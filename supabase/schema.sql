-- Run in the ClearPath project's Supabase SQL Editor.
create table if not exists public.user_finances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"debts":[],"budget":[],"bills":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_finances enable row level security;
revoke all on public.user_finances from anon;
grant select, insert, update, delete on public.user_finances to authenticated;
drop policy if exists "Own finances only" on public.user_finances;
create policy "Own finances only" on public.user_finances
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
