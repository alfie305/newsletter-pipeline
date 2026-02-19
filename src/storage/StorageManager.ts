import { Edition, SourcesConfig } from '../pipeline/types';

/**
 * Abstract storage interface for pipeline data persistence
 */
export abstract class StorageManager {
  /**
   * Create a new edition with initial metadata
   */
  abstract createEdition(date: string): Promise<Edition>;

  /**
   * Save the result of a pipeline stage
   */
  abstract saveStageResult(editionId: string, stage: string, data: any): Promise<void>;

  /**
   * Get a specific edition by ID
   */
  abstract getEdition(editionId: string): Promise<Edition | null>;

  /**
   * List all editions, optionally filtered
   */
  abstract listEditions(limit?: number): Promise<Edition[]>;

  /**
   * Update edition status
   */
  abstract updateEditionStatus(
    editionId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
  ): Promise<void>;

  /**
   * Update stage status within an edition
   */
  abstract updateStageStatus(
    editionId: string,
    stage: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
  ): Promise<void>;

  /**
   * Get sources configuration
   */
  abstract getSources(): Promise<SourcesConfig>;

  /**
   * Update sources configuration
   */
  abstract updateSources(sources: SourcesConfig): Promise<void>;

  /**
   * Get enabled source domains for discovery
   */
  async getEnabledSources(): Promise<string[]> {
    const config = await this.getSources();
    return config.sources
      .filter((source) => source.enabled)
      .map((source) => source.url);
  }
}
