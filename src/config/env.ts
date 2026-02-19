import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

export const config = {
  // API Keys
  perplexityApiKey: process.env.PERPLEXITY_API_KEY || '',
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  beehiivApiKey: process.env.BEEHIIV_API_KEY || '',
  beehiivPubId: process.env.BEEHIIV_PUB_ID || '',

  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: parseInt(process.env.API_PORT || '3000', 10),
  dashboardPort: parseInt(process.env.DASHBOARD_PORT || '5173', 10),

  // Data Directories
  dataDir: process.env.DATA_DIR || './data',
  editionsDir: process.env.EDITIONS_DIR || './data/editions',
  cacheDir: process.env.CACHE_DIR || './data/cache',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

/**
 * Validate that all required API keys are present
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const required = [
    { key: 'PERPLEXITY_API_KEY', value: config.perplexityApiKey },
    { key: 'FIRECRAWL_API_KEY', value: config.firecrawlApiKey },
    { key: 'OPENAI_API_KEY', value: config.openaiApiKey },
    { key: 'ANTHROPIC_API_KEY', value: config.anthropicApiKey },
    { key: 'GEMINI_API_KEY', value: config.geminiApiKey },
  ];

  const missing = required.filter((r) => !r.value).map((r) => r.key);

  return {
    valid: missing.length === 0,
    missing,
  };
}
