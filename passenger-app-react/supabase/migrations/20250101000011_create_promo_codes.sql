create table public.promo_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  promo_type      public.promo_type not null,
  value           numeric(10,2) not null, -- percentage (0-100) or fixed NOK amount
  max_discount_nok numeric(10,2), -- cap for percentage discounts
  min_fare_nok    numeric(10,2) not null default 0,
  max_uses        int, -- null = unlimited
  used_count      int not null default 0,
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Track per-user promo usage
create table public.promo_usage (
  id            uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id),
  user_id       uuid not null references public.profiles(id),
  ride_id       uuid references public.rides(id),
  used_at       timestamptz not null default now(),
  unique(promo_code_id, user_id) -- one use per user per promo
);

create index idx_promo_codes_code on public.promo_codes(code) where is_active = true;
