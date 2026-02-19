import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { createPipeline } from '../index';
import { FileStorage } from '../storage/FileStorage';
import { config } from '../config/env';
import logger from '../utils/logger';

// Import routes
import { sourcesRouter } from './routes/sources';
import { topicsRouter } from './routes/topics';
import { pipelineRouter } from './routes/pipeline';
import { editionsRouter } from './routes/editions';
import promptsRouter from './routes/prompts';
import { stylePresetsRouter } from './routes/style-presets';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Initialize storage
const storage = new FileStorage(config.dataDir);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
  });
  next();
});

// Static file serving for reference images
app.use('/data/style_presets', express.static('data/style_presets'));

// API Routes
app.use('/api/sources', sourcesRouter(storage));
app.use('/api/topics', topicsRouter(storage));
app.use('/api/pipeline', pipelineRouter(storage, io));
app.use('/api/editions', editionsRouter(storage));
app.use('/api/prompts', promptsRouter);
app.use('/api/style-presets', stylePresetsRouter(storage));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });

  // Pipeline execution via WebSocket
  socket.on('pipeline:execute', async (data: { customTopics?: string[]; stylePresetId?: string }) => {
    try {
      logger.info('Pipeline execution requested via WebSocket', {
        customTopics: data.customTopics,
        stylePresetId: data.stylePresetId,
      });

      const pipeline = await createPipeline();

      // Forward pipeline progress events to the client
      pipeline.on('progress', (event) => {
        socket.emit('pipeline:progress', event);
        logger.info('Pipeline progress', event);
      });

      // Execute pipeline
      const edition = await pipeline.execute({
        customTopics: data.customTopics,
        stylePresetId: data.stylePresetId,
      });

      // Notify completion
      socket.emit('pipeline:complete', {
        editionId: edition.id,
        status: edition.status,
      });

      logger.info('Pipeline execution completed', {
        editionId: edition.id,
        status: edition.status,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Pipeline execution failed', { error: errorMessage });

      socket.emit('pipeline:error', {
        error: errorMessage,
      });
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('API error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
const PORT = 3000;

async function startServer() {
  await storage.initialize();
  logger.info('Storage initialized');

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Space Pulse API server running on http://localhost:${PORT}`);
    logger.info(`📡 WebSocket server ready for connections`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
