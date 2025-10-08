#!/usr/bin/env node

/**
 * Build script for unlockopen-slides
 * Generates CSS from design tokens and copies files to Obsidian plugin directories
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OBSIDIAN_PLUGIN_BASE = '../.obsidian/plugins/obsidian-advanced-slides';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

function copyFile(src, dest) {
  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied ${src} → ${dest}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${src} → ${dest}:`, error.message);
  }
}

function main() {
  console.log('🚀 Building unlockopen-slides...\n');

  // Step 1: Generate CSS from design tokens
  console.log('1️⃣ Generating CSS from design tokens...');
  try {
    execSync('npm run build:tokens', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to generate tokens');
    process.exit(1);
  }

  // Step 2: Copy files to Obsidian plugin directories
  console.log('\n2️⃣ Copying files to Obsidian plugin...');

  const filesToCopy = [
    {
      src: 'reveal.html',
      dest: path.join(OBSIDIAN_PLUGIN_BASE, 'template', 'reveal.html')
    },
    {
      src: 'mermaid.js',
      dest: path.join(OBSIDIAN_PLUGIN_BASE, 'plugin', 'mermaid', 'mermaid.js')
    },
    {
      src: 'tokens-generated.css',
      dest: path.join(OBSIDIAN_PLUGIN_BASE, 'template', 'tokens-generated.css')
    },
    {
      src: 'unlockopen.css',
      dest: path.join(OBSIDIAN_PLUGIN_BASE, 'template', 'unlockopen.css')
    }
  ];

  filesToCopy.forEach(({ src, dest }) => {
    if (fs.existsSync(src)) {
      copyFile(src, dest);
    } else {
      console.warn(`⚠️  Source file not found: ${src}`);
    }
  });

  console.log('\n✨ Build complete!');
}

main();