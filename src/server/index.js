/**
 * Development server with live reload
 * Serves presentations and watches for changes
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Mustache from 'mustache';
import { parseMarkdown } from '../parser/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Create the development server
 */
export function createServer(options = {}) {
  const {
    port = 3000,
    liveReloadPort = 35729,
    watchDir = process.cwd(),
    open: shouldOpen = true,
  } = options;

  const app = express();

  // Track connected WebSocket clients for live reload
  const clients = new Set();

  // Serve static vendor files
  app.use('/vendor', express.static(path.join(ROOT_DIR, 'vendor')));

  // Serve styles
  app.use('/styles', express.static(path.join(ROOT_DIR, 'styles')));

  // Serve local images and assets from watch directory
  app.use('/assets', express.static(path.join(watchDir, 'images')));
  app.use('/images', express.static(path.join(watchDir, 'images')));

  // Read the template
  const templatePath = path.join(ROOT_DIR, 'src/templates/presentation.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Main route - list available presentations
  app.get('/', (req, res) => {
    const files = fs.readdirSync(watchDir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const content = fs.readFileSync(path.join(watchDir, f), 'utf-8');
        const { config } = parseMarkdown(content);
        return {
          file: f,
          title: config.title || f.replace('.md', ''),
          path: `/${f.replace('.md', '')}`,
        };
      });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>UnlockOpen Slides</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          h1 { color: #333; }
          ul { list-style: none; padding: 0; }
          li {
            background: white;
            margin: 10px 0;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          a {
            text-decoration: none;
            color: #0066cc;
            font-weight: 500;
          }
          a:hover { text-decoration: underline; }
          .file { color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <h1>UnlockOpen Slides</h1>
        <p>Available presentations in ${watchDir}</p>
        <ul>
          ${files.map(f => `
            <li>
              <a href="${f.path}">${f.title}</a>
              <span class="file">(${f.file})</span>
            </li>
          `).join('')}
        </ul>
        <script>
          const ws = new WebSocket('ws://localhost:${liveReloadPort}');
          ws.onmessage = (e) => { if (e.data === 'reload') location.reload(); };
        </script>
      </body>
      </html>
    `);
  });

  // Serve individual presentations
  app.get('/:presentation', (req, res) => {
    const presentationName = req.params.presentation;
    const mdPath = path.join(watchDir, `${presentationName}.md`);

    if (!fs.existsSync(mdPath)) {
      return res.status(404).send(`Presentation not found: ${presentationName}.md`);
    }

    try {
      const content = fs.readFileSync(mdPath, 'utf-8');
      const { config, slidesHtml } = parseMarkdown(content);

      // Build template data
      const data = {
        ...config,
        slides: slidesHtml,
        baseUrl: '/',
        enableLiveReload: true,
        liveReloadPort,
        transition: config.transition || 'none',
        backgroundTransition: config.backgroundTransition || 'none',
        controls: config.controls !== false,
        progress: config.progress !== false,
        history: config.history !== false,
        center: config.center !== false,
      };

      const html = Mustache.render(template, data);
      res.send(html);
    } catch (error) {
      console.error('Error rendering presentation:', error);
      res.status(500).send(`Error rendering presentation: ${error.message}`);
    }
  });

  // Start server
  const server = app.listen(port, () => {
    console.log(`\n  UnlockOpen Slides Dev Server`);
    console.log(`  ----------------------------`);
    console.log(`  Local:   http://localhost:${port}`);
    console.log(`  Watching: ${watchDir}`);
    console.log(`\n  Press Ctrl+C to stop\n`);
  });

  // WebSocket server for live reload
  const wss = new WebSocketServer({ port: liveReloadPort });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  // Watch for file changes
  const watcher = chokidar.watch(
    [
      path.join(watchDir, '**/*.md'),
      path.join(ROOT_DIR, 'src/templates/**/*.html'),
      path.join(ROOT_DIR, 'styles/**/*.css'),
    ],
    {
      ignoreInitial: true,
      ignored: /node_modules/,
    }
  );

  watcher.on('all', (event, filePath) => {
    console.log(`  [${event}] ${path.relative(watchDir, filePath)}`);
    // Notify all connected clients to reload
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send('reload');
      }
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n  Shutting down...');
    watcher.close();
    wss.close();
    server.close();
    process.exit(0);
  });

  return { app, server, wss, watcher };
}

export default { createServer };
