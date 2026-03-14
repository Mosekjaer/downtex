# Implementation Plan: Rich Text Formatting & Tables

**Branch**: `002-rich-text-formatting` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-rich-text-formatting/spec.md`

## Summary

Add comprehensive rich text formatting controls (font family, font size, text color, alignment, line/paragraph spacing, indentation, letter spacing, superscript/subscript, highlight), enhanced table features (style presets, merge/split, cell backgrounds), and live LaTeX math rendering with a symbol palette to the Downtex editor. Uses official Tiptap extensions where available and custom extensions for paragraph-level formatting. Toolbar reorganized into collapsible groups. Self-hosted fonts for GDPR compliance.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18+
**Primary Dependencies**: Tiptap 3.20.1 (+ TextStyle, Color, TextAlign, Superscript, Subscript, Highlight extensions), KaTeX 0.16.38, Yjs
**Storage**: Supabase PostgreSQL — no new tables; formatting stored in existing `yjs_state` bytea column via ProseMirror marks/attributes
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (SSR via React Router 7)
**Project Type**: Web application (collaborative document editor)
**Performance Goals**: KaTeX rendering <500ms per expression, toolbar interactions <100ms, 60fps during editing
**Constraints**: Self-hosted fonts (GDPR), CRDT-compatible marks/attributes, existing document backward compatibility
**Scale/Scope**: Multi-user collaborative editing with real-time sync

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity Over Features | PASS | All features are essential for academic writing (formatting, tables, math) |
| II. Real-Time First | PASS | All formatting uses ProseMirror marks/node attributes, synced via Yjs CRDT |
| III. Reliability and Data Safety | PASS | Auto-save unchanged; formatting is part of Yjs state |
| IV. Performance | PASS | KaTeX rendering target <500ms; toolbar interactions <100ms |
| V. Academic Export Quality | PASS | PDF template updated to render all new formatting |
| VI. Security and Privacy | PASS | No new auth surfaces; self-hosted fonts avoid external CDN requests |
| VII. Code Quality Standards | VIOLATION | Dynamic user-chosen styles (font-family, font-size, color, etc.) require inline styles — see Complexity Tracking |
| VIII. Accessibility | PASS | Toolbar groups keyboard-navigable; color contrast maintained; ARIA labels on new controls |
| IX. English Only | PASS | All UI labels, code, and docs in English |
| X. Design System Consistency | PASS | New toolbar components follow existing ToolbarButton/ToolbarGroup patterns; color picker uses design tokens |

## Project Structure

### Documentation (this feature)

```text
specs/002-rich-text-formatting/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research output
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 quickstart guide
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
app/
├── components/
│   └── editor/
│       ├── Editor.tsx                    # Modified: add new extensions
│       ├── extensions/
│       │   ├── math-inline.ts            # Modified: add NodeView
│       │   ├── math-block.ts             # Modified: add NodeView
│       │   ├── paragraph-spacing.ts      # New: marginTop/marginBottom
│       │   ├── indent.ts                 # New: paragraph indentation
│       │   ├── letter-spacing.ts         # New: letter-spacing mark
│       │   ├── table-style.ts            # New: table style presets
│       │   └── table-cell-bg.ts          # New: cell background color
│       ├── node-views/
│       │   ├── MathInlineView.tsx         # New: live KaTeX inline
│       │   └── MathBlockView.tsx          # New: live KaTeX block
│       └── toolbar/
│           ├── Toolbar.tsx               # Modified: collapsible groups
│           ├── ToolbarGroup.tsx           # Modified: collapsible behavior
│           ├── FontFamilyPicker.tsx       # New
│           ├── FontSizePicker.tsx         # New
│           ├── ColorPicker.tsx            # New: reusable for text/highlight/cell
│           ├── AlignmentControls.tsx      # New
│           ├── SpacingControls.tsx        # New: line/paragraph spacing + indent
│           ├── TableStylePicker.tsx       # New
│           └── MathSymbolPalette.tsx      # New
├── styles/
│   └── fonts.css                         # New: @font-face declarations
├── lib/
│   └── pdf-template.server.ts            # Modified: render new marks/attrs
└── app.css                               # Modified: table preset styles, math styles

public/
└── fonts/                                # New: WOFF2 font files
    ├── inter/
    ├── merriweather/
    ├── open-sans/
    ├── roboto/
    ├── playfair-display/
    ├── lora/
    ├── jetbrains-mono/
    └── fira-code/

tests/
├── unit/
│   ├── extensions/                       # New: extension unit tests
│   └── toolbar/                          # New: toolbar component tests
└── e2e/
    └── formatting.spec.ts                # New: E2E formatting tests
```

**Structure Decision**: Follows existing project conventions. New extensions go in `app/components/editor/extensions/`, new toolbar components in `app/components/editor/toolbar/`, new NodeViews in a new `app/components/editor/node-views/` directory.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Inline styles for user-chosen formatting (Principle VII) | Tiptap TextStyle mark renders as `<span style="...">` by design. Font family, size, color, line-height, letter-spacing, and text-align are dynamic user values that cannot be mapped to static Tailwind classes (Tailwind purges unused classes at build time). | Dynamic Tailwind class generation doesn't work (purged at build time). CSS custom properties still require inline `style` attributes. This is the standard approach for all rich text editors. Inline styles are scoped exclusively to the editor content area — all structural/UI styling continues to use Tailwind. |
