import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { FirecrawlService } from '../../services/FirecrawlService';
import { ArticlesResultSchema, DiscoveryResult } from '../../utils/validation';

/**
 * Stage 2: Deep Crawl
 * Uses Firecrawl to extract full article content from top 10 URLs
 */
export class CrawlStage extends Stage {
  readonly name = 'crawl';
  readonly description = 'Extracting full article content';

  private firecrawl: FirecrawlService;
  private minSuccessfulCrawls = 6; // Minimum articles needed to continue

  constructor(apiKey: string) {
    super();
    this.firecrawl = new FirecrawlService(apiKey);
  }

  async execute(context: EditionContext): Promise<StageResult> {
    const startTime = Date.now();

    try {
      this.log('info', 'Starting crawl stage', { editionId: context.id });

      // Get discovery results
      const discoveryData = context.results.discovery as DiscoveryResult;
      if (!discoveryData || !discoveryData.stories) {
        throw new Error('No discovery data found');
      }

      // Select top 10 stories by importance
      const topStories = discoveryData.stories
        .sort((a, b) => b.importance_score - a.importance_score)
        .slice(0, 10);

      this.log('info', 'Selected top stories for crawling', {
        count: topStories.length,
      });

      // Extract URLs
      const urls = topStories.map((story) => story.source_url);

      // Crawl articles
      this.log('info', 'Starting article crawl', { urlCount: urls.length });
      const scrapeResults = await this.firecrawl.scrapeMultiple(urls, {
        concurrency: 3,
        delayMs: 1000,
      });

      // Merge crawl results with story data
      const articles = topStories.map((story, index) => {
        const scrapeResult = scrapeResults[index];

        return {
          ...story,
          full_text: scrapeResult.markdown || scrapeResult.content || '',
          author: scrapeResult.author,
          key_stats: this.extractKeyStats(scrapeResult.markdown || ''),
          crawl_status: scrapeResult.status,
          crawl_error: scrapeResult.error,
        };
      });

      // Check if we have enough successful crawls
      const successfulCrawls = articles.filter(
        (a) => a.crawl_status === 'success'
      ).length;

      if (successfulCrawls < this.minSuccessfulCrawls) {
        this.log('warn', 'Insufficient successful crawls', {
          successful: successfulCrawls,
          minimum: this.minSuccessfulCrawls,
        });
        throw new Error(
          `Only ${successfulCrawls} articles crawled successfully. Minimum ${this.minSuccessfulCrawls} required.`
        );
      }

      // Build result
      const result = {
        generated_at: new Date().toISOString(),
        articles,
        crawl_summary: {
          attempted: urls.length,
          succeeded: successfulCrawls,
          failed: urls.length - successfulCrawls,
          failed_urls: scrapeResults
            .filter((r) => r.status !== 'success')
            .map((r) => r.url),
        },
      };

      // Validate schema
      const validated = ArticlesResultSchema.parse(result);

      const duration = Date.now() - startTime;
      this.log('info', 'Crawl stage completed', {
        attempted: urls.length,
        succeeded: successfulCrawls,
        duration_ms: duration,
      });

      return this.success(validated, { duration_ms: duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', 'Crawl stage failed', {
        error: error.message,
        duration_ms: duration,
      });

      return this.failure(error, { duration_ms: duration });
    }
  }

  protected validate(input: any): boolean {
    try {
      ArticlesResultSchema.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract key statistics from article text
   */
  private extractKeyStats(text: string): string[] {
    const stats: string[] = [];

    // Look for common number patterns
    const numberPatterns = [
      /\$[\d,.]+ (?:million|billion|trillion)/gi,
      /\d+(?:,\d{3})* (?:kg|tons|meters|km|miles|feet)/gi,
      /\d+% (?:increase|decrease|growth|reduction)/gi,
      /\d+ (?:days|weeks|months|years|missions|launches|satellites)/gi,
    ];

    for (const pattern of numberPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        stats.push(...matches.slice(0, 3)); // Max 3 per pattern
      }
    }

    return stats.slice(0, 5); // Return max 5 stats
  }

  async rollback(context: EditionContext): Promise<void> {
    this.log('info', 'Rolling back crawl stage', { editionId: context.id });
    // No cleanup needed for crawl stage
  }
}
