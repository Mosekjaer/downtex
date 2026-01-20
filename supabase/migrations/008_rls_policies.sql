-- Helper functions for role resolution

create or replace function public.get_workspace_role(ws_id uuid, uid uuid)
returns text
language sql
security definer
stable
as $$
  select role from public.workspace_members
  where workspace_id = ws_id and user_id = uid;
$$;

create or replace function public.get_document_role(doc_id uuid, uid uuid)
returns text
language sql
security definer
stable
as $$
  select case
    when max(role_rank) = 4 then 'owner'
    when max(role_rank) = 3 then 'editor'
    when max(role_rank) = 2 then 'commenter'
    when max(role_rank) = 1 then 'viewer'
    else null
  end
  from (
    select case wm.role
      when 'owner' then 4 when 'editor' then 3
      when 'commenter' then 2 when 'viewer' then 1
    end as role_rank
    from public.workspace_members wm
    join public.documents d on d.workspace_id = wm.workspace_id
    where d.id = doc_id and wm.user_id = uid
    union all
    select case dc.role
      when 'owner' then 4 when 'editor' then 3
      when 'commenter' then 2 when 'viewer' then 1
    end as role_rank
    from public.document_collaborators dc
    where dc.document_id = doc_id and dc.user_id = uid
  ) roles;
$$;

create or replace function public.is_public_document(doc_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.document_public_links where document_id = doc_id
  );
$$;

create or replace function public.role_rank(r text)
returns integer
language sql
immutable
as $$
  select case r
    when 'owner' then 4 when 'editor' then 3
    when 'commenter' then 2 when 'viewer' then 1
    else 0
  end;
$$;

-- Enable RLS on all tables

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_collaborators enable row level security;
alter table public.document_public_links enable row level security;
alter table public.comments enable row level security;
alter table public.comment_replies enable row level security;
alter table public.figures enable row level security;
alter table public.document_snapshots enable row level security;

-- users: can read own row, update own row
create policy "users_select_own" on public.users
  for select using (id = auth.uid());
create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- workspaces: members can read
create policy "workspaces_select_member" on public.workspaces
  for select using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = id and user_id = auth.uid()
    )
  );
create policy "workspaces_insert" on public.workspaces
  for insert with check (owner_id = auth.uid());
create policy "workspaces_update_owner" on public.workspaces
  for update using (
    public.get_workspace_role(id, auth.uid()) = 'owner'
  );
create policy "workspaces_delete_owner" on public.workspaces
  for delete using (
    public.get_workspace_role(id, auth.uid()) = 'owner'
  );

-- workspace_members: visible to other members of same workspace
create policy "wm_select" on public.workspace_members
  for select using (
    exists (
      select 1 from public.workspace_members wm2
      where wm2.workspace_id = workspace_id and wm2.user_id = auth.uid()
    )
  );
create policy "wm_insert_owner" on public.workspace_members
  for insert with check (
    public.get_workspace_role(workspace_id, auth.uid()) = 'owner'
  );
create policy "wm_update_owner" on public.workspace_members
  for update using (
    public.get_workspace_role(workspace_id, auth.uid()) = 'owner'
  );
create policy "wm_delete_owner" on public.workspace_members
  for delete using (
    public.get_workspace_role(workspace_id, auth.uid()) = 'owner'
  );

-- folders: workspace members can read, editor+ can write
create policy "folders_select" on public.folders
  for select using (
    public.get_workspace_role(workspace_id, auth.uid()) is not null
  );
create policy "folders_insert" on public.folders
  for insert with check (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );
create policy "folders_update" on public.folders
  for update using (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );
create policy "folders_delete" on public.folders
  for delete using (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );

-- documents: workspace members, document collaborators, or public link
create policy "documents_select" on public.documents
  for select using (
    public.get_document_role(id, auth.uid()) is not null
    or public.is_public_document(id)
  );
create policy "documents_insert" on public.documents
  for insert with check (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );
create policy "documents_update" on public.documents
  for update using (
    public.role_rank(public.get_document_role(id, auth.uid())) >= 3
  );
create policy "documents_delete" on public.documents
  for delete using (
    public.role_rank(public.get_document_role(id, auth.uid())) >= 4
  );

-- document_collaborators: visible if you have document access, editable by editor+
create policy "dc_select" on public.document_collaborators
  for select using (
    public.get_document_role(document_id, auth.uid()) is not null
  );
create policy "dc_insert" on public.document_collaborators
  for insert with check (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );
create policy "dc_delete" on public.document_collaborators
  for delete using (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );

-- document_public_links: editor+ can manage
create policy "dpl_select" on public.document_public_links
  for select using (
    public.get_document_role(document_id, auth.uid()) is not null
    or exists (select 1 from public.document_public_links where document_id = document_public_links.document_id and token = document_public_links.token)
  );
create policy "dpl_insert" on public.document_public_links
  for insert with check (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );
create policy "dpl_delete" on public.document_public_links
  for delete using (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );

-- comments: readable by document viewers, writable by commenter+
create policy "comments_select" on public.comments
  for select using (
    public.get_document_role(document_id, auth.uid()) is not null
    or public.is_public_document(document_id)
  );
create policy "comments_insert" on public.comments
  for insert with check (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 2
  );
create policy "comments_update" on public.comments
  for update using (
    user_id = auth.uid()
    or public.role_rank(public.get_document_role(document_id, auth.uid())) >= 4
  );

-- comment_replies: same access as parent comment's document
create policy "cr_select" on public.comment_replies
  for select using (
    exists (
      select 1 from public.comments c
      where c.id = comment_id
      and (
        public.get_document_role(c.document_id, auth.uid()) is not null
        or public.is_public_document(c.document_id)
      )
    )
  );
create policy "cr_insert" on public.comment_replies
  for insert with check (
    exists (
      select 1 from public.comments c
      where c.id = comment_id
      and public.role_rank(public.get_document_role(c.document_id, auth.uid())) >= 2
    )
  );

-- figures: document access
create policy "figures_select" on public.figures
  for select using (
    public.get_document_role(document_id, auth.uid()) is not null
    or public.is_public_document(document_id)
  );
create policy "figures_insert" on public.figures
  for insert with check (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );
create policy "figures_update" on public.figures
  for update using (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );
create policy "figures_delete" on public.figures
  for delete using (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );

-- document_snapshots: document access for reading, editor+ for creating
create policy "snapshots_select" on public.document_snapshots
  for select using (
    public.get_document_role(document_id, auth.uid()) is not null
  );
create policy "snapshots_insert" on public.document_snapshots
  for insert with check (
    public.role_rank(public.get_document_role(document_id, auth.uid())) >= 3
  );
