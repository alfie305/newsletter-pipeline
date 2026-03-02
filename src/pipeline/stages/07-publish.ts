import fs from 'fs/promises';
import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { BeehiivPublisher } from '../../services/BeehiivPublisher';
import { NewsletterContent } from '../../utils/validation';
import { config } from '../../config/env';

/**
 * Stage 7: Publish
 * Pushes the assembled newsletter to beehiiv as a draft post via API
 */
export class PublishStage extends Stage {
    readonly name = 'publish';
    readonly description = 'Publishing to beehiiv';

    async execute(context: EditionContext): Promise<StageResult> {
        const startTime = Date.now();

        // Skip if no beehiiv credentials
        if (!config.beehiivApiKey || !config.beehiivPubId) {
            this.log('warn', 'Beehiiv not configured — skipping publish stage');
            return this.success({ skipped: true, reason: 'No beehiiv credentials' });
        }

        try {
            this.log('info', 'Starting publish stage', { editionId: context.id });

            // Get newsletter content for title/subtitle
            const newsletterContent = context.results.writing as NewsletterContent;
            const assemblyResult = context.results.assembly as { output_path: string };

            if (!assemblyResult?.output_path) {
                throw new Error('No assembled HTML found — run assembly stage first');
            }

            // Read the assembled HTML
            const contentHtml = await fs.readFile(assemblyResult.output_path, 'utf-8');

            // Build title from newsletter content
            const title = newsletterContent?.segments?.header?.title
                || `Newsletter — ${context.date}`;
            const subtitle = newsletterContent?.segments?.header?.subtitle || '';
            const previewText = newsletterContent?.segments?.intro?.hook
                ? this.stripHtml(newsletterContent.segments.intro.hook).slice(0, 200)
                : subtitle;

            // Publish to beehiiv as a draft
            const publisher = new BeehiivPublisher(config.beehiivApiKey, config.beehiivPubId);
            const post = await publisher.createPost({
                title,
                subtitle,
                contentHtml,
                previewText,
                status: 'draft', // Always draft — you manually hit send in beehiiv
            });

            const duration = Date.now() - startTime;
            this.log('info', 'Publish stage completed', {
                post_id: post.post_id,
                web_url: post.web_url,
                duration_ms: duration,
            });

            return this.success(
                {
                    post_id: post.post_id,
                    web_url: post.web_url,
                    beehiiv_status: post.status,
                    published_at: new Date().toISOString(),
                },
                { duration_ms: duration }
            );
        } catch (error) {
            const duration = Date.now() - startTime;
            this.log('error', 'Publish stage failed', {
                error: error.message,
                duration_ms: duration,
            });
            // Non-fatal — don't break the pipeline if publishing fails
            return this.success(
                { skipped: true, reason: error.message },
                { duration_ms: duration }
            );
        }
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    protected validate(input: any): boolean {
        return true;
    }

    async rollback(context: EditionContext): Promise<void> {
        this.log('info', 'Rolling back publish stage — deletion not implemented', {
            editionId: context.id,
        });
    }
}
