<!-- components/dashboard/NextFocusCard.vue -->
<template>
  <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-slate-100">Next focus</h2>
          <span v-if="statusPill" class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-200">
            {{ statusPill }}
          </span>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">
          Two options — one low effort, one higher impact.
        </p>
      </div>

      <button
        class="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
        @click="load"
        :disabled="loading"
      >
        <span v-if="loading">Updating…</span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <div v-if="loading" class="text-[11px] text-slate-300">
      Loading next focus…
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-200">
      {{ error }}
    </div>

    <div v-else-if="!options.length" class="text-[11px] text-slate-500">
      Not enough data yet — keep logging for a few days.
    </div>

    <div v-else class="space-y-3">
      <section
        v-for="(o, idx) in options"
        :key="o.id"
        class="rounded-xl border border-white/10 bg-black/10 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Option {{ idx === 0 ? 'A' : 'B' }}
              <span class="ml-2 normal-case tracking-normal text-white/35">
                · effort: {{ o.effort }} · impact: {{ o.impact }}
              </span>
            </div>

            <div class="mt-1 text-base font-semibold text-slate-100">
              {{ o.title }}
            </div>

            <p class="mt-2 text-sm leading-relaxed text-white/75">
              {{ o.why }}
            </p>
          </div>

          <span
            class="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70"
          >
            {{ o.id }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-if="o.preset"
            class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
            @click="emit('start-preset', { ...o.preset, title: o.title })"
          >
            Start “{{ o.title }}” →
          </button>

          <button
            v-else
            class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
            @click="emit('open-check-in')"
          >
            Add a tiny action →
          </button>
        </div>
      </section>

      <p v-if="periodLabel" class="text-[11px] text-white/40">
        Based on {{ periodLabel }}.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'

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

type NextFocusOption = {
  id: string
  title: string
  why: string
  effort: 'low' | 'moderate' | 'high'
  impact: 'low' | 'moderate' | 'high'
  preset: Preset | null
}

const emit = defineEmits<{
  (e: 'start-preset', preset: Preset): void
  (e: 'open-check-in'): void
}>()


const loading = ref(false)
const error = ref('')
const options = ref<NextFocusOption[]>([])
const period = ref<{ start: string; end: string; checkins: number } | null>(null)

const statusPill = computed(() => {
  if (loading.value) return 'Loading'
  if (error.value) return 'Error'
  if (!options.value.length) return 'Early'
  return 'Ready'
})

const periodLabel = computed(() => {
  if (!period.value) return ''
  return `${period.value.checkins}/7 check-ins · ${period.value.start} → ${period.value.end}`
})

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/next-focus', { query: { date: todayISO() } }) as any
    options.value = (res?.options || []) as NextFocusOption[]
    period.value = res?.period || null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not load next focus.'
    options.value = []
    period.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
