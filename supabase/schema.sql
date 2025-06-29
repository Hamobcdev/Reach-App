-- =============================
-- ✅ TABLE: kyc_data
-- =============================
create table if not exists public.kyc_data (
  user_id uuid primary key,
  firstName text not null,
  lastName text not null,
  phone text not null,
  tier text check (tier in ('INSUFFICIENT', 'BASIC', 'STANDARD', 'ENHANCED')) default 'INSUFFICIENT',
  status text check (status in ('pending', 'verified', 'rejected')) default 'pending',
  country text,
  birthdate date,
  created_at timestamp default now()
);

alter table public.kyc_data enable row level security;

create policy "KYC: User can access their data"
  on public.kyc_data
  for all
  to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================
-- ✅ TABLE: cards
-- =============================
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  cardNumber text,
  cvv text,
  expiryDate text,
  amount numeric,
  status text check (status in ('pending', 'active', 'expired', 'blocked')) default 'pending',
  stripe_issuing_id text,
  chainlink_vrf_hash text,
  created_at timestamp default now()
);

alter table public.cards enable row level security;

create policy "Cards: User can access their cards"
  on public.cards
  for all
  to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================
-- ✅ TABLE: payments
-- =============================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  amount numeric not null,
  method text check (method in ('stripe', 'crypto', 'mobile', 'cash')) default 'stripe',
  status text check (status in ('pending', 'completed', 'failed')) default 'pending',
  stripe_payment_intent text,
  crypto_tx_hash text,
  created_at timestamp default now()
);

alter table public.payments enable row level security;

create policy "Payments: User can access their payments"
  on public.payments
  for all
  to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================
-- ✅ TABLE: events (for audit logging)
-- =============================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  type text not null,
  data jsonb,
  created_at timestamp default now()
);

alter table public.events enable row level security;

create policy "Events: User can access their own events"
  on public.events
  for all
  to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
