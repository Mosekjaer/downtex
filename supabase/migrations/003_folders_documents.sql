create table public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_folders_workspace_parent on public.folders (workspace_id, parent_folder_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default 'Untitled',
  yjs_state bytea,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_workspace on public.documents (workspace_id);
create index idx_documents_folder on public.documents (folder_id);
