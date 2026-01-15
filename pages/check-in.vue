<template>
  <div class="mx-auto max-w-6xl px-4 py-8 lg:py-10 space-y-8">
    <section
      class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-sky-500/20 px-6 py-6 lg:px-8 lg:py-7">
      <div class="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl" />
      <div class="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
      <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
        {{ $t('checkin.title') }}
      </p>
      <h1 class="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight text-white">
        Today’s snapshot
      </h1>
      <p class="mt-1 text-xs text-slate-300">
        {{ $t('checkin.subtitle') }}
      </p>

    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <!-- Left: inputs -->
      <div
        class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
        <h2 class="text-sm font-semibold text-slate-100">
          Core metrics
        </h2>


        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label class="mb-1 block text-slate-300">Sleep (hours)</label>
            <input v-model.number="sleepHours" step="0.5" min="0"
              class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
          </div>
          <div>
            <label class="mb-1 block text-slate-300">Steps</label>
            <input v-model.number="steps" type="number" min="0"
              class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-xs">
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

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label class="mb-1 block text-slate-300">Water (L)</label>
            <input v-model.number="waterLiters" step="0.1" min="0"
              class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
          </div>
          <div>
            <label class="mb-1 block text-slate-300">Outdoor time (min)</label>
            <input v-model.number="outdoorMinutes" min="0"
              class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70" />
          </div>
        </div>

        <div class="space-y-2 text-xs">
          <label class="block text-slate-300">Evening reflection (optional)</label>
          <textarea v-model="note" rows="3"
            class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
            placeholder="What stood out about today?" />
        </div>



      </div>

      <!-- Habits -->
      <div
        class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-slate-100">
              Habits today
            </h2>
            <p class="mt-1 text-[11px] text-slate-400">
              Mark what you’ve already done so Halo can keep your streaks and snapshot up to date.
            </p>
          </div>
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
            class="flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70">
            <div>
              <p class="font-medium text-slate-100">
                {{ h.name }}
              </p>
              <p class="text-[10px] text-slate-400">
                {{ h.frequency === 'daily' ? 'Daily' : `Weekly · target ${h.target_per_week}` }}
              </p>
            </div>

            <input type="checkbox" class="h-4 w-4 rounded border-slate-600 bg-slate-900" :value="h.id"
              v-model="selectedHabitIds" />
          </label>
        </div>
      </div>
      <div class="md:col-span-2">
        <div class="flex items-center justify-between pt-2">
          <div class="text-[11px] text-slate-400">
            {{ statusMessage }}
          </div>
          <button
            class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
            @click.prevent="handleSubmit" :disabled="saving">
            <span v-if="saving">Saving…</span>
            <span v-else>Save & generate AI summary</span>
          </button>
        </div>
      </div>
    </section>
    <section
      class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">




      <h2 class="text-sm font-semibold text-slate-100">
        AI daily summary
      </h2>
      <p class="text-[11px] text-slate-400">
        Once you save today’s check-in, your AI coach will summarise how your day
        looked and what to focus on.
      </p>

      <div v-if="loadingSummary" class="text-[11px] text-slate-300">
        Generating your summary…
      </div>

      <div v-else-if="summary" class="space-y-2 text-[11px] text-slate-200">
        <p v-for="(p, idx) in summary.split('\n')" :key="idx">
          {{ p }}
        </p>
      </div>

      <div v-else class="text-[11px] text-slate-500">
        No summary yet for today.
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const today = new Date().toISOString().slice(0, 10)
const date = ref(new Date().toISOString().slice(0, 10))

// Hábitos
const habits = ref<any[]>([])
const habitsLoading = ref(true)
const selectedHabitIds = ref<string[]>([])

const sleepHours = ref<number | null>(null)
const steps = ref<number | null>(null)
const mood = ref<number | null>(null)
const energy = ref<number | null>(null)
const stress = ref<number | null>(null)
const waterLiters = ref<number | null>(null)
const outdoorMinutes = ref<number | null>(null)
const note = ref('')

const saving = ref(false)
const statusMessage = ref<string>('')
const loadingSummary = ref(false)
const summary = ref<string>('')

const user = useSupabaseUser()

watch(
  user,
  (u) => {
    if (!u) {
      navigateTo('/auth')
    }
  },
  { immediate: true }
)
// TODO: cargar check-in existente si ya hay para hoy

const handleSubmit = async () => {
  statusMessage.value = ''
  saving.value = true
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      statusMessage.value = 'You need to be logged in to save your check-in.'
      return
    }

    const payload = {
      user_id: user.id,
      date: today,
      sleep_hours: sleepHours.value,
      steps: steps.value,
      mood: mood.value,
      energy: energy.value,
      stress: stress.value,
      water_liters: waterLiters.value,
      outdoor_minutes: outdoorMinutes.value
    }


    // upsert daily_metrics
    const { error: metricsError } = await supabase
      .from('daily_metrics')
      .upsert(payload, { onConflict: 'user_id,date' })

    if (metricsError) {
      console.error(metricsError)
      statusMessage.value = 'Failed to save daily metrics.'
      return
    }

    // journal entry if note
    if (note.value.trim()) {
      await supabase.from('journal_entries').insert({
        user_id: user.id,
        date: today,
        type: 'evening',
        content: note.value.trim()
      })
    }

    await $fetch('/api/habits/log-today', {
      method: 'POST',
      body: {
        date: date.value,
        completedHabitIds: selectedHabitIds.value
      }
    })

    statusMessage.value = 'Saved. Generating AI summary…'
    saving.value = false

    loadingSummary.value = true
    const aiRes = await $fetch<{ summary: string }>('/api/ai/daily-summary', {
      method: 'POST',
      body: { date: today }
    })

    summary.value = aiRes.summary
    statusMessage.value = 'Summary ready.'
  } catch (e) {
    console.error(e)
    statusMessage.value = 'Something went wrong.'
  } finally {
    loadingSummary.value = false
  }
}

async function loadHabitsForToday() {
  habitsLoading.value = true

  const { data: userData } = await supabase.auth.getUser()
  const currentUser = userData.user
  if (!currentUser) {
    habits.value = []
    selectedHabitIds.value = []
    habitsLoading.value = false
    return
  }

  const data = await $fetch('/api/habits/today', {
    query: { date: date.value }
  })

  habits.value = (data as any[]) || []
  selectedHabitIds.value = habits.value
    .filter((h) => h.completed_today)
    .map((h) => h.id)

  habitsLoading.value = false
}

onMounted(() => {
  loadHabitsForToday()
})
</script>
