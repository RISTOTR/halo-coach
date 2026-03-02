function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

export function toWeekKey(yyyy_mm_dd: string) {
  const dt = new Date(`${yyyy_mm_dd}T00:00:00Z`)
  const { year, week } = isoWeek(dt)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function weekWindowEnd(yyyy_mm_dd: string) {
  // We’ll use the provided date as window_end; window_start = end - 13 days (prev7 + last7)
  const end = new Date(`${yyyy_mm_dd}T00:00:00Z`)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 13)
  return {
    windowStart: start.toISOString().slice(0, 10),
    windowEnd: end.toISOString().slice(0, 10)
  }
}