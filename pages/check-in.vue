<!-- pages/check-in.vue -->
<template>
  <div class="mx-auto max-w-6xl px-4 py-8 lg:py-10 space-y-8">
    <!-- HERO -->
    <section
      class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-sky-500/20 px-6 py-6 lg:px-8 lg:py-7">
      <div class="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl" />
      <div class="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

      <div class="relative">
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
          {{ $t('checkin.title') }}
        </p>
        <h1 class="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight text-white">
          Today’s snapshot
        </h1>
        <p class="mt-1 text-xs text-slate-300">
          {{ $t('checkin.subtitle') }}
        </p>
      </div>
    </section>

    <!-- MAIN GRID (dashboard-like) -->
    <section class="grid gap-6 lg:grid-cols-3">
      <!-- LEFT (2/3): Metrics + Reflection + Habits -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Core metrics card -->
        <div
          class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-100">Core metrics</h2>
              <p class="mt-1 text-[11px] text-slate-400">
                Quick numbers + a short reflection. You can update again later today.
              </p>
            </div>

            <span class="text-[11px] text-white/40">
              {{ formattedToday }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label class="mb-1 block text-slate-300">Sleep (hours)</label>
              <input v-model.number="sleepHours" type="number" step="0.5" min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
            </div>

            <div>
              <label class="mb-1 block text-slate-300">Movement / exercise (min)</label>
              <input v-model.number="movementMinutes" type="number" min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
            </div>
          </div>

          <div class="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div>
              <label class="mb-1 block text-slate-300">Mood</label>
              <select v-model.number="mood"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70">
                <option :value="null">–</option>
                <option v-for="n in 5" :key="'m' + n" :value="n">{{ n }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-slate-300">Energy</label>
              <select v-model.number="energy"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70">
                <option :value="null">–</option>
                <option v-for="n in 5" :key="'e' + n" :value="n">{{ n }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-slate-300">Stress</label>
              <select v-model.number="stress"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70">
                <option :value="null">–</option>
                <option v-for="n in 5" :key="'s' + n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <label class="mb-1 block text-slate-300">Water (L)</label>
              <input v-model.number="waterLiters" type="number" step="0.1" min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
            </div>

            <div>
              <label class="mb-1 block text-slate-300">Outdoor time (min)</label>
              <input v-model.number="outdoorMinutes" type="number" min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
            </div>
          </div>

          <div class="mt-4 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <label class="block text-slate-300">Evening reflection (optional)</label>
              <span v-if="reflectionLoaded" class="text-[10px] text-slate-500">
                loaded
              </span>
            </div>

            <textarea v-model="note" rows="4"
              class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              placeholder="What stood out about today?" />
          </div>
        </div>

        <!-- Habits card -->
        <div
          class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <div class="mb-3">
            <h2 class="text-sm font-semibold text-slate-100">Habits today</h2>
            <p class="mt-1 text-[11px] text-slate-400">
              Mark what you’ve already done so Halo can keep your streaks and snapshot up to date.
            </p>
          </div>

          <div v-if="habitsLoading" class="text-xs text-slate-400">
            Loading your habits…
          </div>

          <div v-else-if="habits.length === 0" class="text-xs text-slate-400">
            You haven’t created any habits yet.
            <NuxtLink to="/habits" class="ml-1 text-emerald-300 hover:underline">
              Add your first habit →
            </NuxtLink>
          </div>

          <div v-else class="mt-2 space-y-2 text-xs">
            <label v-for="h in habits" :key="h.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2">
              <div class="min-w-0">
                <p class="font-medium text-slate-100 truncate">{{ h.name }}</p>
                <p class="text-[10px] text-slate-400">
                  {{ h.frequency === 'daily' ? 'Daily' : `Weekly · target ${h.target_per_week}` }}
                </p>
              </div>

              <input type="checkbox" class="h-4 w-4 rounded border-slate-600 bg-slate-900" :value="h.id"
                v-model="selectedHabitIds" />
            </label>

            <p class="pt-2 text-[11px] text-slate-400">
              {{ habitsStatus }}
            </p>
          </div>
        </div>
      </div>

      <!-- RIGHT (1/3): AI reflection + actions -->
      <div class="space-y-6">
        <!-- Experiment card -->
        <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-100">Experiment</h2>
              <p class="mt-1 text-[11px] text-slate-400">
                One focused lever at a time. End it when you’re ready to review.
              </p>
            </div>

            <span v-if="expActive"
              class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-100">
              Active
            </span>
            <span v-else class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60">
              None
            </span>
          </div>

          <div v-if="expLoading" class="mt-3 text-[11px] text-slate-400">
            Loading experiment…
          </div>

          <div v-else-if="expActive" class="mt-3 space-y-3">
            <div class="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
              <p class="text-xs font-medium text-slate-100 truncate">
                {{ expFlow.ctx.activeExperiment.title }}
              </p>
              <p class="mt-0.5 text-[10px] text-slate-400">
                Day {{ experimentDay }} · Target: {{ expFlow.ctx.activeExperiment.target_metric }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="openExperimentDialog">
                View / end
              </button>

              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                @click="openExperimentDialog">
                End & review
              </button>
            </div>
          </div>

          <div v-else class="mt-3 space-y-3">
            <p class="text-[11px] text-slate-400">
              No active experiment right now.
            </p>
            <button
              class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
              @click="openExperimentStart">
              Start an experiment
            </button>

          </div>
        </div>

        <!-- Experiment dialog -->
        <ExperimentDialog v-model="experimentDialogOpen" :flow="expFlow" />
        <ExperimentStartDialog v-model="experimentStartOpen" :flow="expFlow" />


        <!-- Actions card -->
        <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] text-slate-400 min-h-[1.25rem]">
              {{ statusMessage }}
            </div>

            <button
              class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
              @click.prevent="handleSubmit" :disabled="saving || habitsLoading"
              title="Save your check-in and refresh the AI reflection">
              <span v-if="saving">Saving…</span>
              <span v-else>Save & refresh</span>
            </button>
          </div>

          <p class="mt-2 text-[11px] text-slate-400">
            You can save again later today if your day changes.
          </p>
        </div>

        <!-- AI card -->
        <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          <div class="mb-2 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-100">AI daily reflection</h2>
              <p class="mt-1 text-[11px] text-slate-400">
                Halo turns your check-in into a short, motivating reflection and 1–2 gentle ideas for tomorrow.
              </p>
            </div>
          </div>

          <div v-if="loadingAi" class="mt-3 text-[11px] text-slate-300">
            Writing your reflection…
          </div>

          <div v-else-if="aiContent" class="mt-3 prose prose-invert max-w-none text-[11px] leading-relaxed
         prose-strong:text-slate-100 prose-strong:font-semibold
         prose-em:text-slate-200">
            <div v-html="renderedAiContent" />
          </div>



          <div v-else class="mt-3 text-[11px] text-slate-500">
            No reflection yet for today. Save your check-in to generate one.
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { marked } from 'marked'
import ExperimentDialog from '~/components/ExperimentDialog.vue'
import { useExperimentFlow } from '~/composables/useExperimentFlow'
import ExperimentStartDialog from '~/components/ExperimentStartDialog.vue'

type Preset = {
  title: string
  leverType: 'metric' | 'habit' | 'custom'
  leverRef?: string
  targetMetric: 'energy' | 'stress' | 'mood' | 'sleep_hours' | 'steps' | 'water_liters' | 'outdoor_minutes'
  effortEstimate?: 'low' | 'moderate' | 'high'
  expectedImpact?: 'low' | 'moderate' | 'high'
  recommendedDays?: number
  baselineDays?: number
}


const supabase = useSupabaseClient()
const userRef = useSupabaseUser()

const today = new Date().toISOString().slice(0, 10)
const date = ref(today)

const formattedToday = computed(() => {
  const d = new Date(today)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
})

// Core metrics
const sleepHours = ref<number | null>(null)
const movementMinutes = ref<number | null>(null)
const mood = ref<number | null>(null)
const energy = ref<number | null>(null)
const stress = ref<number | null>(null)
const waterLiters = ref<number | null>(null)
const outdoorMinutes = ref<number | null>(null)

// Reflection
const note = ref('')
const reflectionLoaded = ref(false)

// Habits
const habits = ref<any[]>([])
const habitsLoading = ref(true)
const selectedHabitIds = ref<string[]>([])

const habitsStatus = computed(() => {
  const total = habits.value.length
  const completedCount = habits.value.filter((h) => selectedHabitIds.value.includes(h.id)).length
  if (!total) return 'No habits defined yet.'
  return `${completedCount} / ${total} habits completed today.`
})

const habitsSummary = computed(() => {
  const completed = habits.value.filter((h) => selectedHabitIds.value.includes(h.id))
  if (!completed.length) return 'No habits completed today.'
  return completed.map((h) => `- ${h.name} (${h.frequency})`).join('\n')
})

const renderedAiContent = computed(() => (aiContent.value ? marked.parse(aiContent.value) : ''))

// AI
const aiContent = ref('')
const loadingAi = ref(false)

// UI state
const saving = ref(false)
const statusMessage = ref('')

// Experiments
const expFlow = useExperimentFlow()
const experimentDialogOpen = ref(false)

const expLoading = computed(() => expFlow.state.value === 'loading_active')
const expActive = computed(() => expFlow.ctx.activeExperiment?.status === 'active')

const experimentStartOpen = ref(false)

function openExperimentStart() {
  experimentStartOpen.value = true
}


const experimentDay = computed(() => {
  const exp = expFlow.ctx.activeExperiment
  if (!exp?.start_date) return 0
  const start = new Date(`${exp.start_date}T00:00:00Z`)
  const now = new Date(`${today}T00:00:00Z`)
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays + 1)
})

function openExperimentDialog() {
  experimentDialogOpen.value = true
  // If you want the dialog to always begin at confirm_end step:
  expFlow.openEndConfirm()
}

const replaceConfirmOpen = ref(false)
const pendingPreset = ref<Preset | null>(null)
const activeExpFrom409 = ref<any | null>(null)

async function startExperiment(preset: Preset, replaceActive = false) {
  try {
    await $fetch('/api/ai/experiments/start', {
      method: 'POST',
      body: {
        title: preset.title,
        leverType: preset.leverType,
        leverRef: preset.leverRef,
        targetMetric: preset.targetMetric,
        effortEstimate: preset.effortEstimate,
        expectedImpact: preset.expectedImpact,
        recommendedDays: preset.recommendedDays ?? 7,
        baselineDays: preset.baselineDays ?? 30,
        replaceActive
      }
    })

    await expFlow.loadActive()
  } catch (e: any) {
    const status = e?.status || e?.data?.statusCode
    if (status === 409) {
      // Your API returns data.activeExperiment
      activeExpFrom409.value = e?.data?.data?.activeExperiment || null
      pendingPreset.value = preset
      replaceConfirmOpen.value = true
      return
    }
    console.error(e?.data?.statusMessage || e?.message || 'Failed to start experiment')
  }
}

// call this when user confirms "Replace"
async function confirmReplaceActive() {
  if (!pendingPreset.value) return
  replaceConfirmOpen.value = false
  await startExperiment(pendingPreset.value, true)
  pendingPreset.value = null
  activeExpFrom409.value = null
}



watch(
  userRef,
  (u) => {
    if (!u) navigateTo('/auth')
  },
  { immediate: true }
)

function normalizeAiResponse(res: any): string {
  // Support both shapes: { content } or { summary }
  return (res?.content ?? res?.summary ?? '') as string
}

async function loadHabitsForToday() {
  habitsLoading.value = true
  try {
    const { data: userData } = await supabase.auth.getUser()
    const currentUser = userData.user
    if (!currentUser) {
      habits.value = []
      selectedHabitIds.value = []
      return
    }

    const data = await $fetch('/api/habits/today', {
      query: { date: date.value }
    })

    habits.value = (data as any[]) || []
    selectedHabitIds.value = habits.value.filter((h) => h.completed_today).map((h) => h.id)
  } finally {
    habitsLoading.value = false
  }
}

async function loadTodayCheckin() {
  const { data: userData } = await supabase.auth.getUser()
  const currentUser = userData.user
  if (!currentUser) return

  // 1) Daily metrics
  const { data: metrics, error: metricsErr } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .maybeSingle()

  if (metricsErr) console.error(metricsErr)

  if (metrics) {
    sleepHours.value = metrics.sleep_hours
    movementMinutes.value = metrics.steps // keeping your DB column name "steps"
    mood.value = metrics.mood
    energy.value = metrics.energy
    stress.value = metrics.stress
    waterLiters.value = metrics.water_liters
    outdoorMinutes.value = metrics.outdoor_minutes
  }

  // 2) Reflection (latest single row guaranteed by unique constraint)
  const { data: reflection, error: reflectionErr } = await supabase
    .from('journal_entries')
    .select('content')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .eq('type', 'evening')
    .maybeSingle()

  if (reflectionErr) console.error(reflectionErr)

  if (reflection?.content) {
    note.value = reflection.content
    reflectionLoaded.value = true
  }

  // 3) AI report
  const { data: report, error: reportErr } = await supabase
    .from('ai_reports')
    .select('content')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .eq('period', 'daily')
    .maybeSingle()

  if (reportErr) console.error(reportErr)

  if (report?.content) {
    aiContent.value = report.content
  }
}

const handleSubmit = async () => {
  statusMessage.value = ''
  saving.value = true
  loadingAi.value = false

  try {
    const { data: userData } = await supabase.auth.getUser()
    const currentUser = userData.user
    if (!currentUser) {
      statusMessage.value = 'You need to be logged in to save your check-in.'
      return
    }

    // 1) upsert daily_metrics
    const payload = {
      user_id: currentUser.id,
      date: today,
      sleep_hours: sleepHours.value,
      steps: movementMinutes.value, // DB col is still "steps"
      mood: mood.value,
      energy: energy.value,
      stress: stress.value,
      water_liters: waterLiters.value,
      outdoor_minutes: outdoorMinutes.value,
      habits_summary: habitsSummary.value,
      habits_status: habitsStatus.value
    }

    const { error: metricsError } = await supabase
      .from('daily_metrics')
      .upsert(payload, { onConflict: 'user_id,date' })

    if (metricsError) {
      console.error(metricsError)
      statusMessage.value = 'Failed to save daily metrics.'
      return
    }

    // 2) upsert reflection (only if non-empty)
    const reflectionText = note.value.trim()

    if (reflectionText) {
      await supabase.from('journal_entries').upsert(
        { user_id: currentUser.id, date: today, type: 'evening', content: reflectionText },
        { onConflict: 'user_id,date,type' }
      )
    } else {
      // user cleared reflection -> delete
      await supabase
        .from('journal_entries')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .eq('type', 'evening')
    }


    // 3) habits logs
    await $fetch('/api/habits/log-today', {
      method: 'POST',
      body: {
        date: date.value,
        completedHabitIds: selectedHabitIds.value
      }
    })

    // 4) generate AI
    statusMessage.value = 'Saved. Writing your reflection…'
    loadingAi.value = true

    const aiRes = await $fetch('/api/ai/daily-summary', {
      method: 'POST',
      body: { date: today }
    })
    aiContent.value = normalizeAiResponse(aiRes)
    statusMessage.value = 'Reflection updated.'
    await expFlow.loadActive()

  } catch (e) {
    console.error(e)
    statusMessage.value = 'Something went wrong.'
  } finally {
    loadingAi.value = false
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadHabitsForToday(), loadTodayCheckin()])
  await expFlow.loadActive()
})

</script>
