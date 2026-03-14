# Research: Rich Text Formatting & Tables

**Branch**: `002-rich-text-formatting` | **Date**: 2026-03-14

## Decision 1: Text Formatting Extensions

**Decision**: Use official Tiptap extensions via `@tiptap/extension-text-style` (TextStyle mark) for font family, font size, line height; `@tiptap/extension-color` for text color; `@tiptap/extension-text-align` for paragraph alignment; `@tiptap/extension-superscript` and `@tiptap/extension-subscript` for super/subscript; `@tiptap/extension-highlight` with `multicolor: true` for text highlighting.

**Rationale**: Official extensions are well-maintained, compatible with the existing Tiptap 3.x stack, and handle CRDT sync through Yjs automatically since they use standard ProseMirror marks/attributes. TextStyle is the foundation mark that font family, font size, and color attach to as attributes.

**Alternatives considered**:
- Custom extensions for each formatting type — rejected because official extensions already exist and are battle-tested.
- TextStyleKit bundle — considered but individual extensions give more control over configuration and bundle size.

## Decision 2: Paragraph Spacing, Indentation, Letter Spacing

**Decision**: Create custom Tiptap extensions for these three features since no official extensions exist.
- **Paragraph spacing**: Custom node attribute extension on Paragraph/Heading nodes, storing `marginTop`/`marginBottom` as attributes, rendered as inline styles.
- **Indentation**: Custom node attribute extension on Paragraph/Heading nodes, storing `indent` level, rendered as `padding-left` style.
- **Letter spacing**: Custom mark attribute on TextStyle, storing `letterSpacing` value, rendered as inline `letter-spacing` style.

**Rationale**: Community packages (tiptap-extension-margin, tiptap-extension-letter-spacing, tiptaptop-extension-indent) exist but are maintained by individual authors with uncertain long-term support. Building custom extensions following the same pattern as official ones is straightforward and gives full control.

**Alternatives considered**:
- Community packages (KID-1912/tiptap-extension-margin, KID-1912/tiptap-extension-letter-spacing, evanfuture/tiptaptop-extension-indent) — rejected due to maintenance risk and the simplicity of implementing these ourselves.

## Decision 3: Table Cell Merge/Split

**Decision**: Use the existing `@tiptap/extension-table` package's built-in `mergeCells()`, `splitCell()`, and `mergeOrSplit()` commands. No additional packages needed.

**Rationale**: The Tiptap table extension already supports cell merging natively through colspan/rowspan attributes. The project already has the table extensions installed at v3.20.1.

**Alternatives considered**: None — native support is sufficient.

## Decision 4: Table Style Presets

**Decision**: Implement table style presets as a custom system that applies CSS class names to table nodes via a `tableStyle` node attribute. Define 4+ preset styles in CSS: "academic" (booktabs-style minimal with top/bottom rules), "striped" (alternating row backgrounds), "bordered" (full grid borders), "modern" (colored header with clean body).

**Rationale**: Tiptap doesn't have built-in table theming. Using CSS classes rather than inline styles keeps the document model clean and allows styles to be updated without migrating document data. The presets match academic publishing conventions.

**Alternatives considered**:
- Inline styles per cell — rejected because it bloats the document and is harder to change globally.
- Data attributes — rejected in favor of CSS classes which are more standard.

## Decision 5: Live KaTeX Math Rendering

**Decision**: Enhance the existing custom math-inline and math-block extensions by adding React NodeViews that render KaTeX live in the editor. Use `addNodeView()` to create React components that call `katex.renderToString()` on the `latex` attribute. Clicking renders an editable textarea overlay for editing the raw LaTeX.

**Rationale**: The project already has custom math extensions (math-inline.ts, math-block.ts) that store LaTeX correctly. Adding NodeViews is the minimal change needed to render math live. KaTeX is already a dependency (v0.16.38). This approach preserves backward compatibility with existing documents.

**Alternatives considered**:
- Replace with official `@tiptap/extension-mathematics` — rejected because migrating existing document data would be risky and the official extension may not offer the exact UX we want (click-to-edit behavior).
- Community `@aarkue/tiptap-math-extension` — rejected for the same migration concerns.

## Decision 6: Math Symbol Palette

**Decision**: Build a custom React component rendered in the Math toolbar group. Organized into tabbed categories (Greek letters, operators, fractions/roots, integrals/sums, matrices, arrows, accents). Each symbol click inserts the corresponding LaTeX command at the current cursor position within a math node.

**Rationale**: No existing Tiptap extension provides a symbol palette. This is a UI component that interacts with the editor's command API, not a ProseMirror extension itself.

**Alternatives considered**: None — custom UI is the only viable approach.

## Decision 7: Font Hosting

**Decision**: Self-host a curated set of fonts bundled with the application. Include at least 8 fonts across categories: serif (e.g., Georgia, Merriweather, Playfair Display), sans-serif (e.g., Inter, Open Sans, Roboto), monospace (e.g., JetBrains Mono, Fira Code). Font files served from `public/fonts/`.

**Rationale**: Self-hosting ensures GDPR compliance (no Google Fonts CDN requests), consistent rendering across environments, and works offline. The bundle size impact is manageable with WOFF2 format (typically 20-50KB per font weight).

**Alternatives considered**:
- Google Fonts CDN — rejected for GDPR compliance concerns.
- System fonts only — rejected because rendering would be inconsistent across platforms.

## Decision 8: Inline Styles vs Tailwind (Constitution Violation)

**Decision**: Use inline styles for user-controlled dynamic formatting values (font-family, font-size, color, line-height, letter-spacing, text-align, margins). This is a necessary exception to Constitution Principle VII ("No inline styles — Tailwind utility classes only").

**Rationale**: Tiptap's TextStyle mark renders as `<span style="font-family: ...">` by design. User-chosen values are inherently dynamic and cannot be mapped to static Tailwind classes. This is the standard approach for all rich text editors. Static/structural styling (toolbar UI, layout, design system components) will continue to use Tailwind exclusively. The inline styles only appear within the editor's content area.

**Alternatives considered**:
- CSS custom properties per mark — overly complex and still requires inline `style` attributes.
- Dynamic Tailwind classes — Tailwind purges classes at build time, so dynamic class generation doesn't work.

## Decision 9: Toolbar Organization

**Decision**: Restructure the toolbar into collapsible groups: Text (font family, size, color, bold, italic, underline, strike, super/subscript, code), Paragraph (alignment, line spacing, paragraph spacing, indentation, lists, blockquote), Insert (table, image, figure, horizontal rule, document mention), Math (inline/block math, symbol palette). Each group has a label and can be collapsed.

**Rationale**: The current flat toolbar will become overcrowded with 15+ additional controls. Grouping follows standard word processor conventions and matches the clarified spec requirement.

**Alternatives considered**:
- Ribbon tabs (Word-style) — rejected as too heavy for the minimal design aesthetic.
- Contextual popover — rejected because users need persistent access to formatting tools while editing.
