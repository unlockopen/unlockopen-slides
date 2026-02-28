# UnlockOpen Slides

Professional presentation tool with UnlockOpen styling, powered by Reveal.js.

**Now available as a standalone CLI tool** - no Obsidian required!

## Quick Start

```bash
# Install dependencies
npm install

# Start development server with live reload
npm run dev

# Or specify a directory containing markdown files
npm run dev -- --dir ./my-presentations
```

## Installation

### Option 1: Clone and use directly

```bash
git clone https://github.com/unlockopen/unlockopen-slides.git
cd unlockopen-slides
npm install
```

### Option 2: Install globally (coming soon)

```bash
npm install -g unlockopen-slides
```

## CLI Commands

### `npm run dev` - Development Server

Start a development server with live reload:

```bash
npm run dev                          # Serve current directory
npm run dev -- --dir ./presentations # Serve specific directory
npm run dev -- --port 8080           # Custom port
npm run dev -- --no-open             # Don't open browser
```

### `npm run build` - Build Static HTML

Generate static HTML presentations:

```bash
npm run build                        # Build all .md files in current dir
npm run build -- ./my-presentation.md # Build specific file
npm run build -- --output ./dist     # Custom output directory
```

### `npm run serve` - Serve Built Files

Serve previously built presentations (no live reload):

```bash
npm run serve                        # Serve ./dist
npm run serve -- --dir ./output      # Serve custom directory
```

### `npm run init` - Initialize New Project

Create a new presentation project:

```bash
npm run init                         # Initialize in current directory
npm run init -- ./my-project         # Initialize in new directory
```

## Creating Presentations

### Basic Structure

Create a markdown file with YAML frontmatter:

```markdown
---
title: "My Presentation"
logo: true
metadata:
  copyright:
    owner: "Your Company"
    year: 2024
author:
  name: "Your Name"
---

<!-- slide class="report-title section-title" -->

# Presentation Title

## Subtitle

---

<!-- slide -->

# Regular Slide

Content goes here.

- Bullet point
- Another point

---

<!-- slide class="report-findings section-title" -->

# (🔍)
# Key Findings

## Section subtitle
```

### Slide Types

| Class | Description |
|-------|-------------|
| `section-title` | Full-screen section header with accent color |
| `simple-slide` | Centered content slide |
| `report-title` | Title slide with bullet shape |
| `report-findings` | Findings section (salmon color) |
| `report-recommendations` | Recommendations (golden color) |
| `report-insights` | Insights (tangerine color) |
| `report-services` | Services (apple/green color) |
| `report-summary` | Summary section |
| `report-lastpage` | Final slide |

### Special Markers

Use markers in list items for special formatting:

```markdown
- (check) Success item      → ✔ Success item
- (X) Failed item           → ✘ Failed item
- (arrow) Next step         → ➜ Next step
- (therefore) Conclusion    → ⇒ Conclusion
- (finger) Important        → 👉 Important
```

### Emoji Titles

Add emojis to slide titles:

```markdown
# (🎯) Goals

<!-- Renders emoji separately above the title -->
```

### Themes

Apply color themes to slides:

- `theme-pink`, `theme-blush`, `theme-salmon`
- `theme-tangerine`, `theme-golden`, `theme-apple`
- `theme-caribbean`, `theme-aqua`, `theme-blue`
- `theme-lavender`

## Project Structure

```
unlockopen-slides/
├── src/
│   ├── cli/          # CLI commands
│   ├── parser/       # Markdown parser
│   ├── server/       # Dev server with live reload
│   └── templates/    # HTML presentation template
├── vendor/           # Reveal.js and plugins
├── styles/           # CSS stylesheets
├── styleguide/       # Example presentations
└── package.json
```

## Legacy Obsidian Plugin Support

The original Obsidian Advanced Slides integration is still available:

```bash
npm run legacy:build
```

This copies files to `.obsidian/plugins/obsidian-advanced-slides/template/`.

## Requirements

- Node.js 18 or later
- npm 8 or later

## License

MIT

## Credits

- [Reveal.js](https://revealjs.com/) - Presentation framework
- [UnlockOpen Design Tokens](https://github.com/unlockopen/unlockopen-design-tokens) - Design system
