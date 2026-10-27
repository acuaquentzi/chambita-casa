-- Chambita Casa: esquema de Supabase.
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → cambia los 2 correos → Run.

-- 1) Quién tiene acceso (solo estas personas pueden leer y escribir).
create table if not exists public.members (
  email text primary key,
  name  text not null
);
insert into public.members (email, name) values
  ('alecuaquentzi@gmail.com', 'Alejandro'),
  ('tjacky06@gmail.com', 'Pareja')
on conflict (email) do update set name = excluded.name;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

-- 2) Todos los datos de la app (tareas, áreas, comentarios, fechas movidas, preferencias) como documentos JSON.
create table if not exists public.docs (
  path       text primary key,
  coll       text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create index if not exists docs_coll_idx on public.docs (coll);

create or replace function public.touch_docs() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs for each row execute function public.touch_docs();

-- Fusiona solo los campos enviados, para que dos ediciones al mismo tiempo no se pisen.
create or replace function public.merge_doc(p_path text, p_data jsonb) returns void
language sql security invoker set search_path = public as $$
  insert into public.docs (path, coll, data)
  values (p_path, regexp_replace(p_path, '/[^/]+$', ''), p_data)
  on conflict (path) do update set data = public.docs.data || excluded.data
$$;

-- 3) Seguridad: nadie fuera de members ve ni toca nada.
alter table public.members enable row level security;
alter table public.docs enable row level security;

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_member());

drop policy if exists docs_all on public.docs;
create policy docs_all on public.docs for all to authenticated
  using (public.is_member()) with check (public.is_member());

-- 4) Cambios en tiempo real entre los dos teléfonos.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
