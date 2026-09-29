# Deferred constraints — NOT migrations

Hosted constraints and historical rows are unknown. These are review proposals;
none of this SQL is run by `supabase db reset`. First recover metadata, run the
aggregate compatibility checks with authorized visibility, agree repairs, and
rehearse a forward migration on an isolated restored schema with synthetic rows.

## One active experiment

Source states are `active`, `ended_pending_review`, `completed`, `abandoned`.
The active reader filters only status; start also requires `end_date IS NULL`.
Recommend status as authority, after reconciling active rows with end dates:

```sql
create unique index experiments_one_active_per_owner
  on public.experiments (user_id) where status = 'active';
```

This permits arbitrarily many ended/pending, completed and abandoned rows. It
rejects concurrent starts and resume while another row is active. Current routes
would expose a generic database failure rather than the intended 409. Implement
error mapping and transaction semantics in Phase B before deploying this index.
Using `end_date IS NULL` in the index predicate would leave active readers able to
see multiple status-active records with inconsistent end dates.

## Other proposed validation (compatibility review required)

- Nullable mood/energy/stress: integer 1–5. Null remains missing. Inspect historic
  scales before enforcement; do not auto-convert or silently discard rows.
- Sleep, movement (`steps`), water, outdoor time: nonnegative finite values when
  present. Clarify historical steps-vs-minutes before applying any upper limits.
- Habit frequency daily/weekly; category body/mind/emotion/productivity;
  target_per_week 1–7 only after confirming product semantics and existing data.
- Experiments: status set above; end >= start; positive windows; metric catalog;
  lever_type metric/habit/custom; nullable custom lever_ref. Future-dated starts
  can currently be abandoned today, producing end < start: fix caller handling
  before enforcing chronology. No behavior is changed here.
- Habit levers need a DB ownership check for `lever_type='habit'` (a trigger or a
  separately reviewed representation), including ownership changes/deletions of
  referenced habits. Do not add a plain UUID FK to polymorphic text `lever_ref`.
- Effects: candidate unique(experiment_id, method_version, metric_key), but the
  missing RPC must confirm its conflict key, null handling and version behavior.
- Reviews: valid nullable subjective rating; confidence low/moderate/strong;
  alignment aligned/mismatch/unclear; ordered windows and nonnegative counts.
- AI period daily/weekly; goal status pending/in_progress/done/skipped; week_key
  ISO week syntax and chronological weekly windows. No goal-per-week uniqueness.
- Audit child cascades, auth-user deletion and retention before production use.

For an existing DB: do not replay clean-baseline CREATE TABLE statements or mark
versions applied without a schema comparison. Separate data repair from DDL.
Use NOT VALID then VALIDATE for eligible check/FK constraints; unique constraints
require duplicate resolution first (and a separately planned concurrent index
when necessary). Backups, lock impact, deployment ordering and rollback rehearsal
must precede rollout. Never choose which duplicate wellness record to delete
without an explicit data-preservation decision.
