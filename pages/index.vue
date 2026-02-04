<template>
  <div v-if="habitError" class="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
    {{ habitError }}
  </div>

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

          <DailySnapshotCard v-else :mood-score="metrics.mood" :energy-score="metrics.energy"
            :sleep-hours="metrics.sleep_hours" :sleep-quality="metrics.sleep_quality || 0"
            :stress-level="metrics.stress" :habits-completed="completedHabitsCount" :habits-total="todayHabitsCount" />
        </div>

        <!-- Habits (move here) -->
        <section
          class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
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
            <div v-for="h in habits.slice(0, 6)" :key="h.id" class="group relative rounded-xl border border-white/10 bg-slate-900/90 py-4 px-3 transition
         hover:bg-slate-900/95 hover:border-white/15">
              <!-- top row -->
              <div class="flex items-end gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <!-- done indicator -->
                    <button type="button" class="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-black/10
         text-white/70 hover:bg-white/10"
                      :class="h.completed_today ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-200' : ''"
                      :disabled="toggling[h.id]" @click="toggleHabit(h)">
                      <span v-if="toggling[h.id]" class="text-[10px]">…</span>
                      <span v-else class="text-[12px] leading-none">
                        {{ h.completed_today ? '✓' : '' }}
                      </span>
                    </button>

                    <span class="min-w-0 flex-1 truncate font-medium text-slate-100"
                      :class="h.completed_today ? 'text-slate-100' : 'text-slate-100'">
                      {{ h.name }}
                    </span>
                  </div>

                  <div class="mt-2 text-[10px] text-slate-300">
                    Aim: {{ h.target_per_week }} this week
                  </div>
                </div>

                <div class="shrink-0 flex flex-col items-end gap-2">
                  <span class="text-[10px] text-slate-400">
                    {{ h.frequency === 'daily' ? 'Daily' : 'Weekly' }}
                  </span>

                  <!-- status pill -->
                  <span class="rounded-full border px-2 py-0.5 text-[10px]" :class="h.completed_today
                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-black/10 text-white/55'">
                    {{ h.completed_today ? 'Done' : 'Not done' }}
                  </span>
                </div>
              </div>

              <!-- subtle strike / fade effect when done -->
              <div v-if="h.completed_today"
                class="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-emerald-500/10" />
            </div>

          </div>
        </section>

        <!-- Patterns (move here) -->
        <!-- Patterns -->
        <section
          class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">
                Patterns this week
              </h2>
              <p class="mt-1 text-xs text-white/55">
                Last 7 days · {{ trendDaysCount }} check-ins
              </p>
            </div>

            <div class="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-white/60">
              {{ trendStatus }}
            </div>
          </div>

          <div v-if="trendLoading" class="mt-4 text-sm text-slate-400">
            Loading weekly trends…
          </div>

          <!-- Not enough data -->
          <div v-else-if="trendDaysCount < 3" class="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
            <div class="text-sm text-slate-200">
              Not enough data yet.
            </div>
            <p class="mt-1 text-xs text-white/55">
              Add a couple more daily check-ins and Halo will start showing meaningful weekly patterns.
            </p>

            <div class="mt-3">
              <NuxtLink to="/check-in"
                class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20">
                Complete check-in →
              </NuxtLink>
            </div>
          </div>

          <!-- Charts -->
          <div v-else class="mt-4 grid gap-6 md:grid-cols-3">
            <MiniTrendCard title="Sleep" :points="sleepSeries" />
            <MiniTrendCard title="Mood" :points="moodSeries" />
            <MiniTrendCard title="Stress" :points="stressSeries" />
          </div>

          <!-- subtle footnote -->
          <div v-if="!trendLoading && trendDaysCount >= 3" class="mt-4 text-[11px] text-white/40">
            Tip: trends update after each daily check-in.
          </div>
        </section>

      </div>

      <!-- RIGHT COLUMN (1/3): Insight (controlled height) -->
      <div class="lg:col-span-1">
        <div class="lg:sticky lg:top-24 h-[calc(100vh-25rem)]">
          <DailyInsightCard :collapsed="true" :max-paragraphs="2" class="h-full" :loading="aiLoading" :error="errors.ai"
            :ai-summary="aiSummary" :metrics="metrics" />
        </div>
      </div>
    </section>


    <NextFocusCard
      @openCheckIn="navigateTo('/check-in')"
      @start-preset="startExperiment"
      @openExperiment="openExperimentDialog"
    />



    <Teleport to="body">
      <div v-if="replaceConfirmOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        @keydown.esc.prevent="replaceConfirmOpen = false">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="replaceConfirmOpen = false" />

        <div
          class="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
          role="dialog" aria-modal="true" aria-label="Replace experiment">
          <div class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                Experiment already active
              </div>
              <div class="mt-1 text-base font-semibold text-slate-100">
                Replace it?
              </div>
            </div>

            <button type="button"
              class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
              @click="replaceConfirmOpen = false">
              Close
            </button>
          </div>

          <div class="px-5 py-4 space-y-3">
            <p class="text-sm text-white/75">
              Starting a new experiment will end the current one as <span
                class="text-white/90 font-medium">abandoned</span>.
            </p>

            <div v-if="activeExpFrom409" class="rounded-xl border border-white/10 bg-black/10 p-3">
              <div class="text-[11px] uppercase tracking-[0.18em] text-white/45 font-semibold">
                Current experiment
              </div>
              <div class="mt-1 text-sm text-slate-100">
                {{ activeExpFrom409.title || 'Untitled experiment' }}
              </div>
              <div class="mt-1 text-xs text-white/55">
                Started {{ activeExpFrom409.start_date || '—' }}
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button type="button"
                class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
                @click="replaceConfirmOpen = false">
                Keep current
              </button>

              <button type="button"
                class="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                @click="confirmReplace">
                Replace & start
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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
import NextFocusCard from '~/components/dashboard/NextFocusCard.vue'


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

const toggling = ref<Record<string, boolean>>({})
const habitError = ref('')



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

const uid = (user.value as any)?.id || (user.value as any)?.sub

const completedHabitsCount = computed(() =>
  habits.value.filter((h) => h.completed_today).length
)
const todayHabitsCount = computed(() => habits.value.length)

const trendDaysCount = computed(() => {
  // sleep/mood/stress should be same dates; use sleepSeries as reference
  return sleepSeries.value?.length || 0
})

const trendStatus = computed(() => {
  if (trendLoading.value) return 'Loading'
  if (trendDaysCount.value === 0) return 'No data'
  if (trendDaysCount.value < 3) return 'Early'
  return 'Ready'
})

function openExperimentDialog() {
  experimentDialogOpen.value = true
  expFlow.openEndConfirm()
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function sevenDaysAgoISO() {
  return new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
}

async function toggleHabit(h: any) {
  const id = String(h?.id || '')
  if (!id) return

  habitError.value = ''
  if (toggling.value[id]) return
  toggling.value = { ...toggling.value, [id]: true }

  const prev = Boolean(h.completed_today)
  h.completed_today = !prev

  try {
    await $fetch('/api/habits/toggle', {
      method: 'POST',
      body: { habit_id: id, date: todayISO(), completed: h.completed_today }
    })
  } catch (e: any) {
    h.completed_today = prev
    habitError.value = e?.data?.statusMessage || e?.data?.message || e?.message || 'Could not update habit.'
  } finally {
    toggling.value = { ...toggling.value, [id]: false }
  }
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

const expFlow = useExperimentFlow()

const replaceConfirmOpen = ref(false)
const pendingPreset = ref<Preset | null>(null)
const activeExpFrom409 = ref<any | null>(null)

async function startExperiment(preset: Preset, replaceActive = false) {
  try {
    await expFlow.startFromPreset(preset, replaceActive)
  } catch (e: any) {
    const status = e?.status || e?.data?.statusCode
    if (status === 409) {
      activeExpFrom409.value =
        e?.data?.data?.activeExperiment ||
        e?.data?.activeExperiment ||
        null

      pendingPreset.value = preset
      replaceConfirmOpen.value = true
      return
    }
    console.error(e?.data?.statusMessage || e?.message || 'Failed to start experiment')
  }
}

async function confirmReplace() {
  if (!pendingPreset.value) return
  replaceConfirmOpen.value = false
  await startExperiment(pendingPreset.value, true)
  pendingPreset.value = null
}


async function loadAll() {
  let id = uid
  if (!id) {
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
    loadToday(id),
    loadHabits(id),
    loadTrends(id),
    loadAI(id),
    expFlow.loadActive()


  ])
}

onMounted(loadAll)

watch(
  () => uid.value,
  (newUid) => {
    if (newUid) loadAll()
  },
  { immediate: true }
)

</script>
