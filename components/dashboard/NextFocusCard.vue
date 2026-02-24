<!-- components/dashboard/NextFocusCard.vue -->
<template>
  <div
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-slate-100">Next focus</h2>
          <span v-if="statusPill"
            class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-200">
            {{ statusPill }}
          </span>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">
          Two options — one low effort, one higher impact.
        </p>
        <div v-if="hint" class="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/70">
          <span class="font-semibold text-white/80">Hint:</span>
          {{ hint }}
        </div>
      </div>

      <button
        class="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
        @click="load" :disabled="loading">
        <span v-if="loading">Updating…</span>
        <span v-else>Refresh</span>
      </button>
    </div>


    <div v-if="hasActiveExperiment" class="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
      <div class="text-xs font-semibold text-emerald-100">
        Experiment in progress
      </div>
      <p class="mt-1 text-xs text-emerald-100/70">
        {{ activeLabel }}. Finish or review it before starting a new focus.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
          @click="$emit('openExperiment')">
          View experiment →
        </button>
      </div>
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
      <section v-for="(o, idx) in options" :key="o.id" class="rounded-xl border border-white/10 bg-black/10 p-4">
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
            class="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70">
            {{ o.id }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button v-if="o.preset"
            class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60 disabled:hover:bg-emerald-500/10"
            :disabled="false" @click="onStartPreset(o.preset)">
            Start {{ o.preset.title }} →
          </button>

          <p v-if="hasActiveExperiment" class="mt-2 text-[11px] text-white/45">
            Experiment in progress: <span class="text-white/70">{{ activeLabel }}</span>.
            Starting a new one will ask to replace it.
          </p>



          <!-- <button v-else
            class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
            @click="emit('open-check-in')">
            Add a tiny action →
          </button> -->
          <p v-if="o.preset" class="mt-2 text-[11px] text-white/45">
            Experiment lever: {{ o.preset.leverType }} · {{ o.preset.leverRef }} → {{ o.preset.targetMetric }}
          </p>

        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

type Effort = 'low' | 'moderate' | 'high'
type Impact = 'low' | 'moderate' | 'high'
type TargetMetric =
  | 'energy' | 'stress' | 'mood'
  | 'sleep_hours' | 'steps' | 'water_liters' | 'outdoor_minutes'

type Preset = {
  title: string
  leverType: 'metric' | 'habit' | 'custom'
  leverRef?: string
  targetMetric: TargetMetric
  effortEstimate?: Effort
  expectedImpact?: Impact
  recommendedDays?: number
  baselineDays?: number
}

type NextFocusOption = {
  id: string
  title: string
  why: string
  effort: Effort
  impact: Impact
  preset: Preset | null
}

const props = defineProps<{
  activeExperiment?: any | null
}>()

const emit = defineEmits<{
  (e: 'startPreset', preset: Preset): void
  (e: 'openCheckIn'): void
  (e: 'openExperiment'): void
}>()

const hasActiveExperiment = computed(() => !!props.activeExperiment)

const activeLabel = computed(() => {
  const exp = props.activeExperiment
  if (!exp) return ''
  const title = exp.title || `${exp.leverLabel} → ${exp.targetLabel}`
  const started = exp.startDate ? ` · started ${exp.startDate}` : ''
  return `${title}${started}`
})

const loading = ref(false)
const error = ref('')
const options = ref<NextFocusOption[]>([])

const hint = ref<string>('')

function computeHint(meta: any) {
  const n = meta?.topCorrelation?.n
  if (typeof n === 'number' && n > 0 && n < 14) {
    return `Tip: Insights get much more reliable with longer experiments (5–7 days). Right now correlations use n=${n} days of data.`
  }
  return 'Tip: Halo becomes much more accurate after a few 5–7 day experiments (1-day tests are mostly noise).'
}

const statusPill = computed(() => {
  if (hasActiveExperiment.value) return 'Experiment active'
  if (loading.value) return 'Loading'
  if (error.value) return 'Error'
  if (!options.value.length) return 'Early'
  return 'Ready'
})

const { loadNextFocus } = useNextFocusSuggestions()

async function load() {
  loading.value = true
  error.value = ''

  try {
    const res = await loadNextFocus({ windowDays: 60 })
    options.value = res.options
    hint.value = computeHint(res?.debug)// optional; remove period display if you want
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not load next focus.'
    options.value = []
  } finally {
    loading.value = false
  }
}

function onStartPreset(preset: Preset) {
  emit('startPreset', preset)
}

onMounted(async () => {
  load()
})

</script>
