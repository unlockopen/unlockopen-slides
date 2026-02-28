#!/usr/bin/env node

/**
 * Setup vendor dependencies for UnlockOpen Slides
 * Copies Reveal.js from node_modules to vendor directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VENDOR_DIR = path.join(ROOT_DIR, 'vendor');
const NODE_MODULES = path.join(ROOT_DIR, 'node_modules');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  Warning: Source not found: ${src}`);
    return false;
  }

  ensureDir(dest);

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
  return true;
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  Warning: File not found: ${src}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

async function main() {
  console.log('\n  Setting up vendor dependencies...\n');

  // Create vendor directories
  ensureDir(VENDOR_DIR);
  ensureDir(path.join(VENDOR_DIR, 'reveal.js'));
  ensureDir(path.join(VENDOR_DIR, 'mermaid'));
  ensureDir(path.join(VENDOR_DIR, 'fontawesome'));

  const revealSrc = path.join(NODE_MODULES, 'reveal.js');

  if (!fs.existsSync(revealSrc)) {
    console.log('  Warning: reveal.js not found in node_modules.');
    console.log('  Run "npm install" first.\n');
    return;
  }

  // Copy Reveal.js dist
  console.log('  Copying Reveal.js dist...');
  copyDirRecursive(
    path.join(revealSrc, 'dist'),
    path.join(VENDOR_DIR, 'reveal.js/dist')
  );

  // Copy required plugins
  const plugins = ['markdown', 'highlight', 'zoom', 'notes', 'math'];
  console.log('  Copying Reveal.js plugins...');

  for (const plugin of plugins) {
    const pluginSrc = path.join(revealSrc, 'plugin', plugin);
    const pluginDest = path.join(VENDOR_DIR, 'reveal.js/plugin', plugin);

    if (fs.existsSync(pluginSrc)) {
      copyDirRecursive(pluginSrc, pluginDest);
      console.log(`    - ${plugin}`);
    }
  }

  // Copy mermaid.js from project root if it exists
  const mermaidSrc = path.join(ROOT_DIR, 'mermaid.js');
  const mermaidDest = path.join(VENDOR_DIR, 'mermaid/mermaid.js');

  if (fs.existsSync(mermaidSrc)) {
    console.log('  Copying mermaid.js...');
    fs.copyFileSync(mermaidSrc, mermaidDest);
  } else {
    console.log('  Note: mermaid.js not found. Diagrams may not work.');
    // Create a placeholder that defines RevealMermaid as a no-op
    const placeholder = `
// Mermaid plugin placeholder
// Replace with actual mermaid.js for diagram support
window.RevealMermaid = {
  id: 'mermaid',
  init: function() { console.log('Mermaid plugin not loaded'); }
};
`;
    ensureDir(path.dirname(mermaidDest));
    fs.writeFileSync(mermaidDest, placeholder);
  }

  // Create FontAwesome placeholder (will use CDN in production)
  const fontawesomePlaceholder = `
// FontAwesome placeholder
// Icons will load from CDN in the HTML template
console.log('FontAwesome: Using CDN');
`;
  ensureDir(path.join(VENDOR_DIR, 'fontawesome'));
  fs.writeFileSync(path.join(VENDOR_DIR, 'fontawesome/all.min.js'), fontawesomePlaceholder);

  console.log('\n  Vendor setup complete!\n');
}

main().catch(console.error);
