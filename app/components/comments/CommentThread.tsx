import { useFetcher } from "react-router";
import { useState } from "react";

interface Reply {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

interface CommentThreadProps {
  commentId: string;
  anchorTextPreview: string;
  body: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorUserId: string;
  createdAt: string;
  resolvedAt: string | null;
  replies: Reply[];
  currentUserId: string;
  isDocumentOwner: boolean;
  canComment: boolean;
  onAnchorClick?: () => void;
}

export function CommentThread({
  commentId,
  anchorTextPreview,
  body,
  authorName,
  authorAvatarUrl,
  authorUserId,
  createdAt,
  resolvedAt,
  replies,
  currentUserId,
  isDocumentOwner,
  canComment,
  onAnchorClick,
}: CommentThreadProps) {
  const fetcher = useFetcher();
  const [replyText, setReplyText] = useState("");

  const canResolve = currentUserId === authorUserId || isDocumentOwner;

  function handleReply() {
    if (!replyText.trim()) return;
    fetcher.submit(
      { intent: "reply-comment", commentId, body: replyText },
      { method: "post" },
    );
    setReplyText("");
  }

  function handleResolve() {
    fetcher.submit(
      { intent: "resolve-comment", commentId },
      { method: "post" },
    );
  }

  return (
    <div className="border-b border-zinc-100 px-3 py-3">
      {anchorTextPreview && (
        <button
          onClick={onAnchorClick}
          className="mb-2 block w-full truncate rounded bg-amber-50 px-2 py-1 text-left text-xs text-amber-700 hover:bg-amber-100"
        >
          &ldquo;{anchorTextPreview}&rdquo;
        </button>
      )}

      <div className="flex items-start gap-2">
        {authorAvatarUrl ? (
          <img src={authorAvatarUrl} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-300 text-xs font-medium text-white">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-zinc-900">{authorName}</span>
            <span className="text-xs text-zinc-400">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-700">{body}</p>
        </div>
      </div>

      {replies.map((reply) => (
        <div key={reply.id} className="ml-8 mt-2 flex items-start gap-2">
          {reply.avatarUrl ? (
            <img src={reply.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-300 text-xs text-white">
              {reply.userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-zinc-900">{reply.userName}</span>
              <span className="text-xs text-zinc-400">
                {new Date(reply.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-zinc-600">{reply.body}</p>
          </div>
        </div>
      ))}

      <div className="mt-2 flex items-center gap-2">
        {canComment && !resolvedAt && (
          <>
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReply();
              }}
              placeholder="Reply..."
              className="flex-1 rounded border border-zinc-200 px-2 py-1 text-xs focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="rounded px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50 disabled:opacity-40"
            >
              Reply
            </button>
          </>
        )}
        {canResolve && !resolvedAt && (
          <button
            onClick={handleResolve}
            className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-zinc-700"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
