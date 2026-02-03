type SubjectiveRating = 'more_stable'|'slightly_better'|'no_change'|'hard_to_maintain'|'worse'

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

export function useExperimentFlow() {
  const state = ref<'idle'|'loading_active'|'ready'|'confirm_end'|'ending'|'subjective'|'submitting_review'|'insufficient'|'review'|'next_focus'|'error'>('idle')

  const ctx = reactive({
    activeExperiment: null as any | null,
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
    state.value = 'confirm_end'
  }

  async function endExperiment() {
    if (!ctx.activeExperiment) return
    state.value = 'ending'
    try {
      const id = ctx.activeExperiment.id
      const res = await $fetch(`/api/ai/experiments/${id}/end`, {
        method: 'POST',
        body: { endDate: ctx.endDate } // mode omitted => normal end
      })
      ctx.activeExperiment = (res as any).experiment
      // now go to subjective (objective must not be shown before this)
      state.value = 'subjective'
    } catch (e: any) {
  const status = e?.status || e?.data?.statusCode

  // If already ended, just move forward to subjective
  if (status === 409 && String(e?.data?.statusMessage || '').includes('end_date')) {
    state.value = 'subjective'
    return
  }

  ctx.error = { message: e?.data?.statusMessage || e?.message || 'Failed to end experiment' }
  state.value = 'error'
}

  }

  async function submitSubjective() {
    if (!ctx.activeExperiment?.id) return
    if (!ctx.subjectiveRating) return

    state.value = 'submitting_review'
    try {
      const id = ctx.activeExperiment.id
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
      // experiment is now completed server-side; clear active
      ctx.activeExperiment = null
      await loadActive()
      state.value = 'review'
    } catch (e: any) {
      // common 409s: already reviewed, abandoned, etc.
      ctx.error = { message: e?.data?.statusMessage || e?.message || 'Failed to submit review' }
      state.value = 'error'
    }
  }

  async function continueExperiment() {
  if (!ctx.activeExperiment?.id) {
    state.value = 'ready'
    return
  }

  try {
    const id = ctx.activeExperiment.id
    const res = await $fetch(`/api/ai/experiments/${id}/resume`, { method: 'POST' })
    ctx.activeExperiment = (res as any).experiment
    ctx.insufficient = null
    // go back to normal ready state (experiment continues)
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

    // After start, refresh the active experiment
    await loadActive()

    // If you have a "start" UI step, you can move to 'active'
    state.value = 'active'
    return res
  } catch (e: any) {
    const status = e?.status || e?.data?.statusCode

    // bubble up 409 so UI can show replace dialog
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
