import logger from './logger';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  backoff: 'exponential' | 'linear';
  retryableErrors?: Set<number>; // HTTP status codes that should trigger retry
}

const DEFAULT_RETRYABLE_ERRORS = new Set([408, 429, 500, 502, 503, 504]);

export class RetryError extends Error {
  constructor(
    message: string,
    public attemptsMade: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriable(error: any, retryableErrors: Set<number>): boolean {
  // Check if error has a status code (axios error)
  if (error.response?.status) {
    return retryableErrors.has(error.response.status);
  }

  // Check if it's a network error
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Check if error message indicates temporary issue
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('rate limit')
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  context?: string
): Promise<T> {
  const retryableErrors = options.retryableErrors || DEFAULT_RETRYABLE_ERRORS;
  let lastError: Error;

  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetriable(error, retryableErrors)) {
        logger.error('Non-retriable error encountered', {
          context,
          error: lastError.message,
          attempt: attempt + 1,
        });
        throw lastError;
      }

      if (attempt === options.maxRetries - 1) {
        logger.error('Max retries exceeded', {
          context,
          attempts: attempt + 1,
          error: lastError.message,
        });
        throw new RetryError(
          `Failed after ${options.maxRetries} attempts: ${lastError.message}`,
          options.maxRetries,
          lastError
        );
      }

      const delay =
        options.backoff === 'exponential'
          ? options.initialDelay * Math.pow(2, attempt)
          : options.initialDelay * (attempt + 1);

      logger.warn('Retrying after error', {
        context,
        attempt: attempt + 1,
        maxRetries: options.maxRetries,
        delay,
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  throw lastError!;
}
