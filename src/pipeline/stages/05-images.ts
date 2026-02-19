import path from 'path';
import fs from 'fs/promises';
import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { NanoBananaService, ReferenceImage } from '../../services/NanoBananaService';
import { ImageResultSchema, EditorialResult } from '../../utils/validation';
import { FileStorage } from '../../storage/FileStorage';

/**
 * Stage 5: Images
 * Uses Nano Banana (Gemini) to generate section header images
 */
export class ImagesStage extends Stage {
  readonly name = 'images';
  readonly description = 'Generating section images';

  private nanoBanana: NanoBananaService;
  private storage: FileStorage;
  private minSuccessfulImages = 3; // Minimum images needed (can use placeholders for rest)

  constructor(apiKey: string, storage: FileStorage) {
    super();
    this.nanoBanana = new NanoBananaService(apiKey);
    this.storage = storage;
  }

  async execute(context: EditionContext): Promise<StageResult> {
    const startTime = Date.now();

    try {
      this.log('info', 'Starting images stage', { editionId: context.id });

      // Get editorial results for image prompts
      const editorialData = context.results.editorial as EditorialResult;
      if (!editorialData || !editorialData.main_stories) {
        throw new Error('No editorial data found');
      }

      // Load reference images from active style preset if available
      let referenceImages: ReferenceImage[] | undefined = undefined;

      if (context.stylePresetId) {
        const presets = await this.storage.getStylePresets();
        const activePreset = presets.find((p) => p.id === context.stylePresetId);

        if (activePreset && activePreset.reference_images.length > 0) {
          // Validate files exist
          const validImages: string[] = [];

          for (const relativePath of activePreset.reference_images) {
            const absolutePath = path.join(process.cwd(), 'data', relativePath);
            try {
              await fs.access(absolutePath);
              validImages.push(absolutePath);
            } catch {
              this.log('warn', 'Reference image not found, skipping', {
                path: absolutePath,
              });
            }
          }

          if (validImages.length > 0) {
            // Convert to ReferenceImage array with sequential IDs
            referenceImages = validImages.map((filePath, index) => ({
              filePath,
              referenceId: index + 1, // 1-based indexing
              styleDescription: undefined, // Optional: could use activePreset.style_description
            }));

            this.log('info', 'Using direct reference images for style', {
              presetId: activePreset.id,
              presetName: activePreset.name,
              imageCount: referenceImages.length,
            });
          } else {
            this.log('warn', 'No valid reference images found, using text-only generation', {
              presetId: activePreset.id,
            });
          }
        }
      }

      this.log('info', 'Images stage starting', {
        hasStylePreset: !!context.stylePresetId,
        willUseReferences: !!referenceImages,
      });

      // Prepare image generation tasks
      const imagePrompts = editorialData.main_stories.map((story, index) => ({
        sectionId: `section_${index + 1}`,
        prompt: story.image_prompt,
        outputPath: path.join(
          context.dataDir,
          'images',
          `section_${index + 1}.png`
        ),
        referenceImages: referenceImages,
      }));

      // Add deep space image if present
      if (editorialData.deep_space) {
        imagePrompts.push({
          sectionId: 'deep_space',
          prompt: editorialData.deep_space.image_prompt,
          outputPath: path.join(context.dataDir, 'images', 'deep_space.png'),
          referenceImages: referenceImages,
        });
      }

      this.log('info', 'Generating images', { count: imagePrompts.length });

      // Generate images with delays
      const imageResults = await this.nanoBanana.generateMultiple(imagePrompts, 5000);

      // Count successful images
      const successfulImages = imageResults.filter(
        (r) => r.status === 'success'
      ).length;

      this.log('info', 'Image generation results', {
        total: imageResults.length,
        successful: successfulImages,
        failed: imageResults.length - successfulImages,
      });

      // Create placeholders for failed images
      const finalResults = await Promise.all(
        imageResults.map(async (result) => {
          if (result.status === 'success') {
            return result;
          }

          // Create placeholder
          const story = editorialData.main_stories.find(
            (s, i) => `section_${i + 1}` === result.section_id
          );
          const emoji = story?.section_emoji || '🚀';

          // Build placeholder path from section ID (file_path may be empty on failure)
          const placeholderPath = path.join(
            context.dataDir,
            'images',
            `${result.section_id}.svg`
          );
          const placeholder = await this.nanoBanana.createPlaceholder(
            placeholderPath,
            result.section_id,
            emoji
          );

          return placeholder;
        })
      );

      // Check if we have enough successful generations
      if (successfulImages < this.minSuccessfulImages) {
        this.log('warn', 'Using placeholders for some images', {
          successful: successfulImages,
          minimum: this.minSuccessfulImages,
        });
      }

      // Build result
      const result = {
        generated_at: new Date().toISOString(),
        images: finalResults,
      };

      // Validate schema
      const validated = ImageResultSchema.parse(result);

      const duration = Date.now() - startTime;
      this.log('info', 'Images stage completed', {
        totalImages: validated.images.length,
        successfulImages,
        placeholders: validated.images.length - successfulImages,
        duration_ms: duration,
      });

      return this.success(validated, { duration_ms: duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', 'Images stage failed', {
        error: error.message,
        duration_ms: duration,
      });

      return this.failure(error, { duration_ms: duration });
    }
  }

  protected validate(input: any): boolean {
    try {
      ImageResultSchema.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  async rollback(context: EditionContext): Promise<void> {
    this.log('info', 'Rolling back images stage', { editionId: context.id });
    // Could delete generated images here if needed
  }
}
