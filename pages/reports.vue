<template>
  <div class="mx-auto max-w-6xl px-4 py-8 lg:py-10 space-y-8">
    <!-- Hero -->
    <section
      class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-sky-500/20 px-6 py-6 lg:px-8 lg:py-7">
      <div class="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl" />
      <div class="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[12px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
            Halo · Reports
          </p>
          <h1 class="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight text-white">
            Patterns & progress
          </h1>
          <p class="mt-2 text-sm text-white/70 max-w-xl">
            Calm, data-backed insights—without turning your life into a spreadsheet.
          </p>
        </div>

        
        <div class="flex items-center gap-2">
          <button type="button" class="rounded-full border px-3 py-1.5 text-xs" :class="advanced
            ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
            : 'border-white/10 bg-black/10 text-white/70 hover:bg-white/10'" @click="advanced = !advanced">
            {{ advanced ? 'Advanced: ON' : 'Advanced' }}
          </button>

          <button v-for="opt in dayOptions" :key="opt" type="button" class="rounded-full border px-3 py-1.5 text-xs"
            :class="days === opt
              ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
              : 'border-white/10 bg-black/10 text-white/70 hover:bg-white/10'" @click="days = opt">
            {{ opt }}d
          </button>
        </div>
      </div>
    </section>

    <!-- Loading / error -->
    <div v-if="loading" class="text-sm text-slate-400">Loading reports…</div>
    <div v-else-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
      {{ error }}
    </div>

    <template v-else>
      <!-- Summary -->
      <section class="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Avg sleep" :value="fmtSleep(report.summary.sleep_avg)"
          :delta="fmtDelta(report.deltas.sleep, 'sleep')" :show-delta="advanced" />
        <SummaryTile label="Avg mood" :value="fmtNum(report.summary.mood_avg)"
          :delta="fmtDelta(report.deltas.mood, 'mood')" :show-delta="advanced" />
        <SummaryTile label="Avg stress" :value="fmtNum(report.summary.stress_avg)"
          :delta="fmtDelta(report.deltas.stress, 'stress')" :show-delta="advanced" />
        <SummaryTile label="Habits" :value="fmtPct(report.summary.habit_completion_rate)"
          :delta="`${report.habits.active_count} active`" :show-delta="advanced" deltaNeutral />
      </section>


      <!-- Trends -->
      <section
        class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">Trends</h2>
            <p class="mt-1 text-xs text-white/55">
  <span v-if="!advanced">A calm view of how your week is moving.</span>
  <span v-else>{{ report.period.start }} → {{ report.period.end }} · {{ report.checkins }} check-ins</span>
</p>

          </div>
          <div class="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-white/60">
            {{ report.period.days }} days
          </div>
        </div>

        <div class="mt-4 grid gap-6 md:grid-cols-2">
          <TrendCard title="Sleep" hint="Higher is better (aim ~7–8h)">
            <template v-if="compact(report.series.sleep).length > 1">
  <MiniSparkline :points="compact(report.series.sleep)" class="h-16 w-full" />
</template>
<div v-else class="text-[11px] text-white/45">
  Not enough data yet.
</div>

          </TrendCard>

          <TrendCard title="Mood" hint="Your 1–10 scale">
            <template v-if="compact(report.series.mood).length > 1">
  <MiniSparkline :points="compact(report.series.mood)" class="h-16 w-full" />
</template>
<div v-else class="text-[11px] text-white/45">
  Not enough data yet.
</div>

          </TrendCard>

          <TrendCard title="Stress" hint="Lower is better">
            <template v-if="compact(report.series.stress).length > 1">
  <MiniSparkline :points="compact(report.series.stress)" class="h-16 w-full" />
</template>
<div v-else class="text-[11px] text-white/45">
  Not enough data yet.
</div>

          </TrendCard>

          <TrendCard title="Energy" hint="Your 1–10 scale">
            <template v-if="compact(report.series.energy).length > 1">
  <MiniSparkline :points="compact(report.series.energy)" class="h-16 w-full" />
</template>
<div v-else class="text-[11px] text-white/45">
  Not enough data yet.
</div>

          </TrendCard>
        </div>
        <div v-if="advanced" class="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
  <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
    Details
  </div>
  <div class="mt-2 grid gap-2 sm:grid-cols-2 text-[11px] text-white/70">
    <div>Check-ins: <span class="text-white/90 font-medium">{{ report.checkins }}</span></div>
    <div>Window: <span class="text-white/90 font-medium">{{ report.period.days }} days</span></div>
    <div>Start: <span class="text-white/90 font-medium">{{ report.period.start }}</span></div>
    <div>End: <span class="text-white/90 font-medium">{{ report.period.end }}</span></div>
  </div>
</div>

      </section>

      <!-- Habits performance -->
      <section
        class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">Habits performance</h2>
            <p class="mt-1 text-xs text-white/55">
              Completion frequency over the selected window
            </p>
          </div>
        </div>

        <div v-if="!report.habits.performance.length" class="mt-4 text-sm text-slate-400">
          No active habits yet.
          <NuxtLink to="/habits" class="text-emerald-300 hover:underline ml-1">Create your first habit →</NuxtLink>
        </div>

        <div v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="h in sortedHabits" :key="h.id" class="rounded-xl border border-white/10 bg-black/10 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-slate-100">{{ h.name }}</div>
                <div class="mt-1 text-[11px] text-white/55">
                  {{ h.frequency === 'daily' ? 'Daily' : 'Weekly' }} · Target {{ h.target_per_week }}/week
                </div>
              </div>

              <!-- <div class="shrink-0 text-right">
                <div class="text-sm font-semibold text-white/90">{{ Math.round(h.completion_rate * 100) }}%</div>
                <div class="mt-1 text-[11px] text-white/45">{{ h.completed_count }} done</div>
              </div> -->
              <div class="shrink-0 text-right">
  <template v-if="advanced">
    <div class="text-sm font-semibold text-white/90">
      {{ Math.round(h.completion_rate * 100) }}%
    </div>
    <div class="mt-1 text-[11px] text-white/45">
      {{ h.completed_count }} done
    </div>
  </template>

  <div v-else class="text-[11px] text-white/55">
    {{ h.frequency === 'daily' ? 'Daily habit' : 'Weekly habit' }}
  </div>
</div>


            </div>

            <div class="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div class="h-full bg-emerald-500/30"
                :style="{ width: `${Math.min(100, Math.round(h.completion_rate * 100))}%` }" />
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-lg font-semibold text-slate-100">Insights</h2>
      <p class="mt-1 text-xs text-white/55">
        A few gentle observations from this window.
      </p>
    </div>
    <div class="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-white/60">
      {{ advanced ? 'Advanced' : 'Calm' }}
    </div>
  </div>

  <div class="mt-4 space-y-2 text-sm text-slate-200">
    <p v-for="(s, i) in insightSentences" :key="i">
      • {{ s }}
    </p>
  </div>
</section>


      <!-- Teaser: insights -->
      <section class="rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-5 lg:px-6 lg:py-6">
        <h2 class="text-base font-semibold text-slate-100">Next</h2>
        <p class="mt-1 text-sm text-white/60">
          Tomorrow we can add correlations (sleep → mood, habits → stress) and a weekly “what worked” insight that’s
          truly data-backed.
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MiniSparkline from '~/components/charts/MiniSparkline.vue'
import SummaryTile from '~/components/reports/SummaryTile.vue'
import TrendCard from '~/components/reports/TrendCard.vue'


type SparkPoint = { time: number; value: number | null }

const advanced = useState<boolean>('reportsAdvanced', () => false)

const days = ref<number>(30)
const dayOptions = [7, 14, 30, 90]

const loading = ref(true)
const error = ref<string>('')

const report = ref<any>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await $fetch('/api/reports/overview', { query: { days: days.value } })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load reports'
    report.value = null
  } finally {
    loading.value = false
  }
}

watch(days, load, { immediate: true })

function compact(points: SparkPoint[]): { time: number; value: number }[] {
  return (points || [])
    .filter((p): p is { time: number; value: number } => typeof p.value === 'number')
    .map(p => ({ time: p.time, value: p.value }))
}


function fmtNum(v: number | null) {
  return v == null ? '—' : String(v)
}
function fmtSleep(v: number | null) {
  return v == null ? '—' : `${v.toFixed(1)}h`
}
function fmtPct(v: number | null) {
  return v == null ? '—' : `${Math.round(v * 100)}%`
}
function fmtDelta(v: number | null, kind: 'sleep' | 'mood' | 'stress' | 'energy') {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  if (kind === 'sleep') return `${sign}${v.toFixed(1)}h`
  return `${sign}${v.toFixed(1)}`
}

const sortedHabits = computed(() => {
  const list = report.value?.habits?.performance || []
  return [...list].sort((a, b) => (b.completion_rate ?? 0) - (a.completion_rate ?? 0))
})

const insightSentences = computed(() => {
  if (!report.value) return []

  const s = report.value.summary || {}
  const d = report.value.deltas || {}

  const out: string[] = []

  // Sleep
  if (typeof d.sleep === 'number') {
    if (d.sleep > 0.3) out.push(`Sleep is trending upward lately.`)
    else if (d.sleep < -0.3) out.push(`Sleep has dipped a bit — consider protecting your evenings.`)
    else out.push(`Sleep looks steady — consistency is doing its job.`)
  } else if (typeof s.sleep_avg === 'number') {
    out.push(`Average sleep is ${s.sleep_avg.toFixed(1)}h in this window.`)
  }

  // Mood / stress relationship “gentle”
  if (typeof d.stress === 'number') {
    if (d.stress < -0.3) out.push(`Stress looks a little lower than last week.`)
    else if (d.stress > 0.3) out.push(`Stress has been slightly higher — keep expectations soft.`)
  }

  // Habits
  if (typeof s.habit_completion_rate === 'number') {
    const pct = Math.round(s.habit_completion_rate * 100)
    if (pct >= 70) out.push(`Habits are landing consistently — momentum is there.`)
    else if (pct >= 40) out.push(`Habits are partially consistent — one “anchor habit” could help.`)
    else out.push(`This window looks harder for habits — start with a tiny win.`)
  }

  // Advanced: add one numeric line max
  if (advanced.value && typeof d.sleep === 'number') {
    out.push(`Sleep delta: ${d.sleep > 0 ? '+' : ''}${d.sleep.toFixed(1)}h vs previous week.`)
  }

  return out.slice(0, advanced.value ? 4 : 3)
})

</script>
