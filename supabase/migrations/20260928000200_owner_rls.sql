-- Proposed least-scope ownership boundary for the inferred LOCAL baseline.
-- Not a statement about hosted policies/grants. Owners may CRUD their own rows.
-- Composite FKs in 001 enforce matching ownership for habit/experiment children.
do $$
declare
  table_name text;
  owner_column text;
begin
  foreach table_name in array array[
    'profiles', 'daily_metrics', 'journal_entries', 'habits', 'habit_entries',
    'habit_logs', 'weekly_goals', 'ai_reports', 'experiments', 'experiment_effects',
    'experiment_reviews', 'experiment_events', 'ai_weekly_insights', 'insight_events'
  ] loop
    owner_column := case when table_name = 'profiles' then 'id' else 'user_id' end;
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = %I)', table_name, owner_column);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = %I)', table_name, owner_column);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)', table_name, owner_column, owner_column);
    execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = %I)', table_name, owner_column);
  end loop;
end;
$$;

grant usage on schema public to authenticated;
-- No application function/trigger is invented here. Recover the actual RPCs first.
