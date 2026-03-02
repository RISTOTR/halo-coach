function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day) // llevar al lunes
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
