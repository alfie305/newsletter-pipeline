#!/usr/bin/env node

import { Command } from 'commander';
import { createPipeline } from './index';
import { FileStorage } from './storage/FileStorage';
import { config } from './config/env';
import logger from './utils/logger';

const program = new Command();

program
  .name('payloadpipeline')
  .description('Payload Pipeline newsletter generation')
  .version('1.0.0');

// Execute full pipeline
program
  .command('execute')
  .description('Execute the full pipeline')
  .option('--edition <id>', 'Resume specific edition')
  .action(async (options) => {
    try {
      logger.info('Executing pipeline', { edition: options.edition });

      const pipeline = await createPipeline();

      // Listen to progress
      pipeline.on('progress', (event) => {
        console.log(`[${event.stage}] ${event.status}: ${event.message}`);
      });

      const edition = await pipeline.execute({
        editionId: options.edition,
      });

      console.log('\n✅ Pipeline completed successfully!');
      console.log(`📰 Edition: ${edition.id}`);
      console.log(`📊 Status: ${edition.status}`);
      console.log(`📁 Output: data/editions/${edition.id}/output.html`);
    } catch (error) {
      console.error('\n❌ Pipeline failed:', error.message);
      process.exit(1);
    }
  });

// Execute single stage
program
  .command('stage <stageName>')
  .description('Execute a single stage')
  .requiredOption('--edition <id>', 'Edition ID')
  .action(async (stageName, options) => {
    try {
      logger.info('Executing single stage', {
        stage: stageName,
        edition: options.edition,
      });

      const pipeline = await createPipeline();

      const edition = await pipeline.execute({
        editionId: options.edition,
        fromStage: stageName,
      });

      console.log('\n✅ Stage completed successfully!');
      console.log(`📰 Edition: ${edition.id}`);
    } catch (error) {
      console.error('\n❌ Stage failed:', error.message);
      process.exit(1);
    }
  });

// Execute from specific stage
program
  .command('from <stageName>')
  .description('Execute pipeline from a specific stage')
  .option('--edition <id>', 'Edition ID (if resuming)')
  .action(async (stageName, options) => {
    try {
      logger.info('Executing from stage', {
        stage: stageName,
        edition: options.edition,
      });

      const pipeline = await createPipeline();

      // Listen to progress
      pipeline.on('progress', (event) => {
        console.log(`[${event.stage}] ${event.status}: ${event.message}`);
      });

      const edition = await pipeline.execute({
        editionId: options.edition,
        fromStage: stageName,
      });

      console.log('\n✅ Pipeline completed successfully!');
      console.log(`📰 Edition: ${edition.id}`);
    } catch (error) {
      console.error('\n❌ Pipeline failed:', error.message);
      process.exit(1);
    }
  });

// List editions
program
  .command('list')
  .description('List all editions')
  .option('--limit <number>', 'Limit number of results', '10')
  .action(async (options) => {
    try {
      const storage = new FileStorage(config.dataDir);
      await storage.initialize();

      const editions = await storage.listEditions(parseInt(options.limit, 10));

      console.log(`\n📚 Editions (${editions.length}):\n`);
      editions.forEach((edition) => {
        console.log(`  ${edition.id} - ${edition.status}`);
        console.log(`    Created: ${edition.created_at}`);
        if (edition.completed_at) {
          console.log(`    Completed: ${edition.completed_at}`);
        }
        console.log();
      });
    } catch (error) {
      console.error('❌ Failed to list editions:', error.message);
      process.exit(1);
    }
  });

// Show edition details
program
  .command('show <editionId>')
  .description('Show details of an edition')
  .action(async (editionId) => {
    try {
      const storage = new FileStorage(config.dataDir);
      await storage.initialize();

      const edition = await storage.getEdition(editionId);

      if (!edition) {
        console.error(`❌ Edition ${editionId} not found`);
        process.exit(1);
      }

      console.log(`\n📰 Edition: ${edition.id}`);
      console.log(`Status: ${edition.status}`);
      console.log(`Date: ${edition.date}`);
      console.log(`Created: ${edition.created_at}`);
      if (edition.completed_at) {
        console.log(`Completed: ${edition.completed_at}`);
      }

      console.log('\nStages:');
      Object.entries(edition.stages).forEach(([stage, status]) => {
        const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';
        console.log(`  ${icon} ${stage}: ${status}`);
      });

      console.log('\nResults:');
      Object.entries(edition.results).forEach(([stage, data]) => {
        if (data) {
          console.log(`  ✓ ${stage}: Available`);
        }
      });
    } catch (error) {
      console.error('❌ Failed to show edition:', error.message);
      process.exit(1);
    }
  });

program.parse();
