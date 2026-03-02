import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { createPipeline } from '../index';
import { FileStorage } from '../storage/FileStorage';
import { SupabaseService } from '../services/SupabaseService';
import { config } from '../config/env';
import logger from '../utils/logger';

// Import routes
import { sourcesRouter } from './routes/sources';
import { topicsRouter } from './routes/topics';
import { pipelineRouter } from './routes/pipeline';
import { editionsRouter } from './routes/editions';
import promptsRouter from './routes/prompts';
import { stylePresetsRouter } from './routes/style-presets';
import { generationModelsRouter } from './routes/generation-models';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());

// Initialize storage
const storage = new FileStorage(config.dataDir);

// Initialize Supabase (optional - for subscriber analytics)
let supabase: SupabaseService | undefined;
if (config.supabaseUrl && config.supabaseServiceRoleKey) {
  supabase = new SupabaseService(config.supabaseUrl, config.supabaseServiceRoleKey);
  logger.info('Supabase subscriber analytics enabled for API');
} else {
  logger.warn('Supabase not configured - city statistics disabled');
}

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
app.use('/api/generation-models', generationModelsRouter(storage));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Get subscriber city statistics
 */
app.get('/api/statistics/cities', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase not configured',
        message: 'City statistics require Supabase configuration'
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const cities = await supabase.getTopCities(limit);
    const analytics = await supabase.getAnalytics();

    res.json({
      total_cities: cities.length,
      total_subscribers: analytics.total_subscribers,
      top_cities: cities
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to fetch city statistics', { error: errorMessage });
    res.status(500).json({
      error: 'Failed to fetch city statistics',
      message: errorMessage
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });

  // Pipeline execution via WebSocket
  socket.on('pipeline:execute', async (data: { customTopics?: string[]; stylePresetId?: string; includeCityMarkets?: boolean }) => {
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
        includeCityMarkets: data.includeCityMarkets ?? false,
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
    logger.info(`🚀 Payload Pipeline API server running on http://localhost:${PORT}`);
    logger.info(`📡 WebSocket server ready for connections`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
