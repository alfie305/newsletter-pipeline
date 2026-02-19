import fs from 'fs/promises';
import path from 'path';
import { Stage } from '../Stage';
import { EditionContext, StageResult } from '../types';
import { PerplexityService } from '../../services/PerplexityService';
import { DiscoveryResultSchema } from '../../utils/validation';
import { FileStorage } from '../../storage/FileStorage';

/**
 * Stage 1: Discovery
 * Uses Perplexity Sonar to find 15-20 trending news stories
 */
export class DiscoveryStage extends Stage {
  readonly name = 'discovery';
  readonly description = 'Discovering trending news stories';

  private perplexity: PerplexityService;
  private storage: FileStorage;

  constructor(apiKey: string, storage: FileStorage) {
    super();
    this.perplexity = new PerplexityService(apiKey);
    this.storage = storage;
  }

  async execute(context: EditionContext): Promise<StageResult> {
    const startTime = Date.now();

    try {
      this.log('info', 'Starting discovery stage', { editionId: context.id });

      // Load prompt template
      const promptTemplate = await this.loadPrompt();

      // Get enabled sources
      const enabledSources = await this.storage.getEnabledSources();
      this.log('info', 'Loaded enabled sources', { count: enabledSources.length });

      // Build search query from prompt template
      let searchQuery = promptTemplate.replace(
        '{{ENABLED_SOURCES}}',
        enabledSources.join(', ')
      );

      // Add custom topics if provided
      if (context.customTopics && context.customTopics.length > 0) {
        const topicsQuery = context.customTopics.join(', ');
        searchQuery += `\n\n**Additional focus topics:** ${topicsQuery}`;
        this.log('info', 'Including custom topics in search', {
          topics: context.customTopics,
        });
      }

      // Execute search
      this.log('info', 'Executing Perplexity search');
      const stories = await this.perplexity.search(searchQuery, {
        enabledSources,
        daysBack: 7,
      });

      // Validate and structure results
      if (!stories || stories.length === 0) {
        throw new Error('No stories found in discovery');
      }

      // Add IDs to stories
      const storiesWithIds = stories.map((story, index) => ({
        id: `story_${String(index + 1).padStart(3, '0')}`,
        ...story,
      }));

      const result = {
        generated_at: new Date().toISOString(),
        source_count: enabledSources.length,
        stories: storiesWithIds,
      };

      // Validate schema
      const validated = DiscoveryResultSchema.parse(result);

      const duration = Date.now() - startTime;
      this.log('info', 'Discovery stage completed', {
        storiesCount: validated.stories.length,
        duration_ms: duration,
      });

      return this.success(validated, { duration_ms: duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', 'Discovery stage failed', {
        error: error.message,
        duration_ms: duration,
      });

      return this.failure(error, { duration_ms: duration });
    }
  }

  protected validate(input: any): boolean {
    try {
      DiscoveryResultSchema.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  private async loadPrompt(): Promise<string> {
    const promptPath = path.join(process.cwd(), 'prompts', 'discovery.md');
    return fs.readFile(promptPath, 'utf-8');
  }

  async rollback(context: EditionContext): Promise<void> {
    this.log('info', 'Rolling back discovery stage', { editionId: context.id });
    // No cleanup needed for discovery stage
  }
}
