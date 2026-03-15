import type { Doc as YDoc } from "yjs";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";
import { useDocSettings } from "~/hooks/useDocSettings";
import type { CitationStandard } from "~/lib/citation-formatters";

interface DocumentSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ydoc: YDoc;
}

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500";

const labelClass = "text-sm font-medium text-zinc-700";

const sectionClass = "space-y-2";

const sectionTitleClass = "text-xs font-semibold uppercase tracking-wider text-zinc-400";

const CITATION_STANDARDS: { value: CitationStandard; label: string }[] = [
  { value: "apa", label: "APA 7th Edition" },
  { value: "harvard", label: "Harvard" },
  { value: "ieee", label: "IEEE" },
  { value: "chicago", label: "Chicago 17th Edition" },
];

export function DocumentSettingsPanel({ isOpen, onClose, ydoc }: DocumentSettingsPanelProps) {
  const { settings, updateSetting } = useDocSettings(ydoc);

  return (
    <Modal open={isOpen} onClose={onClose} title="Document settings">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto">
        {/* Citation Standard */}
        <div className={sectionClass}>
          <p className={sectionTitleClass}>Citation Standard</p>
          <div>
            <label className={labelClass}>Standard</label>
            <select
              value={settings.citationStandard}
              onChange={(e) => updateSetting("citationStandard", e.target.value as CitationStandard)}
              className={inputClass}
              aria-label="Citation standard"
            >
              {CITATION_STANDARDS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Front Page */}
        <div className={sectionClass}>
          <p className={sectionTitleClass}>Front Page</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.frontPageEnabled}
              onChange={(e) => updateSetting("frontPageEnabled", e.target.checked)}
              className="rounded border-zinc-300"
            />
            Include front page
          </label>
          {settings.frontPageEnabled && (
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={settings.frontPageTitle}
                  onChange={(e) => updateSetting("frontPageTitle", e.target.value)}
                  placeholder="Uses document title if empty"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Subtitle</label>
                <input
                  type="text"
                  value={settings.frontPageSubtitle}
                  onChange={(e) => updateSetting("frontPageSubtitle", e.target.value)}
                  placeholder="Optional subtitle"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Authors</label>
                <input
                  type="text"
                  value={settings.frontPageAuthors}
                  onChange={(e) => updateSetting("frontPageAuthors", e.target.value)}
                  placeholder="Uses collaborator names if empty"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Institution</label>
                  <input
                    type="text"
                    value={settings.frontPageInstitution}
                    onChange={(e) => updateSetting("frontPageInstitution", e.target.value)}
                    placeholder="University name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="text"
                    value={settings.frontPageDate}
                    onChange={(e) => updateSetting("frontPageDate", e.target.value)}
                    placeholder="Uses current date if empty"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Custom field</label>
                <input
                  type="text"
                  value={settings.frontPageCustomField}
                  onChange={(e) => updateSetting("frontPageCustomField", e.target.value)}
                  placeholder="e.g. Course name"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Header & Footer */}
        <div className={sectionClass}>
          <p className={sectionTitleClass}>Header & Footer</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Header content</label>
              <select
                value={settings.headerContent}
                onChange={(e) =>
                  updateSetting(
                    "headerContent",
                    e.target.value as "title" | "section" | "custom" | "none",
                  )
                }
                className={inputClass}
                aria-label="Header content"
              >
                <option value="title">Document title</option>
                <option value="section">Section title</option>
                <option value="custom">Custom text</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Page number format</label>
              <select
                value={settings.footerPageFormat}
                onChange={(e) =>
                  updateSetting(
                    "footerPageFormat",
                    e.target.value as "number" | "pageXofY" | "roman" | "none",
                  )
                }
                className={inputClass}
                aria-label="Page number format"
              >
                <option value="number">1, 2, 3</option>
                <option value="pageXofY">Page X of Y</option>
                <option value="roman">i, ii, iii</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          {settings.headerContent === "custom" && (
            <div>
              <label className={labelClass}>Custom header text</label>
              <input
                type="text"
                value={settings.headerCustomText}
                onChange={(e) => updateSetting("headerCustomText", e.target.value)}
                placeholder="Enter header text"
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Page numbering starts</label>
            <select
              value={settings.pageNumberStart}
              onChange={(e) =>
                updateSetting(
                  "pageNumberStart",
                  e.target.value as "after-frontmatter" | "from-first",
                )
              }
              className={inputClass}
              aria-label="Page numbering start"
            >
              <option value="after-frontmatter">After front page & TOC</option>
              <option value="from-first">From first page</option>
            </select>
          </div>
        </div>

        {/* Table of Contents */}
        <div className={sectionClass}>
          <p className={sectionTitleClass}>Table of Contents</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.tocEnabled}
              onChange={(e) => updateSetting("tocEnabled", e.target.checked)}
              className="rounded border-zinc-300"
            />
            Include table of contents
          </label>
          {settings.tocEnabled && (
            <div>
              <label className={labelClass}>Heading depth</label>
              <select
                value={settings.tocDepth}
                onChange={(e) => updateSetting("tocDepth", Number(e.target.value))}
                className={inputClass}
                aria-label="TOC heading depth"
              >
                <option value={1}>H1 only</option>
                <option value={2}>H1 – H2</option>
                <option value={3}>H1 – H2 – H3</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
