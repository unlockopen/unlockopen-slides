/**
 * Markdown-to-Slides Parser
 * Converts markdown files with YAML frontmatter into Reveal.js presentations
 */

import matter from 'gray-matter';
import { marked } from 'marked';

// Configure marked for GFM
marked.use({
  gfm: true,
  breaks: false,
});

/**
 * Default presentation configuration
 */
const DEFAULT_CONFIG = {
  title: 'Presentation',
  theme: 'unlockopen',
  transition: 'none',
  backgroundTransition: 'none',
  logo: true,
  metadata: null,
  author: null,
  controls: true,
  progress: true,
  history: true,
  center: true,
};

/**
 * Parse slide attributes from HTML comment
 * <!-- slide id="foo" class="bar baz" data-background="#fff" -->
 */
function parseSlideAttributes(comment) {
  const attrs = {};

  // Match attribute patterns: key="value" or key='value'
  const attrRegex = /(\w+(?:-\w+)*)=["']([^"']*)["']/g;
  let match;

  while ((match = attrRegex.exec(comment)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

/**
 * Process the slide template placeholders
 * Handles: <% content %>, <%? optional %>, etc.
 */
function processSlideTemplate(template, content) {
  // For now, we'll use a simpler approach - just wrap content in the grid structure
  // The full template processing would be more complex

  return `<div class="slide-grid">
<div class="topright">
<div class="subbrand"></div>
<div class="chapter"></div>
</div>
<div class="content">
<div class="full-width">${content}</div>
<div class="left"></div>
<div class="right"></div>
</div>
<div class="bottom-left"></div>
</div>`;
}

/**
 * Split markdown content into individual slides
 */
function splitSlides(content) {
  const slides = [];

  // Split by horizontal rule (---)
  // But we need to be careful about --- in code blocks
  const parts = content.split(/\n---\n/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check for slide attributes comment at the start
    const slideCommentRegex = /^<!--\s*slide\s+([^>]*)\s*-->\s*\n?/i;
    const commentMatch = trimmed.match(slideCommentRegex);

    let attrs = {};
    let slideContent = trimmed;

    if (commentMatch) {
      attrs = parseSlideAttributes(commentMatch[1]);
      slideContent = trimmed.slice(commentMatch[0].length).trim();
    }

    slides.push({
      attributes: attrs,
      markdown: slideContent,
    });
  }

  return slides;
}

/**
 * Convert a single slide to HTML
 */
function slideToHtml(slide) {
  // Build section attributes
  const attrParts = ['data-markdown'];

  if (slide.attributes.id) {
    attrParts.push(`id="${slide.attributes.id}"`);
  }

  if (slide.attributes.class) {
    attrParts.push(`class="${slide.attributes.class}"`);
  }

  // Handle data-* attributes
  for (const [key, value] of Object.entries(slide.attributes)) {
    if (key.startsWith('data-')) {
      attrParts.push(`${key}="${value}"`);
    }
  }

  // Convert markdown to HTML
  const htmlContent = marked.parse(slide.markdown);

  // Wrap in slide template
  const wrappedContent = processSlideTemplate(null, htmlContent);

  return `<section ${attrParts.join(' ')}>
${wrappedContent}
</section>`;
}

/**
 * Parse a markdown file into a presentation object
 */
export function parseMarkdown(markdownContent) {
  // Extract frontmatter
  const { data: frontmatter, content } = matter(markdownContent);

  // Merge with defaults
  const config = { ...DEFAULT_CONFIG, ...frontmatter };

  // Split into slides
  const slides = splitSlides(content);

  // Convert slides to HTML
  const slidesHtml = slides.map(slideToHtml).join('\n\n');

  return {
    config,
    slides,
    slidesHtml,
    slideCount: slides.length,
  };
}

/**
 * Generate the complete HTML presentation
 */
export function generatePresentation(markdownContent, options = {}) {
  const parsed = parseMarkdown(markdownContent);

  return {
    ...parsed,
    options: {
      ...parsed.config,
      ...options,
    },
  };
}

export default {
  parseMarkdown,
  generatePresentation,
  parseSlideAttributes,
  splitSlides,
};
