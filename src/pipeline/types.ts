// Re-export validation types and schemas for convenience
export {
  DiscoveryStory,
  DiscoveryResult,
  DiscoveryResultSchema,
  CrawledArticle,
  ArticlesResult,
  ArticlesResultSchema,
  EditorialStory,
  QuickHit,
  DeepSpace,
  CitySection,
  EditorialResult,
  EditorialResultSchema,
  NewsletterSegment,
  QuickHitContent,
  CityMarketSegment,
  NewsletterContent,
  NewsletterContentSchema,
  ImageResult,
  ImageResultSchema,
  Source,
  SourcesConfig,
  SourcesConfigSchema,
  Topic,
  TopicsConfig,
  TopicSchema,
  TopicsConfigSchema,
  Edition,
  EditionSchema,
} from '../utils/validation';

// Pipeline-specific types
export interface PipelineOptions {
  scheduled?: boolean;
  fromStage?: string;
  editionId?: string;
  customTopics?: string[];
  stylePresetId?: string;
}

export interface EditionContext {
  id: string;
  date: string;
  dataDir: string;
  results: Record<string, any>;
  customTopics?: string[];
  stylePresetId?: string;
}

export interface StageResult {
  success: boolean;
  data: any;
  error?: string;
  metadata?: {
    duration_ms: number;
    timestamp: string;
    retries?: number;
  };
}

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ProgressEvent {
  stage: string;
  status: StageStatus;
  message: string;
  progress?: number;
  error?: string;
}
