export interface Source {
  id: number;
  name: string;
  url: string;
  type: 'RSS' | 'Web' | 'API';
  category: string;
  segment: string; // Topic segment (e.g., "Real Estate", "AI News")
  enabled: boolean;
  added_at: string;
  notes?: string;
}

export interface SourcesConfig {
  sources: Source[];
  categories: string[];
  segments: string[];
  last_updated: string;
}

export interface Topic {
  id: number;
  text: string;
  added_at: string;
  enabled: boolean;
}

export interface TopicsConfig {
  topics: Topic[];
  last_updated: string;
}

export interface Edition {
  id: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  stages: Record<string, 'pending' | 'in_progress' | 'completed' | 'failed'>;
  results: Record<string, any>;
}

export interface ProgressEvent {
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  progress?: number;
  error?: string;
}

export interface Prompt {
  name: string;
  content: string;
}

export interface PromptsData {
  prompts: Record<string, string>;
}

export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  reference_images: string[];
  style_description: string;
  created_at: string;
  last_used?: string;
}
