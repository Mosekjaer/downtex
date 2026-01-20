import { useState, useRef, useEffect, useCallback } from "react";
import { useFetcher, Link } from "react-router";

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
}

// ─── Context menu state ──────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  type: "folder" | "document";
  id: string;
  folderId?: string; // parent folder for documents
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesSearch(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.toLowerCase());
}

/**
 * Returns the set of folder IDs that should be visible given the search query.
 * A folder is visible if its name matches or any descendant folder/document matches.
 * When there is no query every folder is visible.
 */
function getVisibleFolderIds(
  folders: Folder[],
  documents: Document[],
  query: string,
): Set<string> {
  if (!query) return new Set(folders.map((f) => f.id));

  const visible = new Set<string>();

  // Mark folders whose name matches
  for (const f of folders) {
    if (matchesSearch(f.name, query)) {
      // Walk up to root so ancestor folders are visible too
      let current: Folder | undefined = f;
      while (current) {
        visible.add(current.id);
        current = folders.find((p) => p.id === current!.parent_folder_id);
      }
    }
  }

  // Mark folders that contain a matching document (and their ancestors)
  for (const d of documents) {
    if (matchesSearch(d.title, query)) {
      let current: Folder | undefined = folders.find((f) => f.id === d.folder_id);
      while (current) {
        visible.add(current.id);
        current = folders.find((p) => p.id === current!.parent_folder_id);
      }
    }
  }

  return visible;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FolderTree({
  folders,
  documents,
  workspaceId,
  isEditor,
  searchQuery = "",
}: FolderTreeProps) {
  const fetcher = useFetcher();

  // Expand / collapse
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)));

  // Drag-and-drop
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

  // Inline rename
  const [renaming, setRenaming] = useState<{ type: "folder" | "document"; id: string } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on outside click / Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
  }, [renaming]);

  // When searching, auto-expand matching folders
  useEffect(() => {
    if (searchQuery) {
      const vis = getVisibleFolderIds(folders, documents, searchQuery);
      setExpandedIds(vis);
    }
  }, [searchQuery, folders, documents]);

  // ── helpers ──

  const toggleExpand = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const childFolders = (parentId: string | null) =>
    folders.filter((f) => f.parent_folder_id === parentId);

  const folderDocs = (folderId: string) =>
    documents.filter((d) => d.folder_id === folderId);

  const visibleIds = getVisibleFolderIds(folders, documents, searchQuery);

  // ── drag handlers ──

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
      { method: "post" },
    );
  }

  // ── context menu actions ──

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
    fetcher.submit({ intent, [key]: ctxMenu.id }, { method: "post" });
    setCtxMenu(null);
  }

  function ctxNewSubfolder() {
    if (!ctxMenu || ctxMenu.type !== "folder") return;
    const name = prompt("Subfolder name:");
    if (!name) return;
    fetcher.submit(
      { intent: "create-folder", name, parentFolderId: ctxMenu.id },
      { method: "post" },
    );
    setCtxMenu(null);
  }

  function ctxMoveToFolder() {
    if (!ctxMenu || ctxMenu.type !== "document") return;
    const targetId = prompt("Enter target folder ID:");
    if (!targetId) return;
    fetcher.submit(
      { intent: "move-document", documentId: ctxMenu.id, targetFolderId: targetId },
      { method: "post" },
    );
    setCtxMenu(null);
  }

  function submitRename(value: string) {
    if (!renaming) return;
    if (renaming.type === "folder") {
      fetcher.submit(
        { intent: "rename-folder", folderId: renaming.id, name: value },
        { method: "post" },
      );
    } else {
      fetcher.submit(
        { intent: "rename-document", documentId: renaming.id, title: value },
        { method: "post" },
      );
    }
    setRenaming(null);
  }

  // ── render helpers ──

  function renderFolder(folder: Folder, depth: number) {
    if (!visibleIds.has(folder.id)) return null;

    const children = childFolders(folder.id);
    const docs = folderDocs(folder.id);
    const expanded = expandedIds.has(folder.id);
    const isDropTarget = dragOverFolderId === folder.id;
    const isRenamingThis = renaming?.type === "folder" && renaming.id === folder.id;

    // Filter docs when searching
    const filteredDocs = searchQuery
      ? docs.filter((d) => matchesSearch(d.title, searchQuery))
      : docs;

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 ${
            isDropTarget ? "bg-accent-100 ring-2 ring-accent-400" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onContextMenu={(e) =>
            isEditor
              ? handleContextMenu(e, { x: 0, y: 0, type: "folder", id: folder.id })
              : undefined
          }
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {/* Expand toggle */}
          <button
            onClick={() => toggleExpand(folder.id)}
            className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-700"
            aria-label={expanded ? "Collapse" : "Expand"}
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
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Folder name or rename input */}
          {isRenamingThis ? (
            <input
              ref={renameInputRef}
              defaultValue={folder.name}
              className="flex-1 rounded border border-zinc-300 px-1 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
              onBlur={(e) => submitRename(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename(e.currentTarget.value);
                if (e.key === "Escape") setRenaming(null);
              }}
            />
          ) : (
            <span className="flex-1 truncate select-none">{folder.name}</span>
          )}

          {/* Quick actions (editor only) */}
          {isEditor && !isRenamingThis && (
            <div className="hidden gap-0.5 group-hover:flex">
              <button
                onClick={() =>
                  fetcher.submit(
                    { intent: "create-document", folderId: folder.id },
                    { method: "post" },
                  )
                }
                className="rounded p-0.5 text-zinc-400 hover:text-zinc-700"
                title="New document"
              >
                +
              </button>
              <button
                onClick={() => {
                  const name = prompt("Subfolder name:");
                  if (!name) return;
                  fetcher.submit(
                    { intent: "create-folder", name, parentFolderId: folder.id },
                    { method: "post" },
                  );
                }}
                className="rounded p-0.5 text-zinc-400 hover:text-zinc-700"
                title="New subfolder"
              >
                /
              </button>
            </div>
          )}
        </div>

        {/* Children (folders + documents) */}
        {expanded && (
          <>
            {filteredDocs.map((doc) => renderDocument(doc, depth + 1))}
            {children.map((child) => renderFolder(child, depth + 1))}
          </>
        )}
      </div>
    );
  }

  function renderDocument(doc: Document, depth: number) {
    const isRenamingThis = renaming?.type === "document" && renaming.id === doc.id;

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
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        className="flex items-center rounded-md py-1 pr-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      >
        {isRenamingThis ? (
          <input
            ref={renameInputRef}
            defaultValue={doc.title}
            className="flex-1 rounded border border-zinc-300 px-1 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            onBlur={(e) => submitRename(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename(e.currentTarget.value);
              if (e.key === "Escape") setRenaming(null);
            }}
          />
        ) : (
          <Link
            to={`/workspace/${workspaceId}/${doc.id}`}
            className="flex-1 truncate"
          >
            {doc.title}
          </Link>
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
          className="fixed z-50 min-w-[160px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            onClick={ctxRename}
          >
            Rename
          </button>
          <button
            className="flex w-full px-3 py-1.5 text-sm text-red-600 hover:bg-zinc-100"
            onClick={ctxDelete}
          >
            Delete
          </button>
          {ctxMenu.type === "folder" && (
            <button
              className="flex w-full px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
              onClick={ctxNewSubfolder}
            >
              New subfolder
            </button>
          )}
          {ctxMenu.type === "document" && (
            <button
              className="flex w-full px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
              onClick={ctxMoveToFolder}
            >
              Move to folder...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
