import axios from 'axios';
import logger from '../utils/logger';

export interface BeehiivPostResult {
    post_id: string;
    web_url: string;
    status: string;
}

export interface BeehiivPublishOptions {
    title: string;
    subtitle?: string;
    previewText?: string;
    bodyContent: string;        // HTML string — the actual post content
    status?: 'draft' | 'confirmed';
}

/**
 * Publishes newsletter content to beehiiv via POST /v2/publications/:pubId/posts
 * Docs: https://developers.beehiiv.com/api-reference/posts/create
 */
export class BeehiivPublisher {
    private readonly baseUrl = 'https://api.beehiiv.com/v2';
    private readonly apiKey: string;
    private readonly pubId: string;

    constructor(apiKey: string, pubId: string) {
        this.apiKey = apiKey;
        this.pubId = pubId;
    }

    /**
     * Create a draft post in beehiiv.
     * Uses body_content (HTML) as the post body — the correct field per beehiiv API docs.
     */
    async createPost(options: BeehiivPublishOptions): Promise<BeehiivPostResult> {
        const { title, subtitle, previewText, bodyContent, status = 'draft' } = options;

        logger.info('Creating beehiiv post', { title, status, pubId: this.pubId });

        // Correct payload per beehiiv API v2 docs
        const payload: Record<string, any> = {
            subject_line: title,
            preview_text: previewText || subtitle || title,
            status,
            body_content: bodyContent,
        };

        if (subtitle) {
            payload.subtitle = subtitle;
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/publications/${this.pubId}/posts`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const post = response.data?.data;

            if (!post?.id) {
                throw new Error(`No post ID in response: ${JSON.stringify(response.data)}`);
            }

            const result: BeehiivPostResult = {
                post_id: post.id,
                web_url: post.web_url || '',
                status: post.status,
            };

            logger.info('Beehiiv post created successfully', result);
            return result;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const body = JSON.stringify(error.response?.data);
                logger.error('Beehiiv API error', { status, body });
                throw new Error(`Beehiiv API error (${status}): ${body}`);
            }
            throw error;
        }
    }

    /**
     * Test connectivity to beehiiv
     */
    async testConnection(): Promise<{ ok: boolean; name?: string }> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/publications/${this.pubId}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        Accept: 'application/json',
                    },
                    timeout: 10000,
                }
            );
            const name = response.data?.data?.name;
            logger.info('Beehiiv connection test successful', { publication: name });
            return { ok: true, name };
        } catch (error) {
            logger.error('Beehiiv connection test failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { ok: false };
        }
    }
}
