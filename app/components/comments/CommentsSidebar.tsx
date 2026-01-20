import { useState } from "react";
import { CommentThread } from "./CommentThread";

interface Reply {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

interface Comment {
  id: string;
  anchorTextPreview: string;
  body: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorUserId: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  replies: Reply[];
}

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  currentUserId: string;
  isDocumentOwner: boolean;
  canComment: boolean;
  onAnchorClick?: (commentId: string) => void;
}

export function CommentsSidebar({
  isOpen,
  onClose,
  comments,
  currentUserId,
  isDocumentOwner,
  canComment,
  onAnchorClick,
}: CommentsSidebarProps) {
  const [tab, setTab] = useState<"open" | "resolved">("open");

  const openComments = comments.filter((c) => !c.resolvedAt);
  const resolvedComments = comments.filter((c) => c.resolvedAt);
  const displayedComments = tab === "open" ? openComments : resolvedComments;

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-[300px] flex-shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("open")}
            className={`rounded px-2 py-1 text-xs font-medium ${
              tab === "open"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Open ({openComments.length})
          </button>
          <button
            onClick={() => setTab("resolved")}
            className={`rounded px-2 py-1 text-xs font-medium ${
              tab === "resolved"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Resolved ({resolvedComments.length})
          </button>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:text-zinc-700"
          aria-label="Close comments"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayedComments.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-zinc-400">
            {tab === "open" ? "No open comments" : "No resolved comments"}
          </div>
        ) : (
          displayedComments.map((comment) => (
            <CommentThread
              key={comment.id}
              commentId={comment.id}
              anchorTextPreview={comment.anchorTextPreview}
              body={comment.body}
              authorName={comment.authorName}
              authorAvatarUrl={comment.authorAvatarUrl}
              authorUserId={comment.authorUserId}
              createdAt={comment.createdAt}
              resolvedAt={comment.resolvedAt}
              replies={comment.replies}
              currentUserId={currentUserId}
              isDocumentOwner={isDocumentOwner}
              canComment={canComment}
              onAnchorClick={() => onAnchorClick?.(comment.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
