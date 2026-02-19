import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { withRetry } from '../utils/retry';
import logger from '../utils/logger';

export interface ImageGenerationResult {
  section_id: string;
  file_path: string;
  prompt: string;
  status: 'success' | 'failed' | 'placeholder';
  error?: string;
}

export interface ReferenceImage {
  filePath: string;           // Absolute path to reference image
  referenceId: number;        // 1-4 (sequential)
  styleDescription?: string;  // Optional enhancement
}

/**
 * Service wrapper for Nano Banana (Gemini) image generation
 */
export class NanoBananaService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate a single image
   */
  async generateImage(
    prompt: string,
    outputPath: string,
    sectionId: string,
    referenceImages?: ReferenceImage[]
  ): Promise<ImageGenerationResult> {
    try {
      const result = await withRetry(
        async () => {
          // Build instances array
          const instances: any[] = [];

          if (referenceImages && referenceImages.length > 0) {
            // NEW PATH: With reference images
            logger.info('Generating image with reference images', {
              sectionId,
              referenceCount: referenceImages.length,
            });

            const enhancedPrompt = this.enhancePromptWithReferences(
              prompt,
              referenceImages.length
            );

            const referenceImageData = await Promise.all(
              referenceImages.map(async (ref) => ({
                referenceType: 'REFERENCE_TYPE_STYLE',
                referenceId: ref.referenceId,
                referenceImage: {
                  bytesBase64Encoded: await this.loadReferenceImage(ref.filePath),
                },
                ...(ref.styleDescription && {
                  styleImageConfig: { styleDescription: ref.styleDescription },
                }),
              }))
            );

            instances.push({
              prompt: enhancedPrompt,
              referenceImages: referenceImageData,
            });
          } else {
            // LEGACY PATH: Text-only (backward compatible)
            instances.push({ prompt: prompt });
          }

          const response = await axios.post(
            `${this.baseUrl}/models/imagen-3.0-generate-001:predict`,
            {
              instances,
              parameters: {
                sampleCount: 1,
                aspectRatio: '16:9',
                safetyFilterLevel: 'block_some',
                personGeneration: 'allow_adult',
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.apiKey,
              },
              timeout: 60000, // 60 second timeout for image generation
            }
          );

          // Extract image data from response
          const imageData = response.data.predictions[0].bytesBase64Encoded;

          // Ensure output directory exists
          await fs.mkdir(path.dirname(outputPath), { recursive: true });

          // Save image
          const buffer = Buffer.from(imageData, 'base64');
          await fs.writeFile(outputPath, buffer);

          return {
            section_id: sectionId,
            file_path: outputPath,
            prompt,
            status: 'success' as const,
          };
        },
        {
          maxRetries: 2,
          initialDelay: 5000,
          backoff: 'exponential',
        },
        `Image generation: ${sectionId}`
      );

      logger.info('Image generated successfully', {
        sectionId,
        outputPath,
      });

      return result;
    } catch (error) {
      const errorMessage = error.message.toLowerCase();

      // NEW: Detect reference image errors and fallback
      if (errorMessage.includes('reference')) {
        logger.warn('Reference image processing failed, falling back to text-only', {
          sectionId,
          error: error.message,
        });

        // Retry without reference images
        return await this.generateImage(prompt, outputPath, sectionId);
      }

      // Detect content filter block
      if (errorMessage.includes('safety') || errorMessage.includes('filter')) {
        logger.warn('Image generation blocked by content filter', {
          sectionId,
          prompt: prompt.substring(0, 100),
        });
        return {
          section_id: sectionId,
          file_path: '',
          prompt,
          status: 'failed',
          error: 'Blocked by content filter',
        };
      }

      // Detect rate limit
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        logger.warn('Image generation rate limited', { sectionId });
        return {
          section_id: sectionId,
          file_path: '',
          prompt,
          status: 'failed',
          error: 'Rate limit exceeded',
        };
      }

      // Other errors
      logger.error('Image generation failed', {
        sectionId,
        error: error.message,
      });
      return {
        section_id: sectionId,
        file_path: '',
        prompt,
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Generate multiple images with delays to avoid rate limits
   */
  async generateMultiple(
    prompts: Array<{
      sectionId: string;
      prompt: string;
      outputPath: string;
      referenceImages?: ReferenceImage[];
    }>,
    delayMs: number = 5000
  ): Promise<ImageGenerationResult[]> {
    const results: ImageGenerationResult[] = [];

    for (const { sectionId, prompt, outputPath, referenceImages } of prompts) {
      logger.info('Generating image', { sectionId, hasReferences: !!referenceImages });

      const result = await this.generateImage(
        prompt,
        outputPath,
        sectionId,
        referenceImages
      );
      results.push(result);

      // Add delay between requests to avoid rate limiting
      if (
        prompts.indexOf({ sectionId, prompt, outputPath, referenceImages }) <
        prompts.length - 1
      ) {
        logger.info('Waiting between image generations', { delayMs });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    logger.info('Batch image generation completed', {
      total: prompts.length,
      successful: successCount,
      failed: prompts.length - successCount,
    });

    return results;
  }

  /**
   * Create a gradient placeholder image for failed generations
   */
  async createPlaceholder(
    outputPath: string,
    sectionId: string,
    emoji: string = '🚀'
  ): Promise<ImageGenerationResult> {
    try {
      // Create a simple SVG placeholder
      const svg = `
<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a1e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1a1145;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d0820;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#grad)"/>
  <text x="800" y="450" font-size="200" text-anchor="middle" fill="white" opacity="0.3">${emoji}</text>
</svg>`;

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath.replace('.png', '.svg'), svg, 'utf-8');

      logger.info('Created placeholder image', { sectionId, outputPath });

      return {
        section_id: sectionId,
        file_path: outputPath.replace('.png', '.svg'),
        prompt: 'Placeholder gradient',
        status: 'placeholder',
      };
    } catch (error) {
      logger.error('Failed to create placeholder', {
        sectionId,
        error: error.message,
      });
      return {
        section_id: sectionId,
        file_path: '',
        prompt: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Load reference image and convert to base64
   */
  private async loadReferenceImage(filePath: string): Promise<string> {
    try {
      const imageData = await fs.readFile(filePath);
      return imageData.toString('base64');
    } catch (error) {
      logger.error('Failed to read reference image', { filePath, error: error.message });
      throw new Error(`Reference image not found: ${filePath}`);
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Enhance prompt with reference image notation
   */
  private enhancePromptWithReferences(
    prompt: string,
    referenceCount: number
  ): string {
    // Check if prompt already has reference notation
    const hasReferences = /\[\d+\]/.test(prompt);

    if (hasReferences) {
      // User provided manual references, don't modify
      logger.info('Prompt already contains reference notation, using as-is');
      return prompt;
    }

    // Auto-inject references
    // For 3 references: "in the visual style of [1] and [2] and [3]"
    const refs = Array.from({ length: referenceCount }, (_, i) => `[${i + 1}]`);
    const refString = refs.join(' and ');

    return `${prompt} in the visual style of ${refString}`;
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/models/imagen-3.0-generate-001`,
        {
          headers: {
            'x-goog-api-key': this.apiKey,
          },
        }
      );
      return response.status === 200;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      // Other errors might be OK
      return true;
    }
  }
}
