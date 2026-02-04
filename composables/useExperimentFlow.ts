type SubjectiveRating =
  | 'more_stable'
  | 'slightly_better'
  | 'no_change'
  | 'hard_to_maintain'
  | 'worse'

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

type FlowState =
  | 'idle'
  | 'loading_active'
  | 'ready'
  | 'confirm_end'
  | 'ending'
  | 'subjective'
  | 'submitting_review'
  | 'insufficient'
  | 'review'
  | 'next_focus'
  | 'starting'
  | 'active_exists'
  | 'error'

type ExperimentRow = any // You can type this later from DB schema if you want.

type FlowCtx = {
  // Only truly ACTIVE experiment (no end_date)
  activeExperiment: ExperimentRow | null

  // Experiment that was ended and is awaiting subjective/review
  reviewExperiment: ExperimentRow | null

  endDate: string
  subjectiveRating: SubjectiveRating | null
  subjectiveNote: string
  computed: any | null
  review: any | null
  insufficient: any | null
  error: { message: string } | null
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function useExperimentFlow() {
  // ---- SINGLETON STATE (shared across all callers) ----
  const state = useState<FlowState>('exp:state', () => 'idle')

  const ctx = useState<FlowCtx>('exp:ctx', () => ({
    activeExperiment: null,
    reviewExperiment: null,
    endDate: todayISO(),
    subjectiveRating: null,
    subjectiveNote: '',
    computed: null,
    review: null,
    insufficient: null,
    error: null
  }))

  // Prevent “double load” races (two components calling loadActive at same time)
  const loadSeq = useState<number>('exp:loadSeq', () => 0)

  function resetTransient() {
    ctx.value.subjectiveRating = null
    ctx.value.subjectiveNote = ''
    ctx.value.computed = null
    ctx.value.review = null
    ctx.value.insufficient = null
    ctx.value.error = null
    ctx.value.endDate = todayISO()
    // NOTE: do NOT wipe reviewExperiment here; it’s needed during subjective/review.
  }

  async function loadActive() {
    const seq = ++loadSeq.value
    state.value = 'loading_active'
    resetTransient()

    try {
      const res = await $fetch('/api/ai/experiments/active', { method: 'GET' }) as any

      // If a newer call already started, ignore this result.
      if (seq !== loadSeq.value) return

      ctx.value.activeExperiment = res?.experiment ?? null
      state.value = 'ready'
    } catch (e: any) {
      if (seq !== loadSeq.value) return
      ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to load active experiment' }
      state.value = 'error'
    }
  }

  function openEndConfirm() {
    if (!ctx.value.activeExperiment) return
    // carry the experiment into the end/review flow
    ctx.value.reviewExperiment = ctx.value.activeExperiment
    state.value = 'confirm_end'
  }

  async function endExperiment() {
    // We end the currently active experiment, but keep it in reviewExperiment for the next step.
    const exp = ctx.value.reviewExperiment || ctx.value.activeExperiment
    if (!exp?.id) return

    state.value = 'ending'
    resetTransient()

    try {
      const id = exp.id
      const res = await $fetch(`/api/ai/experiments/${id}/end`, {
        method: 'POST',
        body: { endDate: ctx.value.endDate }
      }) as any

      // endpoint should return updated experiment (with end_date set)
      ctx.value.reviewExperiment = res?.experiment ?? exp

      // active is now gone (by definition)
      ctx.value.activeExperiment = null

      // go straight to subjective
      state.value = 'subjective'
    } catch (e: any) {
      const status = e?.status || e?.data?.statusCode

      // If already ended, still proceed to subjective using the experiment we had
      if (status === 409) {
        ctx.value.activeExperiment = null
        state.value = 'subjective'
        return
      }

      ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to end experiment' }
      state.value = 'error'
    }
  }

  async function submitSubjective() {
    const exp = ctx.value.reviewExperiment
    if (!exp?.id) return
    if (!ctx.value.subjectiveRating) return

    state.value = 'submitting_review'
    try {
      const id = exp.id
      const res = await $fetch(`/api/ai/experiments/${id}/review`, {
        method: 'POST',
        body: {
          subjectiveRating: ctx.value.subjectiveRating,
          subjectiveNote: ctx.value.subjectiveNote || undefined
        }
      }) as any

      if (!res?.ok) {
        ctx.value.insufficient = res
        state.value = 'insufficient'
        return
      }

      ctx.value.computed = res.computed
      ctx.value.review = res.review

      // Now the review is complete → clear reviewExperiment and refresh active (should be null)
      ctx.value.reviewExperiment = null
      await loadActive()

      state.value = 'next_focus'
    } catch (e: any) {
      ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to submit review' }
      state.value = 'error'
    }
  }

  async function continueExperiment() {
    // Continue only makes sense for an ACTIVE experiment
    if (!ctx.value.activeExperiment?.id) {
      state.value = 'ready'
      return
    }

    try {
      const id = ctx.value.activeExperiment.id
      const res = await $fetch(`/api/ai/experiments/${id}/resume`, { method: 'POST' }) as any
      ctx.value.activeExperiment = res?.experiment ?? ctx.value.activeExperiment
      ctx.value.insufficient = null
      state.value = 'ready'
    } catch (e: any) {
      ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to resume experiment' }
      state.value = 'error'
    }
  }

  async function startFromPreset(preset: Preset, replaceActive = false) {
    state.value = 'starting'
    ctx.value.error = null

    try {
      const res = await $fetch('/api/ai/experiments/start', {
        method: 'POST',
        body: {
          title: preset.title,
          leverType: preset.leverType,
          leverRef: preset.leverRef,
          targetMetric: preset.targetMetric,
          effortEstimate: preset.effortEstimate,
          expectedImpact: preset.expectedImpact,
          recommendedDays: preset.recommendedDays ?? 7,
          baselineDays: preset.baselineDays ?? 30,
          replaceActive
        }
      })

      // A new experiment started: clear any pending review context
      ctx.value.reviewExperiment = null
      await loadActive()

      state.value = 'ready'
      return res
    } catch (e: any) {
      const status = e?.status || e?.data?.statusCode
      if (status === 409) {
        state.value = 'active_exists'
        throw e
      }

      ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to start experiment' }
      state.value = 'error'
      throw e
    }
  }

  function goNextFocus() {
    state.value = 'next_focus'
  }

  function close() {
    state.value = 'idle'
    ctx.value.activeExperiment = null
    ctx.value.reviewExperiment = null
    resetTransient()
  }

  return {
    state,
    ctx,
    loadActive,
    openEndConfirm,
    endExperiment,
    submitSubjective,
    continueExperiment,
    startFromPreset,
    goNextFocus,
    close
  }
}
