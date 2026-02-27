import fs from 'fs/promises';
import path from 'path';
import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { ClaudeService } from '../../services/ClaudeService';
import { NewsletterContentSchema, EditorialResult } from '../../utils/validation';

/**
 * Stage 4: Writing
 * Uses Claude Opus to write complete newsletter copy in TLDR style
 */
export class WritingStage extends Stage {
  readonly name = 'writing';
  readonly description = 'Writing newsletter content';

  private claude: ClaudeService;

  constructor(apiKey: string) {
    super();
    this.claude = new ClaudeService(apiKey);
  }

  async execute(context: EditionContext): Promise<StageResult> {
    const startTime = Date.now();

    try {
      this.log('info', 'Starting writing stage', { editionId: context.id });

      // Get editorial results
      const editorialData = context.results.editorial as EditorialResult;
      if (!editorialData || !editorialData.main_stories) {
        throw new Error('No editorial data found');
      }

      // Check if city sections exist
      const hasCitySections = editorialData.city_sections && editorialData.city_sections.length > 0;

      this.log('info', 'Processing editorial package for writing', {
        mainStories: editorialData.main_stories.length,
        quickHits: editorialData.quick_hits.length,
        citySections: hasCitySections ? editorialData.city_sections!.length : 0,
      });

      if (hasCitySections) {
        this.log('info', 'City sections detected for writing stage', {
          cityCount: editorialData.city_sections!.length,
          cities: editorialData.city_sections!.map(c => c.city).join(', ')
        });
      }

      // Load prompt template
      const promptTemplate = await this.loadPrompt();
      let prompt = promptTemplate.replace(
        '{{EDITORIAL_JSON}}',
        JSON.stringify(editorialData, null, 2)
      );

      // Add instruction flag for city sections
      if (hasCitySections) {
        prompt += `\n\n**IMPORTANT: The editorial includes ${editorialData.city_sections!.length} city_sections. Generate the city_markets segment in your output.**`;
      }

      // Generate newsletter content
      this.log('info', 'Generating newsletter content with Claude');
      const newsletterContent = await this.claude.write(editorialData, prompt);

      // Add metadata
      const result = {
        generated_at: new Date().toISOString(),
        ...newsletterContent,
      };

      // Validate schema
      const validated = NewsletterContentSchema.parse(result);

      // Validate subject line length
      if (validated.subject_line.length > 50) {
        this.log('warn', 'Subject line too long, truncating', {
          original: validated.subject_line,
          length: validated.subject_line.length,
        });
        validated.subject_line = validated.subject_line.substring(0, 47) + '...';
      }

      // Log city markets if generated
      if (validated.segments.city_markets && validated.segments.city_markets.length > 0) {
        this.log('info', 'City market segments generated', {
          cityCount: validated.segments.city_markets.length,
          cities: validated.segments.city_markets.map(c => c.city).join(', ')
        });
      }

      const duration = Date.now() - startTime;
      this.log('info', 'Writing stage completed', {
        subjectLine: validated.subject_line,
        storiesCount: validated.segments.stories.length,
        quickHitsCount: validated.segments.quick_hits.length,
        cityMarketsCount: validated.segments.city_markets?.length || 0,
        duration_ms: duration,
      });

      return this.success(validated, { duration_ms: duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', 'Writing stage failed', {
        error: error.message,
        duration_ms: duration,
      });

      return this.failure(error, { duration_ms: duration });
    }
  }

  protected validate(input: any): boolean {
    try {
      NewsletterContentSchema.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  private async loadPrompt(): Promise<string> {
    const promptPath = path.join(process.cwd(), 'prompts', 'writing.md');
    return fs.readFile(promptPath, 'utf-8');
  }

  async rollback(context: EditionContext): Promise<void> {
    this.log('info', 'Rolling back writing stage', { editionId: context.id });
    // No cleanup needed for writing stage
  }
}
