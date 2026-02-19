import fs from 'fs/promises';
import path from 'path';
import { StorageManager } from './StorageManager';
import {
  Edition,
  SourcesConfig,
  Topic,
  TopicsConfig,
  EditionSchema,
  SourcesConfigSchema,
  TopicSchema,
  TopicsConfigSchema,
} from '../pipeline/types';
import { StylePreset, StylePresetsConfig, StylePresetsConfigSchema } from '../utils/validation';
import logger from '../utils/logger';

/**
 * File-based storage implementation using JSON files
 */
export class FileStorage extends StorageManager {
  private dataDir: string;
  private editionsDir: string;
  private sourcesFile: string;
  private topicsFile: string;
  private stylePresetsFile: string;
  private stylePresetsDir: string;

  constructor(dataDir: string = './data') {
    super();
    this.dataDir = dataDir;
    this.editionsDir = path.join(dataDir, 'editions');
    this.sourcesFile = path.join(dataDir, 'sources.json');
    this.topicsFile = path.join(dataDir, 'topics.json');
    this.stylePresetsFile = path.join(dataDir, 'style_presets.json');
    this.stylePresetsDir = path.join(dataDir, 'style_presets');
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.editionsDir, { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'cache'), { recursive: true });
    await fs.mkdir(this.stylePresetsDir, { recursive: true });

    // Initialize sources file if it doesn't exist
    try {
      await fs.access(this.sourcesFile);
    } catch {
      await this.initializeDefaultSources();
    }

    // Initialize topics file if it doesn't exist
    try {
      await fs.access(this.topicsFile);
    } catch {
      await this.initializeDefaultTopics();
    }

    // Initialize style presets file if it doesn't exist
    try {
      await fs.access(this.stylePresetsFile);
    } catch {
      await this.initializeDefaultStylePresets();
    }

    logger.info('File storage initialized', { dataDir: this.dataDir });
  }

  private async initializeDefaultSources(): Promise<void> {
    const defaultSources: SourcesConfig = {
      sources: [
        {
          id: 1,
          name: 'SpaceNews',
          url: 'spacenews.com',
          type: 'RSS',
          category: 'Industry',
          enabled: true,
          added_at: new Date().toISOString(),
          notes: 'Primary industry source',
        },
        {
          id: 2,
          name: 'NASA Blog',
          url: 'blogs.nasa.gov',
          type: 'Web',
          category: 'Missions',
          enabled: true,
          added_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: 'SpaceX Updates',
          url: 'spacex.com/updates',
          type: 'Web',
          category: 'Launches',
          enabled: true,
          added_at: new Date().toISOString(),
        },
        {
          id: 4,
          name: 'Ars Technica Space',
          url: 'arstechnica.com/space',
          type: 'RSS',
          category: 'Science',
          enabled: true,
          added_at: new Date().toISOString(),
        },
        {
          id: 5,
          name: 'ESA News',
          url: 'esa.int/newsroom',
          type: 'Web',
          category: 'Missions',
          enabled: true,
          added_at: new Date().toISOString(),
        },
        {
          id: 6,
          name: 'Space.com',
          url: 'space.com',
          type: 'RSS',
          category: 'Science',
          enabled: true,
          added_at: new Date().toISOString(),
        },
        {
          id: 7,
          name: 'Reuters Space',
          url: 'reuters.com/technology/space',
          type: 'Web',
          category: 'Business',
          enabled: true,
          added_at: new Date().toISOString(),
        },
        {
          id: 8,
          name: 'NASASpaceflight',
          url: 'nasaspaceflight.com',
          type: 'RSS',
          category: 'Launches',
          enabled: true,
          added_at: new Date().toISOString(),
        },
      ],
      categories: ['Industry', 'Missions', 'Launches', 'Science', 'Business', 'Policy'],
      last_updated: new Date().toISOString(),
    };

    await this.writeJSON(this.sourcesFile, defaultSources);
    logger.info('Initialized default sources configuration');
  }

  private async initializeDefaultTopics(): Promise<void> {
    const defaultTopics: TopicsConfig = {
      topics: [],
      last_updated: new Date().toISOString(),
    };

    await this.writeJSON(this.topicsFile, defaultTopics);
    logger.info('Initialized default topics configuration');
  }

  private async initializeDefaultStylePresets(): Promise<void> {
    const defaultStylePresets: StylePresetsConfig = {
      presets: [],
      active_preset_id: null,
    };

    await this.writeJSON(this.stylePresetsFile, defaultStylePresets);
    logger.info('Initialized default style presets configuration');
  }

  async createEdition(date: string): Promise<Edition> {
    const id = date; // Use date as ID (YYYY-MM-DD format)
    const editionDir = path.join(this.editionsDir, id);
    await fs.mkdir(editionDir, { recursive: true });
    await fs.mkdir(path.join(editionDir, 'images'), { recursive: true });

    const edition: Edition = {
      id,
      date,
      status: 'pending',
      created_at: new Date().toISOString(),
      stages: {},
      results: {},
    };

    await this.writeJSON(path.join(editionDir, 'metadata.json'), edition);
    logger.info('Created new edition', { id, date });

    return edition;
  }

  async saveStageResult(editionId: string, stage: string, data: any): Promise<void> {
    const editionDir = path.join(this.editionsDir, editionId);
    const stageFile = path.join(editionDir, `${stage}.json`);

    await this.writeJSON(stageFile, data);

    // Update edition metadata
    const edition = await this.getEdition(editionId);
    if (edition) {
      edition.results[stage] = data;
      await this.writeJSON(path.join(editionDir, 'metadata.json'), edition);
    }

    logger.info('Saved stage result', { editionId, stage });
  }

  async getEdition(editionId: string): Promise<Edition | null> {
    try {
      const editionDir = path.join(this.editionsDir, editionId);
      const metadataFile = path.join(editionDir, 'metadata.json');
      const data = await this.readJSON(metadataFile);
      const edition = EditionSchema.parse(data);

      // Load all stage results if they exist
      const stageNames = ['discovery', 'crawl', 'editorial', 'writing', 'images', 'assembly'];
      for (const stageName of stageNames) {
        const stageFile = path.join(editionDir, `${stageName}.json`);
        try {
          const stageData = await this.readJSON(stageFile);
          edition.results[stageName] = stageData;
        } catch (error) {
          // Stage result doesn't exist yet, skip
        }
      }

      return edition;
    } catch (error) {
      logger.error('Failed to get edition', { editionId, error });
      return null;
    }
  }

  async listEditions(limit?: number): Promise<Edition[]> {
    try {
      const entries = await fs.readdir(this.editionsDir);
      const editions: Edition[] = [];

      for (const entry of entries) {
        const edition = await this.getEdition(entry);
        if (edition) {
          editions.push(edition);
        }
      }

      // Sort by date descending
      editions.sort((a, b) => b.date.localeCompare(a.date));

      return limit ? editions.slice(0, limit) : editions;
    } catch (error) {
      logger.error('Failed to list editions', { error });
      return [];
    }
  }

  async updateEditionStatus(
    editionId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
  ): Promise<void> {
    const edition = await this.getEdition(editionId);
    if (!edition) {
      throw new Error(`Edition ${editionId} not found`);
    }

    edition.status = status;
    if (status === 'completed') {
      edition.completed_at = new Date().toISOString();
    }

    const editionDir = path.join(this.editionsDir, editionId);
    await this.writeJSON(path.join(editionDir, 'metadata.json'), edition);

    logger.info('Updated edition status', { editionId, status });
  }

  async updateStageStatus(
    editionId: string,
    stage: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
  ): Promise<void> {
    const edition = await this.getEdition(editionId);
    if (!edition) {
      throw new Error(`Edition ${editionId} not found`);
    }

    edition.stages[stage] = status;

    const editionDir = path.join(this.editionsDir, editionId);
    await this.writeJSON(path.join(editionDir, 'metadata.json'), edition);

    logger.info('Updated stage status', { editionId, stage, status });
  }

  async getSources(): Promise<SourcesConfig> {
    try {
      const data = await this.readJSON(this.sourcesFile);
      return SourcesConfigSchema.parse(data);
    } catch (error) {
      logger.error('Failed to get sources', { error });
      throw error;
    }
  }

  async updateSources(sources: SourcesConfig): Promise<void> {
    sources.last_updated = new Date().toISOString();
    await this.writeJSON(this.sourcesFile, sources);
    logger.info('Updated sources configuration');
  }

  // Topics management
  async getTopics(): Promise<TopicsConfig> {
    try {
      const data = await this.readJSON(this.topicsFile);
      return TopicsConfigSchema.parse(data);
    } catch (error) {
      logger.error('Failed to get topics', { error });
      throw error;
    }
  }

  async addTopic(text: string): Promise<Topic> {
    const config = await this.getTopics();
    const newId = config.topics.length > 0
      ? Math.max(...config.topics.map(t => t.id)) + 1
      : 1;

    const newTopic: Topic = {
      id: newId,
      text,
      added_at: new Date().toISOString(),
      enabled: true,
    };

    config.topics.push(newTopic);
    config.last_updated = new Date().toISOString();
    await this.writeJSON(this.topicsFile, config);
    logger.info('Added new topic', { id: newId, text });

    return newTopic;
  }

  async updateTopic(id: number, updates: Partial<Omit<Topic, 'id' | 'added_at'>>): Promise<void> {
    const config = await this.getTopics();
    const topicIndex = config.topics.findIndex(t => t.id === id);

    if (topicIndex === -1) {
      throw new Error(`Topic ${id} not found`);
    }

    config.topics[topicIndex] = {
      ...config.topics[topicIndex],
      ...updates,
    };

    config.last_updated = new Date().toISOString();
    await this.writeJSON(this.topicsFile, config);
    logger.info('Updated topic', { id, updates });
  }

  async deleteTopic(id: number): Promise<void> {
    const config = await this.getTopics();
    const topicIndex = config.topics.findIndex(t => t.id === id);

    if (topicIndex === -1) {
      throw new Error(`Topic ${id} not found`);
    }

    config.topics.splice(topicIndex, 1);
    config.last_updated = new Date().toISOString();
    await this.writeJSON(this.topicsFile, config);
    logger.info('Deleted topic', { id });
  }

  // Style Presets management
  async getStylePresets(): Promise<StylePreset[]> {
    try {
      const data = await this.readJSON(this.stylePresetsFile);
      const config = StylePresetsConfigSchema.parse(data);
      return config.presets;
    } catch (error) {
      logger.error('Failed to get style presets', { error });
      throw error;
    }
  }

  async getActiveStylePreset(): Promise<StylePreset | null> {
    try {
      const data = await this.readJSON(this.stylePresetsFile);
      const config = StylePresetsConfigSchema.parse(data);
      if (!config.active_preset_id) {
        return null;
      }
      return config.presets.find(p => p.id === config.active_preset_id) || null;
    } catch (error) {
      logger.error('Failed to get active style preset', { error });
      throw error;
    }
  }

  async setActiveStylePreset(presetId: string): Promise<void> {
    const data = await this.readJSON(this.stylePresetsFile);
    const config = StylePresetsConfigSchema.parse(data);

    // Verify preset exists
    const presetExists = config.presets.some(p => p.id === presetId);
    if (!presetExists) {
      throw new Error(`Style preset ${presetId} not found`);
    }

    config.active_preset_id = presetId;

    // Update last_used timestamp
    const presetIndex = config.presets.findIndex(p => p.id === presetId);
    if (presetIndex !== -1) {
      config.presets[presetIndex].last_used = new Date().toISOString();
    }

    await this.writeJSON(this.stylePresetsFile, config);
    logger.info('Set active style preset', { presetId });
  }

  async createStylePreset(name: string, description?: string): Promise<StylePreset> {
    const data = await this.readJSON(this.stylePresetsFile);
    const config = StylePresetsConfigSchema.parse(data);

    // Generate unique ID
    const newId = `preset_${Date.now()}`;

    const newPreset: StylePreset = {
      id: newId,
      name,
      description: description || '',
      reference_images: [],
      style_description: '',
      created_at: new Date().toISOString(),
    };

    config.presets.push(newPreset);
    await this.writeJSON(this.stylePresetsFile, config);

    // Create preset directory
    const presetDir = path.join(this.stylePresetsDir, newId);
    await fs.mkdir(presetDir, { recursive: true });

    logger.info('Created style preset', { id: newId, name });
    return newPreset;
  }

  async updateStylePreset(id: string, updates: Partial<StylePreset>): Promise<void> {
    const data = await this.readJSON(this.stylePresetsFile);
    const config = StylePresetsConfigSchema.parse(data);

    const presetIndex = config.presets.findIndex(p => p.id === id);
    if (presetIndex === -1) {
      throw new Error(`Style preset ${id} not found`);
    }

    config.presets[presetIndex] = {
      ...config.presets[presetIndex],
      ...updates,
    };

    await this.writeJSON(this.stylePresetsFile, config);
    logger.info('Updated style preset', { id, updates });
  }

  async deleteStylePreset(id: string): Promise<void> {
    const data = await this.readJSON(this.stylePresetsFile);
    const config = StylePresetsConfigSchema.parse(data);

    const presetIndex = config.presets.findIndex(p => p.id === id);
    if (presetIndex === -1) {
      throw new Error(`Style preset ${id} not found`);
    }

    config.presets.splice(presetIndex, 1);

    // If this was the active preset, clear it
    if (config.active_preset_id === id) {
      config.active_preset_id = null;
    }

    await this.writeJSON(this.stylePresetsFile, config);

    // Delete preset directory
    const presetDir = path.join(this.stylePresetsDir, id);
    try {
      await fs.rm(presetDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to delete preset directory', { id, error });
    }

    logger.info('Deleted style preset', { id });
  }

  async addReferenceImage(presetId: string, imagePath: string): Promise<void> {
    const data = await this.readJSON(this.stylePresetsFile);
    const config = StylePresetsConfigSchema.parse(data);

    const presetIndex = config.presets.findIndex(p => p.id === presetId);
    if (presetIndex === -1) {
      throw new Error(`Style preset ${presetId} not found`);
    }

    const preset = config.presets[presetIndex];
    if (preset.reference_images.length >= 3) {
      throw new Error('Maximum 3 reference images allowed per preset');
    }

    preset.reference_images.push(imagePath);
    await this.writeJSON(this.stylePresetsFile, config);
    logger.info('Added reference image to preset', { presetId, imagePath });
  }

  async removeReferenceImage(presetId: string, imagePath: string): Promise<void> {
    const data = await this.readJSON(this.stylePresetsFile);
    const config = StylePresetsConfigSchema.parse(data);

    const presetIndex = config.presets.findIndex(p => p.id === presetId);
    if (presetIndex === -1) {
      throw new Error(`Style preset ${presetId} not found`);
    }

    const preset = config.presets[presetIndex];
    const imageIndex = preset.reference_images.indexOf(imagePath);
    if (imageIndex === -1) {
      throw new Error('Reference image not found in preset');
    }

    preset.reference_images.splice(imageIndex, 1);
    await this.writeJSON(this.stylePresetsFile, config);
    logger.info('Removed reference image from preset', { presetId, imagePath });
  }

  // Helper methods
  private async readJSON(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private async writeJSON(filePath: string, data: any): Promise<void> {
    // Atomic write: write to temp file, then rename
    const tempFile = `${filePath}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempFile, filePath);
  }
}
