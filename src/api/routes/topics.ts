import { Router } from 'express';
import { FileStorage } from '../../storage/FileStorage';
import logger from '../../utils/logger';

export function topicsRouter(storage: FileStorage) {
  const router = Router();

  // GET /api/topics - List all topics
  router.get('/', async (req, res) => {
    try {
      const config = await storage.getTopics();
      res.json(config);
    } catch (error) {
      logger.error('Failed to get topics', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get topics',
      });
    }
  });

  // POST /api/topics - Add new topic
  router.post('/', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
          error: 'Missing or invalid required field: text',
        });
      }

      const newTopic = await storage.addTopic(text.trim());

      logger.info('Topic added', { id: newTopic.id, text: newTopic.text });
      res.status(201).json(newTopic);
    } catch (error) {
      logger.error('Failed to add topic', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to add topic',
      });
    }
  });

  // PUT /api/topics/:id - Update topic
  router.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updates = req.body;

      // Validate text if provided
      if (updates.text !== undefined) {
        if (typeof updates.text !== 'string' || updates.text.trim().length === 0) {
          return res.status(400).json({
            error: 'Invalid text field',
          });
        }
        updates.text = updates.text.trim();
      }

      await storage.updateTopic(id, updates);

      // Get updated topic
      const config = await storage.getTopics();
      const updatedTopic = config.topics.find(t => t.id === id);

      logger.info('Topic updated', { id, updates });
      res.json(updatedTopic);
    } catch (error) {
      logger.error('Failed to update topic', { error });
      const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(status).json({
        error: error instanceof Error ? error.message : 'Failed to update topic',
      });
    }
  });

  // DELETE /api/topics/:id - Delete topic
  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      await storage.deleteTopic(id);

      logger.info('Topic deleted', { id });
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete topic', { error });
      const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(status).json({
        error: error instanceof Error ? error.message : 'Failed to delete topic',
      });
    }
  });

  return router;
}
