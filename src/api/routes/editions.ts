import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { FileStorage } from '../../storage/FileStorage';
import logger from '../../utils/logger';

export function editionsRouter(storage: FileStorage) {
  const router = Router();

  // GET /api/editions - List all editions
  router.get('/', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const editions = await storage.listEditions(limit);

      res.json({
        editions,
        count: editions.length,
      });
    } catch (error) {
      logger.error('Failed to list editions', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list editions',
      });
    }
  });

  // GET /api/editions/:id - Get edition details
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const edition = await storage.getEdition(id);

      if (!edition) {
        return res.status(404).json({ error: 'Edition not found' });
      }

      res.json(edition);
    } catch (error) {
      logger.error('Failed to get edition', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get edition',
      });
    }
  });

  // GET /api/editions/:id/html - Get generated HTML output
  router.get('/:id/html', async (req, res) => {
    try {
      const { id } = req.params;
      const edition = await storage.getEdition(id);

      if (!edition) {
        return res.status(404).json({ error: 'Edition not found' });
      }

      // Read HTML file
      const htmlPath = path.join('data', 'editions', id, 'output.html');

      try {
        const html = await fs.readFile(htmlPath, 'utf-8');
        res.type('html').send(html);
      } catch (error) {
        // HTML file doesn't exist yet
        return res.status(404).json({
          error: 'Newsletter HTML not generated yet. Run the pipeline first.',
        });
      }
    } catch (error) {
      logger.error('Failed to get edition HTML', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get edition HTML',
      });
    }
  });

  // GET /api/editions/:id/images/:filename - Serve generated images
  router.get('/:id/images/:filename', async (req, res) => {
    try {
      const { id, filename } = req.params;

      // Security: only allow specific image files
      if (!/^(section_\d+|deep_space)\.(png|svg)$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename' });
      }

      const imagePath = path.join('data', 'editions', id, 'images', filename);

      try {
        await fs.access(imagePath);
        res.sendFile(path.resolve(imagePath));
      } catch {
        return res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      logger.error('Failed to serve image', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to serve image',
      });
    }
  });

  // GET /api/editions/:id/results/:stage - Get specific stage results
  router.get('/:id/results/:stage', async (req, res) => {
    try {
      const { id, stage } = req.params;
      const edition = await storage.getEdition(id);

      if (!edition) {
        return res.status(404).json({ error: 'Edition not found' });
      }

      const stageResult = edition.results[stage];

      if (!stageResult) {
        return res.status(404).json({
          error: `Stage '${stage}' result not found`,
        });
      }

      res.json(stageResult);
    } catch (error) {
      logger.error('Failed to get stage result', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get stage result',
      });
    }
  });

  return router;
}
