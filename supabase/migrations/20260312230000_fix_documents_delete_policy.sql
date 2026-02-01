-- Fix: documents_delete policy requires owner-level (rank >= 4) but should
-- allow editors (rank >= 3) to match folders_delete and documents_insert.
-- Also switch from get_document_role to get_workspace_role for consistency
-- with folders_delete — document deletion is a workspace-level operation.

drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents
  for delete using (
    public.role_rank(public.get_workspace_role(workspace_id, auth.uid())) >= 3
  );
