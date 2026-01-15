<template>
  <main class="space-y-10">
    <!-- HERO -->
    <section
      class="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-8"
    >
      <div
        class="pointer-events-none absolute inset-0 opacity-50
               bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),transparent_55%),_radial-gradient(circle_at_30%_40%,_rgba(16,185,129,0.18),transparent_60%)]"
      />
      <div class="relative z-10 space-y-3">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-100">
          Your holistic day at a glance
        </h1>
        <p class="max-w-2xl text-sm text-slate-300">
          A calm overview of your sleep, mood, stress, habits, and AI insights.
        </p>
      </div>
    </section>

    <!-- TODAY SNAPSHOT -->
    <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-3">
        Today’s snapshot
      </h2>

      <div
        v-if="loading"
        class="text-sm text-slate-400"
      >
        Loading today’s metrics…
      </div>

      <div
        v-else-if="!metrics"
        class="text-sm text-slate-400"
      >
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
    </section>

    <!-- HABITS -->
    <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-4">
        Habit progress
      </h2>

      <div
        v-if="habitsLoading"
        class="text-sm text-slate-400"
      >
        Loading habits…
      </div>

      <div v-else-if="!habits || habits.length === 0" class="text-sm text-slate-400">
        No habits yet.
        <NuxtLink to="/habits" class="text-emerald-300 hover:underline ml-1">
          Create your first habit →
        </NuxtLink>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
        <div
          v-for="h in habits.slice(0, 3)" :key="h.id"
          class="rounded-xl border border-white/10 bg-slate-900/90 p-4"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-slate-100">{{ h.name }}</span>
            <span class="text-[10px] text-slate-400">
              {{ h.frequency === 'daily' ? 'Daily' : 'Weekly' }}
            </span>
          </div>

          <div class="mt-2 text-[10px] text-slate-300">
            Target: {{ h.target_per_week }} per week
          </div>
        </div>
      </div>
    </section>

    <!-- WEEKLY TRENDS -->
    <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-4">
        Weekly trends
      </h2>

      <div
        v-if="trendLoading"
        class="text-sm text-slate-400"
      >
        Loading weekly trends…
      </div>

      <div
        v-else
        class="grid gap-6 md:grid-cols-3"
      >
        <MiniTrendCard title="Sleep" :points="sleepSeries" />
        <MiniTrendCard title="Mood" :points="moodSeries" />
        <MiniTrendCard title="Stress" :points="stressSeries" />
      </div>
    </section>

    <!-- AI INSIGHT -->
    <section class="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-3">
        AI insight
      </h2>

      <div v-if="aiLoading" class="text-sm text-slate-400">
        Loading summary…
      </div>

      <div v-else-if="!aiSummary" class="text-sm text-slate-400">
        No AI insight yet.
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
  </main>
</template>

<script setup lang="ts">
import DashboardMetric from '~/components/dashboard/DashboardMetric.vue'
import MiniTrendCard from '~/components/dashboard/MiniTrendCard.vue'

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

  const { data } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('archived', false)
    .order('created_at')

  habits.value = data || []
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
