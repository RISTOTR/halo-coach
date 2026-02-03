// server/utils/experimentReview.ts
type DailyMetricRow = {
  date: string
  sleep_hours: number | null
  mood: number | null
  energy: number | null
  stress: number | null
  steps: number | null
  water_liters: number | null
  outdoor_minutes: number | null
}

const EPS = 1e-9

function mean(values: (number | null | undefined)[]) {
  const v = values.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (v.length === 0) return null
  return v.reduce((a, b) => a + b, 0) / v.length
}

function stddev(values: (number | null | undefined)[]) {
  const v = values.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (v.length < 2) return null
  const m = v.reduce((a, b) => a + b, 0) / v.length
  const variance = v.reduce((acc, x) => acc + (x - m) ** 2, 0) / (v.length - 1)
  return Math.sqrt(variance)
}

function pct(delta: number | null, base: number | null) {
  if (delta == null || base == null) return null
  const denom = Math.max(Math.abs(base), EPS)
  return (delta / denom) * 100
}

function metricStats(before: DailyMetricRow[], during: DailyMetricRow[], key: keyof DailyMetricRow) {
  const beforeVals = before.map(r => r[key] as number | null)
  const duringVals = during.map(r => r[key] as number | null)

  const meanBefore = mean(beforeVals)
  const meanDuring = mean(duringVals)
  const deltaAbs = (meanBefore == null || meanDuring == null) ? null : (meanDuring - meanBefore)
  const deltaPct = pct(deltaAbs, meanBefore)

  const volBefore = stddev(beforeVals)
  const volDuring = stddev(duringVals)
  const volDeltaAbs = (volBefore == null || volDuring == null) ? null : (volDuring - volBefore)
  const volDeltaPct = pct(volDeltaAbs, volBefore)

  return { meanBefore, meanDuring, deltaAbs, deltaPct, volBefore, volDuring, volDeltaAbs, volDeltaPct }
}

function confidenceFromSample(baselineRows: number, experimentRows: number): 'low'|'moderate'|'strong' {
  // simple, honest thresholds (tune later)
  if (baselineRows >= 21 && experimentRows >= 7) return 'strong'
  if (baselineRows >= 14 && experimentRows >= 5) return 'moderate'
  return 'low'
}

export async function computeExperimentReview(opts: {
  supabase: any
  userId: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  baselineDays?: number
}) {
  const baselineDays = opts.baselineDays ?? 30

  const baselineFrom = new Date(`${opts.startDate}T00:00:00Z`)

  baselineFrom.setDate(baselineFrom.getDate() - baselineDays)
  const baselineTo = new Date(opts.startDate)
  baselineTo.setDate(baselineTo.getDate() - 1)

  const baselineFromStr = baselineFrom.toISOString().slice(0, 10)
  const baselineToStr = baselineTo.toISOString().slice(0, 10)

  // Fetch baseline
  const { data: baseline, error: bErr } = await opts.supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,energy,stress,steps,water_liters,outdoor_minutes')
    .eq('user_id', opts.userId)
    .gte('date', baselineFromStr)
    .lte('date', baselineToStr)
    .order('date', { ascending: true })

  if (bErr) throw bErr

  // Fetch experiment window
  const { data: during, error: dErr } = await opts.supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,energy,stress,steps,water_liters,outdoor_minutes')
    .eq('user_id', opts.userId)
    .gte('date', opts.startDate)
    .lte('date', opts.endDate)
    .order('date', { ascending: true })

  if (dErr) throw dErr

  const baselineRows = (baseline ?? []) as DailyMetricRow[]
  const duringRows = (during ?? []) as DailyMetricRow[]

  // Sufficiency check (server-side)
  const minBaseline = 10
  const minExperiment = 4
  if (baselineRows.length < minBaseline || duringRows.length < minExperiment) {
    return {
      ok: false as const,
      reason: 'insufficient_data',
      baselineRows: baselineRows.length,
      experimentRows: duringRows.length,
      required: { minBaseline, minExperiment },
      windows: { baselineFrom: baselineFromStr, baselineTo: baselineToStr, start: opts.startDate, end: opts.endDate }
    }
  }

  const confidence = confidenceFromSample(baselineRows.length, duringRows.length)

  const metrics = {
    sleep_hours: metricStats(baselineRows, duringRows, 'sleep_hours'),
    mood: metricStats(baselineRows, duringRows, 'mood'),
    energy: metricStats(baselineRows, duringRows, 'energy'),
    stress: metricStats(baselineRows, duringRows, 'stress'),
    steps: metricStats(baselineRows, duringRows, 'steps'),
    water_liters: metricStats(baselineRows, duringRows, 'water_liters'),
    outdoor_minutes: metricStats(baselineRows, duringRows, 'outdoor_minutes'),
  }

  return {
    ok: true as const,
    sample: {
      baselineDays,
      baselineRows: baselineRows.length,
      experimentRows: duringRows.length,
    },
    windows: {
      baselineFrom: baselineFromStr,
      baselineTo: baselineToStr,
      start: opts.startDate,
      end: opts.endDate,
    },
    confidence,
    metrics,
  }
}
