-- Seed data for local development
-- Note: In production, users are created via Supabase Auth triggers.
-- This seed file creates test data for the public tables directly.

-- Test users (these would normally be created by the auth trigger)
insert into public.users (id, display_name, avatar_url) values
  ('00000000-0000-0000-0000-000000000001', 'Alice Student', null),
  ('00000000-0000-0000-0000-000000000002', 'Bob Researcher', null);

-- Personal workspaces
insert into public.workspaces (id, name, owner_id, type) values
  ('10000000-0000-0000-0000-000000000001', 'Alice''s Workspace', '00000000-0000-0000-0000-000000000001', 'personal'),
  ('10000000-0000-0000-0000-000000000002', 'Bob''s Workspace', '00000000-0000-0000-0000-000000000002', 'personal');

-- Team workspace
insert into public.workspaces (id, name, owner_id, type) values
  ('10000000-0000-0000-0000-000000000003', 'CS101 Project', '00000000-0000-0000-0000-000000000001', 'team');

-- Workspace memberships
insert into public.workspace_members (workspace_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'editor');

-- Sample folders
insert into public.folders (id, workspace_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Reports', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Deliverables', '00000000-0000-0000-0000-000000000001');

-- Sample documents
insert into public.documents (id, folder_id, workspace_id, title, created_by) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Lab Report 1', '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Project Proposal', '00000000-0000-0000-0000-000000000001');
