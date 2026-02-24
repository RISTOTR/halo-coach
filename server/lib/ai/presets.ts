import type { Preset } from './buildCandidates'

export const PRESETS: Preset[] = [
  {
    title: 'Sleep consistency (same bedtime)',
    leverType: 'habit',
    leverRef: 'sleep_consistency',
    targetMetric: 'sleep_hours',
    effortEstimate: 'low',
    expectedImpact: 'moderate',
    recommendedDays: 7,
    baselineDays: 30
  },
  {
    title: 'Daily decompression (10 min)',
    leverType: 'habit',
    leverRef: 'decompression_10m',
    targetMetric: 'stress',
    effortEstimate: 'moderate',
    expectedImpact: 'high',
    recommendedDays: 7,
    baselineDays: 30
  },
  {
    title: 'Outdoor walk (15–20 min)',
    leverType: 'habit',
    leverRef: 'outdoor_walk_20m',
    targetMetric: 'outdoor_minutes',
    effortEstimate: 'low',
    expectedImpact: 'moderate',
    recommendedDays: 7,
    baselineDays: 30
  }
]