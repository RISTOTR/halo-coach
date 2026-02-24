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
  | 'loading_review'
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
  reviewDto: any | null
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
    reviewDto: null,
    error: null
  }))

  // Prevent “double load” races (two components calling loadActive at same time)
  const loadSeq = useState<number>('exp:loadSeq', () => 0)

  function resetTransient(keepEndDate = true) {
  const prevEnd = ctx.value.endDate
  ctx.value.subjectiveRating = null
  ctx.value.subjectiveNote = ''
  ctx.value.computed = null
  ctx.value.review = null
  ctx.value.reviewDto = null
  ctx.value.insufficient = null
  ctx.value.error = null
  if (!keepEndDate) ctx.value.endDate = todayISO()
  else ctx.value.endDate = prevEnd || todayISO()
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
    const exp = ctx.value.reviewExperiment || ctx.value.activeExperiment
    if (!exp?.id) return

    const endDate = ctx.value.endDate || todayISO()

    state.value = 'ending'
    resetTransient(true)
    ctx.value.endDate = endDate

    try {
      const id = exp.id
      await $fetch(`/api/ai/experiments/${id}/end`, {
        method: 'POST',
        body: { endDate }
      })

      const reviewDto = await $fetch(`/api/ai/experiments/${id}/review`, { method: 'GET' }) as any
      ctx.value.reviewDto = reviewDto

      ctx.value.activeExperiment = null
      ctx.value.reviewExperiment = null
      state.value = 'subjective'
      console.log('reviewDto', reviewDto)
    } catch (e: any) {
      ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to end experiment' }
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

  function dismiss() {
    state.value = 'ready'
    ctx.value.reviewExperiment = null
    ctx.value.reviewDto = null
    ctx.value.error = null
  }

  async function openReviewById(id: string) {
  if (!id) return
  state.value = 'loading_review'
  ctx.value.error = null
  ctx.value.reviewDto = null

  try {
    const reviewDto = await $fetch(`/api/ai/experiments/${id}/review`, { method: 'GET' }) as any
    ctx.value.reviewDto = reviewDto
    state.value = 'review'
  } catch (e: any) {
    ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to load review' }
    state.value = 'error'
  }
}


  async function finalizeReview(payload: { whatWorked?: string[]; tryNext?: string[] } = {}) {
    const dto = ctx.value.reviewDto
    const id = dto?.id
    if (!id) return

    state.value = 'submitting_review'
    ctx.value.error = null

    try {
      const res = await $fetch(`/api/ai/experiments/${id}/review`, {
        method: 'POST',
        body: {
          ...payload,
          finalize: true,
          subjectiveRating: ctx.value.subjectiveRating ?? undefined,
          subjectiveNote: ctx.value.subjectiveNote?.trim() ? ctx.value.subjectiveNote.trim() : undefined
        }
      }) as any

      if (ctx.value.reviewDto?.outcome) {
        ctx.value.reviewDto.outcome.whatWorked = payload.whatWorked ?? ctx.value.reviewDto.outcome.whatWorked
        ctx.value.reviewDto.outcome.tryNext = payload.tryNext ?? ctx.value.reviewDto.outcome.tryNext
        ctx.value.reviewDto.status = res?.experiment?.status || 'completed'
      }
      await loadActive()
      state.value = 'next_focus'
    } catch (e: any) {
      ctx.value.error = { message: e?.data?.statusMessage || e?.message || 'Failed to finalize review' }
      state.value = 'error'
    }
  }

  function submitSubjective() {
    if (!ctx.value.subjectiveRating) return
    state.value = 'review'
  }

  return {
    state,
    ctx,
    loadActive,
    openEndConfirm,
    endExperiment,
    continueExperiment,
    startFromPreset,
    goNextFocus,
    close,
    dismiss,
    openReviewById,
    finalizeReview,
    submitSubjective
  }
}
