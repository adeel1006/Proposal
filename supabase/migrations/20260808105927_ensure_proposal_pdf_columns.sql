-- Repairs projects where an earlier PDF migration was recorded but the column is absent.
alter table if exists public.proposals
  add column if not exists pdf_base64 text,
  add column if not exists invoice_pdf_base64 text;
