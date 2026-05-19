-- Supabase Storage bucket for learner-submitted files.
-- Backend uploads with the service role; public URLs are stored on lesson_submissions.attachment_url.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-submissions', 'lesson-submissions', true, 15728640, null)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
