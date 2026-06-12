-- GigGlobe initial schema (see AGENTS.md for the data model)
-- Every table has user_id + RLS so the app is multi-user safe from day 1.

-- artists: unique artists (reused across multiple gigs)
create table artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

-- venues: locations (venue or festival)
create table venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  type text not null check (type in ('venue', 'festival')),
  city text,
  country text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz default now()
);

-- gigs: the performance itself
create table gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  artist_id uuid references artists not null,
  venue_id uuid references venues not null,
  gig_date date not null,
  notes text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz default now()
);

-- media: photos and videos per gig (files live in Storage, not here)
create table media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  gig_id uuid references gigs not null,
  storage_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  created_at timestamptz default now()
);

-- Indexes for common lookups
create index artists_user_id_idx on artists (user_id);
create index venues_user_id_idx on venues (user_id);
create index gigs_user_id_idx on gigs (user_id);
create index gigs_artist_id_idx on gigs (artist_id);
create index gigs_venue_id_idx on gigs (venue_id);
create index media_user_id_idx on media (user_id);
create index media_gig_id_idx on media (gig_id);

-- Row Level Security: users can only touch their own rows. No exceptions.
alter table artists enable row level security;
alter table venues enable row level security;
alter table gigs enable row level security;
alter table media enable row level security;

create policy "Users manage own artists" on artists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own venues" on venues
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own gigs" on gigs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own media" on media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
