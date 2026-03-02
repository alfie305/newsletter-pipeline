import fs from 'fs/promises';
import path from 'path';
import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { ClaudeService } from '../../services/ClaudeService';
import { SupabaseService, SubscriberAnalytics } from '../../services/SupabaseService';
import { EditorialResultSchema, ArticlesResult } from '../../utils/validation';

/**
 * Stage 3: Editorial
 * Uses Claude to deduplicate, rank, and select stories
 * Now includes subscriber data for personalized content
 */
export class EditorialStage extends Stage {
  readonly name = 'editorial';
  readonly description = 'Curating and ranking stories';

  private claude: ClaudeService;
  private supabase?: SupabaseService;

  constructor(apiKey: string, supabase?: SupabaseService) {
    super();
    this.claude = new ClaudeService(apiKey);
    this.supabase = supabase;
  }

  async execute(context: EditionContext): Promise<StageResult> {
    const startTime = Date.now();

    try {
      this.log('info', 'Starting editorial stage', { editionId: context.id });

      // Get articles from previous stage (stored as 'crawl')
      const articlesData = context.results.crawl as ArticlesResult;
      if (!articlesData || !articlesData.articles) {
        throw new Error('No articles data found');
      }

      // Filter to successfully crawled articles
      const successfulArticles = articlesData.articles.filter(
        (a) => a.crawl_status === 'success'
      );

      this.log('info', 'Processing articles for editorial curation', {
        totalArticles: articlesData.articles.length,
        successfulArticles: successfulArticles.length,
      });

      // Get subscriber analytics if available
      let subscriberAnalytics: SubscriberAnalytics | undefined;
      if (this.supabase) {
        this.log('info', 'Fetching subscriber analytics from Supabase');
        subscriberAnalytics = await this.supabase.getAnalytics();
        this.log('info', 'Subscriber analytics retrieved', {
          total: subscriberAnalytics.total_subscribers,
          topCities: subscriberAnalytics.top_cities.length,
          topRoles: subscriberAnalytics.top_roles.length,
          topInterests: subscriberAnalytics.top_interests.length,
        });
      }

      // Load prompt template
      const promptTemplate = await this.loadPrompt();
      let prompt = promptTemplate.replace(
        '{{ARTICLES_JSON}}',
        JSON.stringify(successfulArticles, null, 2)
      );

      // Add subscriber analytics to prompt if available
      const includeCityMarkets = (context as any).options?.includeCityMarkets ?? false;

      if (subscriberAnalytics && subscriberAnalytics.total_subscribers > 0) {
        const analyticsContext = this.buildAnalyticsContext(subscriberAnalytics, includeCityMarkets);
        prompt = prompt.replace(
          '{{SUBSCRIBER_ANALYTICS}}',
          analyticsContext
        );
      } else {
        // Remove the placeholder if no analytics
        prompt = prompt.replace('{{SUBSCRIBER_ANALYTICS}}', 'No subscriber data available yet.');
      }

      // Run editorial curation with Claude
      this.log('info', 'Running Claude editorial curation');
      const responseText = await this.claude.complete(prompt, {
        systemPrompt: 'You are an expert editorial director for a professional newsletter. Return ONLY valid JSON, no markdown, no explanations. Every main_story MUST include the image_prompt field.',
        temperature: 0.3,
        maxTokens: 8000,
      });

      // Parse JSON response
      let curatedResult;
      try {
        curatedResult = JSON.parse(responseText);
      } catch {
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          curatedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON response from Claude');
        }
      }

      // Add metadata
      const result = {
        generated_at: new Date().toISOString(),
        edition_date: context.date,
        ...curatedResult,
      };

      // Validate schema
      const validated = EditorialResultSchema.parse(result);

      // Validate story count
      if (validated.main_stories.length < 4) {
        this.log('warn', 'Insufficient main stories selected', {
          count: validated.main_stories.length,
        });
        throw new Error(
          `Only ${validated.main_stories.length} main stories selected. Minimum 4 required.`
        );
      }

      // Log city sections if generated
      if (validated.city_sections && validated.city_sections.length > 0) {
        this.log('info', 'City sections generated', {
          cityCount: validated.city_sections.length,
          cities: validated.city_sections.map(c => c.city).join(', ')
        });
      }

      const duration = Date.now() - startTime;
      this.log('info', 'Editorial stage completed', {
        mainStories: validated.main_stories.length,
        quickHits: validated.quick_hits.length,
        hasDeepSpace: !!validated.deep_space,
        citySections: validated.city_sections?.length || 0,
        duration_ms: duration,
      });

      return this.success(validated, { duration_ms: duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', 'Editorial stage failed', {
        error: error.message,
        duration_ms: duration,
      });

      return this.failure(error, { duration_ms: duration });
    }
  }

  protected validate(input: any): boolean {
    try {
      EditorialResultSchema.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  private async loadPrompt(): Promise<string> {
    const promptPath = path.join(process.cwd(), 'prompts', 'editorial.md');
    return fs.readFile(promptPath, 'utf-8');
  }

  /**
   * Build context string from subscriber analytics
   */
  private buildAnalyticsContext(analytics: SubscriberAnalytics, includeCityMarkets: boolean = false): string {
    const lines: string[] = [];

    lines.push(`\n## SUBSCRIBER AUDIENCE PROFILE`);
    lines.push(`Total Subscribers: ${analytics.total_subscribers}`);

    if (includeCityMarkets && analytics.top_cities.length > 0) {
      lines.push(`\n### Top Subscriber Cities (GENERATE CITY SECTIONS FOR THESE):`);

      // Limit to top 5 cities for city sections
      const topCities = analytics.top_cities.slice(0, 5);

      topCities.forEach((city, i) => {
        lines.push(`${i + 1}. ${city.city}: ${city.subscriber_count} subscribers (${city.percentage}%)`);
      });

      lines.push(`\n**REQUIRED: Generate dedicated city_sections for the top 3-5 cities listed above.**`);
      lines.push(`Each city section should include:`);
      lines.push(`- 2-4 specific market insights for that city`);
      lines.push(`- Local price trends, inventory changes, or policy impacts`);
      lines.push(`- Optional headline summarizing the market trend`);
    } else if (!includeCityMarkets) {
      lines.push(`\n**DO NOT generate city_sections. Return an empty array [] for city_sections.**`);
    }

    if (analytics.top_roles.length > 0) {
      lines.push(`\n### Top Roles:`);
      analytics.top_roles.forEach((role, i) => {
        lines.push(`${i + 1}. ${role.role}: ${role.subscriber_count} subscribers (${role.percentage}%)`);
      });
    }

    if (analytics.top_interests.length > 0) {
      lines.push(`\n### Top Interests:`);
      analytics.top_interests.forEach((interest, i) => {
        lines.push(`${i + 1}. ${interest.interest}: ${interest.subscriber_count} subscribers (${interest.percentage}%)`);
      });
    }

    lines.push(`\nUse this audience profile to:
- Prioritize stories that match subscriber interests
${includeCityMarkets ? '- Generate city-specific market sections (REQUIRED)\n' : ''}- Tailor tone and content to the professional roles represented`);

    return lines.join('\n');
  }

  async rollback(context: EditionContext): Promise<void> {
    this.log('info', 'Rolling back editorial stage', { editionId: context.id });
    // No cleanup needed for editorial stage
  }
}
