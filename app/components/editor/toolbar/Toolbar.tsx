import { useState } from "react";

import type { Editor } from "@tiptap/react";

import { AlignmentControls } from "./AlignmentControls";
import { ColorPicker } from "./ColorPicker";
import { FontFamilyPicker } from "./FontFamilyPicker";
import { FontSizePicker } from "./FontSizePicker";
import { MathSymbolPalette } from "./MathSymbolPalette";
import { SpacingControls } from "./SpacingControls";
import { TableStylePicker } from "./TableStylePicker";

interface ToolbarProps {
  editor: Editor;
  onInsertImage?: () => void;
  onInsertFigure?: () => void;
  onInsertMention?: () => void;
}

export function Toolbar({ editor, onInsertImage, onInsertFigure, onInsertMention }: ToolbarProps) {
  const isInTable = editor.isActive("table");

  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-3 py-1">
      <div className="flex flex-wrap items-start gap-1">
        {/* ── Text Group ── */}
        <CollapsibleGroup label="Text">
          <FontFamilyPicker editor={editor} />
          <FontSizePicker editor={editor} />
          <Divider />
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            B
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <span className="line-through">S</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("superscript")}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            title="Superscript"
          >
            X<sup className="text-[8px]">2</sup>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("subscript")}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            title="Subscript"
          >
            X<sub className="text-[8px]">2</sub>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            {"<>"}
          </ToolbarButton>
          <Divider />
          <ColorPicker
            editor={editor}
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
            currentColor={editor.getAttributes("textStyle").color as string | undefined}
            icon={
              <span className="flex items-center gap-0.5">
                A
                <span
                  className="block h-1 w-3 rounded-sm"
                  style={{
                    backgroundColor:
                      (editor.getAttributes("textStyle").color as string | undefined) ?? "#000",
                  }}
                />
              </span>
            }
            title="Text color"
          />
          <ColorPicker
            editor={editor}
            onSelect={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
            currentColor={editor.getAttributes("highlight").color as string | undefined}
            icon={
              <span className="flex items-center gap-0.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect
                    x="1"
                    y="10"
                    width="12"
                    height="3"
                    rx="1"
                    fill="currentColor"
                    opacity="0.3"
                  />
                  <path
                    d="M3 9L7 2L11 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            }
            title="Highlight"
          />
        </CollapsibleGroup>

        {/* ── Paragraph Group ── */}
        <CollapsibleGroup label="Paragraph">
          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 4 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            title="Heading 4"
          >
            H4
          </ToolbarButton>
          <Divider />
          <AlignmentControls editor={editor} />
          <Divider />
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            &bull;
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            &ldquo;
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            {"{ }"}
          </ToolbarButton>
          <Divider />
          <SpacingControls editor={editor} />
        </CollapsibleGroup>

        {/* ── Insert Group ── */}
        <CollapsibleGroup label="Insert">
          <ToolbarButton
            active={false}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Insert table"
          >
            Table
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            &mdash;
          </ToolbarButton>
          {onInsertImage && (
            <ToolbarButton active={false} onClick={onInsertImage} title="Insert image">
              Img
            </ToolbarButton>
          )}
          {onInsertFigure && (
            <ToolbarButton active={false} onClick={onInsertFigure} title="Insert Draw.io figure">
              Fig
            </ToolbarButton>
          )}
          {onInsertMention && (
            <ToolbarButton active={false} onClick={onInsertMention} title="Reference a document">
              @Doc
            </ToolbarButton>
          )}
        </CollapsibleGroup>

        {/* ── Math Group ── */}
        <CollapsibleGroup label="Math">
          <MathSymbolPalette editor={editor} />
        </CollapsibleGroup>

        {/* ── Table Controls (conditional) ── */}
        {isInTable && (
          <CollapsibleGroup label="Table">
            <TableStylePicker editor={editor} />
            <Divider />
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              title="Add column before"
            >
              ←Col
            </ToolbarButton>
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add column after"
            >
              Col→
            </ToolbarButton>
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().addRowBefore().run()}
              title="Add row above"
            >
              ↑Row
            </ToolbarButton>
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add row below"
            >
              Row↓
            </ToolbarButton>
            <Divider />
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().mergeOrSplit().run()}
              title="Merge or split cells"
            >
              Merge
            </ToolbarButton>
            <ColorPicker
              editor={editor}
              onSelect={(color) => editor.chain().focus().setCellBackground(color).run()}
              onClear={() => editor.chain().focus().unsetCellBackground().run()}
              icon={
                <span className="flex items-center gap-0.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <rect
                      x="2"
                      y="2"
                      width="10"
                      height="10"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <rect
                      x="4"
                      y="4"
                      width="6"
                      height="6"
                      rx="0.5"
                      fill="currentColor"
                      opacity="0.25"
                    />
                  </svg>
                </span>
              }
              title="Cell background"
            />
            <Divider />
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete column"
              danger
            >
              ×Col
            </ToolbarButton>
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete row"
              danger
            >
              ×Row
            </ToolbarButton>
            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete table"
              danger
            >
              ×Table
            </ToolbarButton>
          </CollapsibleGroup>
        )}
      </div>
    </div>
  );
}

function CollapsibleGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${label} group`}
      >
        <svg
          className={`h-2.5 w-2.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          viewBox="0 0 10 10"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 1l4 4-4 4z" />
        </svg>
        {label}
      </button>
      {isExpanded && <div className="flex items-center gap-0.5">{children}</div>}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent-100 text-accent-700"
          : danger
            ? "text-red-500 hover:bg-red-50 hover:text-red-700"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      } focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-zinc-200" />;
}
