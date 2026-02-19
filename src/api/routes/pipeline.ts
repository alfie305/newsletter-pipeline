import { Router } from 'express';
import { Server as SocketIO } from 'socket.io';
import { FileStorage } from '../../storage/FileStorage';
import { createPipeline } from '../../index';
import logger from '../../utils/logger';

export function pipelineRouter(storage: FileStorage, io: SocketIO) {
  const router = Router();

  // POST /api/pipeline/execute - Execute pipeline
  router.post('/execute', async (req, res) => {
    try {
      const { customTopics } = req.body;

      logger.info('Pipeline execution requested via HTTP', { customTopics });

      // Start pipeline execution asynchronously
      const executionPromise = (async () => {
        const pipeline = await createPipeline();

        // Emit progress events to all connected clients
        pipeline.on('progress', (event) => {
          io.emit('pipeline:progress', event);
          logger.info('Pipeline progress', event);
        });

        // Execute pipeline
        const edition = await pipeline.execute({ customTopics });

        // Notify completion
        io.emit('pipeline:complete', {
          editionId: edition.id,
          status: edition.status,
        });

        logger.info('Pipeline execution completed', {
          editionId: edition.id,
          status: edition.status,
        });

        return edition;
      })();

      // Return immediately with execution started response
      res.status(202).json({
        message: 'Pipeline execution started',
        status: 'in_progress',
      });

      // Handle errors in background
      executionPromise.catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Pipeline execution failed', { error: errorMessage });

        io.emit('pipeline:error', {
          error: errorMessage,
        });
      });
    } catch (error) {
      logger.error('Failed to start pipeline', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to start pipeline',
      });
    }
  });

  // GET /api/pipeline/status - Get current pipeline status
  router.get('/status', async (req, res) => {
    try {
      // Get the most recent edition
      const editions = await storage.listEditions(1);

      if (editions.length === 0) {
        return res.json({
          status: 'idle',
          message: 'No pipeline executions found',
        });
      }

      const latestEdition = editions[0];

      res.json({
        editionId: latestEdition.id,
        status: latestEdition.status,
        stages: latestEdition.stages,
        created_at: latestEdition.created_at,
        completed_at: latestEdition.completed_at,
      });
    } catch (error) {
      logger.error('Failed to get pipeline status', { error });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get pipeline status',
      });
    }
  });

  return router;
}
