-- Supporting indexes inferred from current filters. Unique keys already index
-- daily_metrics, journals, reports, reviews and weekly insights by owner.
create index habits_owner_created_idx on public.habits(user_id, created_at);
create index habit_entries_owner_date_idx on public.habit_entries(user_id, date);
create index habit_logs_owner_date_idx on public.habit_logs(user_id, date);
create index habit_logs_parent_idx on public.habit_logs(user_id, habit_id);
create index weekly_goals_owner_week_idx on public.weekly_goals(user_id, week_start, created_at);
create index ai_reports_owner_period_date_idx on public.ai_reports(user_id, period, date);
create index experiments_owner_status_start_idx on public.experiments(user_id, status, start_date);
create index experiment_effects_parent_method_idx on public.experiment_effects(experiment_id, method_version, metric_key);
create index experiment_effects_owner_parent_idx on public.experiment_effects(user_id, experiment_id);
create index experiment_reviews_owner_created_idx on public.experiment_reviews(user_id, created_at);
create index experiment_events_owner_parent_idx on public.experiment_events(user_id, experiment_id);
create index insight_events_owner_created_idx on public.insight_events(user_id, created_at);
