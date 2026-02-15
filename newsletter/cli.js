#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, readdir, access } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRaindrops, fetchCollections } from './modules/raindrop.js';
import { createDraft, updateDraft, listEmails, sendDraft } from './modules/buttondown.js';
import { renderNewsletter, computeOutputPath } from './modules/renderer.js';
import { downloadAllCovers } from './modules/images.js';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const CONFIGS_DIR = join(__dirname, 'configs');

const program = new Command();

program
  .name('unlock-newsletter')
  .description('Newsletter automation: fetch from Raindrop.io, draft via Buttondown')
  .version('1.0.0');

// ── Helper: load a newsletter config ──────────────────────────────────────────

async function loadConfig(name) {
  const configPath = join(CONFIGS_DIR, `${name}.json`);
  try {
    const raw = await readFile(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Newsletter config not found: ${configPath}\nRun "unlock-newsletter list" to see available configs.`);
    }
    throw new Error(`Invalid config ${configPath}: ${err.message}`);
  }
}

async function listConfigs() {
  try {
    const files = await readdir(CONFIGS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

// ── Command: list ─────────────────────────────────────────────────────────────

program
  .command('list')
  .description('List all configured newsletters')
  .action(async () => {
    const configs = await listConfigs();
    if (configs.length === 0) {
      console.log('No newsletter configs found. Add JSON files to newsletter/configs/');
      return;
    }
    console.log('Available newsletters:\n');
    for (const name of configs) {
      const config = await loadConfig(name);
      const schedule = config.schedule || 'weekly';
      console.log(`  ${name} (${schedule}) - ${config.title}`);
    }
  });

// ── Command: fetch ────────────────────────────────────────────────────────────

program
  .command('fetch')
  .description('Fetch latest links from Raindrop.io and render newsletter markdown')
  .requiredOption('-n, --newsletter <name>', 'Newsletter config name')
  .option('-d, --date <date>', 'Override date (ISO format, e.g. 2026-02-15)', null)
  .option('--no-images', 'Skip downloading cover images')
  .option('--dry-run', 'Fetch and display links without writing files')
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts.newsletter);
      const date = opts.date ? new Date(opts.date) : new Date();

      console.log(`Fetching links for "${config.title}"...`);

      const { items, count } = await fetchRaindrops(config);
      console.log(`Found ${count} total items, fetched ${items.length}`);

      if (items.length === 0) {
        console.log('No items found. Check your collection ID and filters.');
        return;
      }

      if (opts.dryRun) {
        console.log('\n--- Dry run: fetched items ---\n');
        for (const item of items) {
          console.log(`  [${item.tags.join(', ')}] ${item.title}`);
          console.log(`  ${item.link}`);
          if (item.excerpt) console.log(`  ${item.excerpt.slice(0, 100)}...`);
          console.log();
        }
        return;
      }

      const { outputDir, periodLabel, periodSlug } = computeOutputPath(config, date);
      const fullOutputDir = resolvePath(outputDir);
      const imageDir = join(fullOutputDir, 'images');

      // Download cover images
      if (opts.images !== false) {
        console.log('Downloading cover images...');
        await downloadAllCovers(items, imageDir);
        const downloaded = items.filter(i => i.localCover).length;
        console.log(`Downloaded ${downloaded}/${items.length} cover images`);
      }

      // Render markdown
      console.log(`Rendering newsletter for ${periodLabel}...`);
      const outputPath = await renderNewsletter({
        config,
        items,
        periodLabel,
        outputDir: fullOutputDir,
      });

      console.log(`\nNewsletter written to: ${outputPath}`);
      console.log(`Period: ${periodLabel} (${periodSlug})`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ── Command: draft ────────────────────────────────────────────────────────────

program
  .command('draft')
  .description('Create or update a Buttondown draft from the rendered newsletter')
  .requiredOption('-n, --newsletter <name>', 'Newsletter config name')
  .option('-d, --date <date>', 'Override date (ISO format)', null)
  .option('-s, --subject <subject>', 'Override email subject line')
  .option('--update <emailId>', 'Update an existing draft instead of creating a new one')
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts.newsletter);
      const date = opts.date ? new Date(opts.date) : new Date();
      const { outputDir, periodLabel } = computeOutputPath(config, date);
      const markdownPath = resolvePath(join(outputDir, 'newsletter.md'));

      // Verify the markdown file exists
      try {
        await access(markdownPath);
      } catch {
        console.error(`Newsletter markdown not found: ${markdownPath}`);
        console.error('Run "unlock-newsletter fetch" first to generate the markdown.');
        process.exit(1);
      }

      if (opts.update) {
        console.log(`Updating draft ${opts.update}...`);
        const body = await readFile(markdownPath, 'utf-8');
        const updates = { body };
        if (opts.subject) updates.subject = opts.subject;
        const email = await updateDraft(config, opts.update, updates);
        console.log(`Draft updated: ${email.id}`);
      } else {
        console.log(`Creating Buttondown draft for "${config.title}" - ${periodLabel}...`);
        const email = await createDraft(config, {
          markdownPath,
          periodLabel,
          subject: opts.subject,
        });
        console.log(`\nDraft created successfully!`);
        console.log(`  ID:      ${email.id}`);
        console.log(`  Subject: ${email.subject}`);
        console.log(`  Status:  ${email.status}`);
        console.log(`\nReview it at: https://buttondown.com/emails`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ── Command: send ─────────────────────────────────────────────────────────────

program
  .command('send')
  .description('Send a previously created draft (requires confirmation)')
  .requiredOption('-n, --newsletter <name>', 'Newsletter config name')
  .requiredOption('--email-id <id>', 'Buttondown draft email ID to send')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts.newsletter);

      if (!opts.confirm) {
        console.log('WARNING: This will send the draft to all subscribers.');
        console.log('Re-run with --confirm to proceed, or review at https://buttondown.com/emails first.');
        process.exit(0);
      }

      console.log(`Sending draft ${opts.emailId}...`);
      const result = await sendDraft(config, opts.emailId);
      console.log('Draft queued for sending!');
      console.log(`  Status: ${result.status}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ── Command: preview ──────────────────────────────────────────────────────────

program
  .command('preview')
  .description('Show the current newsletter markdown for review')
  .requiredOption('-n, --newsletter <name>', 'Newsletter config name')
  .option('-d, --date <date>', 'Override date (ISO format)', null)
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts.newsletter);
      const date = opts.date ? new Date(opts.date) : new Date();
      const { outputDir, periodLabel } = computeOutputPath(config, date);
      const markdownPath = resolvePath(join(outputDir, 'newsletter.md'));

      const content = await readFile(markdownPath, 'utf-8');
      console.log(`--- ${config.title} | ${periodLabel} ---\n`);
      console.log(content);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ── Command: collections ─────────────────────────────────────────────────────

program
  .command('collections')
  .description('List available Raindrop.io collections (for finding collection IDs)')
  .requiredOption('-n, --newsletter <name>', 'Newsletter config name (for credentials)')
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts.newsletter);
      console.log('Fetching Raindrop.io collections...\n');
      const collections = await fetchCollections(config);

      for (const c of collections) {
        console.log(`  ${c.id} - ${c.title} (${c.count} items)`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ── Command: drafts ──────────────────────────────────────────────────────────

program
  .command('drafts')
  .description('List current Buttondown draft emails')
  .requiredOption('-n, --newsletter <name>', 'Newsletter config name (for credentials)')
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts.newsletter);
      console.log('Fetching Buttondown drafts...\n');
      const emails = await listEmails(config, { status: 'draft' });

      if (emails.length === 0) {
        console.log('No drafts found.');
        return;
      }

      for (const e of emails) {
        console.log(`  ${e.id}`);
        console.log(`  Subject: ${e.subject}`);
        console.log(`  Created: ${e.creation_date}`);
        console.log();
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
