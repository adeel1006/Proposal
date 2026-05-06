create table if not exists public.customers (
  id text primary key,
  company_id text references public.companies(id) on delete set null,
  name text not null,
  email text,
  phone_number text,
  business_website text,
  required_service text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_company_id_idx
  on public.customers (company_id);

create index if not exists customers_created_at_idx
  on public.customers (created_at desc);

create index if not exists customers_name_idx
  on public.customers (name);

create index if not exists customers_email_idx
  on public.customers (email);

alter table public.customers enable row level security;

drop policy if exists "customers_select" on public.customers;
create policy "customers_select"
  on public.customers
  for select
  using (true);

drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert"
  on public.customers
  for insert
  with check (true);

drop policy if exists "customers_update" on public.customers;
create policy "customers_update"
  on public.customers
  for update
  using (true)
  with check (true);

drop policy if exists "customers_delete" on public.customers;
create policy "customers_delete"
  on public.customers
  for delete
  using (true);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at_timestamp();

alter table public.proposals
add column if not exists customer_id text references public.customers(id) on delete set null;

alter table public.draft_proposals
add column if not exists customer_id text references public.customers(id) on delete set null;

create index if not exists proposals_customer_id_idx
  on public.proposals (customer_id);

create index if not exists draft_proposals_customer_id_idx
  on public.draft_proposals (customer_id);
