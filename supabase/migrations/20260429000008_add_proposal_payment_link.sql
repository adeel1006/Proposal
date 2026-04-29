alter table if exists public.proposals
  add column if not exists payment_link text;
