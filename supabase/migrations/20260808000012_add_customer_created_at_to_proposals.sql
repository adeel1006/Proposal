alter table public.proposals
add column if not exists customer_created_at timestamptz;

update public.proposals p
set customer_created_at = c.created_at
from public.customers c
where p.customer_id = c.id
  and p.customer_id is not null
  and p.customer_created_at is null;

create index if not exists proposals_customer_created_at_idx
  on public.proposals (customer_created_at desc);
