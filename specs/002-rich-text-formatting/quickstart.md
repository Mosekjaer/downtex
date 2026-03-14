# Quickstart: Rich Text Formatting & Tables

**Branch**: `002-rich-text-formatting` | **Date**: 2026-03-14

## Prerequisites

- Node.js 18+
- Local Supabase running (`make supabase-start`)
- Dependencies installed (`make install`)

## New Dependencies to Install

```bash
npm install @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-text-align @tiptap/extension-superscript @tiptap/extension-subscript @tiptap/extension-highlight
```

Note: `katex` is already installed (v0.16.38). The existing `@tiptap/extension-underline` and table extensions remain unchanged.

## Key Files to Modify

### Extensions (modify/create)

| File | Action | Purpose |
|------|--------|---------|
| `app/components/editor/Editor.tsx` | Modify | Add new extensions to the extensions array |
| `app/components/editor/extensions/math-inline.ts` | Modify | Add React NodeView for live KaTeX rendering |
| `app/components/editor/extensions/math-block.ts` | Modify | Add React NodeView for live KaTeX rendering |
| `app/components/editor/extensions/paragraph-spacing.ts` | Create | Custom extension for marginTop/marginBottom on paragraphs |
| `app/components/editor/extensions/indent.ts` | Create | Custom extension for paragraph indentation |
| `app/components/editor/extensions/letter-spacing.ts` | Create | Custom mark attribute for letter-spacing |
| `app/components/editor/extensions/table-style.ts` | Create | Custom extension for table style presets |
| `app/components/editor/extensions/table-cell-bg.ts` | Create | Custom extension for cell background color |

### Toolbar (modify/create)

| File | Action | Purpose |
|------|--------|---------|
| `app/components/editor/toolbar/Toolbar.tsx` | Modify | Restructure into collapsible groups |
| `app/components/editor/toolbar/ToolbarGroup.tsx` | Modify | Add collapsible behavior |
| `app/components/editor/toolbar/FontFamilyPicker.tsx` | Create | Font family dropdown |
| `app/components/editor/toolbar/FontSizePicker.tsx` | Create | Font size dropdown/input |
| `app/components/editor/toolbar/ColorPicker.tsx` | Create | Reusable color picker (text color + highlight) |
| `app/components/editor/toolbar/AlignmentControls.tsx` | Create | Text alignment buttons |
| `app/components/editor/toolbar/SpacingControls.tsx` | Create | Line/paragraph spacing controls |
| `app/components/editor/toolbar/TableStylePicker.tsx` | Create | Table style preset selector |
| `app/components/editor/toolbar/MathSymbolPalette.tsx` | Create | Math symbol insertion palette |

### NodeViews (create)

| File | Action | Purpose |
|------|--------|---------|
| `app/components/editor/node-views/MathInlineView.tsx` | Create | Live KaTeX rendering for inline math |
| `app/components/editor/node-views/MathBlockView.tsx` | Create | Live KaTeX rendering for block math |

### Styling (modify/create)

| File | Action | Purpose |
|------|--------|---------|
| `app/app.css` | Modify | Add table preset styles, math rendering styles |
| `app/styles/fonts.css` | Create | @font-face declarations for self-hosted fonts |
| `public/fonts/` | Create | WOFF2 font files |

### PDF Export (modify)

| File | Action | Purpose |
|------|--------|---------|
| `app/lib/pdf-template.server.ts` | Modify | Handle new marks/attributes in HTML generation |

## Development Flow

```bash
# 1. Install new deps
npm install @tiptap/extension-text-style @tiptap/extension-color \
  @tiptap/extension-text-align @tiptap/extension-superscript \
  @tiptap/extension-subscript @tiptap/extension-highlight

# 2. Start dev server
make dev

# 3. Run type checks as you go
make check

# 4. Run tests
npm test
```

## Implementation Order (recommended)

1. **Text formatting extensions** — TextStyle + FontFamily + FontSize + Color + Superscript + Subscript + Highlight
2. **Paragraph extensions** — TextAlign + ParagraphSpacing + Indent + LetterSpacing
3. **Toolbar restructure** — Collapsible groups with new controls
4. **Table enhancements** — Style presets + merge/split + cell background
5. **Math NodeViews** — Live KaTeX rendering + click-to-edit
6. **Math symbol palette** — Toolbar component
7. **PDF export updates** — Handle all new marks/attributes
8. **Font hosting** — Download fonts, create @font-face CSS, wire up
