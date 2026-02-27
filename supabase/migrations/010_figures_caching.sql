-- Extend figures table with caching and repository reference columns.

alter table public.figures
  add column workspace_repository_id uuid
    references public.workspace_repositories(id) on delete set null;

alter table public.figures
  add column cached_image_path text;

alter table public.figures
  add column cached_image_format text
    check (cached_image_format in ('svg', 'png'));

alter table public.figures
  add column file_type text not null default 'drawio'
    check (file_type in ('drawio', 'png', 'jpg', 'jpeg', 'gif', 'svg'));
