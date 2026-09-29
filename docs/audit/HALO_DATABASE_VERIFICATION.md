# Halo Database Verification

## Executive Summary

Phase C2, 28 September 2026. **Local database verification is blocked by the absence of a Docker-compatible runtime.** The project now has the current npm stable Supabase CLI, pinned at **2.118.0**, and its version/help commands execute successfully. No stack was started, no migration/reset was attempted, no accounts or database rows were created, and no generated database types were manufactured.

Read the full audit, Phase 1 stabilization report and database foundation report before edits. Reviewed config, all three migrations, proposals, inspection queries, the ownership suite, seed/inventory scripts and type instructions. Existing application changes were preserved. No Phase B persistence change, analytics change, new constraint or hosted operation was performed.

| Evidence class | C2 result |
| --- | --- |
| Confirmed local tooling/safety behavior | Node/npm/CLI versions; CLI install and help execution; nine seed rejection cases without network access; existing regression suite result below |
| Confirmed local PostgreSQL behavior | None: no local database execution |
| Confirmed hosted behavior | None: no new metadata source or authorized metadata connection available |
| Inferred application/database contract | Previous 14-table / 3-RPC foundation remains inferred, not reconciled |

## Environment / Tooling

| Check / action | Result |
| --- | --- |
| `node --version` | v22.12.0 |
| `npm --version` | 11.12.1 |
| `docker --version` | Command not found |
| `command -v docker podman colima nerdctl limactl` (checked individually) | None found |
| Common Docker/OrbStack application paths, Docker binaries and Docker/Colima socket paths | None found in checked locations |
| Docker/container endpoint environment variable names | None configured |
| `command -v psql` | Not found |
| `npm view supabase version engines --json` | npm stable returned 2.118.0; no engine field returned |
| `npm install --save-dev --save-exact supabase@2.118.0 --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` | Succeeded; exact project devDependency, no global CLI or container runtime install |
| `npm ls supabase --depth=0` | supabase@2.118.0 |
| `npx --no-install supabase --version` | 2.118.0, exit 0 after sandbox escalation |
| `npx --no-install supabase db reset --help` | Confirms `--local`; help only, no reset performed |
| `npx --no-install supabase gen types --help` | Confirms `--local`, `--lang typescript`, `--schema`; help only, no generation performed |

Supabase documents Node 20+ for npm/npx CLI usage and a Docker-compatible runtime for the local stack: [official CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started). Installed CLI execution on Node 22.12.0 was verified. `--no-install` makes the documented npx commands use the installed project dependency without downloading another version.

Sandbox DNS failed for the registry query; the first install waited without progress and was cancelled. The registry query/install succeeded with approved escalation. CLI version/help initially failed because the CLI initializes `~/.supabase`, outside sandbox write roots. Retrying these informational commands with approved escalation succeeded. This created local CLI state, not a hosted link. No login, link, push, remote reset or migration repair was invoked.

`package.json` changes only the Supabase devDependency. The lock adds 15 CLI/transitive/platform package records; every existing non-root package record was preserved. npm initially pruned an optional peer `commander` lock record; that unrelated lock deletion was restored. No unrelated dependency version was upgraded. `supabase/README.md` and `types/README.md` now use the pinned project-local CLI. No Node/application configuration change was required.

## Local Migration Result

**Not executed — blocked prerequisite.** In accordance with the explicit task stop condition, did not attempt `supabase start` without a container runtime. Consequently `db reset --local`, SQL parsing/execution, relation/index/FK/key creation and policy application are not verified. No SQL failure was observed because SQL was never executed; no speculative migration correction or constraint weakening was made.

Static safety review found no production credentials, hosted URLs, personal data or remote command invocations in the migrations. They contain inferred CREATE TABLE definitions, owner RLS/grants and supporting indexes. Local config uses loopback app redirects and project name `halo-foundation-local`. The only fixture credentials are explicitly synthetic/local. Existing local-only seed safeguards remain intact.

The one-active-experiment partial unique index remains a proposal outside the migration directory. SQL files in `supabase/proposals` and read-only inspection queries are not migration runner input. Hosted constraint status and duplicate-active counts remain unknown.

## Local Seed Result

**Database seed and repeat/idempotence verification not executed.** No synthetic accounts or records were created during C2, and no real account was accessed.

Executed nine guard cases using a stubbed `fetch` that records any attempted network access: missing configuration, external host, HTTPS, wrong local port, embedded URL credentials, path, query, fragment and a deceptive localhost-prefix hostname. All nine were rejected before `fetch`; JavaScript syntax checks also passed. The seed retains `redirect: 'error'`; redirect handling was reviewed in source, not exercised against a server.

The intended two-account / 35-day / two-habit / 70-completion / active-experiment dataset is a **source contract only**. Null/zero persistence and repeated-seed row counts still require a real local run. Seed source writes profiles, habits, metrics, completions and experiments; it does not fabricate AI reports, effects or causal conclusions. Fixed history ends 2026-09-28. Re-running intentionally restores synthetic experiment state, not arbitrary user edits.

## RLS Test Result

**Not executed. No database protection is reported as passing.** `npx supabase test db` depends on the unavailable stack.

| Requested assertion | Status |
| --- | --- |
| A cannot SELECT / UPDATE / DELETE B | Defined in existing suite; unexecuted |
| A cannot INSERT as B | Defined; unexecuted |
| A cannot transfer ownership | Suite tests transfer to a third synthetic subject to avoid duplicate-PK masking; unexecuted. Also explicitly exercise A→B after setup. |
| Cross-owner habit and experiment child references | Defined with expected FK failures; unexecuted |
| B retains own access; A retains own CRUD | Defined; unexecuted |
| Anonymous access denied | Anonymous SELECT assertions defined; unexecuted; repeat HTTP write denial checks when stack exists |
| Explicit zero preserved | Daily upsert assertion defined; unexecuted |
| Duplicate conflict keys rejected | Daily duplicate assertion defined; unexecuted. Extend runtime checks to all six distinct application conflict keys before declaring full coverage. |

The suite uses synthetic subjects, authenticated/anon roles and transaction rollback. Static SQL/policy review cannot substitute for its execution. No test results were inferred from the fact that policies appear in a file.

## Generated Type Result

**Not generated.** `types/database.types.ts` is still absent. There is no successfully initialized local DB to introspect. Updated the documented command to use the actual installed CLI and replace the target only on successful, nonempty generation:

```sh
npx --no-install supabase gen types --lang typescript --local --schema public > /tmp/halo-database.types.ts &&
  test -s /tmp/halo-database.types.ts &&
  cp /tmp/halo-database.types.ts types/database.types.ts
```

No post-generation TypeScript impact can be measured yet. The following are **known source-based triage categories**, not newly observed compiler results:

| Category | Examples / next review |
| --- | --- |
| Actual application/database contract bug | Review writes `outcome.what_worked`/`try_next` but reader requests top-level fields; active DTO camelCase vs snake_case consumers. Reconcile actual triggers/SQL before choosing fixes. |
| Missing RPC type | All three analytics RPCs remain absent from local SQL, so local generated Functions cannot describe them. Do not add fake signatures. |
| Known obsolete/broken route | `[id]/history.get.ts` selects review columns from experiments; insights health uses undefined `uuid`. No route changes made here. |
| Unrelated application typing debt | Existing OpenAI response-union access, broad any types, Vue emits/DTO mismatches and other audit diagnostics. Do not blanket-fix in C2. |

Ran the existing `node scripts/verify-phase1.mjs` after CLI installation as a limited dependency regression check. Its final result is recorded in change control; it is not a database integration test. No new application build or broad compiler cleanup was performed.

## Hosted Metadata Access

**Unavailable.** Rechecked repository SQL/schema/dump/metadata filenames: only the previously authored inferred migrations and inspection templates exist. No exported hosted SQL or completed inspection output was supplied. No callable Supabase metadata connector was available. No hosted project ref/link or pre-existing CLI credential directory was found before CLI initialization.

Inspected environment variable names only. `.env` contains public Supabase URL/key names and an AI-key name; no DB connection/password or Supabase management token variable is configured. Values were not printed or used to fetch rows. CLI installation itself provides no hosted metadata authorization. Did not invoke `supabase login`, `link`, `db pull`, `db push`, hosted `db reset` or `migration repair`.

The read-only metadata query was minimally extended to include explicit function arguments and volatility, in addition to existing function SQL, signature, return type, definer flag, owner, search_path configuration and ACLs. This inspection-only change was not run against any database. Full function-body/dependency review remains necessary; catalog metadata alone can miss dynamically referenced objects. An authorized operator can provide reviewed output from this query or a schema-only export; neither requires sharing passwords or personal rows.

## Hosted vs Inferred Schema

No comparison can assert a match or mismatch without hosted metadata. The structured reconciliation queue is:

| Area | Hosted | Inferred baseline | Action |
| --- | --- | --- | --- |
| Columns / types | Unknown | UUID owners/IDs, date windows, nullable numeric measurements, text and JSONB contracts | Obtain actual columns/types and relation kinds |
| Defaults | Unknown | Generated UUID/timestamps and explicit app-derived defaults | Compare defaults; never infer data from them |
| Nullability | Unknown | Required ownership/keys; optional measurements | Compare metadata, then aggregate null counts |
| PKs | Unknown | Profile auth UUID; UUID IDs elsewhere | Confirm actual keys and ID generation |
| Unique keys | Unknown | Six source upsert keys plus parent owner/ID pairs | Confirm all conflict indexes and duplicates |
| FKs | Unknown | Auth owners and composite habit/experiment ownership | Confirm relation embedding and owner integrity |
| Cascades | Unknown | Cascading auth/parent deletion | Review actual deletion/retention behavior |
| Indexes | Unknown | Query-support indexes | Compare coverage and avoid duplicates |
| RLS | Unknown | Four owner CRUD policies per table | Recover policies, execute two-user tests |
| Table grants | Unknown | Authenticated CRUD, no anon grants | Recover effective grants/default privileges |
| Triggers | Unknown | None invented | Recover public and auth-user triggers/helpers |
| RPCs | Unknown | All three absent | Recover full SQL, rights and dependencies |
| Profile provisioning | Unknown | Seed creates profiles; no signup trigger | Confirm deployed trigger/provisioner |
| habit_logs | Unknown | Separate inferred legacy table | Determine whether deployed table/view and sync exists |
| Experiment notes | Unknown | Both top-level arrays and outcome JSON | Determine whether deployed trigger reconciles writes |
| Active-experiment enforcement | Unknown | Deferred unique-index proposal | Inspect hosted indexes and aggregate duplicates before Phase B |

## RPC Recovery

| RPC | Real definition recovered? | Locally reproduced? |
| --- | --- | --- |
| get_what_works | No | No |
| get_metric_correlations | No | No |
| upsert_experiment_effects_v1 | No | No |

Arguments/returns remain application-inferred. Actual overloads, volatility, SECURITY INVOKER/DEFINER, owner, search_path, effective EXECUTE grants and dependencies remain unknown. No formulas, fake stubs or inferred function migrations were introduced.

## RPC Authorization Tests

**Blocked, not passed.** Without real function bodies and a local database, none of the direct-call cases executed. Still required: A-only get_what_works output unaffected by B fixtures; anonymous calls denied; A passing B's UUID to correlations cannot expose B data; own experiment effects recompute succeeds, B's fails without row mutation, repeated invocation obeys recovered version/idempotence semantics. Verify rows after calls, not only HTTP/SQL return values, using synthetic users and actual authenticated roles.

The earlier foundation report contains concrete named-argument probes and an isolation procedure. Those probes must be reconciled with actual signatures and run directly, bypassing Nitro endpoints.

## Existing Data Compatibility

No personal records or aggregate production queries were accessed. Duplicate conflict keys, null ownership, orphan references, duplicate reviews, invalid ranges/statuses and multiple active experiments remain unknown. `compatibility.sql` stays an unexecuted preflight template, to be adapted after actual metadata recovery and run by an authorized operator with adequate visibility. No repairs are proposed as automatic actions.

Do not enable the one-active constraint based on local synthetic data. First confirm actual hosted index status and duplicates; preserve the existing start/resume routes in C2. Phase B must account for concurrent starts/resumes and failed replacement without losing the original experiment.

## Confirmed Protections

- Confirmed seed guard behavior: nine invalid/missing target cases reject before network access.
- Confirmed change-control behavior: no stack start/reset, hosted query, data write or Phase B implementation occurred.
- **No PostgreSQL RLS, FK, unique-key or RPC security protection was runtime-verified locally or on the hosted project.** Owner policies/composite FKs are reviewed definitions only.

## Remaining Security Unknowns

Hosted RLS/EXECUTE grants, function definer rights/search_path, ownership substitution, child-parent isolation, profile provisioning and trigger behavior remain unrecovered. The inferred baseline still lacks DB enforcement of polymorphic habit `lever_ref` ownership, and permits owners to edit their own generated rows; those are documented design boundaries, not confirmed hosted vulnerabilities. The absence of runtime tooling is not evidence of secure or insecure deployed behavior.

## Remaining Reproducibility Gaps

1. A Docker-compatible runtime must be installed/started by the user or environment owner; C2 does not install one automatically.
2. Run the actual clean migration sequence and diagnose failures without weakening RLS/FKs.
3. Run the ownership suite, fill the noted assertion gaps, seed twice and compare counts/values under each synthetic owner.
4. Generate actual local types and classify compiler impact.
5. Recover read-only hosted metadata and the three RPCs; review dependencies/security and reconcile differences before adding recovered SQL locally.
6. Execute direct RPC authorization tests and authorized aggregate compatibility checks before any production constraint rollout.

After the runtime prerequisite is available, from this repository use:

```sh
npx --no-install supabase start
npx --no-install supabase db reset --local
npx --no-install supabase test db
# Set HALO_LOCAL_URL and HALO_LOCAL_ANON_KEY from the local stack only.
node scripts/seed-local-database.mjs
node scripts/seed-local-database.mjs
```

These are future commands, **not commands executed in C2**. Do not add --linked, a hosted --db-url or a hosted project ref. Keep the hosted `.env` intact and use a separate local app environment.

## Phase B Readiness

**NOT YET READY FOR PHASE B**

Blocking reasons: migrations/RLS/seed have never executed in PostgreSQL; actual database types cannot yet be generated; hosted schema and essential RPC definitions remain unrecovered/unreconciled; direct RPC ownership and existing-data compatibility are unverified. Installing the CLI closes a tooling prerequisite only. Phase B persistence routes and the one-active index remain unchanged.

## Change Control

C2 changed `package.json` and `package-lock.json` to add the pinned CLI, updated the local CLI/type-generation instructions in `supabase/README.md` and `types/README.md`, extended `supabase/inspection/metadata.sql` with function arguments/volatility, and added this report. The latter support files were already untracked before C2. All other uncommitted application/foundation files predate this task and were preserved. No commit or push was made.

Final verification: the six existing Phase 1 regression groups passed (exit 0). `git diff --check` passed. New/untracked files were also checked separately against `/dev/null`; ordinary diff statistics exclude them.

```text
$ git status --short
 M app.vue
 M components/dashboard/DailyInsightCard.vue
 M components/dashboard/DailySnapshotCard.vue
 M components/dashboard/WhatWorksCard.vue
 M composables/useExperimentFlow.ts
 M composables/useOnboarding.ts
 M layouts/default.vue
 M package-lock.json
 M package.json
 M pages/check-in.vue
 M pages/index.vue
 M pages/reports.vue
 M server/api/habits/toggle.ts
 M server/api/what-works.get.ts
?? components/SafeMarkdown.vue
?? docs/
?? scripts/
?? supabase/
?? types/
?? utils/

$ git diff --check
(no output; exit 0)

$ git diff --stat
 app.vue                                    |  19 ++-
 components/dashboard/DailyInsightCard.vue  |  78 ++++------
 components/dashboard/DailySnapshotCard.vue |  63 ++++----
 components/dashboard/WhatWorksCard.vue     | 147 +++++++++++++++---
 composables/useExperimentFlow.ts           |  26 +++-
 composables/useOnboarding.ts               |  56 ++++---
 layouts/default.vue                        |   6 +-
 package-lock.json                          | 236 ++++++++++++++++++++++++++++-
 package.json                               |   3 +-
 pages/check-in.vue                         |   4 +-
 pages/index.vue                            |  46 +++---
 pages/reports.vue                          |   8 -
 server/api/habits/toggle.ts                |  20 +--
 server/api/what-works.get.ts               |  67 +++++++-
 14 files changed, 594 insertions(+), 185 deletions(-)
```

Explicit untracked files at completion (including files from earlier phases):

```text
components/SafeMarkdown.vue
docs/audit/HALO_DATABASE_CALLS.md
docs/audit/HALO_DATABASE_FOUNDATION.md
docs/audit/HALO_DATABASE_VERIFICATION.md
docs/audit/HALO_FULL_AUDIT.md
docs/audit/HALO_PHASE1_STABILIZATION.md
docs/audit/README_PROPOSAL.md
scripts/inventory-database.mjs
scripts/seed-local-database.mjs
scripts/verify-phase1.mjs
supabase/.gitignore
supabase/README.md
supabase/config.toml
supabase/inspection/compatibility.sql
supabase/inspection/metadata.sql
supabase/migrations/20260928000100_inferred_core.sql
supabase/migrations/20260928000200_owner_rls.sql
supabase/migrations/20260928000300_query_indexes.sql
supabase/proposals/constraints.md
supabase/tests/database/ownership.test.sql
types/README.md
utils/safeMarkdown.ts
```
