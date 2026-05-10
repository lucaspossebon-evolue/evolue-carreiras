-- Evolue Carreiras - estrutura sugerida para Admin MVP
-- Rode este arquivo no SQL Editor do Supabase.

alter table public.profiles
  add column if not exists role text default 'candidate',
  add column if not exists plano text default 'free',
  add column if not exists selo text default 'bronze',
  add column if not exists career_points integer default 0,
  add column if not exists curriculos_emitidos integer default 0,
  add column if not exists area_interesse text,
  add column if not exists cidade text,
  add column if not exists telefone text,
  add column if not exists escolaridade text,
  add column if not exists experiencia text,
  add column if not exists status_admin text default 'novo',
  add column if not exists prioridade_admin text default 'normal',
  add column if not exists ultima_interacao timestamptz,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  score integer not null default 0,
  nivel text not null default 'Bronze',
  respostas jsonb not null default '{}'::jsonb,
  faltantes jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.apresentacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  texto text not null,
  tipo text default 'curta',
  created_at timestamptz default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references auth.users(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  nota text not null,
  created_at timestamptz default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.diagnosticos enable row level security;
alter table public.apresentacoes enable row level security;
alter table public.admin_notes enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "diagnosticos_owner_or_admin" on public.diagnosticos;
create policy "diagnosticos_owner_or_admin"
on public.diagnosticos for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "apresentacoes_owner_or_admin" on public.apresentacoes;
create policy "apresentacoes_owner_or_admin"
on public.apresentacoes for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin_notes_admin_only" on public.admin_notes;
create policy "admin_notes_admin_only"
on public.admin_notes for all
using (public.is_admin())
with check (public.is_admin());

-- Depois de criar seu usuário, promova-o manualmente:
-- update public.profiles set role = 'admin' where email = 'seu-email@dominio.com';
