# Halo inferred local database foundation

**This is a partial reconstruction from application code, not an export of the
hosted database. Do not push these migrations to the existing Halo project.**

See [the foundation report](../docs/audit/HALO_DATABASE_FOUNDATION.md) for evidence,
unknowns, compatibility risks and RPC contracts. All three analytics RPC bodies
are missing; a full working Halo database is not yet reproducible.

## Local setup (not executed in this environment)

Prerequisites: the project-local Supabase CLI and a Docker-compatible local container runtime.
C2 installed CLI 2.118.0 as a pinned devDependency; the container runtime remains
unavailable. Run `npm ci` to restore the CLI on another machine. No runtime was
installed system-wide. See [C2 verification](../docs/audit/HALO_DATABASE_VERIFICATION.md).
The config uses a distinct local project name and has no remote link.

From the repository root:

```sh
npx --no-install supabase start
# Only for this disposable local stack; deletes its previous LOCAL data:
npx --no-install supabase db reset --local
npx --no-install supabase test db
```

Do not use `--linked`, `--db-url`, `supabase link`, or `supabase db push` for this
baseline. Inspect command help for your installed CLI version. `db reset --local`
should apply three migrations; the pgTAP suite verifies all 14 table ownership
boundaries. It does not verify missing RPCs or the full application workflow.

Use a separate local app environment with the local API URL and public anon key
from `npx --no-install supabase status`; do not overwrite the hosted `.env`. Leave AI credentials
unset for DB-only testing. Auth callback URLs in config assume app port 3000.

## Synthetic fixtures

The seed is opt-in and uses ordinary local signup and owner-authorized REST
writes. SQL migrations never insert real or synthetic auth users automatically.
Supply the **local public anon key**, not a service-role key:

```sh
export HALO_LOCAL_URL=http://127.0.0.1:54321
# Set HALO_LOCAL_ANON_KEY privately from your LOCAL stack status.
node scripts/seed-local-database.mjs
```

The script rejects non-loopback hosts, alternate ports, credentials in URLs and
redirects. It does not load `.env`, query hosted data, generate AI text or print
keys/tokens. Accounts: `halo-demo-a@example.test` and `halo-demo-b@example.test`,
local-only password `LocalSyntheticOnly-2026!`. These are intentionally public
synthetic credentials and must never be used in a hosted environment.

Each has 35 fixed daily measurements ending 2026-09-28, two habits, 70 completion
rows and one active custom experiment. Missing and zero values are represented.
No fabricated effects, correlations, AI reports or causal conclusions are seeded.
Use a matching report date window; ordinary "today" views may be empty later.
Rerunning updates the known synthetic rows, including resetting the demo experiment
to active; use only for disposable fixtures, not retained testing sessions.

## Types and missing definitions

See [types/README.md](../types/README.md) for local generation. Generated types
will describe only this partial inferred schema until actual RPCs are recovered.
No profile-creation or timestamp-maintenance trigger is presumed. The seed creates
profiles normally under RLS; normal new users can currently see the session-only
onboarding fallback until profile provisioning is confirmed and reproduced.

Ask an authorized DB operator to run `inspection/metadata.sql` read-only and
review definitions privately before sharing. It inspects public columns, relation
kinds, keys, grants, indexes, RLS, functions and relevant auth triggers, without
selecting user records. `inspection/compatibility.sql` is an optional aggregate-only
preflight after metadata reconciliation; it is not executed automatically.
Recover all three RPCs and dependencies without changing their calculations,
inspect their authorization, then add reviewed function migrations and tests.

Deferred validation and one-active SQL live in `proposals/constraints.md`, outside
the migration runner. Do not treat them as production-ready migrations.

Official references: [local migrations](https://supabase.com/docs/guides/local-development/database-migrations),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[functions](https://supabase.com/docs/guides/database/functions),
[database testing](https://supabase.com/docs/guides/database/testing).
