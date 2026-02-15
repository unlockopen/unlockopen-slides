import nunjucks from 'nunjucks';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

// Configure nunjucks with autoescape off (we're generating markdown, not HTML)
const env = nunjucks.configure(TEMPLATES_DIR, {
  autoescape: false,
  trimBlocks: true,
  lstripBlocks: true,
});

/**
 * Render a newsletter to markdown using a nunjucks template.
 *
 * @param {Object} params
 * @param {Object} params.config - Newsletter configuration
 * @param {Array}  params.items - Normalized raindrop items (with localCover)
 * @param {string} params.periodLabel - Human-readable period label (e.g. "Week 7, 2026")
 * @param {string} params.outputDir - Directory to write newsletter.md into
 * @param {Object} [params.extraContext] - Additional template variables
 * @returns {Promise<string>} Path to the written newsletter.md
 */
export async function renderNewsletter({ config, items, periodLabel, outputDir, extraContext = {} }) {
  const templateName = (config.output?.template || 'default') + '.njk';

  // Group items by tag if the config specifies sections
  const sections = groupBySections(items, config.sections);

  const context = {
    title: config.title,
    name: config.name,
    description: config.description || '',
    period: periodLabel,
    date: new Date().toISOString().split('T')[0],
    items,
    sections,
    config,
    ...extraContext,
  };

  const markdown = env.render(templateName, context);

  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'newsletter.md');
  await writeFile(outputPath, markdown, 'utf-8');

  return outputPath;
}

/**
 * Group items into named sections based on tag matching.
 * If no sections are defined in config, returns a single "Links" section.
 *
 * @param {Array} items - Raindrop items
 * @param {Array} [sectionsDef] - Section definitions from config: [{ name, tags }]
 * @returns {Array<{ name: string, items: Array }>}
 */
function groupBySections(items, sectionsDef) {
  if (!sectionsDef || sectionsDef.length === 0) {
    return [{ name: 'Links', items }];
  }

  const sections = sectionsDef.map(def => ({
    name: def.name,
    items: [],
  }));
  const uncategorized = [];

  for (const item of items) {
    let placed = false;
    for (let i = 0; i < sectionsDef.length; i++) {
      const defTags = sectionsDef[i].tags || [];
      if (defTags.length === 0 || defTags.some(t => item.tags.includes(t))) {
        sections[i].items.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      uncategorized.push(item);
    }
  }

  // Append uncategorized items if any
  if (uncategorized.length > 0) {
    sections.push({ name: 'Other', items: uncategorized });
  }

  return sections.filter(s => s.items.length > 0);
}

/**
 * Compute the output directory path for a newsletter issue.
 *
 * @param {Object} config - Newsletter configuration
 * @param {Date} [date] - Date to compute period for (defaults to now)
 * @returns {{ outputDir: string, periodLabel: string, periodSlug: string }}
 */
export function computeOutputPath(config, date = new Date()) {
  const baseDir = config.output?.baseDir || 'content/newsletter';
  const year = date.getFullYear();

  let periodSlug, periodLabel;

  switch (config.schedule) {
    case 'monthly': {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      periodSlug = `${year}-m${month}`;
      periodLabel = `${monthName} ${year}`;
      break;
    }
    case 'biweekly': {
      const week = getISOWeek(date);
      const biweek = Math.ceil(week / 2);
      periodSlug = `${year}-bw${String(biweek).padStart(2, '0')}`;
      periodLabel = `Bi-week ${biweek}, ${year}`;
      break;
    }
    case 'weekly':
    default: {
      const week = getISOWeek(date);
      periodSlug = `${year}-w${String(week).padStart(2, '0')}`;
      periodLabel = `Week ${week}, ${year}`;
      break;
    }
  }

  const outputDir = join(baseDir, config.name, periodSlug);
  return { outputDir, periodLabel, periodSlug };
}

/**
 * Get ISO week number for a date.
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
