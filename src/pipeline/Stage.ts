import { EditionContext, StageResult } from './types';
import logger from '../utils/logger';

/**
 * Abstract base class for all pipeline stages
 */
export abstract class Stage {
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Execute this stage of the pipeline
   * @param context The current edition context
   * @returns StageResult with success status and data
   */
  abstract execute(context: EditionContext): Promise<StageResult>;

  /**
   * Validate input data before execution
   * @param input The input data to validate
   * @returns true if valid, throws error if invalid
   */
  protected abstract validate(input: any): boolean;

  /**
   * Optional cleanup/rollback logic if stage fails
   * @param context The current edition context
   */
  async rollback?(context: EditionContext): Promise<void>;

  /**
   * Helper to create a successful stage result
   */
  protected success(data: any, metadata?: any): StageResult {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }

  /**
   * Helper to create a failed stage result
   */
  protected failure(error: string | Error, metadata?: any): StageResult {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return {
      success: false,
      data: null,
      error: errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }

  /**
   * Log stage progress
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, meta?: any) {
    logger[level](message, { stage: this.name, ...meta });
  }
}
