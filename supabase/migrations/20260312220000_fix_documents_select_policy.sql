-- Fix: documents_select policy uses get_document_role(id, ...) which self-joins
-- the documents table. During INSERT ... RETURNING (used by Supabase client's
-- .insert().select()), PostgreSQL evaluates the SELECT policy on the new row.
-- The self-referential get_document_role call fails for the not-yet-visible row.
--
-- Fix: add get_workspace_role check as first OR condition. It short-circuits
-- for workspace members (the common case) without querying the documents table.
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select using (
    public.get_workspace_role(workspace_id, auth.uid()) is not null
    or public.get_document_role(id, auth.uid()) is not null
    or public.is_public_document(id)
  );
