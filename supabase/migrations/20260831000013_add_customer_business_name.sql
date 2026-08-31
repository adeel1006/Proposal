alter table public.customers
  add column if not exists business_name text;

create index if not exists customers_business_name_idx
  on public.customers (business_name);
