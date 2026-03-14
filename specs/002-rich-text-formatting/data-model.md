# Data Model: Rich Text Formatting & Tables

**Branch**: `002-rich-text-formatting` | **Date**: 2026-03-14

## Overview

This feature does not add new database tables. All formatting data is stored within the Yjs CRDT document as ProseMirror marks and node attributes, persisted in the existing `yjs_state` bytea column on the `documents` table.

## ProseMirror Marks (inline formatting)

### TextStyle (extended)

Existing Tiptap mark extended with additional attributes for font and spacing control.

| Attribute | Type | Default | Example | Notes |
|-----------|------|---------|---------|-------|
| fontFamily | string \| null | null (inherit) | "Inter" | From curated font list |
| fontSize | string \| null | null (inherit) | "14pt" | Range: 8pt–72pt |
| color | string \| null | null (inherit) | "#333333" | Hex color value |
| letterSpacing | string \| null | null (inherit) | "0.5px" | CSS letter-spacing value |
| lineHeight | string \| null | null (inherit) | "1.5" | CSS line-height value |

**Rendered as**: `<span style="font-family: Inter; font-size: 14pt; color: #333; letter-spacing: 0.5px; line-height: 1.5">`

### Superscript

| Attribute | Type | Notes |
|-----------|------|-------|
| (none) | boolean mark | Presence of mark = superscript |

**Rendered as**: `<sup>`

### Subscript

| Attribute | Type | Notes |
|-----------|------|-------|
| (none) | boolean mark | Presence of mark = subscript |

**Rendered as**: `<sub>`

### Highlight

| Attribute | Type | Default | Example | Notes |
|-----------|------|---------|---------|-------|
| color | string | "#ffcc00" | "#ff6b6b" | Multicolor mode enabled |

**Rendered as**: `<mark style="background-color: #ffcc00">`

## ProseMirror Node Attributes (block formatting)

### Paragraph (extended)

| Attribute | Type | Default | Example | Notes |
|-----------|------|---------|---------|-------|
| textAlign | string | "left" | "center" | left, center, right, justify |
| marginTop | string \| null | null | "12px" | Paragraph spacing before |
| marginBottom | string \| null | null | "12px" | Paragraph spacing after |
| indent | number | 0 | 2 | Indent level (0-8), rendered as padding-left |

### Heading (extended)

Same additional attributes as Paragraph: `textAlign`, `marginTop`, `marginBottom`, `indent`.

### Table (extended)

| Attribute | Type | Default | Example | Notes |
|-----------|------|---------|---------|-------|
| tableStyle | string | "default" | "academic" | Style preset identifier |

**Available presets**: "default", "academic", "striped", "bordered", "modern"

### TableCell / TableHeader (extended)

| Attribute | Type | Default | Notes |
|-----------|------|---------|-------|
| colspan | number | 1 | Horizontal span (existing) |
| rowspan | number | 1 | Vertical span (existing) |
| backgroundColor | string \| null | null | Cell background color |

## Node Views (React components)

### MathInlineView

Renders inline math (`mathInline` node) as live KaTeX output. On click, switches to editable LaTeX input mode.

**Props from node attributes**:
- `latex: string` — the LaTeX expression

**States**: rendered (shows KaTeX output), editing (shows LaTeX input), error (shows error indicator)

### MathBlockView

Renders block math (`mathBlock` node) as centered KaTeX display equation. On click, switches to editable LaTeX input mode.

**Props from node attributes**:
- `latex: string` — the LaTeX expression

**States**: rendered (shows KaTeX output), editing (shows LaTeX input), error (shows error indicator), empty (shows placeholder)

## Static Assets

### Fonts (`public/fonts/`)

Self-hosted WOFF2 font files. Minimum 8 fonts across 3 categories:

**Serif**: Georgia (system), Merriweather, Playfair Display, Lora
**Sans-serif**: Inter, Open Sans, Roboto
**Monospace**: JetBrains Mono, Fira Code

Each font includes regular (400) and bold (700) weights. Italic variants for serif and sans-serif.

**Font face declarations**: Defined in `app/styles/fonts.css`, imported in `app/app.css`.

## Relationships

```
Document (existing)
└── yjs_state (bytea) — contains all ProseMirror content with:
    ├── TextStyle marks (fontFamily, fontSize, color, letterSpacing, lineHeight)
    ├── Superscript / Subscript marks
    ├── Highlight marks (color)
    ├── Paragraph/Heading attributes (textAlign, marginTop, marginBottom, indent)
    ├── Table attributes (tableStyle)
    ├── TableCell attributes (backgroundColor, colspan, rowspan)
    ├── MathInline nodes (latex) — now with live rendering
    └── MathBlock nodes (latex) — now with live rendering
```

No new database migrations required. All data lives within the Yjs document.
