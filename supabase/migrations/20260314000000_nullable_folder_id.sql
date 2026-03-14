-- Allow documents to exist at workspace root without a folder
alter table public.documents alter column folder_id drop not null;
