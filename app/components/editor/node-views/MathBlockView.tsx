import { useCallback, useEffect, useRef, useState } from "react";

import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";

import type { NodeViewProps } from "@tiptap/react";

export function MathBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const latex = node.attrs.latex as string;
  const [isEditing, setIsEditing] = useState(!latex);
  const [editValue, setEditValue] = useState(latex);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: editValue });
    if (editValue) {
      setIsEditing(false);
    }
  }, [editValue, updateAttributes]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      setEditValue(latex);
      setIsEditing(true);
    }
  }, [isEditing, latex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setEditValue(latex);
        setIsEditing(false);
      }
    },
    [handleSave, latex],
  );

  if (isEditing) {
    return (
      <NodeViewWrapper className="math-block">
        <div className="flex w-full flex-col items-center gap-1">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="math-editing-input w-full max-w-lg"
            placeholder="Enter LaTeX equation..."
            rows={3}
          />
          <span className="text-[10px] text-zinc-400">Ctrl+Enter to save, Esc to cancel</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (!latex) {
    return (
      <NodeViewWrapper
        className={`math-block ${selected ? "ProseMirror-selectednode" : ""}`}
        onClick={handleClick}
      >
        <span className="text-sm text-zinc-400">Enter LaTeX equation...</span>
      </NodeViewWrapper>
    );
  }

  let renderedHtml = "";
  let hasError = false;

  try {
    renderedHtml = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: true,
    });
  } catch {
    hasError = true;
  }

  if (hasError) {
    return (
      <NodeViewWrapper
        className={`math-block ${selected ? "ProseMirror-selectednode" : ""}`}
        onClick={handleClick}
      >
        <span className="math-error">{latex}</span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`math-block ${selected ? "ProseMirror-selectednode" : ""}`}
      onClick={handleClick}
    >
      <span dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    </NodeViewWrapper>
  );
}
