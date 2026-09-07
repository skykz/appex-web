update public.lessons set emoji = '' where emoji <> '';

alter table public.lessons alter column emoji set default '';
