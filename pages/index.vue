<template>
  <div class="mx-auto max-w-6xl px-4 py-8 lg:py-10 space-y-8">
    <section
      class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-sky-500/20 px-6 py-6 lg:px-8 lg:py-7">
      <div class="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl" />
      <div class="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[12px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
            Halo · Daily dashboard
          </p>
          <h1 class="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight text-white">
            Halo, today.
          </h1>
          <p class="mt-2 text-sm text-white/70 max-w-xl">
            A calm overview of how you’re doing right now.
          </p>
        </div>

        <div class="flex flex-wrap gap-3 text-xs text-white/70">
          <div class="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">
            <span class="font-medium text-emerald-200">✓</span>
            Daily check-in ready
          </div>
          <div class="rounded-full border border-white/10 bg-black/10 px-3 py-1.5">
            AI insights enabled
          </div>
        </div>
      </div>
    </section>

    <!-- Row 1: Snapshot + Insight -->
  <section class="grid gap-6 lg:grid-cols-3 lg:items-stretch">
  <!-- LEFT COLUMN (2/3): Snapshot + Habits + Patterns -->
  <div class="space-y-6 lg:col-span-2">
    <!-- Snapshot -->
    <div>
      <div v-if="loading" class="text-sm text-slate-400">
        Loading today’s snapshot…
      </div>

      <div v-else-if="!metrics" class="text-sm text-slate-400">
        No check-in yet today.
        <NuxtLink to="/check-in" class="text-emerald-300 hover:underline ml-1">
          Complete your daily check-in →
        </NuxtLink>
      </div>

      <DailySnapshotCard
        v-else
        :mood-score="metrics.mood"
        :energy-score="metrics.energy"
        :sleep-hours="metrics.sleep_hours"
        :sleep-quality="metrics.sleep_quality || 0"
        :stress-level="metrics.stress"
        :habits-completed="completedHabitsCount"
        :habits-total="todayHabitsCount"
      />
    </div>

    <!-- Habits (move here) -->
    <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div class="flex items-end justify-between gap-3 mb-4">
        <h2 class="text-lg font-semibold text-slate-100">
          Your habits today
        </h2>
        <div class="text-xs text-white/60">
          {{ completedHabitsCount }}/{{ todayHabitsCount }} completed
        </div>
      </div>

      <div v-if="habitsLoading" class="text-sm text-slate-400">Loading habits…</div>

      <div v-else-if="!habits || habits.length === 0" class="text-sm text-slate-400">
        No habits yet.
        <NuxtLink to="/habits" class="text-emerald-300 hover:underline ml-1">
          Create your first habit →
        </NuxtLink>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
        <!-- show more than 3 to make the section feel real -->
        <div
          v-for="h in habits.slice(0, 6)"
          :key="h.id"
          class="rounded-xl border border-white/10 bg-slate-900/90 p-4"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-slate-100">{{ h.name }}</span>
            <span class="text-[10px] text-slate-400">
              {{ h.frequency === 'daily' ? 'Daily' : 'Weekly' }}
            </span>
          </div>
          <div class="mt-2 text-[10px] text-slate-300">
            Aim: {{ h.target_per_week }} this week
          </div>
        </div>
      </div>
    </section>

    <!-- Patterns (move here) -->
    <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-4">
        Patterns this week
      </h2>

      <div v-if="trendLoading" class="text-sm text-slate-400">
        Loading weekly trends…
      </div>

      <div v-else class="grid gap-6 md:grid-cols-3">
        <MiniTrendCard title="Sleep" :points="sleepSeries" />
        <MiniTrendCard title="Mood" :points="moodSeries" />
        <MiniTrendCard title="Stress" :points="stressSeries" />
      </div>
    </section>
  </div>

  <!-- RIGHT COLUMN (1/3): Insight (controlled height) -->
  <div class="lg:col-span-1">
    <div class="lg:sticky lg:top-24 h-full">
      <DailyInsightCard
      :collapsed="true" :max-paragraphs="2"
        class="max-h-[520px] overflow-auto"
        :loading="aiLoading"
        :ai-summary="aiSummary"
        :metrics="metrics"
      />
    </div>
  </div>
</section>



    <WeeklyGoalsCard />
    <WeeklyAiReportCard />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import MiniTrendCard from '~/components/dashboard/MiniTrendCard.vue'
import DailySnapshotCard from '~/components/dashboard/DailySnapshotCard.vue'
import DailyInsightCard from '~/components/dashboard/DailyInsightCard.vue'
import WeeklyAiReportCard from '~/components/dashboard/WeeklyAiReportCard.vue'
import WeeklyGoalsCard from '~/components/dashboard/WeeklyGoalsCard.vue'

type MetricPoint = { time: number; value: number }

type DailyMetricsRow = {
  date: string
  mood: number
  energy: number
  stress: number
  sleep_hours: number
  sleep_quality?: number | null
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Today’s metrics
const metrics = ref<DailyMetricsRow | null>(null)
const loading = ref(true)

// Habits
const habits = ref<any[]>([])
const habitsLoading = ref(true)

// Weekly trends
const sleepSeries = ref<MetricPoint[]>([])
const moodSeries = ref<MetricPoint[]>([])
const stressSeries = ref<MetricPoint[]>([])
const trendLoading = ref(true)

// AI insight
const aiSummary = ref<string>('')
const aiLoading = ref(true)

// Optional: lightweight per-section errors (useful for debugging / banners)
const errors = ref<{ today?: string; habits?: string; trends?: string; ai?: string }>({})

const completedHabitsCount = computed(() =>
  habits.value.filter((h) => h.completed_today).length
)
const todayHabitsCount = computed(() => habits.value.length)

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function sevenDaysAgoISO() {
  return new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
}

async function loadToday(uid: string) {
  loading.value = true
  errors.value.today = undefined

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('date', todayISO())
    .eq('user_id', uid)
    .maybeSingle()

  if (error) errors.value.today = error.message
  metrics.value = (data as any) || null
  loading.value = false
}

async function loadHabits(uid: string) {
  habitsLoading.value = true
  errors.value.habits = undefined

  try {
    const data = await $fetch('/api/habits/today', {
      query: { date: todayISO() }
    })
    habits.value = (data as any[]) || []
  } catch (e: any) {
    errors.value.habits = e?.message || 'Failed to load habits'
    habits.value = []
  } finally {
    habitsLoading.value = false
  }
}

async function loadTrends(uid: string) {
  trendLoading.value = true
  errors.value.trends = undefined

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress')
    .eq('user_id', uid)
    .gte('date', sevenDaysAgoISO())
    .order('date')

  if (error) errors.value.trends = error.message

  const rows = (data as any[]) || []
  sleepSeries.value = rows.map((r) => ({
    time: new Date(r.date).getTime() / 1000,
    value: r.sleep_hours
  }))
  moodSeries.value = rows.map((r) => ({
    time: new Date(r.date).getTime() / 1000,
    value: r.mood
  }))
  stressSeries.value = rows.map((r) => ({
    time: new Date(r.date).getTime() / 1000,
    value: r.stress
  }))

  trendLoading.value = false
}

async function loadAI(uid: string) {
  aiLoading.value = true
  errors.value.ai = undefined

  const { data, error } = await supabase
    .from('ai_reports')
    .select('content')
    .eq('user_id', uid)
    .eq('date', todayISO())
    .eq('period', 'daily')
    .maybeSingle()

  if (error) errors.value.ai = error.message
  aiSummary.value = data?.content || ''
  aiLoading.value = false
}

async function loadAll() {
  const uid = user.value?.sub
  if (!uid) {
    // Reset state for logged-out / not-ready sessions
    metrics.value = null
    habits.value = []
    sleepSeries.value = []
    moodSeries.value = []
    stressSeries.value = []
    aiSummary.value = ''

    loading.value = false
    habitsLoading.value = false
    trendLoading.value = false
    aiLoading.value = false
    return
  }

  // parallel load = smoother dashboard
  await Promise.allSettled([
    loadToday(uid),
    loadHabits(uid),
    loadTrends(uid),
    loadAI(uid)
  ])
}

onMounted(loadAll)

watch(
  () => user.value?.id,
  (uid, prev) => {
    if (uid && uid !== prev) loadAll()
  }
)
</script>

