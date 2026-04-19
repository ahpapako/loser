-- Supabase setup for the OCR Bet Tracker app.
-- Run this in the Supabase SQL Editor for the project used by .env.local.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  image_url text not null,
  match_count integer not null default 0 check (match_count >= 0),
  total_odds numeric(10, 2) not null default 0 check (total_odds >= 0),
  bookmaker_stake_amount numeric(10, 2) not null default 0 check (bookmaker_stake_amount >= 0),
  stake_amount numeric(10, 2) not null default 0 check (stake_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'won', 'lost'))
);

create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(10, 2) not null default 100 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tickets
add column if not exists stake_amount numeric(10, 2) not null default 0 check (stake_amount >= 0);

alter table public.tickets
add column if not exists bookmaker_stake_amount numeric(10, 2) not null default 0 check (bookmaker_stake_amount >= 0);

create index if not exists tickets_created_at_idx on public.tickets (created_at desc);
create index if not exists tickets_user_id_created_at_idx on public.tickets (user_id, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id::text = auth.uid()::text
  );
$$;

alter table public.admins enable row level security;
alter table public.tickets enable row level security;
alter table public.user_wallets enable row level security;

drop policy if exists "Admins are readable by their owner" on public.admins;
create policy "Admins are readable by their owner"
on public.admins
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can manage admins" on public.admins;
create policy "Admins can manage admins"
on public.admins
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read their own wallet" on public.user_wallets;
create policy "Users can read their own wallet"
on public.user_wallets
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated users can read all tickets" on public.tickets;
create policy "Authenticated users can read all tickets"
on public.tickets
for select
to authenticated
using (true);

drop policy if exists "Users can create their own tickets" on public.tickets;
-- New tickets are created through public.place_ticket so wallet debits stay atomic.

drop policy if exists "Admins can update tickets" on public.tickets;
create policy "Admins can update tickets"
on public.tickets
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete tickets" on public.tickets;
create policy "Admins can delete tickets"
on public.tickets
for delete
to authenticated
using (public.is_admin());

create or replace function public.get_my_wallet_balance()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric(10, 2);
begin
  if v_user_id is null then
    raise exception 'User is not authenticated';
  end if;

  insert into public.user_wallets (user_id, balance)
  values (v_user_id, 100)
  on conflict (user_id) do nothing;

  select balance
  into v_balance
  from public.user_wallets
  where user_id = v_user_id;

  return v_balance;
end;
$$;

drop function if exists public.place_ticket(text, integer, numeric, numeric);
drop function if exists public.place_ticket(text, integer, numeric, numeric, numeric);

create or replace function public.place_ticket(
  p_image_url text,
  p_match_count integer,
  p_total_odds numeric,
  p_bookmaker_stake_amount numeric,
  p_stake_amount numeric
)
returns table(ticket_id uuid, balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric(10, 2);
  v_ticket_id uuid;
begin
  if v_user_id is null then
    raise exception 'User is not authenticated';
  end if;

  if p_image_url is null or length(trim(p_image_url)) = 0 then
    raise exception 'Ticket image is required';
  end if;

  if p_stake_amount is null or p_stake_amount <= 0 then
    raise exception 'Stake amount must be greater than zero';
  end if;

  insert into public.user_wallets (user_id, balance)
  values (v_user_id, 100)
  on conflict (user_id) do nothing;

  select user_wallets.balance
  into v_balance
  from public.user_wallets
  where user_wallets.user_id = v_user_id
  for update;

  if v_balance < p_stake_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  update public.user_wallets
  set
    balance = public.user_wallets.balance - p_stake_amount,
    updated_at = now()
  where user_id = v_user_id
  returning public.user_wallets.balance into v_balance;

  insert into public.tickets (
    user_id,
    image_url,
    match_count,
    total_odds,
    bookmaker_stake_amount,
    stake_amount,
    status
  )
  values (
    v_user_id,
    p_image_url,
    greatest(coalesce(p_match_count, 0), 0),
    greatest(coalesce(p_total_odds, 0), 0),
    greatest(coalesce(p_bookmaker_stake_amount, 0), 0),
    p_stake_amount,
    'pending'
  )
  returning id into v_ticket_id;

  ticket_id := v_ticket_id;
  balance := v_balance;
  return next;
end;
$$;

grant execute on function public.get_my_wallet_balance() to authenticated;
grant execute on function public.place_ticket(text, integer, numeric, numeric, numeric) to authenticated;
grant select on public.user_wallets to authenticated;

insert into storage.buckets (id, name, public)
values ('tickets_images', 'tickets_images', true)
on conflict (id) do update set public = true;

drop policy if exists "Ticket images are readable" on storage.objects;
create policy "Ticket images are readable"
on storage.objects
for select
to authenticated
using (bucket_id = 'tickets_images');

drop policy if exists "Users can upload ticket images" on storage.objects;
create policy "Users can upload ticket images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tickets_images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "Users and admins can update ticket images" on storage.objects;
create policy "Users and admins can update ticket images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tickets_images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id = 'tickets_images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "Users and admins can delete ticket images" on storage.objects;
create policy "Users and admins can delete ticket images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tickets_images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

-- After creating your first admin user in Authentication, run this with that user's UUID:
-- insert into public.admins (user_id) values ('00000000-0000-0000-0000-000000000000');
