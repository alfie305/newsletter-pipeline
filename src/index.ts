import { Pipeline } from './pipeline/Pipeline';
import { FileStorage } from './storage/FileStorage';
import { SupabaseService } from './services/SupabaseService';
import { DiscoveryStage } from './pipeline/stages/01-discovery';
import { CrawlStage } from './pipeline/stages/02-crawl';
import { EditorialStage } from './pipeline/stages/03-editorial';
import { WritingStage } from './pipeline/stages/04-writing';
import { ImagesStage } from './pipeline/stages/05-images';
import { AssemblyStage } from './pipeline/stages/06-assembly';
import { config, validateConfig } from './config/env';
import logger from './utils/logger';

/**
 * Initialize and return a configured pipeline instance
 */
export async function createPipeline(): Promise<Pipeline> {
  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    throw new Error(
      `Missing required environment variables: ${validation.missing.join(', ')}`
    );
  }

  // Initialize storage
  const storage = new FileStorage(config.dataDir);
  await storage.initialize();

  // Initialize Supabase (optional - for subscriber analytics)
  let supabase: SupabaseService | undefined;
  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    supabase = new SupabaseService(config.supabaseUrl, config.supabaseServiceRoleKey);
    logger.info('Supabase subscriber analytics enabled');
  } else {
    logger.warn('Supabase not configured - subscriber personalization disabled');
  }

  // Create pipeline
  const pipeline = new Pipeline(storage);

  // Register stages
  pipeline.registerStage(new DiscoveryStage(config.perplexityApiKey, storage));
  pipeline.registerStage(new CrawlStage(config.firecrawlApiKey));
  pipeline.registerStage(new EditorialStage(config.anthropicApiKey, supabase)); // Pass Supabase for personalization
  pipeline.registerStage(new WritingStage(config.anthropicApiKey));
  pipeline.registerStage(new ImagesStage(config.geminiApiKey, storage));
  pipeline.registerStage(new AssemblyStage());

  logger.info('Pipeline initialized successfully with 6 stages');

  return pipeline;
}

/**
 * Execute the pipeline (for direct programmatic use)
 */
export async function executePipeline() {
  try {
    logger.info('Starting Payload Pipeline execution');

    const pipeline = await createPipeline();

    // Listen to progress events
    pipeline.on('progress', (event) => {
      logger.info('Pipeline progress', event);
    });

    // Execute
    const edition = await pipeline.execute();

    logger.info('Pipeline execution completed successfully', {
      editionId: edition.id,
      status: edition.status,
    });

    return edition;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Pipeline execution failed', { error: errorMessage });
    throw error;
  }
}

// If run directly
if (require.main === module) {
  executePipeline()
    .then(() => {
      logger.info('Process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Process failed', { error: errorMessage });
      process.exit(1);
    });
}
