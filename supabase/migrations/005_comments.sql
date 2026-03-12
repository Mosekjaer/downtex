create table public.comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.users(id),
  anchor_yjs_relative bytea not null,
  anchor_text_preview text not null,
  body text not null,
  resolved_at timestamptz,
  resolved_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_comments_document on public.comments (document_id);

create table public.comment_replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_comment_replies_comment on public.comment_replies (comment_id);
