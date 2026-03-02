<!-- components/dashboard/WeeklyAiReportCard.vue -->
<template>
  <div
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-slate-100">
            Weekly reflection
          </h2>

          <!-- Confidence badge -->
          <span
            v-if="report?.confidence"
            class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-200"
            :class="confidencePillClass"
          >
            {{ confidenceLabel }}
          </span>

          <!-- Optional vibe badge -->
          <span
            v-if="vibeBadge"
            class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-200"
          >
            {{ vibeBadge }}
          </span>
        </div>

        <!-- Updated line -->
        <p v-if="generatedLabel" class="mt-1 text-[11px] text-slate-400">
          Week of {{ reportDateLabel }} · generated {{ generatedLabel }} · based on your check-ins and habits
        </p>
        <p v-if="metaLine" class="mt-1 text-[11px] text-white/45">
  {{ metaLine }}
</p>


        <p v-else class="mt-1 text-[11px] text-slate-400">
          A calm look at your last 7 days — wins, drift, and one next focus.
        </p>
      </div>

      <button
        class="shrink-0 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
        @click="refresh"
        :disabled="loading"
      >
        <span v-if="loading">Updating…</span>
        <span v-else>Update</span>
      </button>
    </div>

    <div v-if="loading" class="text-[11px] text-slate-300">
      Loading weekly reflection…
    </div>

    <!-- New structured UI -->
    <div v-else-if="report" class="space-y-4">
      <!-- Wins -->
      <section class="rounded-xl border border-white/10 bg-black/10 p-4">
        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
          Wins
        </div>

        <ul class="mt-2 space-y-1.5 text-sm text-slate-100">
          <li v-for="(w, i) in report.wins" :key="`w-${i}`" class="flex gap-2">
            <span class="mt-[2px] text-emerald-300">•</span>
            <span class="text-white/85">{{ w }}</span>
          </li>
        </ul>
      </section>

      <!-- Drift -->
      <section class="rounded-xl border border-white/10 bg-black/10 p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
            Drift
          </div>
          <div v-if="report.drift?.length === 0" class="text-[11px] text-white/35">
            None flagged
          </div>
        </div>

        <ul v-if="report.drift?.length" class="mt-2 space-y-1.5 text-sm text-slate-100">
          <li v-for="(d, i) in report.drift" :key="`d-${i}`" class="flex gap-2">
            <span class="mt-[2px] text-sky-300">•</span>
            <span class="text-white/80">{{ d }}</span>
          </li>
        </ul>

        <p v-else class="mt-2 text-sm text-white/45">
          Your week looked relatively steady.
        </p>
      </section>

      <!-- Next focus -->
      <section class="rounded-xl border border-emerald-500/15 bg-emerald-500/10 p-4">
        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/80">
          Next focus
        </div>

        <div class="mt-2 flex items-start gap-2 text-sm">
          <span class="mt-[2px] text-emerald-300">→</span>
          <p class="text-emerald-50/90">
            {{ report.next_focus }}
          </p>
        </div>

        <div class="mt-3 text-[11px] text-emerald-100/60">
          Confidence: <span class="font-medium text-emerald-100/80">{{ confidenceLabel }}</span>
        </div>
      </section>

      <!-- Fallback note if parsing failed but we still have rawContent -->
      <div v-if="parseError" class="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-[11px] text-yellow-100/80">
        This weekly report is stored in an older format. Updating will regenerate it in the new structured style.
      </div>
    </div>

    <div v-else class="text-[11px] text-slate-500">
      No weekly reflection yet. Generate the first one from your recent check-ins.
    </div>
  </div>
</template>

<script setup lang="ts">
import { parseReport } from '~/server/utils/aiReportContent'

type WeeklyOut = {
  wins: string[]
  drift: string[]
  next_focus?: string
  confidence: 'low' | 'moderate' | 'strong'
}

const supabase = useSupabaseClient()

const loading = ref(false)

const { loadNextFocus } = useNextFocusSuggestions()
const nf = await loadNextFocus({ windowDays: 60 })
const text = nf.options
  .map((o) => `${o.id}: ${o.title} — ${o.why}`)
  .join('\n\n')

const rawContent = ref<string>('')
const report = ref<WeeklyOut | null>(null)
const parseError = ref(false)

const createdAt = ref<string | null>(null)
const reportDate = ref<string | null>(null)

const coverage = ref<number | null>(null) // 0..7
const deltaLabel = ref<string>('')        // "vs previous week" etc
const deltaMode = ref<string>('')         // "week_over_week" / "within_window"


const generatedLabel = computed(() => {
  if (!createdAt.value) return ''
  const d = new Date(createdAt.value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

const reportDateLabel = computed(() => {
  if (!reportDate.value) return ''
  const d = new Date(reportDate.value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})


const confidenceLabel = computed(() => {
  const c = report.value?.confidence
  if (!c) return ''
  if (c === 'low') return 'Confidence: Low'
  if (c === 'strong') return 'Confidence: Strong'
  return 'Confidence: Moderate'
})

const confidencePillClass = computed(() => {
  // keep subtle; don’t scream
  const c = report.value?.confidence
  if (c === 'strong') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
  if (c === 'low') return 'border-white/10 bg-white/5 text-white/70'
  return 'border-sky-400/15 bg-sky-500/10 text-sky-100'
})

const vibeBadge = computed(() => {
  // very light heuristic (optional)
  const drift = (report.value?.drift || []).join(' ').toLowerCase()
  const focus = (report.value?.next_focus || '').toLowerCase()
  const combined = `${drift} ${focus}`

  const recoverySignals = [
    'rest', 'recovery', 'gentle', 'lower the pressure', 'reduce the pressure',
    'take it easy', 'slow down', 'burnout', 'tired', 'fatigue', 'overwhelmed'
  ]

  if (recoverySignals.some(s => combined.includes(s))) return 'Recovery week'
  return ''
})

const metaLine = computed(() => {
  const parts: string[] = []

  if (typeof coverage.value === 'number') parts.push(`Based on ${coverage.value}/7 check-ins`)
  if (deltaLabel.value) parts.push(deltaLabel.value)

  // Keep this optional; you already show confidence in UI
  const c = report.value?.confidence
  if (c) parts.push(`confidence: ${c}`)

  return parts.join(' · ')
})

async function loadOverviewMeta() {
  try {
    const data = await $fetch('/api/reports/overview', { query: { days: 7 } }) as any
    coverage.value = typeof data?.checkins === 'number' ? data.checkins : null
    deltaLabel.value = String(data?.delta_label || '')
    deltaMode.value = String(data?.delta_mode || '')
  } catch (e) {
    // optional info; fail quietly
    coverage.value = null
    deltaLabel.value = ''
    deltaMode.value = ''
  }
}

async function loadExisting() {
  loading.value = true
  parseError.value = false

  try {
    const today = new Date().toISOString().slice(0, 10)

    const { data: userData } = await supabase.auth.getUser()
    const currentUser = userData.user
    if (!currentUser) {
      rawContent.value = ''
      report.value = null
      return
    }

// 1) Try exact today
let { data, error } = await supabase
  .from('ai_reports')
  .select('content, created_at, date')
  .eq('user_id', currentUser.id)
  .eq('period', 'weekly')
  .eq('date', today)
  .maybeSingle()

if (error) console.error(error)

// 2) Fallback to latest <= today
if (!data) {
  const res = await supabase
    .from('ai_reports')
    .select('content, created_at, date')
    .eq('user_id', currentUser.id)
    .eq('period', 'weekly')
    .lte('date', today)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (res.error) console.error(res.error)
  data = res.data
}

    if (error) console.error(error)

    rawContent.value = data?.content || ''
    createdAt.value = data?.created_at || null
    reportDate.value = data?.date || null

    const parsed = parseReport<WeeklyOut>(rawContent.value)
report.value = parsed
parseError.value = !!rawContent.value && !parsed
// If the report exists but doesn't include next_focus, compute a fallback from Phase 4 engine
// If report exists but next_focus missing/empty, compute a fallback
if (report.value && (!report.value.next_focus || !report.value.next_focus.trim())) {
  try {
    const nf = await $fetch('/api/ai/insights/correlations', {
      query: { windowDays: 60, minN: 10 },
      credentials: 'include'
    }) as any

    const items = Array.isArray(nf?.items) ? nf.items : []
    const top = items
      .filter((c: any) => typeof c?.corr === 'number' && Number.isFinite(c.corr))
      .sort((a: any, b: any) => Math.abs(b.corr) - Math.abs(a.corr))[0]

    report.value.next_focus = top
      ? `A: Explore ${top.x} → ${top.y} (r=${Number(top.corr).toFixed(2)}, n=${top.n}). B: Run a 7-day experiment for a reliable signal.`
      : `Run a 5–7 day experiment (stress or sleep consistency) to unlock more reliable insights.`
  } catch {
    report.value.next_focus =
      `Run a 5–7 day experiment (stress or sleep consistency) to unlock more reliable insights.`
  }
}
await loadOverviewMeta()


  } catch (e) {
    console.error(e)
    rawContent.value = ''
    report.value = null
    parseError.value = false
  } finally {
    loading.value = false
  }
}

async function refresh() {
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)

    const res = await $fetch('/api/ai/weekly-summary', {
  method: 'POST',
  body: { endDate: today }
})

if (res?.summary) {
  report.value = res.summary
  rawContent.value = JSON.stringify(res.summary)
  parseError.value = false
  createdAt.value = new Date().toISOString()
  reportDate.value = today
  await loadOverviewMeta()

} else {
  await loadExisting()
}

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadExisting()
})
</script>
