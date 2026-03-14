-- workspace_repositories: GitHub repository connections per workspace

create table public.workspace_repositories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  github_repo text not null,
  display_name text not null,
  connected_by uuid not null references public.users(id),
  status text not null default 'active' check (status in ('active', 'error', 'disconnected')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, github_repo)
);

create index idx_workspace_repositories_workspace_id on public.workspace_repositories(workspace_id);

-- Enable RLS

alter table public.workspace_repositories enable row level security;

-- RLS policies

create policy "wr_select" on public.workspace_repositories
  for select using (
    public.get_workspace_role(workspace_id, auth.uid()) is not null
  );

create policy "wr_insert" on public.workspace_repositories
  for insert with check (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );

create policy "wr_update" on public.workspace_repositories
  for update using (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );

create policy "wr_delete" on public.workspace_repositories
  for delete using (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );
