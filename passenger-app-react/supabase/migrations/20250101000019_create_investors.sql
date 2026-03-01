-- Investors: name and amount can be anonymous (together or separately).
-- Contact (email/phone) optional for messaging.
create table public.investors (
  id                uuid primary key default gen_random_uuid(),
  name              text,
  amount            numeric(12, 2),
  name_is_anonymous boolean not null default false,
  amount_is_anonymous boolean not null default false,
  contact_email     text,
  contact_phone     text,
  created_at        timestamptz not null default now()
);

comment on table public.investors is 'Company investors; name/amount can be anonymous; contact optional.';
comment on column public.investors.name_is_anonymous is 'If true, name is not shown in lists.';
comment on column public.investors.amount_is_anonymous is 'If true, amount is excluded from public total and not shown.';

create index idx_investors_created_at on public.investors(created_at desc);

-- Allow anonymous insert (e.g. from app) and select for showcasing
alter table public.investors enable row level security;

create policy "Allow insert for anon and authenticated"
  on public.investors for insert
  with check (true);

create policy "Allow select for anon and authenticated"
  on public.investors for select
  using (true);
