import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";
import type { Editor } from "@tiptap/react";
import { figureNumberingPluginKey } from "~/components/editor/extensions/figure";

export type FigureReferencePickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (figureId: string, caption: string) => void;
  editor: Editor | null;
};

type FigureItem = {
  figureId: string;
  number: number;
  caption: string;
};

function collectFigures(editor: Editor): FigureItem[] {
  const items: FigureItem[] = [];
  const numberMap = figureNumberingPluginKey.getState(editor.state);

  editor.state.doc.descendants((node) => {
    if (node.type.name === "figure") {
      const figureId = node.attrs.figureId as string;
      const num = numberMap?.get(figureId) ?? 0;
      // Extract caption text from inline content
      let caption = "";
      node.content.forEach((child) => {
        if (child.text) caption += child.text;
      });
      if (!caption) caption = (node.attrs.caption as string) || "";
      items.push({ figureId, number: num, caption });
    }
    return true;
  });

  return items;
}

export function FigureReferencePicker({
  isOpen,
  onClose,
  onSelect,
  editor,
}: FigureReferencePickerProps) {
  const figures = editor && isOpen ? collectFigures(editor) : [];

  function handleSelect(item: FigureItem) {
    onSelect(item.figureId, item.caption);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Insert figure reference">
      <div className="space-y-2">
        {figures.length === 0 ? (
          <div className="flex items-center justify-center rounded-md border border-dashed border-zinc-300 py-10">
            <p className="text-sm text-zinc-400">No figures in this document.</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto rounded-md border border-zinc-200">
            {figures.map((fig) => (
              <button
                key={fig.figureId}
                onClick={() => handleSelect(fig)}
                className="flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-zinc-50"
              >
                <span className="flex-shrink-0 font-semibold text-accent-600">
                  Figur {fig.number}
                </span>
                <span className="truncate text-zinc-600">
                  {fig.caption || "(no caption)"}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
