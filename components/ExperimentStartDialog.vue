<template>
  <div v-if="modelValue" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/60" @click="close" />

    <div class="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2">
      <div class="rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
        <div class="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.22em] text-white/50">Experiment</p>
            <h3 class="mt-1 text-sm font-semibold text-slate-100">Start an experiment</h3>
          </div>
          <button class="text-white/60 hover:text-white" @click="close">✕</button>
        </div>

        <div class="px-5 py-4 space-y-4">
          <div v-if="step === 'replace'" class="space-y-3">
            <p class="text-[12px] text-slate-200">
              You already have an active experiment.
            </p>
            <div class="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
              <p class="text-xs font-medium text-slate-100 truncate">
                {{ activeExperiment?.title }}
              </p>
              <p class="mt-0.5 text-[10px] text-slate-400">
                Started {{ activeExperiment?.start_date }} · Target: {{ activeExperiment?.target_metric }}
              </p>
            </div>

            <p class="text-[11px] text-slate-400">
              Replace it with the new one?
            </p>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10" @click="backToPresets">
                Keep current
              </button>
              <button class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20" @click="confirmReplace">
                Replace
              </button>
            </div>
          </div>

          <div v-else class="space-y-3">
            <p class="text-[11px] text-slate-400">
              Choose one lever. Keep everything else steady.
            </p>

            <div class="grid gap-2">
              <button
                v-for="p in presets"
                :key="p.id"
                class="text-left rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/80 px-4 py-3"
                @click="startPreset(p)"
                :disabled="loading"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-xs font-semibold text-slate-100 truncate">{{ p.title }}</div>
                    <div class="mt-1 text-[11px] text-slate-400">
                      {{ p.subtitle }}
                    </div>
                  </div>
                  <div class="text-[10px] text-white/50">
                    {{ p.targetMetricLabel }}
                  </div>
                </div>
              </button>
            </div>

            <div v-if="errorMsg" class="text-[11px] text-red-300">
              {{ errorMsg }}
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10" @click="close">
                Close
              </button>
            </div>
          </div>

          <div v-if="loading" class="text-[11px] text-slate-300">
            Starting…
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Preset = {
  id: string
  title: string
  subtitle: string
  leverType: 'metric'|'habit'|'custom'
  leverRef?: string
  targetMetric: 'energy'|'stress'|'mood'|'sleep_hours'|'steps'|'water_liters'|'outdoor_minutes'
  targetMetricLabel: string
}

const props = defineProps<{
  modelValue: boolean
  flow: any
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const loading = ref(false)
const errorMsg = ref('')
const step = ref<'presets'|'replace'>('presets')

const activeExperiment = computed(() => props.flow?.ctx?.activeExperiment || null)

const presets: Preset[] = [
  {
    id: 'sleep_consistency',
    title: 'Sleep consistency',
    subtitle: 'Aim for a steady bedtime / wake time.',
    leverType: 'metric',
    leverRef: 'sleep_hours',
    targetMetric: 'energy',
    targetMetricLabel: 'Target: energy'
  },
  {
    id: 'outdoor_time',
    title: 'Outdoor time',
    subtitle: 'Add a short outdoor block daily.',
    leverType: 'metric',
    leverRef: 'outdoor_minutes',
    targetMetric: 'stress',
    targetMetricLabel: 'Target: stress'
  },
  {
    id: 'hydration',
    title: 'Hydration',
    subtitle: 'Keep water consistent across the day.',
    leverType: 'metric',
    leverRef: 'water_liters',
    targetMetric: 'energy',
    targetMetricLabel: 'Target: energy'
  }
]

let pendingPreset: Preset | null = null

function close() {
  emit('update:modelValue', false)
  loading.value = false
  errorMsg.value = ''
  step.value = 'presets'
  pendingPreset = null
}

function backToPresets() {
  step.value = 'presets'
  pendingPreset = null
}

async function startPreset(p: Preset) {
  errorMsg.value = ''
  loading.value = true
  pendingPreset = p

  try {
    await $fetch('/api/ai/experiments/start', {
      method: 'POST',
      body: {
        title: p.title,
        leverType: p.leverType,
        leverRef: p.leverRef,
        targetMetric: p.targetMetric
      }
    })

    await props.flow.loadActive()
    close()
  } catch (e: any) {
    // If active exists, ask to replace
    const status = e?.status || e?.data?.statusCode
    if (status === 409) {
      step.value = 'replace'
    } else {
      errorMsg.value = e?.data?.statusMessage || e?.message || 'Failed to start experiment'
    }
  } finally {
    loading.value = false
  }
}

async function confirmReplace() {
  if (!pendingPreset) {
    step.value = 'presets'
    return
  }

  errorMsg.value = ''
  loading.value = true
  try {
    await $fetch('/api/ai/experiments/start', {
      method: 'POST',
      body: {
        title: pendingPreset.title,
        leverType: pendingPreset.leverType,
        leverRef: pendingPreset.leverRef,
        targetMetric: pendingPreset.targetMetric,
        replaceActive: true
      }
    })

    await props.flow.loadActive()
    close()
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || e?.message || 'Failed to replace experiment'
    step.value = 'presets'
  } finally {
    loading.value = false
  }
}
</script>
