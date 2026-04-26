-- Tabela wiadomosci miedzy adminem a userem
create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null, -- format: "min(user1,user2)|max(user1,user2)"
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists admin_messages_conversation_idx on public.admin_messages(conversation_id, created_at);
create index if not exists admin_messages_recipient_unread_idx on public.admin_messages(recipient_id, read_at);

alter table public.admin_messages enable row level security;

-- User widzi wiadomosci ktore sam wyslal lub do niego
drop policy if exists "Users see their messages" on public.admin_messages;
create policy "Users see their messages" on public.admin_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users send messages" on public.admin_messages;
create policy "Users send messages" on public.admin_messages
  for insert with check (auth.uid() = sender_id);

drop policy if exists "Users mark as read" on public.admin_messages;
create policy "Users mark as read" on public.admin_messages
  for update using (auth.uid() = recipient_id);
