create table public.payment_methods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  payment_type public.payment_type not null default 'card',
  label        text not null, -- 'Visa •••• 4242'
  is_default   boolean not null default false,
  card_brand   text, -- 'visa', 'mastercard'
  card_last4   text, -- '4242'
  expires_at   date,
  created_at   timestamptz not null default now()
);

create index idx_payment_methods_user on public.payment_methods(user_id);

-- Add FK from profiles to payment_methods now that both tables exist
alter table public.profiles
  add constraint fk_profiles_default_payment
  foreign key (default_payment_method_id)
  references public.payment_methods(id)
  on delete set null;
