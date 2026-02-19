import axios from 'axios';
import { withRetry } from '../utils/retry';
import logger from '../utils/logger';

export interface EditorialResult {
  main_stories: any[];
  quick_hits: any[];
  deep_space?: any;
  story_count: {
    main: number;
    quick_hits: number;
    deep_space: number;
    total: number;
  };
}

/**
 * Service wrapper for OpenAI API (GPT-4)
 */
export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Run editorial curation with GPT-4
   */
  async curate(articles: any[], prompt: string): Promise<EditorialResult> {
    try {
      const result = await withRetry(
        async () => {
          const response = await axios.post(
            `${this.baseUrl}/chat/completions`,
            {
              model: 'gpt-4-turbo-preview',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert editorial director for a space industry newsletter. Return ONLY valid JSON, no markdown, no explanations.',
                },
                {
                  role: 'user',
                  content: `${prompt}\n\nArticles:\n${JSON.stringify(articles, null, 2)}`,
                },
              ],
              temperature: 0.3,
              max_tokens: 4000,
              response_format: { type: 'json_object' },
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
          let result;
          try {
            result = JSON.parse(content);
          } catch {
            // Try to extract JSON if wrapped in markdown
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Failed to parse JSON response');
            }
          }

          return result;
        },
        {
          maxRetries: 3,
          initialDelay: 3000,
          backoff: 'exponential',
        },
        'OpenAI editorial curation'
      );

      logger.info('Editorial curation completed', {
        mainStories: result.main_stories?.length || 0,
        quickHits: result.quick_hits?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error('Editorial curation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate a completion with GPT-4
   */
  async complete(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    } = {}
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 2000, jsonMode = false } = options;

    return withRetry(
      async () => {
        const requestBody: any = {
          model: 'gpt-4-turbo-preview',
          messages,
          temperature,
          max_tokens: maxTokens,
        };

        if (jsonMode) {
          requestBody.response_format = { type: 'json_object' };
        }

        const response = await axios.post(`${this.baseUrl}/chat/completions`, requestBody, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        return response.data.choices[0].message.content;
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        backoff: 'exponential',
      },
      'OpenAI completion'
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
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
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
