import { useState } from "react";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";

export type ImagePickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (src: string, alt: string) => void;
};

export function ImagePicker({ isOpen, onClose, onInsert }: ImagePickerProps) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter an image URL.");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError("Please enter a valid URL.");
      return;
    }
    onInsert(trimmed, alt.trim() || "Image");
    setUrl("");
    setAlt("");
    setError(null);
    onClose();
  }

  function handleClose() {
    setUrl("");
    setAlt("");
    setError(null);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Insert image">
      <div className="space-y-3">
        <div>
          <label htmlFor="image-url" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Image URL
          </label>
          <input
            id="image-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="https://example.com/image.png"
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div>
          <label htmlFor="image-alt" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Alt text{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="image-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe the image"
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!url.trim()}>
            Insert
          </Button>
        </div>
      </div>
    </Modal>
  );
}
