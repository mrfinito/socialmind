-- Tabela briefów klientów
create table if not exists public.client_briefs (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  agency_user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  
  -- Dane zaproszenia
  client_name text,
  client_email text,
  business_name text,
  
  -- Status
  status text default 'pending' check (status in ('pending', 'submitted', 'processed')),
  
  -- Odpowiedzi klienta
  responses jsonb,
  
  -- Wygenerowane wyniki
  generated_dna jsonb,
  generated_strategy jsonb,
  
  expires_at timestamptz default (now() + interval '30 days'),
  submitted_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- RLS: agencja widzi swoje briefy
alter table public.client_briefs enable row level security;

drop policy if exists "Agency views own briefs" on public.client_briefs;
create policy "Agency views own briefs" on public.client_briefs
  for select using (auth.uid() = agency_user_id);

drop policy if exists "Agency creates briefs" on public.client_briefs;
create policy "Agency creates briefs" on public.client_briefs
  for insert with check (auth.uid() = agency_user_id);

drop policy if exists "Agency updates own briefs" on public.client_briefs;
create policy "Agency updates own briefs" on public.client_briefs
  for update using (auth.uid() = agency_user_id);

drop policy if exists "Agency deletes own briefs" on public.client_briefs;
create policy "Agency deletes own briefs" on public.client_briefs
  for delete using (auth.uid() = agency_user_id);

-- Brief jest publicznie dostępny po tokenie (klient nie ma konta)
-- Odczyt/zapis przez serwis role w API, nie przez RLS

-- Tabela sesji czatu asystenta
create table if not exists public.assistant_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.assistant_chats enable row level security;

drop policy if exists "Users manage own chats" on public.assistant_chats;
create policy "Users manage own chats" on public.assistant_chats
  for all using (auth.uid() = user_id);

create index if not exists assistant_chats_project_idx on public.assistant_chats(project_id);
create index if not exists assistant_chats_user_idx on public.assistant_chats(user_id);
create index if not exists client_briefs_agency_idx on public.client_briefs(agency_user_id);
create index if not exists client_briefs_token_idx on public.client_briefs(token);
