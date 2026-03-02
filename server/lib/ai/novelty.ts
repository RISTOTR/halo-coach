export function noveltyPenalty(daysSinceLastUse: number | null) {
  if (daysSinceLastUse == null) return 0
  if (daysSinceLastUse <= 14) return 0.35
  if (daysSinceLastUse <= 30) return 0.20
  if (daysSinceLastUse <= 60) return 0.10
  return 0
}