# Halo portfolio screenshot plan

Reviewed 29 September 2026 against the current working tree. This is a source-based review of four capture targets, not an authenticated browser walkthrough. No account, hosted data or AI generation was accessed. Screenshot readiness below is conditional on a configured backend and synthetic data; no rendered desktop/mobile verification is claimed.

**Safe preparation checklist**

- Use an existing development account only if it contains exclusively synthetic data. Otherwise, manually sign in with a dedicated demo email through the existing magic-link flow on an already configured development backend. Keep email addresses, tokens and real wellness records out of screenshots.
- Prepare 28–35 days ending on the capture date. Include varied sleep (roughly 6–8 hours), integer mood/energy/stress scores on the 1–5 scale, movement/outdoor minutes, some missing optional measurements and uneven habit completion. These are invented demonstration inputs, not customer outcomes.
- The check-in UI edits today only: it cannot backfill several weeks. Fastest route is an existing synthetic development history. Otherwise, the owner must manually enter dated synthetic rows through their existing development data tooling, scoped to the dedicated demo account and actual schema. If that is unavailable, accumulate check-ins over time. No automatic hosted seed or new infrastructure is part of this plan.
- Create 2–3 habits through the app, such as “Short walk”, “Quiet reading” and “Evening wind-down”, with realistic weekly targets. For manual historical completions, use those actual habit IDs and the demo owner. The database field `steps` represents movement **minutes** in this app.
- Prepare one completed experiment with a preceding baseline and, afterward, one current experiment. The start dialog starts today; historical experiment preparation also requires the owner's existing development tooling or elapsed time. Use the real app end/review flow to obtain computed results. Do not insert fabricated effects, confidence labels or AI reports.
- The existing `scripts/seed-local-database.mjs` is guarded for a local Supabase stack, uses fixed historical dates and does not create computed effects or reflections. It is not usable for this no-Docker task. Do not remove its safeguards or point it at a hosted project.
- Saving a check-in requests an OpenAI reflection. Use synthetic journal text, configure the provider if that card is wanted, and let generation finish. If saving reports an error, inspect the saved state before retrying: multi-step persistence remains deferred work.
- Capture with English UI, browser zoom at 100%, onboarding dismissed and no loading/error overlays. Identify the images as synthetic demonstrations in portfolio captions. Save PNG files under `docs/images/`, then enable only the corresponding README image references.

## Dashboard

**Readiness: Ready at source level, pending data and authenticated visual verification.**

- Route: `/`. Suggested viewport: **1440 × 1100**; save `docs/images/dashboard.png`. A full-page capture or a second crop may be necessary: trends and the active experiment are below the first row.
- Show today's snapshot with sleep 7.2 h, mood 4/5, energy 3/5 and stress 3/5. Complete two of three habits. Avoid a uniformly green, perfect day.
- Show at least five populated days in the last seven so the trend cards have useful variation. Keep at least one lower-energy day and one missed habit.
- Include a current “Sleep consistency” experiment targeting energy. It can follow the completed experiment used for the review capture; avoid replacing an unfinished experiment just for a screenshot.
- Include one actual generated daily reflection or a populated What Works observation when available. What Works depends on the configured backend's RPC and sufficient data; an empty/learning state is legitimate, not a reason to manufacture a claim.
- Source review found the signed-out and missing-snapshot states handled, the logo path corrected and earlier developer teasers removed. No additional dashboard edit was needed. Next Focus computes a stored insight on mount, so use the dedicated demo account for walkthroughs.
- Before capture, verify all selected cards settle successfully. An empty account will show onboarding/empty states rather than the intended product story. Do not treat failed API calls as successful empty data.

## Mobile Check-in

**Readiness: Needs small polish for an active-experiment capture.**

- Route: `/check-in`. Suggested viewport: **390 × 844**, optionally captured at device pixel ratio 2. Save `docs/images/check-in-mobile.png` as a full-page image; the form, habits, reflection and experiment cards will not all fit in one viewport. Verify at 360 px wide as well.
- Populate sleep 7.2 h, movement 25 min, mood 4, energy 3, stress 3 and outdoor time 20 min. Leave water blank to demonstrate optional data rather than replacing it with zero.
- Select “Short walk” and “Quiet reading”; leave “Evening wind-down” unchecked. Suggested synthetic reflection: “The lunchtime walk felt refreshing. Energy still dipped in the afternoon.”
- Show readable field labels, selected habits and reflection text. Capture after any save/AI request has settled; keep the keyboard closed. A top-of-form crop can accompany the full-page image on the portfolio.
- Remaining visible issue: the active experiment summary reads `target_metric` and `start_date` while the active API supplies `targetMetric` and `startDate`. With an active experiment, it can show a blank target and Day 0. This contract correction is documented and deferred; do not publish a full-page active-state capture until checked and corrected separately. A genuine pre-experiment form capture is usable now.
- Required manual check: confirm labels fit the narrow columns, controls remain usable and saving reloads the intended values. Failed habit loading and partial-save behavior remain outside this polish task; do not save over a failed load.

## Experiment Review

**Readiness: Blocked for a verified numerical screenshot until a demo experiment produces real computed effects.** The UI exists; authenticated end/review persistence and the hosted effects RPC were not exercised here.

- Route: `/experiments` → open the experiment's end/review or history dialog. Suggested viewport: **1440 × 1200**, with a tight crop around the dialog saved as `docs/images/experiment-review.png`.
- Use the existing **“Outdoor time”** preset: lever `outdoor_minutes`, target `stress`. Define the intended action in the demo narrative as a short outdoor break each day; the app does not verify adherence.
- Example timeline relative to capture date **D**: completed intervention **D−7 through D−1** (7 days), baseline window **D−37 through D−8** (the preset's default 30 days). With 35 days of synthetic history starting D−34, only 27 baseline days have potential entries. The displayed window length is not the number of logged observations. Keep those distinct in captions.
- Give baseline and intervention ordinary variation and overlapping scores. A modest example would be stress averaging about **3.4 → 3.0 out of 5**, with occasional worse days. This is a planning example, not a required output: publish only the averages actually computed from the entered synthetic records. Do not tune confidence or replace the returned result to match it.
- In the subjective step, choose **“Slightly better”** and write “The break felt useful, but busier days were still stressful.” Capture this step separately if desired. Then advance to the numerical review.
- The final review shows baseline/intervention values, window lengths, alignment and confidence. It does **not** display the original subjective radio selection alongside those numbers. Do not imply a combined view exists: use a caption or a companion capture for the subjective step.
- Keep the returned evidence label visible, including low/unclear or insufficient-data states. Caption the result as a synthetic before/after observation, not proof that outdoor time reduced stress.
- Small polish applied: the dialog now has a viewport height limit and vertical scrolling, keeping long reviews reachable on shorter screens. Verify scrolling in a browser before capture.
- Deferred blockers: numeric effects depend on `upsert_experiment_effects_v1`; ending an experiment can leave missing effects after a failure. Review notes are written into outcome JSON but read from top-level fields, so reopened notes may disappear unless hosted behavior reconciles them. Check save/reopen on the demo account; if values or notes disagree, record the issue rather than showing a misleading successful review.

## Reports

**Readiness: Ready at source level after label polish, pending data and authenticated visual verification.**

- Route: `/reports`. Suggested viewport: **1440 × 1100**; save `docs/images/reports.png`. Use a full-page capture if habit and pattern sections extend below the fold.
- Select **30d** with roughly 25–32 logged days in the available 28–35-day history. Show average sleep/mood/stress, four varying trend lines and mixed habit completion.
- Use **Calm** mode for the primary capture. Optionally capture Advanced separately to show counts, date windows, deltas and descriptive correlations. Allow each range request to settle before switching again.
- The Reports “What worked” section is separate from the dashboard's What Works card. Show its actual observations; correlations are associations, not experimental proof. Missing correlations should remain missing.
- Small polish applied: Mood and Energy hints now say **1–5**, matching check-in inputs. Earlier development teaser text was already removed. Empty trends and “No active habits yet” are implemented but need populated demo data for this capture.
- Deferred detail: some insight sentences say “previous week” even when the API uses a within-window comparison. Verify the returned comparison mode before an Advanced capture; do not caption a fallback comparison as week-over-week. Analytics, confidence rules and request-race behavior are unchanged.
- Final browser check: ensure reports load in an authenticated session, all four charts have more than one observation, no horizontal overflow appears and the chosen range matches the visible dates.

**Suggested portfolio description (90 words)**

I built Halo, a personal wellness experimentation app that connects daily check-ins with small changes and thoughtful review. Its core loop combines baseline and intervention comparisons with how an experiment felt, helping users consider what may be worth repeating without treating correlation as causation. Built with Nuxt, Vue, TypeScript and Supabase, Halo includes habit tracking, custom SVG trends, experiment history and contextual AI reflections. I designed the interface and implemented the full-stack flows, keeping deterministic analysis separate from AI narration. The portfolio demo uses synthetic data to illustrate the product.
