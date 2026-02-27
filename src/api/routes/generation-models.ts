import { Router, Request, Response } from 'express';
import type { FileStorage } from '../../storage/FileStorage';
import { AVAILABLE_GENERATION_MODELS } from '../../utils/validation';
import logger from '../../utils/logger';

export function generationModelsRouter(storage: FileStorage): Router {
  const router = Router();

  // GET /api/generation-models - Get available models and active selection
  router.get('/', async (req: Request, res: Response) => {
    try {
      const config = await storage.getGenerationModelsConfig();

      res.json({
        active_model: config.active_model,
        available_models: AVAILABLE_GENERATION_MODELS,
        last_updated: config.last_updated,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get generation models config', { error: errorMessage });
      res.status(500).json({
        error: 'Failed to get generation models config',
        message: errorMessage,
      });
    }
  });

  // PUT /api/generation-models/active - Set active model
  router.put('/active', async (req: Request, res: Response) => {
    try {
      const { model_id } = req.body;

      if (!model_id || typeof model_id !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'model_id is required and must be a string',
        });
      }

      await storage.setActiveGenerationModel(model_id);

      logger.info('Active generation model updated', { model_id });

      res.json({
        success: true,
        active_model: model_id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to set active generation model', { error: errorMessage });
      res.status(500).json({
        error: 'Failed to set active generation model',
        message: errorMessage,
      });
    }
  });

  return router;
}
