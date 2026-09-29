-- OPTIONAL AGGREGATE-ONLY preflight for an authorized operator, AFTER comparing
-- metadata to these column names. NOT run in this phase. No records/IDs returned.
-- RLS can hide violations: run with authorized audit access or results are incomplete.
begin transaction read only;
select 'daily_metrics duplicate owner/day groups' as check_name, count(*) as violations
from (select 1 from public.daily_metrics group by user_id,date having count(*)>1) d
union all select 'journal duplicate owner/day/type groups', count(*) from (select 1 from public.journal_entries group by user_id,date,type having count(*)>1) d
union all select 'habit_entries duplicate owner/habit/day groups', count(*) from (select 1 from public.habit_entries group by user_id,habit_id,date having count(*)>1) d
union all select 'ai_reports duplicate owner/day/period groups', count(*) from (select 1 from public.ai_reports group by user_id,date,period having count(*)>1) d
union all select 'experiment_reviews duplicate owner/experiment groups', count(*) from (select 1 from public.experiment_reviews group by user_id,experiment_id having count(*)>1) d
union all select 'ai_weekly_insights duplicate owner/week groups', count(*) from (select 1 from public.ai_weekly_insights group by user_id,week_key having count(*)>1) d
union all select 'effects duplicate proposed experiment/method/metric groups', count(*) from (select 1 from public.experiment_effects group by experiment_id,method_version,metric_key having count(*)>1) d
union all select 'multiple active experiments', count(*) from (select 1 from public.experiments where status='active' group by user_id having count(*)>1) d
union all select 'active with end_date', count(*) from public.experiments where status='active' and end_date is not null
union all select 'unknown or null experiment status', count(*) from public.experiments where status is null or status not in ('active','ended_pending_review','completed','abandoned')
union all select 'end before start', count(*) from public.experiments where end_date < start_date
union all select 'invalid ratings/nonnegative wellness', count(*) from public.daily_metrics where mood not between 1 and 5 or energy not between 1 and 5 or stress not between 1 and 5 or sleep_hours<0 or steps<0 or water_liters<0 or outdoor_minutes<0
union all select 'foreign/missing habit parent', count(*) from public.habit_entries c left join public.habits p on (c.user_id,c.habit_id)=(p.user_id,p.id) where p.id is null
union all select 'foreign/missing legacy habit parent', count(*) from public.habit_logs c left join public.habits p on (c.user_id,c.habit_id)=(p.user_id,p.id) where p.id is null
union all select 'foreign/missing review parent', count(*) from public.experiment_reviews c left join public.experiments p on (c.user_id,c.experiment_id)=(p.user_id,p.id) where p.id is null
union all select 'foreign/missing effect parent', count(*) from public.experiment_effects c left join public.experiments p on (c.user_id,c.experiment_id)=(p.user_id,p.id) where p.id is null
union all select 'foreign/missing event parent', count(*) from public.experiment_events c left join public.experiments p on (c.user_id,c.experiment_id)=(p.user_id,p.id) where p.id is null;

-- Null ownership across all inferred relations, without emitting owner identifiers.
select 'profiles' as table_name, count(*) filter (where id is null) as null_owners from public.profiles
union all select 'daily_metrics',count(*) filter(where user_id is null) from public.daily_metrics
union all select 'journal_entries',count(*) filter(where user_id is null) from public.journal_entries
union all select 'habits',count(*) filter(where user_id is null) from public.habits
union all select 'habit_entries',count(*) filter(where user_id is null) from public.habit_entries
union all select 'habit_logs',count(*) filter(where user_id is null) from public.habit_logs
union all select 'weekly_goals',count(*) filter(where user_id is null) from public.weekly_goals
union all select 'ai_reports',count(*) filter(where user_id is null) from public.ai_reports
union all select 'experiments',count(*) filter(where user_id is null) from public.experiments
union all select 'experiment_effects',count(*) filter(where user_id is null) from public.experiment_effects
union all select 'experiment_reviews',count(*) filter(where user_id is null) from public.experiment_reviews
union all select 'experiment_events',count(*) filter(where user_id is null) from public.experiment_events
union all select 'ai_weekly_insights',count(*) filter(where user_id is null) from public.ai_weekly_insights
union all select 'insight_events',count(*) filter(where user_id is null) from public.insight_events;
commit;
