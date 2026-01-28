#!/usr/bin/env node

/**
 * UnlockOpen Slides CLI
 * Command-line interface for building and serving presentations
 */

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Mustache from 'mustache';
import { parseMarkdown } from '../parser/index.js';
import { createServer } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const VERSION = '2.0.0';

program
  .name('unlockopen-slides')
  .description('Create beautiful presentations with UnlockOpen styling')
  .version(VERSION);

/**
 * DEV command - Start development server with live reload
 */
program
  .command('dev')
  .description('Start development server with live reload')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-d, --dir <directory>', 'Directory containing markdown files', '.')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    const watchDir = path.resolve(options.dir);

    if (!fs.existsSync(watchDir)) {
      console.error(chalk.red(`Directory not found: ${watchDir}`));
      process.exit(1);
    }

    console.log(chalk.cyan('\n  Starting UnlockOpen Slides...\n'));

    createServer({
      port: parseInt(options.port, 10),
      watchDir,
      open: options.open,
    });

    // Open browser if requested
    if (options.open) {
      const open = (await import('open')).default;
      setTimeout(() => {
        open(`http://localhost:${options.port}`);
      }, 500);
    }
  });

/**
 * BUILD command - Generate static HTML from markdown
 */
program
  .command('build')
  .description('Build static HTML presentations')
  .argument('[input]', 'Input markdown file or directory', '.')
  .option('-o, --output <directory>', 'Output directory', 'dist')
  .option('--self-contained', 'Bundle all assets into single HTML file')
  .action(async (input, options) => {
    const inputPath = path.resolve(input);
    const outputDir = path.resolve(options.output);

    console.log(chalk.cyan('\n  Building presentations...\n'));

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Find markdown files
    let mdFiles = [];
    if (fs.statSync(inputPath).isDirectory()) {
      mdFiles = fs.readdirSync(inputPath)
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(inputPath, f));
    } else {
      mdFiles = [inputPath];
    }

    if (mdFiles.length === 0) {
      console.log(chalk.yellow('  No markdown files found.'));
      process.exit(0);
    }

    // Read template
    const templatePath = path.join(ROOT_DIR, 'src/templates/presentation.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    // Process each file
    for (const mdFile of mdFiles) {
      const filename = path.basename(mdFile, '.md');
      console.log(chalk.gray(`  Processing ${filename}.md...`));

      try {
        const content = fs.readFileSync(mdFile, 'utf-8');
        const { config, slidesHtml } = parseMarkdown(content);

        // Build template data
        const data = {
          ...config,
          slides: slidesHtml,
          baseUrl: './',
          enableLiveReload: false,
          transition: config.transition || 'none',
          backgroundTransition: config.backgroundTransition || 'none',
          controls: config.controls !== false,
          progress: config.progress !== false,
          history: config.history !== false,
          center: config.center !== false,
        };

        const html = Mustache.render(template, data);

        // Write output
        const outputFile = path.join(outputDir, `${filename}.html`);
        fs.writeFileSync(outputFile, html);
        console.log(chalk.green(`  ✓ ${filename}.html`));
      } catch (error) {
        console.error(chalk.red(`  ✗ Error processing ${filename}.md:`), error.message);
      }
    }

    // Copy vendor files
    console.log(chalk.gray('\n  Copying vendor files...'));
    copyDirRecursive(
      path.join(ROOT_DIR, 'vendor'),
      path.join(outputDir, 'vendor')
    );

    // Copy styles
    console.log(chalk.gray('  Copying styles...'));
    copyDirRecursive(
      path.join(ROOT_DIR, 'styles'),
      path.join(outputDir, 'styles')
    );

    console.log(chalk.green(`\n  ✓ Build complete! Output: ${outputDir}\n`));
  });

/**
 * SERVE command - Serve built presentations
 */
program
  .command('serve')
  .description('Serve built presentations (no live reload)')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-d, --dir <directory>', 'Directory to serve', 'dist')
  .action(async (options) => {
    const serveDir = path.resolve(options.dir);

    if (!fs.existsSync(serveDir)) {
      console.error(chalk.red(`Directory not found: ${serveDir}`));
      console.log(chalk.yellow('Run "unlockopen-slides build" first to generate output.'));
      process.exit(1);
    }

    const express = (await import('express')).default;
    const app = express();
    const port = parseInt(options.port, 10);

    app.use(express.static(serveDir));

    app.listen(port, () => {
      console.log(chalk.cyan(`\n  Serving presentations from ${serveDir}`));
      console.log(chalk.cyan(`  http://localhost:${port}\n`));
    });
  });

/**
 * INIT command - Initialize a new presentation project
 */
program
  .command('init')
  .description('Initialize a new presentation project')
  .argument('[directory]', 'Project directory', '.')
  .action((directory) => {
    const projectDir = path.resolve(directory);

    console.log(chalk.cyan(`\n  Initializing project in ${projectDir}...\n`));

    // Create directory if needed
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Create sample presentation
    const sampleMd = `---
title: "My Presentation"
logo: true
metadata:
  copyright:
    owner: "Your Name"
    year: ${new Date().getFullYear()}
author:
  name: "Your Name"
---

<!-- slide class="report-title section-title" -->

# My Presentation

## A Subtitle Goes Here

---

<!-- slide class="simple-slide" -->

# Introduction

This is a simple slide with some content.

- First point
- Second point
- Third point

---

<!-- slide class="report-findings section-title" -->

# (🔍)
# Key Findings

## What we discovered

---

<!-- slide -->

# Details

Here are more details about our findings.

### Subsection

- (check) This worked well
- (X) This didn't work
- (arrow) Next steps

---

<!-- slide class="report-recommendations section-title" -->

# (👉)
# Recommendations

## Our suggestions

---

<!-- slide class="report-lastpage" -->


`;

    const samplePath = path.join(projectDir, 'presentation.md');
    if (!fs.existsSync(samplePath)) {
      fs.writeFileSync(samplePath, sampleMd);
      console.log(chalk.green('  ✓ Created presentation.md'));
    }

    // Create images directory
    const imagesDir = path.join(projectDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
      console.log(chalk.green('  ✓ Created images/ directory'));
    }

    console.log(chalk.cyan(`
  Project initialized!

  Next steps:
    cd ${directory === '.' ? '' : directory}
    unlockopen-slides dev

  This will start the development server with live reload.
`));
  });

/**
 * Helper: Copy directory recursively
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

program.parse();
