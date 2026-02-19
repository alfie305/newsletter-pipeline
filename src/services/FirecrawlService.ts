import axios from 'axios';
import { withRetry } from '../utils/retry';
import logger from '../utils/logger';

export interface ScrapeResult {
  url: string;
  content: string;
  markdown?: string;
  title?: string;
  author?: string;
  publishedDate?: string;
  status: 'success' | 'failed' | 'paywall' | 'timeout';
  error?: string;
}

/**
 * Service wrapper for Firecrawl API
 */
export class FirecrawlService {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Scrape a single URL
   */
  async scrape(url: string, timeout: number = 15000): Promise<ScrapeResult> {
    try {
      const result = await withRetry(
        async () => {
          const response = await axios.post(
            `${this.baseUrl}/scrape`,
            {
              url,
              formats: ['markdown', 'html'],
              onlyMainContent: true,
              timeout: timeout,
            },
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: timeout + 5000, // Add buffer to axios timeout
            }
          );

          return response.data;
        },
        {
          maxRetries: 2,
          initialDelay: 3000,
          backoff: 'linear',
          retryableErrors: new Set([408, 429, 500, 502, 503, 504]),
        },
        `Firecrawl scrape: ${url}`
      );

      // Extract content from response
      const { markdown, html, metadata } = result.data || result;

      return {
        url,
        content: html || '',
        markdown: markdown || '',
        title: metadata?.title || '',
        author: metadata?.author || '',
        publishedDate: metadata?.publishedTime || '',
        status: 'success',
      };
    } catch (error) {
      const errorMessage = error.message.toLowerCase();

      // Detect paywall
      if (
        errorMessage.includes('paywall') ||
        errorMessage.includes('subscription') ||
        errorMessage.includes('403')
      ) {
        logger.warn('Paywall detected', { url });
        return {
          url,
          content: '',
          status: 'paywall',
          error: 'Content behind paywall',
        };
      }

      // Detect timeout
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        logger.warn('Scrape timeout', { url });
        return {
          url,
          content: '',
          status: 'timeout',
          error: 'Request timed out',
        };
      }

      // Other errors
      logger.error('Scrape failed', { url, error: error.message });
      return {
        url,
        content: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Scrape multiple URLs in parallel with rate limiting
   */
  async scrapeMultiple(
    urls: string[],
    options: {
      concurrency?: number;
      delayMs?: number;
    } = {}
  ): Promise<ScrapeResult[]> {
    const { concurrency = 3, delayMs = 1000 } = options;

    const results: ScrapeResult[] = [];
    const batches: string[][] = [];

    // Split URLs into batches
    for (let i = 0; i < urls.length; i += concurrency) {
      batches.push(urls.slice(i, i + concurrency));
    }

    // Process batches sequentially
    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map((url) => this.scrape(url)));
      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    logger.info('Batch scrape completed', {
      total: urls.length,
      successful: successCount,
      failed: urls.length - successCount,
    });

    return results;
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Test with a simple URL
      const response = await axios.post(
        `${this.baseUrl}/scrape`,
        {
          url: 'https://example.com',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.status === 200;
    } catch (error) {
      if (error.response?.status === 401) {
        return false;
      }
      // Other errors might be OK (rate limit, etc.)
      return true;
    }
  }
}
