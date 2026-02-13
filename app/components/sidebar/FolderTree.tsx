import { useState, useRef, useEffect, useCallback } from "react";
import { useFetcher, Link, useParams } from "react-router";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  sort_order: number;
}

export interface Document {
  id: string;
  title: string;
  folder_id: string;
  updated_at: string;
}

export interface FolderTreeProps {
  folders: Folder[];
  documents: Document[];
  workspaceId: string;
  isEditor: boolean;
  searchQuery?: string;
  actionUrl?: string;
}

// ─── Context menu state ──────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  type: "folder" | "document";
  id: string;
  folderId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesSearch(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.toLowerCase());
}

function getVisibleFolderIds(folders: Folder[], documents: Document[], query: string): Set<string> {
  if (!query) return new Set(folders.map((f) => f.id));

  const visible = new Set<string>();

  for (const f of folders) {
    if (matchesSearch(f.name, query)) {
      let current: Folder | undefined = f;
      while (current) {
        visible.add(current.id);
        current = folders.find((p) => p.id === current?.parent_folder_id);
      }
    }
  }

  for (const d of documents) {
    if (matchesSearch(d.title, query)) {
      let current: Folder | undefined = folders.find((f) => f.id === d.folder_id);
      while (current) {
        visible.add(current.id);
        current = folders.find((p) => p.id === current?.parent_folder_id);
      }
    }
  }

  return visible;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-zinc-400"
    >
      <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
      <path d="M20 13H4l3 7h10z" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-zinc-400"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-zinc-400"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function MoreIcon() {
  return (
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
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FolderTree({
  folders,
  documents,
  workspaceId,
  isEditor,
  searchQuery = "",
  actionUrl,
}: FolderTreeProps) {
  const fetcher = useFetcher();
  const params = useParams();
  const activeDocId = params.docId;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(folders.map((f) => f.id)),
  );
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [renaming, setRenaming] = useState<{ type: "folder" | "document"; id: string } | null>(
    null,
  );
  const [inlineCreate, setInlineCreate] = useState<{
    type: "folder" | "document";
    parentId: string;
  } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click / Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: MouseEvent) => {
      if (ctxMenuRef.current?.contains(e.target as Node)) return;
      setCtxMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtxMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
  }, [renaming]);

  useEffect(() => {
    if (inlineCreate) createInputRef.current?.focus();
  }, [inlineCreate]);

  useEffect(() => {
    if (searchQuery) {
      const vis = getVisibleFolderIds(folders, documents, searchQuery);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedIds(vis);
    }
  }, [searchQuery, folders, documents]);

  const toggleExpand = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const childFolders = (parentId: string | null) =>
    folders
      .filter((f) => f.parent_folder_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));

  const folderDocs = (folderId: string) =>
    documents
      .filter((d) => d.folder_id === folderId)
      .sort((a, b) => a.title.localeCompare(b.title));

  const visibleIds = getVisibleFolderIds(folders, documents, searchQuery);

  // ── Drag handlers ──

  function handleDragStart(e: React.DragEvent, docId: string) {
    e.dataTransfer.setData("text/plain", docId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  }

  function handleDragLeave() {
    setDragOverFolderId(null);
  }

  function handleDrop(e: React.DragEvent, targetFolderId: string) {
    e.preventDefault();
    setDragOverFolderId(null);
    const docId = e.dataTransfer.getData("text/plain");
    if (!docId) return;
    fetcher.submit(
      { intent: "move-document", documentId: docId, targetFolderId },
      { method: "post", action: actionUrl },
    );
  }

  // ── Context menu ──

  function handleContextMenu(e: React.MouseEvent, state: ContextMenuState) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ ...state, x: e.clientX, y: e.clientY });
  }

  function ctxRename() {
    if (!ctxMenu) return;
    setRenaming({ type: ctxMenu.type, id: ctxMenu.id });
    setCtxMenu(null);
  }

  function ctxDelete() {
    if (!ctxMenu) return;
    const intent = ctxMenu.type === "folder" ? "delete-folder" : "delete-document";
    const key = ctxMenu.type === "folder" ? "folderId" : "documentId";
    fetcher.submit({ intent, [key]: ctxMenu.id }, { method: "post", action: actionUrl });
    setCtxMenu(null);
  }

  function ctxNewSubfolder() {
    if (!ctxMenu || ctxMenu.type !== "folder") return;
    setExpandedIds((prev) => new Set([...prev, ctxMenu.id]));
    setInlineCreate({ type: "folder", parentId: ctxMenu.id });
    setCtxMenu(null);
  }

  function ctxNewDocument() {
    if (!ctxMenu || ctxMenu.type !== "folder") return;
    setExpandedIds((prev) => new Set([...prev, ctxMenu.id]));
    setInlineCreate({ type: "document", parentId: ctxMenu.id });
    setCtxMenu(null);
  }

  function submitRename(value: string) {
    if (!renaming) return;
    if (!value.trim()) {
      setRenaming(null);
      return;
    }
    if (renaming.type === "folder") {
      fetcher.submit(
        { intent: "rename-folder", folderId: renaming.id, name: value },
        { method: "post", action: actionUrl },
      );
    } else {
      fetcher.submit(
        { intent: "rename-document", documentId: renaming.id, title: value },
        { method: "post", action: actionUrl },
      );
    }
    setRenaming(null);
  }

  function submitInlineCreate(value: string) {
    if (!inlineCreate || !value.trim()) {
      setInlineCreate(null);
      return;
    }
    if (inlineCreate.type === "folder") {
      fetcher.submit(
        { intent: "create-folder", name: value.trim(), parentFolderId: inlineCreate.parentId },
        { method: "post", action: actionUrl },
      );
    } else {
      fetcher.submit(
        { intent: "create-document", folderId: inlineCreate.parentId, title: value.trim() },
        { method: "post", action: actionUrl },
      );
    }
    setInlineCreate(null);
  }

  // ── Render ──

  function renderFolder(folder: Folder, depth: number) {
    if (!visibleIds.has(folder.id)) return null;

    const children = childFolders(folder.id);
    const docs = folderDocs(folder.id);
    const expanded = expandedIds.has(folder.id);
    const isDropTarget = dragOverFolderId === folder.id;
    const isRenamingThis = renaming?.type === "folder" && renaming.id === folder.id;

    const filteredDocs = searchQuery
      ? docs.filter((d) => matchesSearch(d.title, searchQuery))
      : docs;

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 rounded-md py-[5px] pr-1 text-sm transition-colors ${
            isDropTarget ? "bg-accent-50 ring-1 ring-accent-300" : "hover:bg-zinc-100/80"
          }`}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
          onContextMenu={(e) =>
            isEditor
              ? handleContextMenu(e, { x: 0, y: 0, type: "folder", id: folder.id })
              : undefined
          }
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <button
            onClick={() => toggleExpand(folder.id)}
            className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-600"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronIcon expanded={expanded} />
          </button>

          <FolderIcon open={expanded} />

          {isRenamingThis ? (
            <input
              ref={renameInputRef}
              defaultValue={folder.name}
              className="min-w-0 flex-1 rounded bg-white px-1 py-0 text-sm text-zinc-900 ring-1 ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-500"
              onBlur={(e) => submitRename(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename(e.currentTarget.value);
                if (e.key === "Escape") setRenaming(null);
              }}
            />
          ) : (
            <Link
              to={`/workspace/${workspaceId}/folder/${folder.id}`}
              className={`min-w-0 flex-1 truncate select-none ${
                params.folderId === folder.id
                  ? "font-medium text-accent-700"
                  : "text-zinc-700 hover:text-zinc-900"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {folder.name}
            </Link>
          )}

          {isEditor && !isRenamingThis && (
            <div className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedIds((prev) => new Set([...prev, folder.id]));
                  setInlineCreate({ type: "document", parentId: folder.id });
                }}
                className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600"
                title="New page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, { x: 0, y: 0, type: "folder", id: folder.id });
                }}
                className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600"
                title="More actions"
              >
                <MoreIcon />
              </button>
            </div>
          )}
        </div>

        {expanded && (
          <>
            {/* Inline create input */}
            {inlineCreate && inlineCreate.parentId === folder.id && (
              <div
                className="flex items-center gap-1 rounded-md py-[5px]"
                style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }}
              >
                {inlineCreate.type === "folder" ? <FolderIcon open={false} /> : <DocumentIcon />}
                <input
                  ref={createInputRef}
                  placeholder={inlineCreate.type === "folder" ? "Folder name..." : "Page title..."}
                  className="min-w-0 flex-1 rounded bg-white px-1.5 py-0.5 text-sm text-zinc-900 ring-1 ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  onBlur={(e) => submitInlineCreate(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitInlineCreate(e.currentTarget.value);
                    if (e.key === "Escape") setInlineCreate(null);
                  }}
                />
              </div>
            )}

            {filteredDocs.map((doc) => renderDocument(doc, depth + 1))}
            {children.map((child) => renderFolder(child, depth + 1))}
          </>
        )}
      </div>
    );
  }

  function renderDocument(doc: Document, depth: number) {
    const isRenamingThis = renaming?.type === "document" && renaming.id === doc.id;
    const isActive = doc.id === activeDocId;

    return (
      <div
        key={doc.id}
        draggable={isEditor}
        onDragStart={(e) => handleDragStart(e, doc.id)}
        onContextMenu={(e) =>
          isEditor
            ? handleContextMenu(e, {
                x: 0,
                y: 0,
                type: "document",
                id: doc.id,
                folderId: doc.folder_id,
              })
            : undefined
        }
        style={{ paddingLeft: `${depth * 16 + 20}px` }}
        className={`group flex items-center gap-1.5 rounded-md py-[5px] pr-1 text-sm transition-colors ${
          isActive
            ? "bg-accent-50 text-accent-700"
            : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
        }`}
      >
        <DocumentIcon />

        {isRenamingThis ? (
          <input
            ref={renameInputRef}
            defaultValue={doc.title}
            className="min-w-0 flex-1 rounded bg-white px-1 py-0 text-sm text-zinc-900 ring-1 ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-500"
            onBlur={(e) => submitRename(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename(e.currentTarget.value);
              if (e.key === "Escape") setRenaming(null);
            }}
          />
        ) : (
          <Link to={`/workspace/${workspaceId}/${doc.id}`} className="min-w-0 flex-1 truncate">
            {doc.title}
          </Link>
        )}

        {isEditor && !isRenamingThis && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, {
                x: 0,
                y: 0,
                type: "document",
                id: doc.id,
                folderId: doc.folder_id,
              });
            }}
            className="ml-auto hidden shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600 group-hover:block"
            title="More actions"
          >
            <MoreIcon />
          </button>
        )}
      </div>
    );
  }

  const rootFolders = childFolders(null);

  return (
    <div className="relative">
      {rootFolders.map((f) => renderFolder(f, 0))}

      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          {ctxMenu.type === "folder" && (
            <>
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                onClick={ctxNewDocument}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                New page
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                onClick={ctxNewSubfolder}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400"
                >
                  <path d="M12 10v6M9 13h6" />
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                New subfolder
              </button>
              <div className="mx-2 my-1 border-t border-zinc-100" />
            </>
          )}
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            onClick={ctxRename}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-400"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            onClick={ctxDelete}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
