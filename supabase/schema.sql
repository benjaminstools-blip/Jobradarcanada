-- ============================================================
-- JobRadar Schema + RLS Policies
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. cv_profiles
create table if not exists cv_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  full_name text,
  current_job_title text,
  years_of_experience int,
  technical_skills jsonb,
  professional_summary text,
  raw_cv_text text,
  cv_file_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- NOC 2021 unit group code for the candidate's own occupation, assigned at CV
-- parse time and constrained to the 516 real codes (see lib/noc.ts). Nullable
-- on purpose: a CV with no clear occupation, or a parse that produced a code
-- outside the set, stores null rather than a plausible-looking wrong code.
-- TEER is not stored — in NOC 2021 it is the second digit of the code.
alter table cv_profiles add column if not exists noc_code text;

alter table cv_profiles drop constraint if exists cv_profiles_noc_code_check;
alter table cv_profiles add constraint cv_profiles_noc_code_check
  check (noc_code is null or noc_code ~ '^[0-9]{5}$');

alter table cv_profiles enable row level security;

drop policy if exists "Users can manage their own CV profile" on cv_profiles;
create policy "Users can manage their own CV profile"
  on cv_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source text check (source in ('linkedin', 'indeed', 'eluta', 'workopolis')) not null,
  job_title text not null,
  company_name text,
  location text,
  job_description text,
  apply_url text,
  match_score int,
  fetched_at timestamptz default now()
);

alter table jobs enable row level security;

drop policy if exists "Users can manage their own jobs" on jobs;
create policy "Users can manage their own jobs"
  on jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reset the source check on already-created databases (create table if not
-- exists above does not alter an existing constraint).
--
-- DESTRUCTIVE: Jobberman was a Nigeria-only board and is no longer a source.
-- Any rows left over from it are deleted here, because the tightened constraint
-- below cannot be added while they exist. These are stale scraped listings that
-- the app no longer renders; re-running a search repopulates the feed.
delete from jobs where source = 'jobberman';

alter table jobs drop constraint if exists jobs_source_check;
alter table jobs add constraint jobs_source_check
  check (source in ('linkedin', 'indeed', 'eluta', 'workopolis'));

-- Province/territory, derived from the free-text `location` at insert time and
-- only for Canadian searches (see lib/provinces.ts). Nullable on purpose:
-- "Remote", "Canada", and "Greater Toronto Area" name no province, and a null
-- is honest where a guess would be wrong. Rows inserted before this column
-- existed stay null and show under "Other" in the jobs filter.
alter table jobs add column if not exists province text;

alter table jobs drop constraint if exists jobs_province_check;
alter table jobs add constraint jobs_province_check
  check (province is null or province in (
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ));

create index if not exists jobs_user_province_idx on jobs (user_id, province);

-- 3. applications
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  status text check (
    status in ('Saved','Applied','Screening','Technical Interview','Offer','Rejected')
  ) not null default 'Applied',
  status_updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

alter table applications enable row level security;

drop policy if exists "Users can manage their own applications" on applications;
create policy "Users can manage their own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. user_api_keys
create table if not exists user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  anthropic_api_key text,
  apify_api_key text,
  updated_at timestamptz default now()
);

alter table user_api_keys enable row level security;

drop policy if exists "Users can manage their own API keys" on user_api_keys;
create policy "Users can manage their own API keys"
  on user_api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. generated_documents
create table if not exists generated_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  job_id     uuid references jobs(id) on delete cascade not null,
  type       text check (type in ('cover_letter', 'tailored_cv')) not null,
  content    text not null,
  created_at timestamptz default now(),
  unique (user_id, job_id, type)
);

alter table generated_documents enable row level security;

drop policy if exists "Users can manage their own generated documents" on generated_documents;
create policy "Users can manage their own generated documents"
  on generated_documents for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

