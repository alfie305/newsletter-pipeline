import path from 'path';
import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { TemplateEngine } from '../../output/TemplateEngine';
import { SegmentAssembler } from '../../output/SegmentAssembler';
import { NewsletterContent, ImageResult } from '../../utils/validation';

/**
 * Stage 6: Assembly
 * Combines newsletter content and images into final HTML output
 */
export class AssemblyStage extends Stage {
  readonly name = 'assembly';
  readonly description = 'Assembling final HTML output';

  async execute(context: EditionContext): Promise<StageResult> {
    const startTime = Date.now();

    try {
      this.log('info', 'Starting assembly stage', { editionId: context.id });

      // Get newsletter content and images
      const newsletterContent = context.results.writing as NewsletterContent;
      const imageResult = context.results.images as ImageResult;

      if (!newsletterContent) {
        throw new Error('No newsletter content found');
      }

      if (!imageResult) {
        throw new Error('No image result found');
      }

      // Initialize assembler
      const assembler = new SegmentAssembler();

      // Generate output path
      const outputPath = path.join(context.dataDir, 'output.html');

      // Assemble HTML
      this.log('info', 'Generating HTML output', { outputPath });
      await assembler.assemble(newsletterContent, imageResult, context.date, outputPath);

      const result = {
        generated_at: new Date().toISOString(),
        output_path: outputPath,
        segments_count: 9,
      };

      const duration = Date.now() - startTime;
      this.log('info', 'Assembly stage completed', {
        outputPath,
        duration_ms: duration,
      });

      return this.success(result, { duration_ms: duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', 'Assembly stage failed', {
        error: error.message,
        duration_ms: duration,
      });

      return this.failure(error, { duration_ms: duration });
    }
  }

  protected validate(input: any): boolean {
    return true; // Simple validation for assembly
  }

  async rollback(context: EditionContext): Promise<void> {
    this.log('info', 'Rolling back assembly stage', { editionId: context.id });
    // Could delete output.html here if needed
  }
}
