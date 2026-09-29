# Halo Phase 1 stabilization verification

Verified 28 September 2026. The working tree already contained the Phase 1 implementation and verification script when this pass began. Those edits were reviewed and retained; this pass added a mixed null/zero snapshot regression and this report. Existing What Works edits and audit documents were preserved. No commit or push was made.

## Files and fixes

| Files | Root cause and retained fix | Verification |
| --- | --- | --- |
| `pages/index.vue`, `app.vue`, `composables/useExperimentFlow.ts` | A plain, possibly undefined owner ID was read as a ref by an immediate watcher. Owner identity is now computed; signed-out home displays a sign-in state. Account changes remount views, clear Nuxt data and shared experiment state, and invalidate pending shared requests. Public route configuration stays intact. | Production `/` returns 200; owner-change and delayed-response assertions pass. |
| `components/dashboard/DailySnapshotCard.vue`, `pages/index.vue` | Explicit null bypassed prop defaults and crashed `toFixed`; defaults fabricated scores. Nulls now display `Not logged`, without score bars. Uncollected sleep quality is removed. Habit loading/failure remains distinct from zero completion. | Omitted, null, populated, mixed null/zero snapshots rendered using Vue SSR; assertions pass. |
| `utils/safeMarkdown.ts`, `components/SafeMarkdown.vue`, `pages/check-in.vue`, `components/dashboard/DailyInsightCard.vue` | Parsed HTML was inserted through `v-html`. Shared rendering now converts a small Markdown token subset to fixed Vue elements and escaped text. No content-controlled tags, attributes or URLs reach the DOM. | Script, image/event-handler, SVG, iframe, mixed-case JavaScript/data URL, encoded HTML and code-block payload assertions pass; normal formatting survives. |
| `composables/useOnboarding.ts`, `layouts/default.vue` | Missing profile was dereferenced; load/save errors lacked controlled handling. Missing profiles can dismiss the guide for this session; failures show generic messages and loading always settles. | Missing/failed profile and signed-out assertions pass. |
| `server/api/habits/toggle.ts` | `archived` was read before checking lookup errors/null. Owner-scoped lookup now returns controlled 404/500 responses before dereferencing, and write failures use generic messages. | Missing, hidden, foreign, archived, owned and failed-write cases pass with mocked DB responses. |
| `layouts/default.vue`, `components/dashboard/DailyInsightCard.vue`, `pages/reports.vue`, `pages/index.vue` | Incorrect public asset prefix, inert reset button, development teaser and unconditional AI availability claim. Corrected asset URL and removed misleading/dead UI. | Logo returns 200; source review confirms removals. |
| `scripts/verify-phase1.mjs` | Small reproducible checks using existing Node assertions, Vue compiler/SSR and TypeScript installation; no testing stack added. | All six groups pass, including the added mixed null/zero case. |

The Daily Snapshot contract displays sleep, mood, energy, stress and habits. Movement (`steps`, in minutes), hydration (`water_liters`) and outdoor time (`outdoor_minutes`) are not displayed there. Their existing check-in load/save paths preserve missing values as null and retain explicit zero. Sleep quality is not collected. No additional measurements or card redesign were introduced. Adjacent insight rendering also preserves missing scores rather than treating them as zero; recommendation thresholds were not changed.

Markdown tradeoff: paragraphs, emphasis, lists, quotations and code remain formatted. Links/images retain text labels without navigation or remote image loading. Raw HTML and unsupported constructs display as text. This is intentionally a narrow renderer, with no new dependency and no HTML-string sink.

## Commands and results

Using `PATH=/Users/tyokone/.nvm/versions/node/v22.12.0/bin:$PATH`:

```sh
node scripts/verify-phase1.mjs
npm run build > /tmp/halo-phase1-build.log 2>&1
HOST=127.0.0.1 PORT=3028 node --env-file=.env .output/server/index.mjs
```

Regression script: exit 0, six passing groups. Production build: exit 0. Node 22.12.0 satisfies the installed Nuxt engine range. Local server and HTTP probes required sandbox escalation after port/network restrictions.

```sh
curl -sS --max-time 30 -o /tmp/halo-phase1-home.html -w 'home HTTP %{http_code}\n' http://127.0.0.1:3028/
curl -sS --max-time 30 -o /tmp/halo-phase1-auth.html -w 'auth HTTP %{http_code}\n' http://127.0.0.1:3028/auth
curl -sS --max-time 30 -o /tmp/halo-phase1-logo.png -w 'logo HTTP %{http_code}\n' http://127.0.0.1:3028/Halo_logo3.png
git diff --check
git diff --stat
```

All three HTTP probes returned 200; home contains the signed-out message and auth contains its email input. Diff whitespace check passed. `git diff --stat` excludes untracked files and includes the pre-existing What Works changes.

## Remaining risks and next phase

No authenticated browser walkthrough or hosted DB mutation was performed. Owner-switch tests exercise reactive state and request guards, not browser hydration/remount behavior. Missing-record tests use mocks, so they do not establish actual hosted RLS or profile provisioning. Later browser regressions should cover sign-in/account-switch/sign-out with delayed requests, an optional-field check-in, onboarding with absent profiles, and actual DOM Markdown rendering.

Build warnings remain for the incompatible disabled Markdown module, missing database types and stale Browserslist data. Build success is not a full typecheck. Known persistence/data-loss, experiment DTO, analytics/confidence, date and localization issues remain outside this phase.

Recommended next phase: **C — database migrations/RLS/reproducibility**. Bring schema, constraints, RPCs and policies under review and create an isolated synthetic-data environment. That establishes the foundation for safely implementing and testing **B — atomic persistence/data-loss protection**, which should follow immediately. No migrations, RLS, analytics or persistence redesign was performed here.
