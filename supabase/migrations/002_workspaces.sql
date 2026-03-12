create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  owner_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('personal', 'team')),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'commenter', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.handle_new_user_workspace()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  ws_id uuid;
begin
  insert into public.workspaces (name, owner_id, type)
  values (
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Personal') || '''s Workspace',
    new.id,
    'personal'
  )
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row execute function public.handle_new_user_workspace();
