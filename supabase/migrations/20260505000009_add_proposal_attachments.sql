alter table public.proposals
add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.draft_proposals
add column if not exists attachments jsonb not null default '[]'::jsonb;
