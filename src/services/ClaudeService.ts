import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '../utils/retry';
import logger from '../utils/logger';

export interface NewsletterResult {
  subject_line: string;
  preview_text: string;
  segments: {
    header: any;
    intro: any;
    stories: any[];
    quick_hits: any[];
    deep_space?: any;
    closing: any;
  };
}

/**
 * Service wrapper for Anthropic Claude API
 */
export class ClaudeService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Write newsletter content with Claude Opus
   */
  async write(editorialPackage: any, prompt: string): Promise<NewsletterResult> {
    try {
      const result = await withRetry(
        async () => {
          const message = await this.client.messages.create({
            model: 'claude-opus-4-20250514',
            max_tokens: 8000,
            temperature: 0.7,
            system:
              'You are the voice of Space Pulse newsletter. Write engaging, conversational content in TLDR style. Return ONLY valid JSON, no markdown, no explanations.',
            messages: [
              {
                role: 'user',
                content: `${prompt}\n\nEditorial Package:\n${JSON.stringify(editorialPackage, null, 2)}`,
              },
            ],
          });

          const content = message.content[0].type === 'text' ? message.content[0].text : '';

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
        'Claude newsletter writing'
      );

      logger.info('Newsletter writing completed', {
        storiesCount: result.segments?.stories?.length || 0,
        subjectLine: result.subject_line,
      });

      return result;
    } catch (error) {
      logger.error('Newsletter writing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate a text completion with Claude
   */
  async complete(
    prompt: string,
    options: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const { systemPrompt, temperature = 0.7, maxTokens = 4000 } = options;

    return withRetry(
      async () => {
        const message = await this.client.messages.create({
          model: 'claude-opus-4-20250514',
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        return message.content[0].type === 'text' ? message.content[0].text : '';
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        backoff: 'exponential',
      },
      'Claude completion'
    );
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return message.content.length > 0;
    } catch (error) {
      if (error.status === 401) {
        return false;
      }
      throw error;
    }
  }
}
