import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { FileStorage } from '../../storage/FileStorage';
import { GeminiVisionService } from '../../services/GeminiVisionService';
import { config } from '../../config/env';
import logger from '../../utils/logger';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const presetId = req.params.id;
    const dir = path.join(process.cwd(), 'data', 'style_presets', presetId);
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `ref_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'));
    }
  }
});

export function stylePresetsRouter(fileStorage: FileStorage) {
  // Get all style presets
  router.get('/', async (req: Request, res: Response) => {
    try {
      const presets = await fileStorage.getStylePresets();
      res.json({ presets });
    } catch (error) {
      logger.error('Failed to fetch style presets', { error });
      res.status(500).json({ error: 'Failed to fetch style presets' });
    }
  });

  // Get active style preset
  router.get('/active', async (req: Request, res: Response) => {
    try {
      const activePreset = await fileStorage.getActiveStylePreset();
      res.json({ preset: activePreset });
    } catch (error) {
      logger.error('Failed to fetch active preset', { error });
      res.status(500).json({ error: 'Failed to fetch active preset' });
    }
  });

  // Set active style preset
  router.put('/active', async (req: Request, res: Response) => {
    try {
      const { preset_id } = req.body;
      if (!preset_id) {
        return res.status(400).json({ error: 'preset_id is required' });
      }
      await fileStorage.setActiveStylePreset(preset_id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to set active preset', { error });
      res.status(500).json({ error: 'Failed to set active preset' });
    }
  });

  // Create new style preset
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }
      const preset = await fileStorage.createStylePreset(name, description);
      res.json({ preset });
    } catch (error) {
      logger.error('Failed to create preset', { error });
      res.status(500).json({ error: 'Failed to create preset' });
    }
  });

  // Upload reference image to preset
  router.post('/:id/images', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const presetId = req.params.id;
      const relativePath = path.relative(
        path.join(process.cwd(), 'data'),
        req.file.path
      );

      await fileStorage.addReferenceImage(presetId, relativePath);

      // Automatically analyze style when images are added
      const presets = await fileStorage.getStylePresets();
      const preset = presets.find(p => p.id === presetId);

      if (preset && preset.reference_images.length > 0) {
        try {
          const geminiApiKey = config.geminiApiKey || config.googleApiKey;
          if (!geminiApiKey) {
            logger.warn('No Gemini API key found, skipping style analysis');
          } else {
            const geminiVision = new GeminiVisionService(geminiApiKey);
            const imagePaths = preset.reference_images.map(img =>
              path.join(process.cwd(), 'data', img)
            );
            const styleDescription = await geminiVision.analyzeStyleReferences(imagePaths);
            await fileStorage.updateStylePreset(presetId, { style_description: styleDescription });
            logger.info('Style analysis completed', { presetId });
          }
        } catch (error) {
          logger.error('Style analysis failed', { presetId, error });
          // Don't fail the request if analysis fails
        }
      }

      res.json({ success: true, file_path: relativePath });
    } catch (error) {
      logger.error('Failed to upload image', { error });
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // Delete reference image from preset
  router.delete('/:id/images/:imageIndex', async (req: Request, res: Response) => {
    try {
      const presetId = req.params.id;
      const imageIndex = parseInt(req.params.imageIndex);

      const presets = await fileStorage.getStylePresets();
      const preset = presets.find(p => p.id === presetId);

      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' });
      }

      const imagePath = preset.reference_images[imageIndex];
      if (!imagePath) {
        return res.status(404).json({ error: 'Image not found' });
      }

      await fileStorage.removeReferenceImage(presetId, imagePath);

      // Delete physical file
      const fullPath = path.join(process.cwd(), 'data', imagePath);
      await fs.unlink(fullPath).catch((err) => {
        logger.warn('Failed to delete image file', { fullPath, error: err });
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete image', { error });
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });

  // Delete style preset
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await fileStorage.deleteStylePreset(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete preset', { error });
      res.status(500).json({ error: 'Failed to delete preset' });
    }
  });

  return router;
}
