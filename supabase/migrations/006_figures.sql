create table public.figures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  block_id text not null,
  github_repo text not null,
  github_path text not null,
  last_sha text,
  caption text not null default '',
  status text not null default 'active' check (status in ('active', 'error')),
  error_message text,
  updated_at timestamptz not null default now()
);

create index idx_figures_document on public.figures (document_id);
