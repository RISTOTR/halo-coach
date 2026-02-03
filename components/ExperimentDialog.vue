<template>
  <div v-if="modelValue" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/60" @click="close" />

    <div class="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2">
      <div class="rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
        <div class="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.22em] text-white/50">Experiment</p>
            <h3 class="mt-1 text-sm font-semibold text-slate-100">
              {{ title }}
            </h3>
          </div>
          <button class="text-white/60 hover:text-white" @click="close">✕</button>
        </div>

        <div class="px-5 py-4">
          <!-- CONFIRM END -->
          <div v-if="flow.state.value === 'confirm_end'" class="space-y-3">
            <p class="text-[12px] text-slate-300">
              End this experiment and review it?
            </p>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-[11px] text-slate-400">End date</label>
                <input
                  v-model="flow.ctx.endDate"
                  type="date"
                  class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close"
              >
                Cancel
              </button>
              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                @click="flow.endExperiment"
              >
                End & continue
              </button>
            </div>
          </div>

          <!-- WORKING -->
          <div v-else-if="flow.state.value === 'ending' || flow.state.value === 'submitting_review'" class="text-[12px] text-slate-300">
            Working…
          </div>

          <!-- SUBJECTIVE -->
          <div v-else-if="flow.state.value === 'subjective'" class="space-y-3">
            <p class="text-[12px] text-slate-300">
              Before we look at the data — how did it feel?
            </p>

            <div class="grid gap-2">
              <label
                v-for="opt in options"
                :key="opt.value"
                class="flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-xs text-slate-100"
              >
                <span class="text-slate-100">{{ opt.label }}</span>
                <input
                  type="radio"
                  name="subjective"
                  :value="opt.value"
                  v-model="flow.ctx.subjectiveRating"
                />
              </label>
            </div>

            <div>
              <label class="mb-1 block text-[11px] text-slate-400">Optional note</label>
              <textarea
                v-model="flow.ctx.subjectiveNote"
                rows="3"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-2 text-xs text-slate-100"
                placeholder="Anything you noticed?"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close"
              >
                Cancel
              </button>
              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                :disabled="!flow.ctx.subjectiveRating"
                @click="flow.submitSubjective"
              >
                Review
              </button>
            </div>
          </div>

          <!-- INSUFFICIENT -->
          <div v-else-if="flow.state.value === 'insufficient'" class="space-y-3">
            <p class="text-[12px] text-slate-300">Not enough data yet.</p>
            <p class="text-[11px] text-slate-400">
              We don’t have enough logged days to evaluate reliably. Continue a few more days and try again.
            </p>

            <div class="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-300">
              Logged days — baseline: {{ flow.ctx.insufficient?.baselineRows }} · experiment: {{ flow.ctx.insufficient?.experimentRows }}
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close"
              >
                Close
              </button>
              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                @click="flow.continueExperiment"
              >
                Continue experiment
              </button>
            </div>
          </div>

          <!-- REVIEW -->
          <div v-else-if="flow.state.value === 'review'" class="space-y-4">
            <div class="text-[12px] text-slate-300">
              Here’s how the system shifted.
            </div>

            <div v-if="flow.ctx.computed?.metrics" class="grid gap-3">
              <MetricBlock label="Energy" :m="flow.ctx.computed.metrics.energy" />
              <MetricBlock label="Stress" :m="flow.ctx.computed.metrics.stress" />
              <MetricBlock label="Mood" :m="flow.ctx.computed.metrics.mood" />
              <div class="text-[11px] text-slate-400">
                Confidence: {{ flow.ctx.computed.confidence }}
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close"
              >
                Close
              </button>
              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                @click="flow.goNextFocus"
              >
                What next?
              </button>
            </div>
          </div>

          <!-- NEXT FOCUS -->
          <div v-else-if="flow.state.value === 'next_focus'" class="space-y-3">
            <p class="text-[12px] text-slate-300">What would you like to explore next?</p>
            <p class="text-[11px] text-slate-400">Suggestions come next. For now, this is a placeholder.</p>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close"
              >
                Close
              </button>
            </div>
          </div>

          <!-- ERROR -->
          <div v-else-if="flow.state.value === 'error'" class="space-y-3">
            <p class="text-[12px] text-slate-300">Something went wrong.</p>
            <p class="text-[11px] text-slate-400">{{ flow.ctx.error?.message }}</p>
            <div class="flex items-center justify-end pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close"
              >
                Close
              </button>
            </div>
          </div>

          <!-- FALLBACK -->
          <div v-else class="text-[12px] text-slate-300">
            Ready.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SubjectiveRating = 'more_stable'|'slightly_better'|'no_change'|'hard_to_maintain'|'worse'

const props = defineProps<{
  modelValue: boolean
  flow: any
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const options: { value: SubjectiveRating; label: string }[] = [
  { value: 'more_stable', label: 'More stable' },
  { value: 'slightly_better', label: 'Slightly better' },
  { value: 'no_change', label: 'No noticeable change' },
  { value: 'hard_to_maintain', label: 'Hard to maintain' },
  { value: 'worse', label: 'Worse' }
]

const title = computed(() => props.flow?.ctx?.activeExperiment?.title || 'Experiment')

function close() {
  emit('update:modelValue', false)
  props.flow.close()
}

// Local component (no TSX)
const MetricBlock = defineComponent({
  name: 'MetricBlock',
  props: {
    label: { type: String, required: true },
    m: { type: Object as any, required: true }
  },
  setup(p) {
    const abs = (n: any) => (typeof n === 'number' ? (Math.round(n * 10) / 10).toString() : '–')
    const pct = (n: any) => (typeof n === 'number' ? `${Math.round(n)}%` : '–')

    const meanDuring = computed(() => abs((p.m as any).meanDuring))
    const deltaAbs = computed(() => abs((p.m as any).deltaAbs))
    const volDeltaPct = computed(() => pct((p.m as any).volDeltaPct))

    return { meanDuring, deltaAbs, volDeltaPct }
  },
  template: `
    <div class="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
      <div class="flex items-center justify-between">
        <div class="text-xs font-medium text-slate-100">{{ label }}</div>
        <div class="text-[10px] text-slate-400">
          mean {{ meanDuring }} ({{ deltaAbs }})
        </div>
      </div>
      <div class="mt-1 text-[11px] text-slate-300">
        Volatility {{ volDeltaPct }}
      </div>
    </div>
  `
})
</script>
