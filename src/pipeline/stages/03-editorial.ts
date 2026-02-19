import fs from 'fs/promises';
import path from 'path';
import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { ClaudeService } from '../../services/ClaudeService';
import { EditorialResultSchema, ArticlesResult } from '../../utils/validation';

/**
 * Stage 3: Editorial
 * Uses Claude to deduplicate, rank, and select stories
 */
export class EditorialStage extends Stage {
  readonly name = 'editorial';
  readonly description = 'Curating and ranking stories';

  private claude: ClaudeService;

  constructor(apiKey: string) {
    super();
    this.claude = new ClaudeService(apiKey);
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

      // Load prompt template
      const promptTemplate = await this.loadPrompt();
      const prompt = promptTemplate.replace(
        '{{ARTICLES_JSON}}',
        JSON.stringify(successfulArticles, null, 2)
      );

      // Run editorial curation with Claude
      this.log('info', 'Running Claude editorial curation');
      const responseText = await this.claude.complete(prompt, {
        systemPrompt: 'You are an expert editorial director for a professional newsletter. Return ONLY valid JSON, no markdown, no explanations.',
        temperature: 0.3,
        maxTokens: 4000,
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

      const duration = Date.now() - startTime;
      this.log('info', 'Editorial stage completed', {
        mainStories: validated.main_stories.length,
        quickHits: validated.quick_hits.length,
        hasDeepSpace: !!validated.deep_space,
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

  async rollback(context: EditionContext): Promise<void> {
    this.log('info', 'Rolling back editorial stage', { editionId: context.id });
    // No cleanup needed for editorial stage
  }
}
