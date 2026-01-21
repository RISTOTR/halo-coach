<!-- components/dashboard/WeeklyAiReportCard.vue -->
<template>
  <div
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-slate-100">
            Weekly AI reflection
          </h2>

          <!-- Badge -->
          <span v-if="badgeLabel"
            class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-200">
            {{ badgeLabel }}
          </span>
        </div>

        <!-- Updated line -->
        <p v-if="generatedLabel" class="mt-1 text-[11px] text-slate-400">
          Week of {{ reportDateLabel }} · generated {{ generatedLabel }} · based on your check-ins, habits, and goals
        </p>

        <p v-else class="mt-1 text-[11px] text-slate-400">
          A gentle look at your last 7 days and 2–3 ideas for the week ahead.
        </p>
      </div>

      <button
        class="shrink-0 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
        @click="refresh" :disabled="loading">
        <span v-if="loading">Updating…</span>
        <span v-else>Update reflection</span>
      </button>
    </div>


    <div v-if="loading" class="text-[11px] text-slate-300">
      Loading weekly reflection…
    </div>

    <div v-else-if="summary" class="max-w-none text-sm leading-relaxed halo-weekly-summary">
      <div v-html="renderedSummary" />
    </div>

    <div v-else class="text-[11px] text-slate-500">
      No weekly reflection yet. Generate the first one from your recent check-ins.
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'

const supabase = useSupabaseClient()

const summary = ref<string>('')
const loading = ref(false)

const renderedSummary = computed(() =>
  summary.value ? marked.parse(summary.value) : ''
)

const createdAt = ref<string | null>(null)

const generatedLabel = computed(() => {
  if (!createdAt.value) return ''
  const d = new Date(createdAt.value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

const reportDate = ref<string | null>(null)

const reportDateLabel = computed(() => {
  if (!reportDate.value) return ''
  const d = new Date(reportDate.value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})


const badgeLabel = computed(() => {
  const text = (summary.value || '').toLowerCase()

  // Recovery signals
  const recoverySignals = [
    'rest', 'recovery', 'gentle', 'lower the pressure', 'reduce the pressure',
    'take it easy', 'slow down', 'burnout', 'tired', 'fatigue', 'overwhelmed'
  ]

  const hasRecoveryTheme = recoverySignals.some(s => text.includes(s))

  if (text.includes('gentle')) return 'Gentle week'
  if (hasRecoveryTheme) return 'Recovery week'

  return ''
})

async function loadExisting() {
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)

    const { data: userData } = await supabase.auth.getUser()
    const currentUser = userData.user
    if (!currentUser) {
      summary.value = ''
      return
    }

    const { data, error } = await supabase
      .from('ai_reports')
      .select('content, created_at, date')
      .eq('user_id', currentUser.id)
      .eq('period', 'weekly')
      .lte('date', today)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) console.error(error)

    summary.value = data?.content || ''
    createdAt.value = data?.created_at || null
    reportDate.value = data?.date || null



  } catch (e) {
    console.error(e)
    summary.value = ''
  } finally {
    loading.value = false
  }
}

async function refresh() {
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)

    await $fetch('/api/ai/weekly-summary', {
      method: 'POST',
      body: { endDate: today }
    })

    await loadExisting()
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

<style scoped>
.halo-weekly-summary :deep(strong) {
  font-weight: 700;
  color: #6ee7b7;
  /* emerald-300-ish, para que se note bien */
}

.halo-weekly-summary :deep(em) {
  font-style: italic;
  color: rgba(226, 232, 240, 0.9);
  /* slate-200-ish */
  opacity: 0.95;
}
</style>
