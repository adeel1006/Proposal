alter table if exists public.proposals
  add column if not exists invoice_pdf_base64 text;
