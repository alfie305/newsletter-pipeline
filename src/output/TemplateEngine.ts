import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

/**
 * Template engine for processing HTML templates with variable replacement
 */
export class TemplateEngine {
  private templatesDir: string;
  private templateCache: Map<string, string> = new Map();

  constructor(templatesDir: string = './templates') {
    this.templatesDir = templatesDir;
  }

  /**
   * Load and cache a template file
   */
  async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(this.templatesDir, templateName);
    const content = await fs.readFile(templatePath, 'utf-8');
    this.templateCache.set(templateName, content);

    logger.debug('Template loaded', { templateName });
    return content;
  }

  /**
   * Replace variables in template content
   */
  replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const replacement = value?.toString() || '';
      result = result.replace(new RegExp(placeholder, 'g'), replacement);
    }

    return result;
  }

  /**
   * Process a template with variables
   */
  async process(templateName: string, variables: Record<string, any>): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return this.replaceVariables(template, variables);
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}
