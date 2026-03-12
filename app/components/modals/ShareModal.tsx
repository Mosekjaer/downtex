import { useState } from "react";
import { useFetcher } from "react-router";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";

type Collaborator = {
  userId: string;
  displayName: string;
  role: string;
};

export type ShareModalProps = {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  currentCollaborators: Collaborator[];
  publicLink: { token: string } | null;
};

const ROLE_OPTIONS = [
  { value: "editor", label: "Editor" },
  { value: "commenter", label: "Commenter" },
  { value: "viewer", label: "Viewer" },
] as const;

export function ShareModal({
  documentId,
  isOpen,
  onClose,
  currentCollaborators,
  publicLink,
}: ShareModalProps) {
  const shareFetcher = useFetcher();
  const removeFetcher = useFetcher();
  const roleFetcher = useFetcher();
  const linkFetcher = useFetcher();

  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<string>("viewer");
  const [copied, setCopied] = useState(false);

  const publicUrl = publicLink
    ? `${window.location.origin}/share/${publicLink.token}`
    : null;

  function handleAddPerson() {
    if (!email.trim()) return;
    shareFetcher.submit(
      { intent: "share-user", email: email.trim(), role: newRole },
      { method: "post" },
    );
    setEmail("");
  }

  function handleRemove(userId: string) {
    removeFetcher.submit(
      { intent: "remove-share", userId },
      { method: "post" },
    );
  }

  function handleRoleChange(userId: string, role: string) {
    roleFetcher.submit(
      { intent: "share-user", userId, role },
      { method: "post" },
    );
  }

  function handleTogglePublicLink() {
    linkFetcher.submit(
      { intent: publicLink ? "disable-public-link" : "enable-public-link" },
      { method: "post" },
    );
  }

  async function handleCopyLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isSubmitting =
    shareFetcher.state !== "idle" || linkFetcher.state !== "idle";

  return (
    <Modal open={isOpen} onClose={onClose} title="Share document">
      <div className="space-y-6">
        {/* Add people section */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Add people
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPerson();
                }
              }}
              placeholder="Email address"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleAddPerson}
              disabled={!email.trim() || isSubmitting}
            >
              Add
            </Button>
          </div>
          {shareFetcher.data && "error" in shareFetcher.data && (
            <p className="mt-1 text-xs text-red-600">
              {String((shareFetcher.data as { error: string }).error)}
            </p>
          )}
        </div>

        {/* Current collaborators */}
        {currentCollaborators.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-700">
              People with access
            </h3>
            <ul className="divide-y divide-zinc-100">
              {currentCollaborators.map((collab) => (
                <li
                  key={collab.userId}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-zinc-900">
                    {collab.displayName}
                  </span>
                  <div className="flex items-center gap-2">
                    {collab.role === "owner" ? (
                      <span className="text-xs text-zinc-500">Owner</span>
                    ) : (
                      <>
                        <select
                          value={collab.role}
                          onChange={(e) =>
                            handleRoleChange(collab.userId, e.target.value)
                          }
                          className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-700 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemove(collab.userId)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                          aria-label={`Remove ${collab.displayName}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Public link section */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-700">Public link</h3>
            <button
              onClick={handleTogglePublicLink}
              disabled={linkFetcher.state !== "idle"}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                publicLink ? "bg-accent-600" : "bg-zinc-300"
              }`}
              role="switch"
              aria-checked={!!publicLink}
              aria-label="Toggle public link"
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  publicLink ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {publicUrl && (
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={publicUrl}
                className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600"
              />
              <Button size="sm" variant="secondary" onClick={handleCopyLink}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
