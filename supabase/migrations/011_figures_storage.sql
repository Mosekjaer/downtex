-- Create a storage bucket for caching figure images (10 MB limit per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('figures', 'figures', false, 10485760);

-- SELECT: workspace members can read figures within their workspace.
-- Path format: {workspace_id}/{figure_id}.{ext}
create policy "figures_select"
  on storage.objects for select
  using (
    bucket_id = 'figures'
    and exists (
      select 1
        from public.workspace_members
       where workspace_id = (storage.foldername(name))[1]::uuid
         and user_id = auth.uid()
    )
  );

-- INSERT: service role only
create policy "figures_insert_service"
  on storage.objects for insert
  with check (
    bucket_id = 'figures'
    and (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- UPDATE: service role only
create policy "figures_update_service"
  on storage.objects for update
  using (
    bucket_id = 'figures'
    and (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- DELETE: service role only
create policy "figures_delete_service"
  on storage.objects for delete
  using (
    bucket_id = 'figures'
    and (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );
