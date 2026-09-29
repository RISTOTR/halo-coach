-- INFERRED CLEAN-DATABASE BASELINE, not a dump of hosted Halo.
-- Read docs/audit/HALO_DATABASE_FOUNDATION.md before use.
-- Never apply to the existing hosted project. No IF NOT EXISTS: schema drift must fail.
-- Requires Supabase-managed auth.users, auth.uid(), anon and authenticated roles.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false
);

create table public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_hours double precision,
  mood integer,
  energy integer,
  stress integer,
  steps double precision, -- current UI stores movement MINUTES; historical semantics unverified
  water_liters double precision,
  outdoor_minutes double precision,
  habits_summary text,
  habits_status text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date, type)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  frequency text not null,
  target_per_week integer not null default 5,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null,
  date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (user_id, habit_id) references public.habits(user_id, id) on delete cascade,
  unique (user_id, habit_id, date)
);

-- Separate legacy read contract. No evidence establishes a view or synchronization trigger.
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null,
  date date not null,
  completed boolean,
  foreign key (user_id, habit_id) references public.habits(user_id, id) on delete cascade
);

create table public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  title text not null,
  description text,
  category text not null default 'other',
  status text not null default 'pending',
  created_at timestamptz not null default now()
  -- Multiple goals per week are intentional. No unique(user_id, week_start).
);

create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  period text not null,
  content text not null, -- daily Markdown or weekly serialized JSON; NOT jsonb
  created_at timestamptz not null default now(),
  unique (user_id, date, period)
);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  lever_type text not null,
  lever_ref text, -- polymorphic metric key / habit UUID / custom string; no ordinary FK
  target_metric text not null,
  start_date date not null,
  end_date date,
  status text not null default 'active',
  baseline_days integer not null default 30,
  recommended_days integer not null default 7,
  hypothesis text,
  effort_estimate text not null default 'moderate',
  expected_impact text not null default 'moderate',
  confidence text not null default 'low',
  outcome jsonb,
  what_worked text[], -- read by review.get; writer currently updates outcome instead
  try_next text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.experiment_effects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null,
  metric_key text not null,
  baseline_avg double precision,
  experiment_avg double precision,
  delta double precision,
  baseline_rows integer,
  experiment_rows integer,
  baseline_start date,
  baseline_end date,
  experiment_start date,
  experiment_end date,
  method_version integer not null,
  foreign key (user_id, experiment_id) references public.experiments(user_id, id) on delete cascade
  -- RPC SQL unavailable: do not guess its write key or calculation defaults.
);

create table public.experiment_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null,
  subjective_rating text,
  subjective_note text,
  baseline_rows integer not null,
  experiment_rows integer not null,
  baseline_from date not null,
  baseline_to date not null,
  experiment_from date not null,
  experiment_to date not null,
  confidence text not null,
  alignment text not null,
  metrics jsonb not null,
  conclusion text,
  created_at timestamptz not null default now(),
  foreign key (user_id, experiment_id) references public.experiments(user_id, id) on delete cascade,
  unique (user_id, experiment_id)
);

create table public.experiment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id uuid not null,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, experiment_id) references public.experiments(user_id, id) on delete cascade
);

create table public.ai_weekly_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  window_start date not null,
  window_end date not null,
  drift jsonb not null,
  gate jsonb not null,
  next_focus_options jsonb not null,
  computed_at timestamptz not null,
  unique (user_id, week_key)
);

create table public.insight_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
