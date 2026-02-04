// server/api/next-focus.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'
type TargetMetric = 'energy' | 'stress' | 'mood' | 'sleep_hours' | 'steps' | 'water_liters' | 'outdoor_minutes'
type Effort = 'low' | 'moderate' | 'high'
type Impact = 'low' | 'moderate' | 'high'

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

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function daysAgoISO(n: number, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

function mean(nums: number[]) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
function stddev(nums: number[]) {
  if (nums.length < 2) return null
  const m = mean(nums)
  if (m == null) return null
  const v = nums.reduce((acc, x) => acc + (x - m) ** 2, 0) / (nums.length - 1)
  return Math.sqrt(v)
}
function values(rows: any[], key: MetricKey) {
  return rows.map(r => r?.[key]).filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v))
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

// simple “weak signal” score helper
function scoreSignal(n: number, threshold: number) {
  const a = Math.abs(n)
  if (a >= threshold * 2) return 3
  if (a >= threshold * 1.25) return 2
  if (a >= threshold) return 1
  return 0
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { date } = querySchema.parse(getQuery(event))

  const end = date ? new Date(date) : new Date()
  const endISO = isoDate(end)
  const startISO = daysAgoISO(6, end) // last 7 days inclusive

  const { data: metricsRows, error: mErr } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress,energy')
    .eq('user_id', uid)
    .gte('date', startISO)
    .lte('date', endISO)
    .order('date', { ascending: true })

  if (mErr) throw createError({ statusCode: 500, statusMessage: mErr.message })

   const rows = metricsRows || []

  // Count only rows that contain at least ONE numeric core metric
  const checkinRows = rows.filter((r) =>
    ['sleep_hours', 'mood', 'stress', 'energy'].some(
      (k) => typeof (r as any)?.[k] === 'number' && Number.isFinite((r as any)?.[k])
    )
  )
  const checkins = checkinRows.length

  // honest gating: require at least 3 *numeric* check-ins
  if (checkins < 3) {
    return { period: { start: startISO, end: endISO, checkins }, options: [] }
  }

  // Use checkinRows (not raw rows) for signals
  const sleep = values(checkinRows, 'sleep_hours')
  const mood = values(checkinRows, 'mood')
  const stress = values(checkinRows, 'stress')
  const energy = values(checkinRows, 'energy')

  const sleepAvg = mean(sleep)
  const sleepSd = sleep.length >= 3 ? stddev(sleep) : null

  const stressAvg = mean(stress)
  const energyAvg = mean(energy)
  const moodAvg = mean(mood)

  // Heuristics (tuneable)
  const sleepVarianceScore = sleepSd == null ? 0 : scoreSignal(sleepSd, 0.9)
  const stressHighScore = stressAvg == null ? 0 : scoreSignal(stressAvg - 3.3, 0.6)
  const energyLowScore = energyAvg == null ? 0 : scoreSignal(3.2 - energyAvg, 0.5)
  const moodLowScore = moodAvg == null ? 0 : scoreSignal(3.2 - moodAvg, 0.5)

  const candidates: Array<NextFocusOption & { score: number }> = []

  // Sleep consistency: require at least 3 sleep datapoints OR energy datapoints
  if (sleep.length >= 3 || energy.length >= 3) {
    if (sleepVarianceScore > 0 || energyLowScore > 0) {
      const why =
        sleepVarianceScore > 0
          ? 'Your sleep looks a bit uneven this week — smoothing it often helps energy and steadiness.'
          : 'Energy dipped this week; protecting sleep is usually the best first lever.'

      candidates.push({
        id: 'sleep_consistency',
        title: 'Sleep consistency',
        why,
        effort: 'low',
        impact: 'high',
        preset: {
          title: 'Sleep consistency',
          leverType: 'metric',
          leverRef: 'sleep_hours',
          targetMetric: 'energy',
          effortEstimate: 'low',
          expectedImpact: 'high',
          recommendedDays: 7,
          baselineDays: 30
        },
        score: clamp(sleepVarianceScore * 2 + energyLowScore * 2, 0, 10)
      })
    }
  }

  // Outdoor reset: require at least 3 mood/stress datapoints OR just allow as a gentle default
  if (stress.length >= 3 || mood.length >= 3) {
    if (stressHighScore > 0 || moodLowScore > 0) {
      const why =
        stressHighScore > 0
          ? 'Stress looks elevated — a short daily reset outside can help prevent stress from accumulating.'
          : 'Mood looks a bit low; light + air is a gentle lever that’s easy to sustain.'

      candidates.push({
        id: 'outdoor_reset',
        title: 'Get light + air daily',
        why,
        effort: 'low',
        impact: 'moderate',
        preset: {
          title: 'Get light + air daily',
          leverType: 'metric',
          leverRef: 'outdoor_minutes',
          targetMetric: 'stress',
          effortEstimate: 'low',
          expectedImpact: 'moderate',
          recommendedDays: 7,
          baselineDays: 30
        },
        score: clamp(stressHighScore * 2 + moodLowScore, 0, 10)
      })
    }
  }

  // One strong block: require numeric energy/stress means
  if (energyAvg != null && stressAvg != null && energyAvg >= 3.6 && stressAvg <= 3.2) {
    candidates.push({
      id: 'one_block',
      title: 'One meaningful 20-minute block',
      why: 'When energy is reasonably steady, a single focused block can create momentum without overloading the day.',
      effort: 'moderate',
      impact: 'high',
      preset: null,
      score: 2
    })
  }

  if (!candidates.length) {
    candidates.push({
      id: 'outdoor_reset',
      title: 'Get light + air daily',
      why: 'You have a few check-ins — keep it simple this week. Light + air is a low-effort reset that tends to help stress and mood.',
      effort: 'low',
      impact: 'moderate',
      preset: {
        title: 'Get light + air daily',
        leverType: 'metric',
        leverRef: 'outdoor_minutes',
        targetMetric: 'stress',
        effortEstimate: 'low',
        expectedImpact: 'moderate',
        recommendedDays: 7,
        baselineDays: 30
      },
      score: 1
    })
  }


  // Sort by score desc
  candidates.sort((a, b) => b.score - a.score)

  // pick max 2: A low effort, B higher impact (if available)
  // Step 1: choose best low-effort
  const lowEffort = candidates.find(c => c.effort === 'low') || candidates[0]
  const rest = candidates.filter(c => c.id !== lowEffort?.id)

  // Step 2: choose “highest impact” among remaining
  let highImpact = rest.find(c => c.impact === 'high') || rest[0] || null

  // if only one candidate exists
  const options: NextFocusOption[] = []
  if (lowEffort) options.push(lowEffort)
  if (highImpact) options.push(highImpact)

  return {
    period: { start: startISO, end: endISO, checkins },
    options
  }
})
