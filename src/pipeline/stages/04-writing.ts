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

      this.log('info', 'Processing editorial package for writing', {
        mainStories: editorialData.main_stories.length,
        quickHits: editorialData.quick_hits.length,
      });

      // Load prompt template
      const promptTemplate = await this.loadPrompt();
      const prompt = promptTemplate.replace(
        '{{EDITORIAL_JSON}}',
        JSON.stringify(editorialData, null, 2)
      );

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

      const duration = Date.now() - startTime;
      this.log('info', 'Writing stage completed', {
        subjectLine: validated.subject_line,
        storiesCount: validated.segments.stories.length,
        quickHitsCount: validated.segments.quick_hits.length,
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
