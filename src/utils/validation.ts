import { z } from 'zod';

// Story from discovery stage
export const DiscoveryStorySchema = z.object({
  id: z.string(),
  headline: z.string(),
  summary: z.string(),
  source_url: z.string().url(),
  source_name: z.string(),
  category: z.enum(['market_trends', 'policy', 'commercial', 'residential', 'finance', 'development', 'ai_tech', 'marketing', 'business_growth']),
  importance_score: z.number().min(1).max(10),
  published_date: z.string(),
  tags: z.array(z.string()),
});

export const DiscoveryResultSchema = z.object({
  generated_at: z.string(),
  source_count: z.number(),
  stories: z.array(DiscoveryStorySchema),
});

// Article from crawl stage
export const CrawledArticleSchema = DiscoveryStorySchema.extend({
  full_text: z.string().optional(),
  author: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      // Convert array of authors to comma-separated string
      if (Array.isArray(val)) {
        return val.join(', ');
      }
      return val;
    }),
  key_stats: z.array(z.string()).optional(),
  crawl_status: z.enum(['success', 'failed', 'skipped', 'paywall']),
  crawl_error: z.string().optional(),
});

export const ArticlesResultSchema = z.object({
  generated_at: z.string(),
  articles: z.array(CrawledArticleSchema),
  crawl_summary: z.object({
    attempted: z.number(),
    succeeded: z.number(),
    failed: z.number(),
    failed_urls: z.array(z.string()),
  }),
});

// Editorial stage
export const EditorialStorySchema = z.object({
  id: z.string(),
  section: z.string(),
  section_emoji: z.string(),
  section_label: z.string(),
  position: z.number(),
  headline: z.string(),
  key_facts: z.array(z.string()),
  surprising_angle: z.string(),
  why_it_matters: z.string(),
  source_url: z.string().url(),
  source_name: z.string(),
  image_prompt: z.string(),
  scores: z.object({
    newsworthiness: z.number().min(1).max(10),
    reader_interest: z.number().min(1).max(10),
    industry_impact: z.number().min(1).max(10),
  }),
});

export const QuickHitSchema = z.object({
  id: z.string(),
  one_liner: z.string(),
  source_url: z.string().url(),
  source_name: z.string(),
});

export const DeepSpaceSchema = z.object({
  id: z.string(),
  headline: z.string(),
  summary: z.string(),
  source_url: z.string().url(),
  image_prompt: z.string(),
});

// City-specific market insights (editorial stage)
export const CitySectionSchema = z.object({
  id: z.string(),
  city: z.string(),
  subscriber_count: z.number(),
  percentage: z.number(),
  insights: z.array(z.string()).min(2).max(4), // 2-4 key market insights
  headline: z.string().optional(), // Optional headline for city section
});

export const EditorialResultSchema = z.object({
  generated_at: z.string(),
  edition_date: z.string(),
  main_stories: z.array(EditorialStorySchema),
  quick_hits: z.array(QuickHitSchema),
  deep_space: DeepSpaceSchema.nullish(), // Allow both null and undefined
  city_sections: z.array(CitySectionSchema).min(0).max(5).optional(), // 0-5 city sections
  story_count: z.object({
    main: z.number(),
    quick_hits: z.number(),
    deep_space: z.number(),
    city_markets: z.number().optional(), // count of city sections
    total: z.number(),
  }),
});

// Newsletter writing stage
export const NewsletterSegmentSchema = z.object({
  position: z.number(),
  section_emoji: z.string(),
  section_label: z.string(),
  headline: z.string(),
  body_html: z.string(),
  tldr_html: z.string(),
  read_more_url: z.string().url(),
  read_more_label: z.string(),
  image_placeholder: z.string(),
});

export const QuickHitContentSchema = z.object({
  title_bold: z.string(),
  body: z.string(),
  source_url: z.string().url(),
  source_label: z.string(),
});

// City market segment (writing stage)
export const CityMarketSegmentSchema = z.object({
  position: z.number(),
  city: z.string(),
  subscriber_percentage: z.string(), // e.g., "12% of readers"
  headline: z.string(),
  body_html: z.string(),
  insights_html: z.string(), // Bulleted list of 2-4 insights
  image_placeholder: z.string().optional(), // e.g., "city_new_york"
});

export const NewsletterContentSchema = z.object({
  generated_at: z.string(),
  subject_line: z.string().max(50),
  preview_text: z.string(),
  segments: z.object({
    header: z.object({
      title: z.string(),
      subtitle: z.string(),
    }),
    intro: z.object({
      hook: z.string(),
      rundown_items: z.array(z.string()),
    }),
    stories: z.array(NewsletterSegmentSchema),
    city_markets: z.array(CityMarketSegmentSchema).optional(), // City market segments
    quick_hits: z.array(QuickHitContentSchema),
    deep_space: z.object({
      headline: z.string(),
      body_html: z.string(),
      read_more_url: z.string().url(),
      image_placeholder: z.string(),
    }).nullish(), // Allow both null and undefined
    closing: z.object({
      body: z.string(),
      cta: z.string(),
    }),
  }),
});

// Images stage
export const ImageResultSchema = z.object({
  generated_at: z.string(),
  images: z.array(
    z.object({
      section_id: z.string(),
      file_path: z.string(),
      prompt: z.string(),
      status: z.enum(['success', 'failed', 'placeholder']),
      error: z.string().optional(),
    })
  ),
});

// Source configuration
export const SourceSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  type: z.enum(['Web', 'RSS', 'API']),
  category: z.string(),
  segment: z.string(), // Topic segment (e.g., "Real Estate", "AI News")
  enabled: z.boolean(),
  added_at: z.string(),
  notes: z.string().optional(),
});

export const SourcesConfigSchema = z.object({
  sources: z.array(SourceSchema),
  categories: z.array(z.string()),
  last_updated: z.string(),
});

// Custom discovery topics
export const TopicSchema = z.object({
  id: z.number(),
  text: z.string(),
  added_at: z.string(),
  enabled: z.boolean(),
});

export const TopicsConfigSchema = z.object({
  topics: z.array(TopicSchema),
  last_updated: z.string(),
});

// Style presets for image generation
export const StylePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  reference_images: z.array(z.string()), // File paths
  style_description: z.string(), // Generated by Gemini Vision
  created_at: z.string(),
  last_used: z.string().optional(),
});

export const StylePresetsConfigSchema = z.object({
  presets: z.array(StylePresetSchema),
  active_preset_id: z.string().optional().nullable(),
});

// Generation Models Configuration
export interface GenerationModelOption {
  id: string;
  name: string;
  description: string;
  pricing: {
    text_input: string;
    text_output: string;
    image_output: string;
  };
  tier: 'standard' | 'pro' | 'premium';
}

export const GenerationModelsConfigSchema = z.object({
  active_model: z.string(),
  last_updated: z.string(),
});

export type GenerationModelsConfig = z.infer<typeof GenerationModelsConfigSchema>;

// Available models (hardcoded list)
export const AVAILABLE_GENERATION_MODELS: GenerationModelOption[] = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    description: 'State-of-the-art image generation and editing model',
    pricing: {
      text_input: '$0.30 / 1M tokens',
      text_output: '$2.50 / 1M tokens',
      image_output: '$0.039 per image',
    },
    tier: 'standard',
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    description: 'Pro-level visual intelligence with Flash-speed efficiency',
    pricing: {
      text_input: '$0.50 / 1M tokens',
      text_output: '$3.00 / 1M tokens',
      image_output: '$0.0672 per image',
    },
    tier: 'pro',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    description: 'State-of-the-art image generation and editing model',
    pricing: {
      text_input: '$2.00 / 1M tokens',
      text_output: '$12.00 / 1M tokens',
      image_output: '$0.134 per image',
    },
    tier: 'premium',
  },
];

// Edition metadata
export const EditionSchema = z.object({
  id: z.string(),
  date: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  created_at: z.string(),
  completed_at: z.string().optional(),
  stages: z.record(z.enum(['pending', 'in_progress', 'completed', 'failed'])),
  results: z.record(z.any()),
});

// Type exports
export type DiscoveryStory = z.infer<typeof DiscoveryStorySchema>;
export type DiscoveryResult = z.infer<typeof DiscoveryResultSchema>;
export type CrawledArticle = z.infer<typeof CrawledArticleSchema>;
export type ArticlesResult = z.infer<typeof ArticlesResultSchema>;
export type EditorialStory = z.infer<typeof EditorialStorySchema>;
export type QuickHit = z.infer<typeof QuickHitSchema>;
export type DeepSpace = z.infer<typeof DeepSpaceSchema>;
export type CitySection = z.infer<typeof CitySectionSchema>;
export type EditorialResult = z.infer<typeof EditorialResultSchema>;
export type NewsletterSegment = z.infer<typeof NewsletterSegmentSchema>;
export type QuickHitContent = z.infer<typeof QuickHitContentSchema>;
export type CityMarketSegment = z.infer<typeof CityMarketSegmentSchema>;
export type NewsletterContent = z.infer<typeof NewsletterContentSchema>;
export type ImageResult = z.infer<typeof ImageResultSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type SourcesConfig = z.infer<typeof SourcesConfigSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type TopicsConfig = z.infer<typeof TopicsConfigSchema>;
export type StylePreset = z.infer<typeof StylePresetSchema>;
export type StylePresetsConfig = z.infer<typeof StylePresetsConfigSchema>;
export type Edition = z.infer<typeof EditionSchema>;
