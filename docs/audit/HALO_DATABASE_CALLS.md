# Halo database call-site inventory

Generated from application source with `node scripts/inventory-database.mjs`. This is source evidence, not deployed SQL.

14 tables; 3 RPC names; 99 call sites.

## ai_reports

- `components/dashboard/WeeklyAiReportCard.vue:247`

```ts
supabase .from('ai_reports') .select('content, created_at, date') .eq('user_id', currentUser.id) .eq('period', 'weekly') .eq('date', today) .maybeSingle()
```

- `components/dashboard/WeeklyAiReportCard.vue:259`

```ts
supabase .from('ai_reports') .select('content, created_at, date') .eq('user_id', currentUser.id) .eq('period', 'weekly') .lte('date', today) .order('date', { ascending: false }) .limit(1) .maybeSingle()
```

- `pages/check-in.vue:470`

```ts
supabase .from('ai_reports') .select('content') .eq('user_id', currentUser) .eq('date', today) .eq('period', 'daily') .maybeSingle()
```

- `pages/index.vue:510`

```ts
supabase .from('ai_reports') .select('content') .eq('user_id', uid) .eq('date', todayISO()) .eq('period', 'daily') .maybeSingle()
```

- `server/api/ai/daily-summary.post.ts:407`

```ts
supabase .from('ai_reports') .upsert( { user_id: uid, date: normalizedDate, period: 'daily', content: finalContent }, { onConflict: 'user_id,date,period' } )
```

- `server/api/ai/weekly-summary.post.ts:226`

```ts
supabase .from('ai_reports') .upsert( { user_id: uid, date: normalizedEnd, period: 'weekly', content: stringifyReport(safeSummary) }, { onConflict: 'user_id,date,period' } )
```

## ai_weekly_insights

- `server/api/ai/insights/health.get.ts:19`

```ts
supabase.from('ai_weekly_insights').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
```

- `server/api/ai/insights/health.get.ts:23`

```ts
supabase .from('ai_weekly_insights') .select('computed_at') .eq('user_id', uuid) .order('computed_at', { ascending: false }) .limit(1) .maybeSingle()
```

- `server/api/ai/weekly-insight.compute.post.ts:146`

```ts
supabase .from('ai_weekly_insights') .upsert( { user_id: uid, week_key: weekKey, window_start: windowStart, window_end: windowEnd, drift, gate: gateResult, next_focus_options: ranked, computed_at: new Date().toISOString() }, { onConflict: 'user_id,week_key' // ✅ IMPORTANT } ) .select('computed_at') .single()
```

- `server/api/ai/weekly-insight.get.ts:23`

```ts
supabase .from('ai_weekly_insights') .select('*') .eq('user_id', uid) .eq('week_key', weekKey) .single()
```

## daily_metrics

- `pages/check-in.vue:437`

```ts
supabase .from('daily_metrics') .select('*') .eq('user_id', currentUser) .eq('date', today) .maybeSingle()
```

- `pages/check-in.vue:522`

```ts
supabase .from('daily_metrics') .upsert(payload, { onConflict: 'user_id,date' })
```

- `pages/index.vue:447`

```ts
supabase .from('daily_metrics') .select('*') .eq('date', todayISO()) .eq('user_id', uid) .maybeSingle()
```

- `pages/index.vue:480`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,stress') .eq('user_id', uid) .gte('date', sevenDaysAgoISO()) .order('date')
```

- `server/api/ai/daily-summary.post.ts:125`

```ts
supabase .from('daily_metrics') .select('*') .eq('user_id', uid) .eq('date', normalizedDate) .maybeSingle()
```

- `server/api/ai/daily-summary.post.ts:144`

```ts
supabase .from('daily_metrics') .select('*') .eq('user_id', uid) .eq('date', yesterdayDate) .maybeSingle()
```

- `server/api/ai/daily-summary.post.ts:229`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,stress,energy') .eq('user_id', uid) .gte('date', start14) .lte('date', normalizedDate) .order('date', { ascending: true })
```

- `server/api/ai/experiments/[id]/end.post.ts:142`

```ts
supabase .from('daily_metrics') .select(selectCols) .eq('user_id', uid) .gte('date', baselineStart) .lte('date', baselineEnd) .order('date', { ascending: true })
```

- `server/api/ai/experiments/[id]/end.post.ts:150`

```ts
supabase .from('daily_metrics') .select(selectCols) .eq('user_id', uid) .gte('date', expStart) .lte('date', expEnd) .order('date', { ascending: true })
```

- `server/api/ai/insights/health.get.ts:16`

```ts
supabase.from('daily_metrics').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
```

- `server/api/ai/weekly-goal-suggestions.post.ts:50`

```ts
supabase .from('daily_metrics') .select('*') .eq('user_id', user.sub) .gte('date', normalizedStart) .lte('date', normalizedEnd) .order('date')
```

- `server/api/ai/weekly-insight.compute.post.ts:46`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,energy,stress') .eq('user_id', uid) .gte('date', last7StartStr) .lte('date', date) .order('date', { ascending: true })
```

- `server/api/ai/weekly-insight.compute.post.ts:55`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,energy,stress') .eq('user_id', uid) .gte('date', prev7StartStr) .lte('date', prev7EndStr) .order('date', { ascending: true })
```

- `server/api/ai/weekly-summary.post.ts:82`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,stress,energy,water_liters,steps,outdoor_minutes') .eq('user_id', uid) .gte('date', start14) .lte('date', normalizedEnd) .order('date', { ascending: true })
```

- `server/api/next-focus.get.ts:479`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,stress,energy') .eq('user_id', uid) .gte('date', startISO) .lte('date', endISO) .order('date', { ascending: true })
```

- `server/api/reports/overview.get.ts:56`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,stress,energy') .eq('user_id', uid) .gte('date', start) .lte('date', end) .order('date', { ascending: true })
```

- `server/api/reports/overview.get.ts:114`

```ts
supabase .from('daily_metrics') .select('date,sleep_hours,mood,stress,energy') .eq('user_id', uid) .gte('date', prev7Start) .lte('date', prev7End) .order('date', { ascending: true })
```

- `server/utils/experimentReview.ts:86`

```ts
opts.supabase .from('daily_metrics') .select('date,sleep_hours,mood,energy,stress,steps,water_liters,outdoor_minutes') .eq('user_id', opts.userId) .gte('date', baselineFromStr) .lte('date', baselineToStr) .order('date', { ascending: true })
```

- `server/utils/experimentReview.ts:97`

```ts
opts.supabase .from('daily_metrics') .select('date,sleep_hours,mood,energy,stress,steps,water_liters,outdoor_minutes') .eq('user_id', opts.userId) .gte('date', opts.startDate) .lte('date', opts.endDate) .order('date', { ascending: true })
```

## experiment_effects

- `server/api/ai/experiments/[id]/review.get.ts:165`

```ts
supabase .from('experiment_effects') .select( 'metric_key,baseline_avg,experiment_avg,delta,baseline_rows,experiment_rows,baseline_start,baseline_end,experiment_start,experiment_end,method_version' ) .eq('experiment_id', id) .eq('method_version', 1)
```

- `server/api/ai/insights/health.get.ts:18`

```ts
supabase.from('experiment_effects').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
```

- `server/api/ai/insights/lever-summary.get.ts:36`

```ts
supabase .from('experiment_effects') .select( ` experiment_id, metric_key, delta, baseline_rows, experiment_rows, experiments!inner ( user_id, status, start_date, end_date, lever_type, lever_ref, target_metric ) ` ) .eq('experiments.user_id', uid) .gte('experiments.start_date', since) .eq('method_version', 1)
```

- `server/api/ai/weekly-insight.compute.post.ts:69`

```ts
supabase .from('experiment_effects') .select('experiment_rows') .eq('user_id', uid)
```

- `server/lib/ai/buildLeverSummary.ts:27`

```ts
supabase .from('experiment_effects') .select( ` experiment_id, metric_key, delta, experiments!inner ( user_id, status, start_date, end_date, lever_type, lever_ref, target_metric ) ` ) .eq('experiments.user_id', uid) .gte('experiments.start_date', since) .eq('method_version', 1) .in('experiments.status', ['completed', 'ended_pending_review', 'abandoned'])
```

## experiment_events

- `server/api/ai/experiments/[id]/end.post.ts:236`

```ts
supabase.from('experiment_events').insert({ user_id: uid, experiment_id: id, type: 'ended', payload: { end_date, alignment, confidence_score: confScore } })
```

- `server/api/ai/experiments/[id]/resume.post.ts:58`

```ts
supabase.from('experiment_events').insert({ user_id: uid, experiment_id: id, type: 'resumed', payload: {} })
```

- `server/api/ai/experiments/[id]/review.post.ts:257`

```ts
supabase.from('experiment_events').insert({ user_id: uid, experiment_id: id, type: finalize ? 'finalized' : 'review_updated', payload: { what_worked: what_worked ?? null, try_next: try_next ?? null } })
```

## experiment_reviews

- `server/api/ai/experiments/[id]/review.post.ts:213`

```ts
supabase .from('experiment_reviews') .upsert( { user_id: uid, experiment_id: id, subjective_rating, subjective_note, baseline_rows, experiment_rows, baseline_from, baseline_to, experiment_from, experiment_to, confidence, alignment, metrics, conclusion: conclusion ?? null }, { onConflict: 'user_id,experiment_id' } )
```

- `server/api/ai/experiments/[id]/reviews.get.ts:20`

```ts
supabase .from('experiment_reviews') .select('id,created_at,experiment_id,confidence,alignment,subjective_rating,baseline_from,baseline_to,experiment_from,experiment_to,metrics') .eq('user_id', uid) .order('created_at', { ascending: false }) .limit(limit ?? 50)
```

## experiments

- `server/api/ai/experiments/[id]/end.post.ts:100`

```ts
supabase .from('experiments') .select('id,user_id,status,start_date,end_date,title,lever_ref,target_metric,baseline_days,recommended_days,confidence') .eq('id', id) .eq('user_id', uid) .maybeSingle()
```

- `server/api/ai/experiments/[id]/end.post.ts:220`

```ts
supabase .from('experiments') .update({ end_date, status: 'ended_pending_review', outcome, updated_at: new Date().toISOString() }) .eq('id', id) .eq('user_id', uid) .select('*') .single()
```

- `server/api/ai/experiments/[id]/history.get.ts:82`

```ts
supabase .from('experiments') .select('id,created_at,experiment_id,confidence,alignment,subjective_rating,baseline_from,baseline_to,experiment_from,experiment_to,metrics,conclusion') .eq('user_id', uid) .in('status', statuses) .order('start_date', { ascending: false }) .limit(limit)
```

- `server/api/ai/experiments/[id]/recompute-effects.post.ts:22`

```ts
supabase .from('experiments') .select('id,user_id') .eq('id', id) .eq('user_id', uid) .maybeSingle()
```

- `server/api/ai/experiments/[id]/resume.post.ts:22`

```ts
supabase .from('experiments') .select('id,user_id,status,start_date,end_date') .eq('id', id) .eq('user_id', uid) .maybeSingle()
```

- `server/api/ai/experiments/[id]/resume.post.ts:44`

```ts
supabase .from('experiments') .update({ end_date: null, status: 'active', updated_at: new Date().toISOString() }) .eq('id', id) .eq('user_id', uid) .select('*') .single()
```

- `server/api/ai/experiments/[id]/review.get.ts:145`

```ts
supabase .from('experiments') .select( 'id,user_id,status,start_date,end_date,title,lever_ref,target_metric,baseline_days,recommended_days,outcome,what_worked,try_next' ) .eq('id', id) .eq('user_id', uid) .maybeSingle()
```

- `server/api/ai/experiments/[id]/review.post.ts:52`

```ts
supabase .from('experiments') .select('id,user_id,status,outcome,end_date,title,lever_ref,target_metric') .eq('id', id) .eq('user_id', uid) .maybeSingle()
```

- `server/api/ai/experiments/[id]/review.post.ts:246`

```ts
supabase .from('experiments') .update(updatePayload) .eq('id', id) .eq('user_id', uid) .select('id,status,outcome') .single()
```

- `server/api/ai/experiments/active.get.ts:68`

```ts
supabase .from('experiments') .select('id,title,status,start_date,lever_ref,target_metric,recommended_days') .eq('user_id', uid) .eq('status', 'active') .order('start_date', { ascending: false }) .limit(1)
```

- `server/api/ai/experiments/history.get.ts:21`

```ts
supabase .from('experiments') .select( [ 'id', 'title', 'lever_ref', 'target_metric', 'start_date', 'end_date', 'status', 'recommended_days', 'baseline_days', 'outcome' ].join(',') ) .eq('user_id', uid) .neq('status', 'active') // history = completed/abandoned/ended_pending_review (you can remove if you want active too) .order('start_date', { ascending: false }) .range(offset, offset + limit - 1)
```

- `server/api/ai/experiments/start.post.ts:37`

```ts
supabase .from('experiments') .select('id,title,start_date,status') .eq('user_id', uid) .eq('status', 'active') .is('end_date', null) .order('start_date', { ascending: false }) .limit(1)
```

- `server/api/ai/experiments/start.post.ts:60`

```ts
supabase .from('experiments') .update({ status: 'abandoned', end_date: today, updated_at: new Date().toISOString() }) .eq('id', active[0].id) .eq('user_id', uid) .eq('status', 'active') .is('end_date', null)
```

- `server/api/ai/experiments/start.post.ts:119`

```ts
supabase .from('experiments') .insert(insertRow) .select('*') .single()
```

- `server/api/ai/insights/health.get.ts:17`

```ts
supabase.from('experiments').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
```

- `server/api/ai/insights/recent-levers.get.ts:24`

```ts
supabase .from('experiments') .select('lever_ref,start_date') .eq('user_id', uid) // ✅ use uid .not('lever_ref', 'is', null) .gte('start_date', sinceStr) .order('start_date', { ascending: false })
```

- `server/api/ai/weekly-insight.compute.post.ts:91`

```ts
supabase .from('experiments') .select('lever_ref,start_date') .eq('user_id', uid) .not('lever_ref', 'is', null) .gte('start_date', since60Str) .order('start_date', { ascending: false })
```

- `server/api/next-focus.get.ts:461`

```ts
supabase .from('experiments') .select('id, lever_ref, lever_type, target_metric, start_date, end_date, status, title') .eq('user_id', uid) .eq('status', 'active') .is('end_date', null) .order('start_date', { ascending: false }) .limit(1) .maybeSingle()
```

## habit_entries

- `server/api/ai/daily-summary.post.ts:201`

```ts
supabase .from('habit_entries') .select('habit_id, completed') .eq('user_id', uid) .eq('date', normalizedDate)
```

- `server/api/ai/weekly-summary.post.ts:136`

```ts
supabase .from('habit_entries') .select('habit_id,date,completed') .eq('user_id', uid) .gte('date', start7) .lte('date', normalizedEnd)
```

- `server/api/habits/log-today.post.ts:39`

```ts
supabase .from('habit_entries') .delete() .eq('user_id', uid) .eq('date', day)
```

- `server/api/habits/log-today.post.ts:56`

```ts
supabase .from('habit_entries') .insert(rows)
```

- `server/api/habits/log-today.post.ts:64`

```ts
supabase .from('habit_entries') .delete() .eq('user_id', uid) .eq('date', day)
```

- `server/api/habits/today.get.ts:32`

```ts
supabase .from('habit_entries') .select('habit_id,completed') .eq('user_id', uid) .eq('date', date)
```

- `server/api/habits/toggle.ts:35`

```ts
supabase .from('habit_entries') .upsert({ user_id: uid, habit_id, date, completed: true }, { onConflict: 'user_id,habit_id,date' })
```

- `server/api/habits/toggle.ts:41`

```ts
supabase .from('habit_entries') .delete() .eq('user_id', uid) .eq('habit_id', habit_id) .eq('date', date)
```

- `server/api/reports/overview.get.ts:183`

```ts
supabase .from('habit_entries') .select('habit_id,date,completed') .eq('user_id', uid) .gte('date', start) .lte('date', end)
```

## habit_logs

- `server/api/ai/weekly-goal-suggestions.post.ts:115`

```ts
supabase .from('habit_logs') .select('habit_id, date, completed') .eq('user_id', user.sub) .gte('date', normalizedStart) .lte('date', normalizedEnd)
```

## habits

- `pages/habits.vue:267`

```ts
supabase .from('habits') .select('*') .eq('user_id', currentUser.id) .order('created_at', { ascending: true })
```

- `pages/habits.vue:317`

```ts
supabase .from('habits') .insert(payload) .select('*') .single()
```

- `pages/habits.vue:345`

```ts
supabase .from('habits') .update({ archived: true }) .eq('id', id)
```

- `pages/habits.vue:364`

```ts
supabase .from('habits') .update({ archived: false }) .eq('id', id)
```

- `server/api/ai/daily-summary.post.ts:190`

```ts
supabase .from('habits') .select('id, name, frequency, target_per_week, archived') .eq('user_id', uid) .or('archived.is.null,archived.eq.false')
```

- `server/api/ai/experiments/start.post.ts:81`

```ts
supabase .from('habits') .select('id') .eq('user_id', uid) .eq('id', body.leverRef) .or('archived.is.null,archived.eq.false') .maybeSingle()
```

- `server/api/ai/weekly-goal-suggestions.post.ts:104`

```ts
supabase .from('habits') .select('id, name, frequency, target_per_week') .eq('user_id', user.sub) .eq('archived', false)
```

- `server/api/ai/weekly-summary.post.ts:130`

```ts
supabase .from('habits') .select('id,name,frequency,target_per_week,archived') .eq('user_id', uid) .or('archived.is.null,archived.eq.false')
```

- `server/api/habits/log-today.post.ts:26`

```ts
supabase .from('habits') .select('id') .eq('user_id', uid) .in('id', completedHabitIds) .or('archived.is.null,archived.eq.false')
```

- `server/api/habits/today.get.ts:22`

```ts
supabase .from('habits') .select('id,user_id,name,category,frequency,target_per_week,created_at,archived') .eq('user_id', uid) .or('archived.is.null,archived.eq.false') .order('created_at', { ascending: true })
```

- `server/api/habits/toggle.ts:22`

```ts
supabase .from('habits') .select('id,user_id,archived') .eq('id', habit_id) .eq('user_id', uid) .maybeSingle()
```

- `server/api/reports/overview.get.ts:170`

```ts
supabase .from('habits') .select('id,name,category,frequency,target_per_week,archived,created_at') .eq('user_id', uid) .or('archived.is.null,archived.eq.false') .order('created_at', { ascending: true })
```

## insight_events

- `server/api/ai/insights/health.get.ts:31`

```ts
supabase .from('insight_events') .select('created_at,kind') .eq('user_id', uid) .order('created_at', { ascending: false }) .limit(1) .maybeSingle()
```

- `server/api/ai/weekly-insight.compute.post.ts:168`

```ts
supabase.from('insight_events').insert({ user_id: uid, // ✅ not user.id kind: 'weekly_insight_computed', payload: { weekKey, gate: gateResult, driftPrimary: primary, corrNMax, experimentRowsMax, topOptionId: ranked[0]?.id } })
```

## journal_entries

- `pages/check-in.vue:456`

```ts
supabase .from('journal_entries') .select('content') .eq('user_id', currentUser) .eq('date', today) .eq('type', 'evening') .maybeSingle()
```

- `pages/check-in.vue:533`

```ts
supabase .from('journal_entries') .upsert( { user_id: currentUser, date: today, type: 'evening', content: reflectionText }, { onConflict: 'user_id,date,type' } )
```

- `pages/check-in.vue:541`

```ts
supabase .from('journal_entries') .delete() .eq('user_id', currentUser) .eq('date', today) .eq('type', 'evening')
```

- `server/api/ai/daily-summary.post.ts:158`

```ts
supabase .from('journal_entries') .select('content, created_at') .eq('user_id', uid) .eq('date', normalizedDate) .eq('type', 'evening') .order('created_at', { ascending: false }) .limit(1)
```

- `server/api/ai/daily-summary.post.ts:174`

```ts
supabase .from('journal_entries') .select('content, created_at') .eq('user_id', uid) .eq('date', yesterdayDate) .eq('type', 'evening') .order('created_at', { ascending: false }) .limit(1)
```

- `server/api/ai/weekly-goal-suggestions.post.ts:138`

```ts
supabase .from('journal_entries') .select('date, content') .eq('user_id', user.sub) .eq('type', 'evening') .gte('date', normalizedStart) .lte('date', normalizedEnd) .order('date', { ascending: true })
```

- `server/api/ai/weekly-summary.post.ts:151`

```ts
supabase .from('journal_entries') .select('date,content') .eq('user_id', uid) .eq('type', 'evening') .gte('date', start7) .lte('date', normalizedEnd) .order('date', { ascending: true })
```

## profiles

- `composables/useOnboarding.ts:19`

```ts
supabase .from('profiles') .select('onboarding_completed') .eq('id', user.value.sub) .maybeSingle()
```

- `composables/useOnboarding.ts:42`

```ts
supabase .from('profiles') .update({ onboarding_completed: true }) .eq('id', user.value.sub) .select('id') .maybeSingle()
```

## weekly_goals

- `server/api/ai/daily-summary.post.ts:113`

```ts
supabase .from('weekly_goals') .select('id, title, status') .eq('user_id', uid) .eq('week_start', weekStart) .order('created_at', { ascending: true })
```

- `server/api/goals/weekly.get.ts:29`

```ts
supabase .from('weekly_goals') .select('*') .eq('user_id', user.sub) .eq('week_start', weekStart) .order('created_at')
```

- `server/api/goals/weekly.post.ts:42`

```ts
supabase .from('weekly_goals') .delete() .eq('user_id', user.sub) .eq('week_start', weekStart)
```

- `server/api/goals/weekly.post.ts:66`

```ts
supabase .from('weekly_goals') .insert(rows) .select('*')
```

## get_metric_correlations

- `server/api/ai/insights/correlations.get.ts:20`

```ts
supabase.rpc('get_metric_correlations', { p_user_id: uid, // ✅ must be real uuid p_window_days: windowDays, p_min_n: minN })
```

- `server/api/ai/weekly-insight.compute.post.ts:76`

```ts
supabase.rpc('get_metric_correlations', { p_user_id: uid, p_window_days: 30, p_min_n: 14 })
```

## get_what_works

- `server/api/what-works.get.ts:84`

```ts
supabase.rpc('get_what_works', { p_window_days: windowDays, p_min_n: minN, })
```

## upsert_experiment_effects_v1

- `server/api/ai/experiments/[id]/end.post.ts:247`

```ts
supabase.rpc('upsert_experiment_effects_v1', { p_experiment_id: id, p_method_version: 1 })
```

- `server/api/ai/experiments/[id]/recompute-effects.post.ts:32`

```ts
supabase.rpc('upsert_experiment_effects_v1', { p_experiment_id: id, p_method_version: 1 })
```
