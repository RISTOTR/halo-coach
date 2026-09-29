-- ISOLATED LOCAL SUPABASE ONLY. Synthetic auth subjects; all rows roll back.
-- Execute with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

create temporary table fixtures (seq integer, table_name text, b jsonb);
insert into fixtures values
(1, 'profiles', '{"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","onboarding_completed":false}'),
(2, 'daily_metrics', '{"id":"20000000-0000-4000-8000-000000000002","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","date":"2026-01-01","sleep_hours":null,"mood":3}'),
(3, 'journal_entries', '{"id":"20000000-0000-4000-8000-000000000003","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","date":"2026-01-01","type":"evening","content":"Synthetic only"}'),
(4, 'habits', '{"id":"20000000-0000-4000-8000-000000000004","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","name":"Synthetic walk","category":"body","frequency":"daily"}'),
(5, 'habit_entries', '{"id":"20000000-0000-4000-8000-000000000005","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","habit_id":"20000000-0000-4000-8000-000000000004","date":"2026-01-01","completed":true}'),
(6, 'habit_logs', '{"id":"20000000-0000-4000-8000-000000000006","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","habit_id":"20000000-0000-4000-8000-000000000004","date":"2026-01-01","completed":true}'),
(7, 'weekly_goals', '{"id":"20000000-0000-4000-8000-000000000007","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","week_start":"2025-12-29","title":"Synthetic goal"}'),
(8, 'ai_reports', '{"id":"20000000-0000-4000-8000-000000000008","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","date":"2026-01-01","period":"daily","content":"Synthetic, not generated"}'),
(9, 'experiments', '{"id":"20000000-0000-4000-8000-000000000009","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","title":"Synthetic walk","lever_type":"custom","lever_ref":"evening_walk","target_metric":"energy","start_date":"2026-01-01"}'),
(10, 'experiment_effects', '{"id":"20000000-0000-4000-8000-000000000010","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","experiment_id":"20000000-0000-4000-8000-000000000009","metric_key":"energy","method_version":1}'),
(11, 'experiment_reviews', '{"id":"20000000-0000-4000-8000-000000000011","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","experiment_id":"20000000-0000-4000-8000-000000000009","baseline_rows":0,"experiment_rows":0,"baseline_from":"2025-12-25","baseline_to":"2025-12-31","experiment_from":"2026-01-01","experiment_to":"2026-01-07","confidence":"low","alignment":"unclear","metrics":{}}'),
(12, 'experiment_events', '{"id":"20000000-0000-4000-8000-000000000012","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","experiment_id":"20000000-0000-4000-8000-000000000009","type":"ended","payload":{}}'),
(13, 'ai_weekly_insights', '{"id":"20000000-0000-4000-8000-000000000013","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","week_key":"2026-W01","window_start":"2025-12-26","window_end":"2026-01-01","drift":{},"gate":{},"next_focus_options":[],"computed_at":"2026-01-01T00:00:00Z"}'),
(14, 'insight_events', '{"id":"20000000-0000-4000-8000-000000000014","user_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","kind":"synthetic","payload":{}}');
grant select on fixtures to authenticated, anon;

-- Construct inserts using only supplied fields so real column defaults execute.
create function pg_temp.insert_sql(t text, row_data jsonb) returns text
language sql security invoker as $$
  select format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, %L::jsonb)',
    t, string_agg(format('%I', key), ',' order by key),
    string_agg(format('%I', key), ',' order by key), t, row_data::text)
  from jsonb_object_keys(row_data) as keys(key);
$$;

do $$ declare r record; begin
  for r in select * from fixtures order by seq loop
    execute pg_temp.insert_sql(r.table_name, r.b);
  end loop;
end $$;

select ok(c.relrowsecurity, f.table_name || ' enables RLS')
from fixtures f join pg_class c on c.oid = ('public.' || f.table_name)::regclass;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

create function pg_temp.check_owner(t text, b jsonb) returns setof text
language plpgsql security invoker as $$
declare
  owner_col text := case when t = 'profiles' then 'id' else 'user_id' end;
  a jsonb := replace(replace(b::text, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), '20000000-', '10000000-')::jsonb;
  forbidden jsonb := case when t = 'profiles' then b else jsonb_set(b, '{id}', to_jsonb(gen_random_uuid())) end;
  n bigint;
begin
  execute format('select count(*) from public.%I', t) into n;
  return next is(n, 0::bigint, t || ': A cannot read B');
  execute format('with changed as (update public.%I set %I = %I returning 1) select count(*) from changed', t, owner_col, owner_col) into n;
  return next is(n, 0::bigint, t || ': A cannot update B');
  execute format('with changed as (delete from public.%I returning 1) select count(*) from changed', t) into n;
  return next is(n, 0::bigint, t || ': A cannot delete B');
  return next throws_ok(pg_temp.insert_sql(t, forbidden), '42501', null, t || ': A cannot insert as B');
  return next lives_ok(pg_temp.insert_sql(t, a), t || ': A can insert own row');
  execute format('select count(*) from public.%I', t) into n;
  return next is(n, 1::bigint, t || ': A reads only own row');
  return next throws_ok(format('update public.%I set %I = %L', t, owner_col, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), '42501', null, t || ': cannot transfer ownership');
  execute format('with changed as (update public.%I set %I = %I returning 1) select count(*) from changed', t, owner_col, owner_col) into n;
  return next is(n, 1::bigint, t || ': A can update own row');
end;
$$;
select pg_temp.check_owner(table_name, b) from (select * from fixtures order by seq) ordered;

-- Child owner matches the caller, but parent belongs to B: composite FK must reject.
select throws_ok($$insert into public.habit_entries(user_id, habit_id, date) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','20000000-0000-4000-8000-000000000004','2026-01-02')$$, '23503', null, 'foreign habit completion rejected');
select throws_ok($$update public.habit_logs set habit_id = '20000000-0000-4000-8000-000000000004'$$, '23503', null, 'foreign habit log reference rejected');
select throws_ok($$update public.experiment_reviews set experiment_id = '20000000-0000-4000-8000-000000000009'$$, '23503', null, 'foreign experiment review rejected');
select throws_ok($$update public.experiment_effects set experiment_id = '20000000-0000-4000-8000-000000000009'$$, '23503', null, 'foreign experiment effect rejected');
select throws_ok($$update public.experiment_events set experiment_id = '20000000-0000-4000-8000-000000000009'$$, '23503', null, 'foreign experiment event rejected');
select lives_ok($$insert into public.daily_metrics(user_id,date,sleep_hours) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-01-01',0) on conflict (user_id,date) do update set sleep_hours=excluded.sleep_hours$$, 'daily upsert accepts explicit zero');
select is((select sleep_hours from public.daily_metrics), 0::double precision, 'zero remains zero');
select throws_ok($$insert into public.daily_metrics(user_id,date) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-01-01')$$, '23505', null, 'daily duplicate rejected');

-- Switch identity, using the same database role: no privileged bypass.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
create function pg_temp.check_b(t text) returns text language plpgsql security invoker as $$
declare n bigint; begin
  execute format('select count(*) from public.%I', t) into n;
  return is(n, 1::bigint, t || ': B still sees exactly own original row');
end $$;
select pg_temp.check_b(table_name) from fixtures;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
create function pg_temp.delete_own(t text) returns text language plpgsql security invoker as $$
declare n bigint; begin
  execute format('with removed as (delete from public.%I returning 1) select count(*) from removed', t) into n;
  return is(n, 1::bigint, t || ': A can delete own row');
end $$;
select pg_temp.delete_own(table_name) from (select * from fixtures order by seq desc) ordered;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(format('select * from public.%I', table_name), '42501', null, table_name || ': anonymous read denied') from fixtures;
reset role;
select * from finish();
rollback;
