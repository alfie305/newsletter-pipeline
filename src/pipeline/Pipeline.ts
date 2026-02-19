import { EventEmitter } from 'events';
import { Stage } from './Stage';
import { StorageManager } from '../storage/StorageManager';
import { EditionContext, PipelineOptions, ProgressEvent, Edition } from './types';
import logger from '../utils/logger';

/**
 * Main pipeline orchestrator that executes all stages sequentially
 */
export class Pipeline extends EventEmitter {
  private stages: Stage[] = [];
  private storage: StorageManager;
  private currentExecution: string | null = null;

  constructor(storage: StorageManager) {
    super();
    this.storage = storage;
  }

  /**
   * Register a stage to be executed in the pipeline
   */
  registerStage(stage: Stage): void {
    this.stages.push(stage);
    logger.info(`Registered stage: ${stage.name}`);
  }

  /**
   * Execute the entire pipeline
   */
  async execute(options: PipelineOptions = {}): Promise<Edition> {
    const startTime = Date.now();
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Create or load edition
    let edition: Edition;
    if (options.editionId) {
      const existing = await this.storage.getEdition(options.editionId);
      if (!existing) {
        throw new Error(`Edition ${options.editionId} not found`);
      }
      edition = existing;
    } else {
      edition = await this.storage.createEdition(date);
    }

    this.currentExecution = edition.id;

    // Initialize edition context
    const context: EditionContext = {
      id: edition.id,
      date: edition.date,
      dataDir: `data/editions/${edition.id}`,
      results: edition.results,
      customTopics: options.customTopics,
      stylePresetId: options.stylePresetId,
    };

    try {
      await this.storage.updateEditionStatus(edition.id, 'in_progress');
      this.emitProgress({
        stage: 'pipeline',
        status: 'in_progress',
        message: 'Starting pipeline execution',
      });

      // Determine which stages to execute
      const stagesToExecute = this.getStagesToExecute(options);

      // Execute stages sequentially
      for (const stage of stagesToExecute) {
        const stageStartTime = Date.now();

        try {
          // Update stage status
          await this.storage.updateStageStatus(edition.id, stage.name, 'in_progress');
          this.emitProgress({
            stage: stage.name,
            status: 'in_progress',
            message: `Executing ${stage.description}`,
          });

          logger.info(`Starting stage: ${stage.name}`, { editionId: edition.id });

          // Execute the stage
          const result = await stage.execute(context);

          if (!result.success) {
            throw new Error(result.error || 'Stage failed with unknown error');
          }

          // Save stage result
          await this.storage.saveStageResult(edition.id, stage.name, result.data);
          context.results[stage.name] = result.data;

          // Update stage status
          await this.storage.updateStageStatus(edition.id, stage.name, 'completed');

          const duration = Date.now() - stageStartTime;
          logger.info(`Completed stage: ${stage.name}`, {
            editionId: edition.id,
            duration_ms: duration,
          });

          this.emitProgress({
            stage: stage.name,
            status: 'completed',
            message: `Completed ${stage.description}`,
          });
        } catch (error) {
          const duration = Date.now() - stageStartTime;
          logger.error(`Stage failed: ${stage.name}`, {
            editionId: edition.id,
            error: error.message,
            duration_ms: duration,
          });

          await this.storage.updateStageStatus(edition.id, stage.name, 'failed');
          this.emitProgress({
            stage: stage.name,
            status: 'failed',
            message: `Failed: ${error.message}`,
            error: error.message,
          });

          // Handle stage failure
          await this.handleStageFailure(stage, edition, error);

          throw error; // Re-throw to stop pipeline
        }
      }

      // Mark edition as completed
      await this.storage.updateEditionStatus(edition.id, 'completed');

      const totalDuration = Date.now() - startTime;
      logger.info('Pipeline execution completed', {
        editionId: edition.id,
        duration_ms: totalDuration,
        duration_sec: Math.round(totalDuration / 1000),
      });

      this.emitProgress({
        stage: 'pipeline',
        status: 'completed',
        message: `Pipeline completed in ${Math.round(totalDuration / 1000)}s`,
      });

      // Get final edition with all results
      const finalEdition = await this.storage.getEdition(edition.id);
      return finalEdition!;
    } catch (error) {
      await this.storage.updateEditionStatus(edition.id, 'failed');

      const totalDuration = Date.now() - startTime;
      logger.error('Pipeline execution failed', {
        editionId: edition.id,
        error: error.message,
        duration_ms: totalDuration,
      });

      this.emitProgress({
        stage: 'pipeline',
        status: 'failed',
        message: `Pipeline failed: ${error.message}`,
        error: error.message,
      });

      throw error;
    } finally {
      this.currentExecution = null;
    }
  }

  /**
   * Determine which stages to execute based on options
   */
  private getStagesToExecute(options: PipelineOptions): Stage[] {
    if (!options.fromStage) {
      return this.stages;
    }

    // Find the starting stage index
    const startIndex = this.stages.findIndex((s) => s.name === options.fromStage);
    if (startIndex === -1) {
      throw new Error(`Stage ${options.fromStage} not found`);
    }

    return this.stages.slice(startIndex);
  }

  /**
   * Handle stage failure with fallback strategies
   */
  private async handleStageFailure(
    stage: Stage,
    edition: Edition,
    error: Error
  ): Promise<void> {
    logger.warn(`Handling failure for stage: ${stage.name}`, {
      editionId: edition.id,
      error: error.message,
    });

    // Call stage-specific rollback if available
    if (stage.rollback) {
      try {
        const context: EditionContext = {
          id: edition.id,
          date: edition.date,
          dataDir: `data/editions/${edition.id}`,
          results: edition.results,
        };
        await stage.rollback(context);
      } catch (rollbackError) {
        logger.error(`Rollback failed for stage: ${stage.name}`, {
          error: rollbackError.message,
        });
      }
    }

    // Emit failure event
    this.emit('stage:failed', {
      stage: stage.name,
      edition: edition.id,
      error: error.message,
    });
  }

  /**
   * Emit progress event to listeners
   */
  private emitProgress(event: ProgressEvent): void {
    this.emit('progress', event);
  }

  /**
   * Get current execution status
   */
  getStatus(): { executing: boolean; editionId: string | null } {
    return {
      executing: this.currentExecution !== null,
      editionId: this.currentExecution,
    };
  }

  /**
   * Cancel current execution (if supported)
   */
  async cancel(): Promise<void> {
    if (!this.currentExecution) {
      throw new Error('No execution in progress');
    }

    logger.warn('Pipeline cancellation requested', {
      editionId: this.currentExecution,
    });

    // TODO: Implement cancellation logic
    // This would require AbortController or similar mechanism
    throw new Error('Pipeline cancellation not yet implemented');
  }
}
