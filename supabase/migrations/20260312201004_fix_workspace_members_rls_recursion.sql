-- Fix infinite recursion: wm_select was self-referencing workspace_members
-- which caused recursion when workspaces_select_member also queries workspace_members.
-- Instead, just check if the current user owns the row directly.
drop policy if exists "wm_select" on public.workspace_members;
create policy "wm_select" on public.workspace_members
  for select using (user_id = auth.uid());
