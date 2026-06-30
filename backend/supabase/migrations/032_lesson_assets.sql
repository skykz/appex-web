-- Public bucket for CMS lesson download blocks (PDF, DOCX, etc.).
-- Admin uploads via service role; learners download via the stored public URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-assets', 'lesson-assets', true, 20971520, null)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
