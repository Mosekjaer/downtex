import { useState, useEffect } from "react";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";
import type { ReferenceSource } from "~/lib/citation-formatters";

type SourceType = ReferenceSource["type"];

interface ReferenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (source: ReferenceSource) => void;
  editSource?: ReferenceSource | null;
}

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "journal", label: "Journal" },
  { value: "book", label: "Book" },
  { value: "website", label: "Website" },
  { value: "conference", label: "Conference" },
  { value: "thesis", label: "Thesis" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500";

const labelClass = "text-sm font-medium text-zinc-700";

function parseAuthors(raw: string): string[] {
  return raw
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

export function ReferenceDialog({ isOpen, onClose, onSubmit, editSource }: ReferenceDialogProps) {
  const [type, setType] = useState<SourceType>("journal");
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [doi, setDoi] = useState("");
  const [pages, setPages] = useState("");
  const [journal, setJournal] = useState("");
  const [volume, setVolume] = useState("");
  const [issue, setIssue] = useState("");

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Reset form when dialog opens or editSource changes
  useEffect(() => {
    if (!isOpen) return;

    if (editSource) {
      setType(editSource.type);
      setTitle(editSource.title);
      setAuthors(editSource.authors.join(", "));
      setYear(editSource.year ?? "");
      setPublisher(editSource.publisher ?? "");
      setUrl(editSource.url ?? "");
      setDoi(editSource.doi ?? "");
      setPages(editSource.pages ?? "");
      setJournal(editSource.journal ?? "");
      setVolume(editSource.volume ?? "");
      setIssue(editSource.issue ?? "");
    } else {
      setType("journal");
      setTitle("");
      setAuthors("");
      setYear("");
      setPublisher("");
      setUrl("");
      setDoi("");
      setPages("");
      setJournal("");
      setVolume("");
      setIssue("");
    }

    setLookupError(null);
    setLookupLoading(false);
  }, [isOpen, editSource]);

  function applyLookupData(data: Record<string, unknown>) {
    if (typeof data.title === "string") setTitle(data.title);
    if (Array.isArray(data.authors)) setAuthors((data.authors as string[]).join(", "));
    if (typeof data.year === "string") setYear(data.year);
    if (typeof data.publisher === "string") setPublisher(data.publisher);
    if (typeof data.url === "string") setUrl(data.url);
    if (typeof data.doi === "string") setDoi(data.doi);
    if (typeof data.pages === "string") setPages(data.pages);
    if (typeof data.journal === "string") setJournal(data.journal);
    if (typeof data.volume === "string") setVolume(data.volume);
    if (typeof data.issue === "string") setIssue(data.issue);
    if (typeof data.type === "string" && SOURCE_TYPES.some((t) => t.value === data.type)) {
      setType(data.type as SourceType);
    }
  }

  async function handleLookup(query: string, lookupType: "doi" | "url") {
    setLookupLoading(true);
    setLookupError(null);

    try {
      const res = await fetch("/api/reference-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type: lookupType }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Lookup failed (${res.status})`);
      }

      const data = (await res.json()) as {
        success: boolean;
        source?: Record<string, unknown>;
        error?: string;
      };
      if (!data.success || !data.source) {
        throw new Error(data.error ?? "Lookup returned no results");
      }
      applyLookupData(data.source);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const source: ReferenceSource = {
      id: editSource?.id ?? crypto.randomUUID(),
      type,
      title,
      authors: parseAuthors(authors),
      year: year || undefined,
      publisher: publisher || undefined,
      url: url || undefined,
      doi: doi || undefined,
      pages: pages || undefined,
      journal: journal || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      createdAt: editSource?.createdAt ?? new Date().toISOString(),
    };

    onSubmit(source);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={editSource ? "Edit reference" : "Add reference"}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Type + Year row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SourceType)}
              className={inputClass}
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2024"
              className={inputClass}
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Title of the work"
            className={inputClass}
          />
        </div>

        {/* Authors */}
        <div>
          <label className={labelClass}>Authors</label>
          <input
            type="text"
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
            placeholder="Last, First; Last, First (comma-separated)"
            className={inputClass}
          />
        </div>

        {/* Journal + Publisher */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Journal</label>
            <input
              type="text"
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="Journal name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Publisher</label>
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Publisher"
              className={inputClass}
            />
          </div>
        </div>

        {/* Volume + Issue */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Volume</label>
            <input
              type="text"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="e.g. 12"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Issue</label>
            <input
              type="text"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. 3"
              className={inputClass}
            />
          </div>
        </div>

        {/* Pages */}
        <div>
          <label className={labelClass}>Pages</label>
          <input
            type="text"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="e.g. 1-15"
            className={inputClass}
          />
        </div>

        {/* DOI with lookup */}
        <div>
          <label className={labelClass}>DOI</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              placeholder="10.xxxx/xxxxx"
              className={inputClass}
            />
            {doi.trim() && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={lookupLoading}
                onClick={() => handleLookup(doi.trim(), "doi")}
              >
                {lookupLoading ? "..." : "Lookup"}
              </Button>
            )}
          </div>
        </div>

        {/* URL with lookup */}
        <div>
          <label className={labelClass}>URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
            {url.trim() && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={lookupLoading}
                onClick={() => handleLookup(url.trim(), "url")}
              >
                {lookupLoading ? "..." : "Lookup"}
              </Button>
            )}
          </div>
        </div>

        {/* Lookup error */}
        {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {editSource ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
