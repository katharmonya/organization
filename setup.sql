-- Run this once in Supabase: SQL Editor > New query > paste > Run
-- IMPORTANT: replace YOUR_ADMIN_EMAIL (appears twice) with the email of your admin account.

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  contact text not null check (contact ~ '^[0-9+ ()-]{7,20}$'),
  created_at timestamptz not null default now()
);

-- Prevent the same number from registering twice
create unique index attendees_contact_key
  on public.attendees (regexp_replace(contact, '[^0-9]', '', 'g'));

-- Lock the table down, then open only what is needed
alter table public.attendees enable row level security;

-- Anyone (visitors) can register, but cannot read anything back
create policy "visitors can register"
  on public.attendees for insert
  to anon, authenticated
  with check (true);

-- Only the admin account can view the list
create policy "admin can read"
  on public.attendees for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

-- Only the admin account can remove entries
create policy "admin can delete"
  on public.attendees for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');
