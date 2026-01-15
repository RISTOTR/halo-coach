<template>
  <main class="space-y-6">
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
        {{ $t('checkin.title') }}
      </p>
      <h1 class="mt-1 text-lg font-semibold">
        Today’s snapshot
      </h1>
      <p class="mt-1 text-xs text-slate-300">
        {{ $t('checkin.subtitle') }}
      </p>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <!-- Left: inputs -->
      <div class="space-y-4 rounded-2xl border border-white/10 bg-halo-card p-4">
        <h2 class="text-sm font-semibold text-slate-100">
          Core metrics
        </h2>

        <form class="space-y-3" @submit.prevent="handleSubmit">
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label class="mb-1 block text-slate-300">Sleep (hours)</label>
              <input
                v-model.number="sleepHours"
                type="number"
                step="0.5"
                min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              />
            </div>
            <div>
              <label class="mb-1 block text-slate-300">Steps</label>
              <input
                v-model.number="steps"
                type="number"
                min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label class="mb-1 block text-slate-300">Mood</label>
              <select
                v-model.number="mood"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              >
                <option :value="null">–</option>
                <option v-for="n in 5" :key="'m'+n" :value="n">{{ n }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-slate-300">Energy</label>
              <select
                v-model.number="energy"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              >
                <option :value="null">–</option>
                <option v-for="n in 5" :key="'e'+n" :value="n">{{ n }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-slate-300">Stress</label>
              <select
                v-model.number="stress"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              >
                <option :value="null">–</option>
                <option v-for="n in 5" :key="'s'+n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label class="mb-1 block text-slate-300">Water (L)</label>
              <input
                v-model.number="waterLiters"
                type="number"
                step="0.1"
                min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              />
            </div>
            <div>
              <label class="mb-1 block text-slate-300">Outdoor time (min)</label>
              <input
                v-model.number="outdoorMinutes"
                type="number"
                min="0"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              />
            </div>
          </div>

          <div class="space-y-2 text-xs">
            <label class="block text-slate-300">Evening reflection (optional)</label>
            <textarea
              v-model="note"
              rows="3"
              class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              placeholder="What stood out about today?"
            />
          </div>

          <div class="flex items-center justify-between pt-2">
            <div class="text-[11px] text-slate-400">
              {{ statusMessage }}
            </div>
            <button
              type="submit"
              class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
              :disabled="saving"
            >
              <span v-if="saving">Saving…</span>
              <span v-else>Save & generate AI summary</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Right: AI summary -->
      <div class="space-y-3 rounded-2xl border border-white/10 bg-halo-card p-4">
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
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()

const today = new Date().toISOString().slice(0, 10)

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
</script>
