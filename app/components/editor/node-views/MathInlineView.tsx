import { useCallback, useEffect, useRef, useState } from "react";

import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";

import type { NodeViewProps } from "@tiptap/react";

export function MathInlineView({ node, updateAttributes, selected }: NodeViewProps) {
  const latex = node.attrs.latex as string;
  const [isEditing, setIsEditing] = useState(!latex);
  const [editValue, setEditValue] = useState(latex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
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
      if (e.key === "Enter") {
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
      <NodeViewWrapper as="span" className="math-inline">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="math-editing-input"
          placeholder="LaTeX..."
          style={{ minWidth: "4em" }}
        />
      </NodeViewWrapper>
    );
  }

  let renderedHtml = "";
  let hasError = false;

  try {
    renderedHtml = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: true,
    });
  } catch {
    hasError = true;
  }

  if (hasError || !latex) {
    return (
      <NodeViewWrapper
        as="span"
        className={`math-inline ${selected ? "ProseMirror-selectednode" : ""}`}
        onClick={handleClick}
      >
        <span className="math-error">{latex || "empty"}</span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="span"
      className={`math-inline ${selected ? "ProseMirror-selectednode" : ""}`}
      onClick={handleClick}
    >
      <span dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    </NodeViewWrapper>
  );
}
