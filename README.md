# unlockopen-slides

UnlockOpen branded slides for [Obsidian Advanced Slides](https://github.com/MSztu662/obsidian-advanced-slides) (built on top of Reveal.js).

## Prerequisites

- [Obsidian](https://obsidian.md/) with the Advanced Slides plugin installed
- [Node.js](https://nodejs.org/)

## Setup

1. Open the root of your Obsidian vault in terminal
2. Clone this repository:
   ```sh
   git clone https://github.com/unlockopen/unlockopen-slides.git
   ```
3. Install dependencies:
   ```sh
   cd unlockopen-slides
   npm install
   ```
4. Build and deploy to the Obsidian plugin directory:
   ```sh
   npm run build
   ```

The build step generates CSS custom properties from [UnlockOpen design tokens](https://github.com/unlockopen/unlockopen-design-tokens) and copies all required files (`reveal.html`, `unlockopen.css`, `tokens-generated.css`, `mermaid.js`) to the Advanced Slides plugin directory.

## Build Commands

| Command | Description |
|---|---|
| `npm run build` | Generate token CSS and copy all files to the plugin directory |
| `npm run build:tokens` | Only regenerate CSS from design tokens |
| `npm run watch:tokens` | Watch for token changes and rebuild automatically |

## Creating Slides

Create a new `.md` file in your vault and add frontmatter to use the UnlockOpen template:

```yaml
---
defaultTemplate: "[[slide-base]]"
theme: [[unlockopen-slides/unlockopen.css]]
backgroundTransition: none
title: "My Presentation"
logo: true
metadata:
  copyright:
    owner: "UnlockOpen, LLC"
    year: 2024
  confidential: true  # optional
author:
  name: "Author Name"
  title: "Title"
  email: "email@unlockopen.com"
---
```

## Styleguide

Reference slides are available in the `styleguide/` directory:

- **[Themes](styleguide/themes.md)** - Color themes (pink, blush, salmon, tangerine, golden, apple, caribbean, aqua, blue, lavender) with light and accent variants
- **[Types](styleguide/types.md)** - Slide types (title, section, standard, split, simple, aside)
- **[Sections](styleguide/sections.md)** - Report sections (title, about, agenda, context, methodology, findings, insights, recommendations, services, summary) and topic colors
- **[Shapes](styleguide/shapes.md)** - Decorative SVG shape overlays (sun, tilted)
- **[Utils](styleguide/utils.md)** - Utility classes (emoji lists, check lists)

## Slide Layout

Slides use a composable template (`templates/slide-base.md`) with named regions:

- `content` / `full-width` - Main content area
- `left` / `right` - Split layout columns
- `chapter` - Chapter label (top right)
- `subbrand` - Sub-brand logo (top right)
- `aside` / `src` / `footnotes` - Bottom-left metadata

## Project Structure

```
unlockopen-slides/
  build.js              # Main build script
  build-tokens.js       # Design token CSS generator
  reveal.html           # Custom Reveal.js HTML template
  unlockopen.css        # Main stylesheet
  mermaid.js            # Mermaid diagram support
  package.json
  images/               # SVG assets
  styleguide/           # Reference slides
  templates/            # Slide templates
    slide-base.md       # Base template with composable layout
```

