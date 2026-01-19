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

    <!-- PRIMER BLOQUE: Snapshot + Insight IA ------------------- -->
    <section class="grid gap-6 lg:grid-cols-3">
      <!-- Snapshot ocupa 2/3 -->
      <div class="lg:col-span-2">
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
          :sleep-hours="metrics.sleep_hours" :sleep-quality="metrics.sleep_quality || 0" :stress-level="metrics.stress"
          :habits-completed="completedHabitsCount" :habits-total="todayHabitsCount"></DailySnapshotCard>
      </div>

      <!-- Insight IA a la derecha -->
      <div>
        <div>DailyInsightCard</div>
        <!-- <DailyInsightCard /> -->
      </div>
    </section>


    <!-- SEGUNDO BLOQUE: Hábitos + Tendencias ------------------- -->
    <!-- <section class="grid gap-6 lg:grid-cols-2">
      <RecentHabitsCard />
      <WeeklyTrendsMiniCard />
    </section> -->

    <!-- TODAY SNAPSHOT -->
    <!-- <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-3">
        Today’s snapshot
      </h2>

      <div v-if="loading" class="text-sm text-slate-400">
        Loading today’s metrics…
      </div>

      <div v-else-if="!metrics" class="text-sm text-slate-400">
        No check-in yet today.
        <NuxtLink to="/check-in" class="text-emerald-300 hover:underline ml-1">
          Complete your daily check-in →
        </NuxtLink>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 text-xs">
        <DashboardMetric label="Sleep (h)" :value="metrics.sleep_hours" />
        <DashboardMetric label="Mood" :value="metrics.mood" />
        <DashboardMetric label="Energy" :value="metrics.energy" />
        <DashboardMetric label="Stress" :value="metrics.stress" />
        <DashboardMetric label="Steps" :value="metrics.steps" />
        <DashboardMetric label="Water (L)" :value="metrics.water_liters" />
      </div>
    </section> -->

    <!-- HABITS -->
    <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-4">
        Your habits today
      </h2>

      <div v-if="habitsLoading" class="text-sm text-slate-400">
        Loading habits…
      </div>

      <div v-else-if="!habits || habits.length === 0" class="text-sm text-slate-400">
        No habits yet.
        <NuxtLink to="/habits" class="text-emerald-300 hover:underline ml-1">
          Create your first habit →
        </NuxtLink>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
        <div v-for="h in habits.slice(0, 3)" :key="h.id" class="rounded-xl border border-white/10 bg-slate-900/90 p-4">
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

    <!-- WEEKLY TRENDS -->
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

    <!-- AI INSIGHT -->
    <section class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
      <h2 class="text-lg font-semibold text-slate-100 mb-3">
        Today’s reflection
      </h2>

      <div v-if="aiLoading" class="text-sm text-slate-400">
        Loading summary…
      </div>

      <div v-else-if="!aiSummary" class="text-sm text-slate-400">
        No reflection yet.
        <NuxtLink to="/check-in" class="text-emerald-300 hover:underline ml-1">
          Complete your daily check-in →
        </NuxtLink>
      </div>

      <div v-else class="space-y-2 text-sm leading-relaxed text-slate-200">
        <p v-for="(p, idx) in aiSummary.split('\n')" :key="idx">
          {{ p }}
        </p>
      </div>
    </section>
      <WeeklyGoalsCard />
      <WeeklyAiReportCard />
    

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DashboardMetric from '~/components/dashboard/DashboardMetric.vue'
import MiniTrendCard from '~/components/dashboard/MiniTrendCard.vue'
import DailySnapshotCard from '~/components/dashboard/DailySnapshotCard.vue'
import WeeklyAiReportCard from '~/components/dashboard/WeeklyAiReportCard.vue'
import WeeklyGoalsCard from '~/components/dashboard/WeeklyGoalsCard.vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Today’s metrics
const metrics = ref<any>(null)
const loading = ref(true)

// Habits
const habits = ref<any[]>([])
const habitsLoading = ref(true)

// Weekly trends
const sleepSeries = ref([])
const moodSeries = ref([])
const stressSeries = ref([])
const trendLoading = ref(true)

// AI insight
const aiSummary = ref('')
const aiLoading = ref(true)

const completedHabitsCount = computed(() =>
  habits.value.filter((h) => h.completed_today).length
)

const todayHabitsCount = computed(() => habits.value.length)

// load everything on mount
onMounted(() => {
  loadToday()
  loadHabits()
  loadTrends()
  loadAI()
})

async function loadToday() {
  loading.value = true
  const today = new Date().toISOString().slice(0, 10)

  const { data: userData } = await supabase.auth.getUser()
  const currentUser = userData.user
  if (!currentUser) {
    loading.value = false
    metrics.value = null
    return
  }

  const { data } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('date', today)
    .eq('user_id', currentUser.id)
    .maybeSingle()

  metrics.value = data
  loading.value = false
}

async function loadHabits() {
  habitsLoading.value = true

  const { data: userData } = await supabase.auth.getUser()
  const currentUser = userData.user
  if (!currentUser) {
    habits.value = []
    habitsLoading.value = false
    return
  }

  const today = new Date().toISOString().slice(0, 10)

  const data = await $fetch('/api/habits/today', {
    query: { date: today }
  })

  habits.value = (data as any[]) || []
  habitsLoading.value = false
}


async function loadTrends() {
  trendLoading.value = true

  const { data: userData } = await supabase.auth.getUser()
  const currentUser = userData.user
  if (!currentUser) {
    sleepSeries.value = []
    moodSeries.value = []
    stressSeries.value = []
    trendLoading.value = false
    return
  }

  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000)
    .toISOString()
    .slice(0, 10)

  const { data } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date', sevenDaysAgo)
    .order('date')

  const rows = data || []

  sleepSeries.value = rows.map(r => ({
    time: new Date(r.date).getTime() / 1000,
    value: r.sleep_hours
  }))
  moodSeries.value = rows.map(r => ({
    time: new Date(r.date).getTime() / 1000,
    value: r.mood
  }))
  stressSeries.value = rows.map(r => ({
    time: new Date(r.date).getTime() / 1000,
    value: r.stress
  }))

  trendLoading.value = false
}

async function loadAI() {
  aiLoading.value = true

  const { data: userData } = await supabase.auth.getUser()
  const currentUser = userData.user
  if (!currentUser) {
    aiSummary.value = ''
    aiLoading.value = false
    return
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .eq('period', 'daily')
    .maybeSingle()

  aiSummary.value = data?.content
  aiLoading.value = false
}
</script>
