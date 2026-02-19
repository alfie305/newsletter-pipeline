import { Router } from 'express';
import { FileStorage } from '../../storage/FileStorage';
import logger from '../../utils/logger';

export function sourcesRouter(storage: FileStorage) {
  const router = Router();

  // GET /api/sources - List all sources
  router.get('/', async (req, res) => {
    try {
      const config = await storage.getSources();
      res.json(config);
    } catch (error) {
      logger.error('Failed to get sources', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get sources',
      });
    }
  });

  // POST /api/sources - Add new source
  router.post('/', async (req, res) => {
    try {
      const { name, url, type, category, notes } = req.body;

      if (!name || !url || !type || !category) {
        return res.status(400).json({
          error: 'Missing required fields: name, url, type, category',
        });
      }

      const config = await storage.getSources();

      const newId = config.sources.length > 0
        ? Math.max(...config.sources.map(s => s.id)) + 1
        : 1;

      const newSource = {
        id: newId,
        name,
        url,
        type,
        category,
        enabled: true,
        added_at: new Date().toISOString(),
        notes,
      };

      config.sources.push(newSource);
      await storage.updateSources(config);

      logger.info('Source added', { id: newId, name });
      res.status(201).json(newSource);
    } catch (error) {
      logger.error('Failed to add source', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to add source',
      });
    }
  });

  // PUT /api/sources/:id - Update source
  router.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updates = req.body;

      const config = await storage.getSources();
      const sourceIndex = config.sources.findIndex(s => s.id === id);

      if (sourceIndex === -1) {
        return res.status(404).json({ error: 'Source not found' });
      }

      config.sources[sourceIndex] = {
        ...config.sources[sourceIndex],
        ...updates,
        id, // Ensure ID doesn't change
      };

      await storage.updateSources(config);

      logger.info('Source updated', { id, updates });
      res.json(config.sources[sourceIndex]);
    } catch (error) {
      logger.error('Failed to update source', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update source',
      });
    }
  });

  // DELETE /api/sources/:id - Delete source
  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      const config = await storage.getSources();
      const sourceIndex = config.sources.findIndex(s => s.id === id);

      if (sourceIndex === -1) {
        return res.status(404).json({ error: 'Source not found' });
      }

      config.sources.splice(sourceIndex, 1);
      await storage.updateSources(config);

      logger.info('Source deleted', { id });
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete source', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete source',
      });
    }
  });

  return router;
}
