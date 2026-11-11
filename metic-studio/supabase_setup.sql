-- Metic Studio: run once in the Supabase SQL Editor.
-- Everything is private: each table and the image bucket only allow the signed-in owner.

create table if not exists public.drops (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  theme text not null default '',
  status text not null default 'planning' check (status in ('planning', 'in progress', 'launched')),
  cover text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  drop_id uuid references public.drops(id) on delete set null,
  name text not null,
  type text not null default 'Tee',
  side text not null default 'quiet' check (side in ('quiet', 'loud', 'both')),
  stage text not null default 'idea' check (stage in ('idea', 'sketch', 'mockup', 'sample', 'ready', 'launched')),
  colourways text[] not null default '{}',
  price numeric(8, 2),
  supplier text not null default '',
  notes text not null default '',
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null default '',
  images text[] not null default '{}',
  side text check (side in ('quiet', 'loud', 'both')),
  created_at timestamptz not null default now()
);

create table if not exists public.brand (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  sections jsonb not null default '[]'
);

alter table public.drops enable row level security;
alter table public.products enable row level security;
alter table public.notes enable row level security;
alter table public.brand enable row level security;

create policy "owner only" on public.drops for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner only" on public.products for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner only" on public.notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner only" on public.brand for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private image bucket. Each user's images live in a folder named after their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio', 'studio', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
on conflict (id) do nothing;

create policy "studio owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);
