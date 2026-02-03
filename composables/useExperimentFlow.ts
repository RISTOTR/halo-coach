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

export function useExperimentFlow() {
  const state = ref<FlowState>('idle')

  const ctx = reactive({
    // Only truly ACTIVE experiment (no end_date)
    activeExperiment: null as any | null,

    // Experiment that was ended and is awaiting subjective/review
    reviewExperiment: null as any | null,

    endDate: new Date().toISOString().slice(0, 10),
    subjectiveRating: null as SubjectiveRating | null,
    subjectiveNote: '',
    computed: null as any | null,
    review: null as any | null,
    insufficient: null as any | null,
    error: null as { message: string } | null
  })

  function resetTransient() {
    ctx.subjectiveRating = null
    ctx.subjectiveNote = ''
    ctx.computed = null
    ctx.review = null
    ctx.insufficient = null
    ctx.error = null
    ctx.endDate = new Date().toISOString().slice(0, 10)
    // NOTE: do NOT wipe reviewExperiment here; it’s needed during subjective/review.
  }

  async function loadActive() {
    state.value = 'loading_active'
    resetTransient()

    try {
      const res = await $fetch('/api/ai/experiments/active', { method: 'GET' })
      ctx.activeExperiment = (res as any).experiment ?? null
      state.value = 'ready'
    } catch (e: any) {
      ctx.error = { message: e?.data?.statusMessage || e?.message || 'Failed to load active experiment' }
      state.value = 'error'
    }
  }

  function openEndConfirm() {
    if (!ctx.activeExperiment) return
    // carry the experiment into the end/review flow
    ctx.reviewExperiment = ctx.activeExperiment
    state.value = 'confirm_end'
  }

  async function endExperiment() {
    // We end the currently active experiment, but keep it in reviewExperiment for the next step.
    const exp = ctx.reviewExperiment || ctx.activeExperiment
    if (!exp?.id) return

    state.value = 'ending'
    resetTransient()

    try {
      const id = exp.id
      const res = await $fetch(`/api/ai/experiments/${id}/end`, {
        method: 'POST',
        body: { endDate: ctx.endDate }
      })

      // endpoint should return updated experiment (with end_date set)
      ctx.reviewExperiment = (res as any).experiment ?? exp

      // active is now gone (by definition)
      ctx.activeExperiment = null

      // go straight to subjective
      state.value = 'subjective'
    } catch (e: any) {
      const status = e?.status || e?.data?.statusCode

      // If already ended, still proceed to subjective using the experiment we had
      if (status === 409) {
        ctx.activeExperiment = null
        state.value = 'subjective'
        return
      }

      ctx.error = { message: e?.data?.statusMessage || e?.message || 'Failed to end experiment' }
      state.value = 'error'
    }
  }

  async function submitSubjective() {
    const exp = ctx.reviewExperiment
    if (!exp?.id) return
    if (!ctx.subjectiveRating) return

    state.value = 'submitting_review'
    try {
      const id = exp.id
      const res = await $fetch(`/api/ai/experiments/${id}/review`, {
        method: 'POST',
        body: {
          subjectiveRating: ctx.subjectiveRating,
          subjectiveNote: ctx.subjectiveNote || undefined
        }
      })

      const r = res as any
      if (!r.ok) {
        ctx.insufficient = r
        state.value = 'insufficient'
        return
      }

      ctx.computed = r.computed
      ctx.review = r.review

      // Now the review is complete → clear reviewExperiment and refresh active (should be null)
      ctx.reviewExperiment = null
      await loadActive()

      state.value = 'review'
    } catch (e: any) {
      ctx.error = { message: e?.data?.statusMessage || e?.message || 'Failed to submit review' }
      state.value = 'error'
    }
  }

  async function continueExperiment() {
    // Continue only makes sense for an ACTIVE experiment
    if (!ctx.activeExperiment?.id) {
      state.value = 'ready'
      return
    }

    try {
      const id = ctx.activeExperiment.id
      const res = await $fetch(`/api/ai/experiments/${id}/resume`, { method: 'POST' })
      ctx.activeExperiment = (res as any).experiment
      ctx.insufficient = null
      state.value = 'ready'
    } catch (e: any) {
      ctx.error = { message: e?.data?.statusMessage || e?.message || 'Failed to resume experiment' }
      state.value = 'error'
    }
  }

  async function startFromPreset(preset: Preset, replaceActive = false) {
    state.value = 'starting'
    ctx.error = null

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
      ctx.reviewExperiment = null
      await loadActive()

      state.value = 'ready'
      return res
    } catch (e: any) {
      const status = e?.status || e?.data?.statusCode
      if (status === 409) {
        state.value = 'active_exists'
        throw e
      }

      ctx.error = { message: e?.data?.statusMessage || e?.message || 'Failed to start experiment' }
      state.value = 'error'
      throw e
    }
  }

  function goNextFocus() {
    state.value = 'next_focus'
  }

  function close() {
    state.value = 'idle'
    ctx.activeExperiment = null
    ctx.reviewExperiment = null
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
