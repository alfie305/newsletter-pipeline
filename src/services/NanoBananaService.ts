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
 * Service wrapper for Nano Banana (Gemini 2.5 Flash Image) generation
 * Uses the generateContent API with IMAGE responseModality
 */
export class NanoBananaService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'gemini-2.5-flash-image'; // Default to cheapest
  }

  /**
   * Generate a single image using Gemini generateContent API
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
          // Build content parts array
          const parts: any[] = [];

          if (referenceImages && referenceImages.length > 0) {
            logger.info('Generating image with reference images', {
              sectionId,
              referenceCount: referenceImages.length,
            });

            // Add reference images as inline_data parts first
            for (const ref of referenceImages) {
              const base64Data = await this.loadReferenceImage(ref.filePath);
              const mimeType = this.getMimeType(ref.filePath);

              parts.push({
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              });
            }

            // Add text prompt with style instruction
            parts.push({
              text: `Generate an image matching the visual style, color palette, and artistic approach of the provided reference image(s). The image should depict: ${prompt}`,
            });
          } else {
            // Text-only generation
            parts.push({ text: `Generate an image: ${prompt}` });
          }

          // Make API request using generateContent endpoint
          const response = await axios.post(
            `${this.baseUrl}/models/${this.model}:generateContent`,
            {
              contents: [{ parts }],
              generationConfig: {
                responseModalities: ['IMAGE'],
                imageConfig: {
                  aspectRatio: '16:9',
                },
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.apiKey,
              },
              timeout: 120000, // 120 second timeout for image generation
            }
          );

          // Extract image from response candidates
          const candidates = response.data.candidates;
          if (!candidates || candidates.length === 0) {
            throw new Error('No candidates returned from Gemini');
          }

          const responseParts = candidates[0].content?.parts;
          if (!responseParts || responseParts.length === 0) {
            throw new Error('No parts in response candidate');
          }

          // Find the part containing image data (API returns camelCase: inlineData)
          const imagePart = responseParts.find(
            (part: any) => part.inlineData || part.inline_data
          );

          const imageData = imagePart?.inlineData || imagePart?.inline_data;
          if (!imageData?.data) {
            // Check if there's a text-only response (e.g. safety block)
            const textPart = responseParts.find((part: any) => part.text);
            if (textPart) {
              throw new Error(`Model returned text instead of image: ${textPart.text.substring(0, 200)}`);
            }
            throw new Error('No image data in response');
          }

          // Ensure output directory exists
          await fs.mkdir(path.dirname(outputPath), { recursive: true });

          // Save image
          const buffer = Buffer.from(imageData.data, 'base64');
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
      const errorMessage = error.message?.toLowerCase() || '';

      // Detect reference image errors and fallback to text-only
      if (
        referenceImages &&
        referenceImages.length > 0 &&
        (errorMessage.includes('reference') || errorMessage.includes('inline_data'))
      ) {
        logger.warn('Reference image processing failed, falling back to text-only', {
          sectionId,
          error: error.message,
        });
        return await this.generateImage(prompt, outputPath, sectionId);
      }

      // Detect content filter block
      if (errorMessage.includes('safety') || errorMessage.includes('filter') || errorMessage.includes('blocked')) {
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
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
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

    for (let i = 0; i < prompts.length; i++) {
      const { sectionId, prompt, outputPath, referenceImages } = prompts[i];

      logger.info('Generating image', {
        sectionId,
        hasReferences: !!referenceImages,
        progress: `${i + 1}/${prompts.length}`,
      });

      const result = await this.generateImage(
        prompt,
        outputPath,
        sectionId,
        referenceImages
      );
      results.push(result);

      // Add delay between requests to avoid rate limiting
      if (i < prompts.length - 1) {
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
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/models/${this.model}`,
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
      return true;
    }
  }
}
