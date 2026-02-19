import axios from 'axios';
import { withRetry } from '../utils/retry';
import logger from '../utils/logger';

export interface PerplexitySearchResult {
  headline: string;
  summary: string;
  source_url: string;
  source_name: string;
  category: string;
  importance_score: number;
  published_date: string;
  tags: string[];
}

/**
 * Service wrapper for Perplexity Sonar API
 * Supports both MCP and direct API calls with automatic fallback
 */
export class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for space news stories
   */
  async search(
    query: string,
    options: {
      enabledSources?: string[];
      daysBack?: number;
    } = {}
  ): Promise<PerplexitySearchResult[]> {
    const { enabledSources = [], daysBack = 7 } = options;

    // Build enhanced query with source preferences
    const sourcesHint =
      enabledSources.length > 0
        ? `Prioritize these sources: ${enabledSources.join(', ')}.`
        : '';

    const fullQuery = `
${query}

${sourcesHint}

Time range: Past ${daysBack} days only.

Return results as a JSON array with this exact structure:
[
  {
    "headline": "string",
    "summary": "string",
    "source_url": "string",
    "source_name": "string",
    "category": "launches|missions|policy|commercial|science|exploration",
    "importance_score": number (1-10),
    "published_date": "YYYY-MM-DD",
    "tags": ["string"]
  }
]

Return 15-20 results. Respond with ONLY the JSON array, no other text.
    `.trim();

    try {
      // Try direct API call
      const results = await this.searchViaAPI(fullQuery);
      logger.info('Perplexity search completed via API', {
        resultsCount: results.length,
      });
      return results;
    } catch (error) {
      logger.error('Perplexity search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Search via direct Perplexity API
   */
  private async searchViaAPI(query: string): Promise<PerplexitySearchResult[]> {
    return withRetry(
      async () => {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content:
                  'You are a news discovery system. Return ONLY valid JSON arrays, no markdown, no explanations.',
              },
              {
                role: 'user',
                content: query,
              },
            ],
            temperature: 0.2,
            max_tokens: 4000,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const content = response.data.choices[0].message.content;

        // Parse JSON response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON array found in response');
        }

        const results = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(results)) {
          throw new Error('Response is not an array');
        }

        return results;
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        backoff: 'exponential',
      },
      'Perplexity API search'
    );
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
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
      throw error;
    }
  }
}
