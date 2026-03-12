create table public.document_snapshots (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  label text not null,
  content_json jsonb not null,
  type text not null check (type in ('automatic', 'manual')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_snapshots_document_date on public.document_snapshots (document_id, created_at desc);
