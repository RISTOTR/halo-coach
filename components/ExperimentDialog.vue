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
              End & review
            </p>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-[11px] text-slate-400">End date</label>
                <input v-model="flow.ctx.value.endDate" type="date"
                  class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close">
                Cancel
              </button>
              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                @click="flow.endExperiment">
                End & Review
              </button>
            </div>
          </div>

          <!-- WORKING -->
          <div v-else-if="isWorking" class="text-[12px] text-slate-300">
            {{ workingLabel }}
          </div>

          <!-- SUBJECTIVE -->
          <div v-else-if="flow.state.value === 'subjective'" class="space-y-3">
            <p class="text-[12px] text-slate-300">
              Before we look at the data — how did it feel?
            </p>

            <div class="grid gap-2">
              <label v-for="opt in options" :key="opt.value"
                class="flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-xs text-slate-100">
                <span class="text-slate-100">{{ opt.label }}</span>
                <input type="radio" name="subjective" :value="opt.value" v-model="flow.ctx.value.subjectiveRating" />
              </label>
            </div>

            <div>
              <label class="mb-1 block text-[11px] text-slate-400">Optional note</label>
              <textarea v-model="flow.ctx.value.subjectiveNote" rows="3"
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-2 text-xs text-slate-100"
                placeholder="Anything you noticed?" />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close">
                Cancel
              </button>
              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                :disabled="!flow.ctx.value.subjectiveRating" @click="flow.submitSubjective">
                Review
              </button>
            </div>
          </div>

          <!-- REVIEW (Phase 3 DTO) -->
          <div v-else-if="flow.state.value === 'review'" class="space-y-4">
            <transition name="fadeUp" appear>
              <div :key="dto?.id || 'review'">
                <div class="text-[12px] text-slate-300">
                  Here’s what changed (baseline → experiment).
                </div>

                <div v-if="coverage.baselineDays != null && coverage.experimentDays != null"
                  class="text-[11px] text-white/45">
                  Window: baseline {{ coverage.baselineDays }} days · experiment {{ coverage.experimentDays }} days
                </div>

                <div v-if="flow.ctx.value.reviewDto" class="space-y-3">
                  <!-- Outcome pills -->
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                      {{ flow.ctx.value.reviewDto?.outcome?.alignment || 'unclear' }}
                    </span>
                    <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                      Confidence: {{ flow.ctx.value.reviewDto?.outcome?.confidenceLabel || 'low' }}
                    </span>
                  </div>

                  <!-- Summary pill -->
                  <div class="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-[11px] text-white/70">
                    <span class="font-semibold text-white/80">
                      {{ flow.ctx.value.reviewDto?.outcome?.summaryPill?.text }}
                    </span>
                  </div>

                  <!-- Conclusion -->
                  <div v-if="flow.ctx.value.reviewDto?.conclusion"
                    class="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-[12px] text-white/75">
                    {{ flow.ctx.value.reviewDto.conclusion }}
                  </div>

                  <!-- Target metric -->
                  <div class="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
                    <div class="flex items-center justify-between">
                      <div class="text-xs font-medium text-slate-100">
                        {{ flow.ctx.value.reviewDto.metrics.target.label }} (target)
                      </div>

                      <div class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]" :class="deltaBadgeClass(
                        isDeltaGood(
                          flow.ctx.value.reviewDto.metrics.target.key || flow.ctx.value.reviewDto.targetMetric,
                          metricDelta(flow.ctx.value.reviewDto.metrics.target).dir
                        )
                      )">
                        <span class="opacity-80">
                          {{ arrow(metricDelta(flow.ctx.value.reviewDto.metrics.target).dir) }}
                        </span>
                        <span>
                          {{ flow.ctx.value.reviewDto.metrics.target.deltaText }}
                        </span>
                      </div>
                    </div>

                    <div class="mt-1 text-[11px] text-slate-300">
                      Baseline {{ flow.ctx.value.reviewDto.metrics.target.baselineAvg ?? '—' }}
                      → Experiment {{ flow.ctx.value.reviewDto.metrics.target.experimentAvg ?? '—' }}
                    </div>

                    <div v-if="flow.ctx.value.reviewDto.metrics.target.isSignal === false"
                      class="mt-1 text-[10px] text-white/45">
                      Not enough logged days to evaluate reliably yet.
                    </div>
                  </div>

                  <!-- Other metrics -->
                  <div class="grid gap-2">
                    <div v-for="m in flow.ctx.value.reviewDto.metrics.others" :key="m.key"
                      class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                      <div class="flex items-center justify-between">
                        <div class="text-xs font-medium text-slate-100">{{ m.label }}</div>

                        <div class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                          :class="deltaBadgeClass(isDeltaGood(m.key, metricDelta(m).dir))">
                          <span class="opacity-80">{{ arrow(metricDelta(m).dir) }}</span>
                          <span>{{ m.deltaText }}</span>
                        </div>
                      </div>

                      <div class="mt-1 text-[11px] text-slate-300">
                        Baseline {{ m.baselineAvg ?? '—' }} → Experiment {{ m.experimentAvg ?? '—' }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="text-[12px] text-slate-300">
                  No review data available.
                </div>

                <!-- Notes -->
                <div class="rounded-xl border border-white/10 bg-black/10 p-3 space-y-3">
                  <div>
                    <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      What worked
                    </div>

                    <div class="mt-2 flex flex-wrap gap-2">
                      <button v-for="w in whatWorked" :key="w" type="button"
                        class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 hover:bg-white/10"
                        @click="removeChip('worked', w)" title="Remove">
                        {{ w }} <span class="opacity-60">×</span>
                      </button>

                      <div class="flex items-center gap-2">
                        <input v-model="whatWorkedInput"
                          class="w-44 rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-[11px] text-white/80"
                          placeholder="Add…" @keydown.enter.prevent="addChip('worked')" />
                        <button type="button"
                          class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75 hover:bg-white/10"
                          @click="addChip('worked')">
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      Try next
                    </div>

                    <div class="mt-2 flex flex-wrap gap-2">
                      <button v-for="t in tryNext" :key="t" type="button"
                        class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 hover:bg-white/10"
                        @click="removeChip('next', t)" title="Remove">
                        {{ t }} <span class="opacity-60">×</span>
                      </button>

                      <div class="flex items-center gap-2">
                        <input v-model="tryNextInput"
                          class="w-44 rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-[11px] text-white/80"
                          placeholder="Add…" @keydown.enter.prevent="addChip('next')" />
                        <button type="button"
                          class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75 hover:bg-white/10"
                          @click="addChip('next')">
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-1">
                  <button
                    class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                    @click="close">
                    Close
                  </button>

                  <button
                    class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                    @click="flow.goNextFocus">
                    What next?
                  </button>

                  <button v-if="canFinalize" :disabled="flow.state.value === 'submitting_review'"
                    class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                    @click="onFinalize">
                    Finalize
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- NEXT FOCUS -->
          <div v-else-if="flow.state.value === 'next_focus'" class="space-y-3">
            <p class="text-[12px] text-slate-300">What would you like to explore next?</p>
            <p class="text-[11px] text-slate-400">Suggestions come next. For now, this is a placeholder.</p>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close">
                Close
              </button>
            </div>
          </div>

          <!-- ERROR -->
          <div v-else-if="flow.state.value === 'error'" class="space-y-3">
            <p class="text-[12px] text-slate-300">Something went wrong.</p>
            <p class="text-[11px] text-slate-400">{{ flow.ctx.value?.error?.message }}</p>
            <div class="flex items-center justify-end pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close">
                Close
              </button>
            </div>
          </div>

          <!-- READY (ACTIVE) -->
          <div v-else-if="flow.state.value === 'ready' && flow.ctx.value.activeExperiment" class="space-y-3">
            <p class="text-[12px] text-slate-300">Experiment is in progress.</p>

            <div class="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-[11px] text-white/70">
              <div class="text-white/85 font-medium">
                {{ flow.ctx.value.activeExperiment.title || 'Active experiment' }}
              </div>
              <div class="mt-1 text-white/55">
                {{ flow.ctx.value.activeExperiment.start_date || flow.ctx.value.activeExperiment.startDate || '—' }}
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                class="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                @click="close">
                Close
              </button>
              <button
                class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
                @click="flow.openEndConfirm()">
                End & Review
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
import { computed, ref, watch } from 'vue'

type SubjectiveRating =
  | 'more_stable'
  | 'slightly_better'
  | 'no_change'
  | 'hard_to_maintain'
  | 'worse'

const props = defineProps<{
  modelValue: boolean
  flow: any
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const whatWorkedInput = ref('')
const tryNextInput = ref('')
const whatWorked = ref<string[]>([])
const tryNext = ref<string[]>([])

const dto = computed(() => props.flow?.ctx?.value?.reviewDto)
const canFinalize = computed(() => dto.value?.status === 'ended_pending_review')

const options: { value: SubjectiveRating; label: string }[] = [
  { value: 'more_stable', label: 'More stable' },
  { value: 'slightly_better', label: 'Slightly better' },
  { value: 'no_change', label: 'No noticeable change' },
  { value: 'hard_to_maintain', label: 'Hard to maintain' },
  { value: 'worse', label: 'Worse' }
]

const title = computed(() => {
  const ctx = props.flow?.ctx?.value
  const exp = ctx?.reviewDto || ctx?.reviewExperiment || ctx?.activeExperiment

  if (!exp) return 'Experiment'
  return (
    exp.title ||
    (exp.leverLabel && exp.targetLabel ? `${exp.leverLabel} → ${exp.targetLabel}` : null) ||
    (exp.leverRef && exp.targetMetric ? `${exp.leverRef} → ${exp.targetMetric}` : null) ||
    'Experiment'
  )
})

const isWorking = computed(() =>
  props.flow?.state?.value === 'ending' ||
  props.flow?.state?.value === 'submitting_review' ||
  props.flow?.state?.value === 'loading_review'
)

const workingLabel = computed(() => {
  const s = props.flow?.state?.value
  if (s === 'ending') return 'Ending experiment…'
  if (s === 'loading_review') return 'Loading review…'
  if (s === 'submitting_review') return 'Saving review…'
  return 'Working…'
})

function daysInclusive(start?: string, end?: string) {
  if (!start || !end) return null
  const s = new Date(`${start}T00:00:00Z`).getTime()
  const e = new Date(`${end}T00:00:00Z`).getTime()
  if (Number.isNaN(s) || Number.isNaN(e)) return null
  const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

const coverage = computed(() => {
  const d = dto.value
  const b = d?.windows?.baseline
  const e = d?.windows?.experiment

  // expects windows.baseline = { start, end } and windows.experiment = { start, end }
  const baselineDays = daysInclusive(b?.start, b?.end)
  const experimentDays = daysInclusive(e?.start, e?.end)

  return { baselineDays, experimentDays }
})

function metricDelta(m: any) {
  const b = typeof m?.baselineAvg === 'number' ? m.baselineAvg : null
  const e = typeof m?.experimentAvg === 'number' ? m.experimentAvg : null
  if (b == null || e == null) return { dir: 'flat' as const, delta: null as number | null }
  const delta = e - b
  const dir = Math.abs(delta) < 1e-9 ? 'flat' : delta > 0 ? 'up' : 'down'
  return { dir, delta }
}

function isDeltaGood(metricKey: string, dir: 'up' | 'down' | 'flat') {
  if (dir === 'flat') return null
  if (metricKey === 'stress') return dir === 'down'
  return dir === 'up'
}

function deltaBadgeClass(good: boolean | null) {
  if (good === true) return 'text-emerald-200 bg-emerald-500/10 border-emerald-500/25'
  if (good === false) return 'text-rose-200 bg-rose-500/10 border-rose-500/25'
  return 'text-white/60 bg-white/5 border-white/10'
}

function arrow(dir: 'up' | 'down' | 'flat') {
  return dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'
}

watch(
  dto,
  (d) => {
    // Prefer notes.* (current) but keep legacy fallback outcome.* if you still have it somewhere.
    const n = d?.notes
    const o = d?.outcome

    whatWorked.value = Array.isArray(n?.whatWorked)
      ? [...n.whatWorked]
      : Array.isArray(o?.whatWorked)
        ? [...o.whatWorked]
        : []

    tryNext.value = Array.isArray(n?.tryNext)
      ? [...n.tryNext]
      : Array.isArray(o?.tryNext)
        ? [...o.tryNext]
        : []

    whatWorkedInput.value = ''
    tryNextInput.value = ''
  },
  { immediate: true }
)

function addChip(kind: 'worked' | 'next') {
  const input = kind === 'worked' ? whatWorkedInput : tryNextInput
  const list = kind === 'worked' ? whatWorked : tryNext
  const v = input.value.trim()
  if (!v) return
  if (list.value.includes(v)) {
    input.value = ''
    return
  }
  list.value = [...list.value, v].slice(0, 10)
  input.value = ''
}

function removeChip(kind: 'worked' | 'next', v: string) {
  const list = kind === 'worked' ? whatWorked : tryNext
  list.value = list.value.filter((x) => x !== v)
}

async function onFinalize() {
  await props.flow.finalizeReview({
    whatWorked: whatWorked.value,
    tryNext: tryNext.value
  })
}

function close() {
  emit('update:modelValue', false)
  props.flow.dismiss()
}
</script>

<style scoped>
.fadeUp-enter-active,
.fadeUp-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.fadeUp-enter-from,
.fadeUp-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>