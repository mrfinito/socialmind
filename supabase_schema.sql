-- ═══════════════════════════════════════════════════════════════
-- SocialMind — Supabase Schema
-- Uruchom w: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────────
-- Extended user data (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free','pro','agency')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── PROJECTS ──────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  client text,
  emoji text default '🏢',
  color text default '#6366f1',
  selected_platforms text[] default array['facebook','instagram'],
  dna jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── DRAFTS (posts) ────────────────────────────────────────────
create table if not exists public.drafts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  status text default 'draft' check (status in ('draft','scheduled','published','archived')),
  topic text,
  platforms text[],
  goals text[],
  tones text[],
  content jsonb,
  dna jsonb,
  notes text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── MATERIALS ─────────────────────────────────────────────────
create table if not exists public.materials (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  type text,
  size text,
  data_url text,
  created_at timestamptz default now()
);

-- ── PERSONAS ──────────────────────────────────────────────────
create table if not exists public.personas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  name text,
  data jsonb,
  created_at timestamptz default now()
);

-- ── CAMPAIGNS ─────────────────────────────────────────────────
create table if not exists public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  name text,
  brief text,
  data jsonb,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — każdy widzi tylko swoje dane
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.drafts enable row level security;
alter table public.materials enable row level security;
alter table public.personas enable row level security;
alter table public.campaigns enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Projects
create policy "Users can CRUD own projects" on public.projects for all using (auth.uid() = user_id);

-- Drafts
create policy "Users can CRUD own drafts" on public.drafts for all using (auth.uid() = user_id);

-- Materials
create policy "Users can CRUD own materials" on public.materials for all using (auth.uid() = user_id);

-- Personas
create policy "Users can CRUD own personas" on public.personas for all using (auth.uid() = user_id);

-- Campaigns
create policy "Users can CRUD own campaigns" on public.campaigns for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS — auto-create profile on signup
-- ═══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- INDEXES — performance
-- ═══════════════════════════════════════════════════════════════

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists drafts_user_id_idx on public.drafts(user_id);
create index if not exists drafts_project_id_idx on public.drafts(project_id);
create index if not exists drafts_status_idx on public.drafts(status);
create index if not exists drafts_scheduled_at_idx on public.drafts(scheduled_at);
create index if not exists materials_project_id_idx on public.materials(project_id);

-- ═══════════════════════════════════════════════════════════════
-- DODATKOWE TABELE — uruchom w SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── INVITES ───────────────────────────────────────────────────
create table if not exists public.invites (
  id uuid default uuid_generate_v4() primary key,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  email text,
  created_by uuid references auth.users(id) on delete set null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  plan text default 'pro',
  note text,
  created_at timestamptz default now()
);

alter table public.invites enable row level security;
create policy "Admins manage invites" on public.invites for all using (
  exists (select 1 from public.profiles where id = auth.uid() and plan = 'agency')
);
create policy "Anyone can read own invite by token" on public.invites
  for select using (true);

-- ── CLIENT BRIEFS ─────────────────────────────────────────────
create table if not exists public.briefs (
  id uuid default uuid_generate_v4() primary key,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  client_name text,
  status text default 'pending' check (status in ('pending','completed')),
  responses jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.briefs enable row level security;
create policy "Users manage own briefs" on public.briefs for all using (auth.uid() = user_id);
create policy "Anyone can submit brief by token" on public.briefs for update using (true);
create policy "Anyone can read brief by token" on public.briefs for select using (true);

-- ── ONBOARDING ────────────────────────────────────────────────
alter table public.profiles add column if not exists onboarded boolean default false;
alter table public.profiles add column if not exists is_admin boolean default false;

create index if not exists invites_token_idx on public.invites(token);
create index if not exists briefs_token_idx on public.briefs(token);
