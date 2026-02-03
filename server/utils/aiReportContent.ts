// server/utils/aiReportContent.ts
export function stringifyReport(obj: unknown) {
  return JSON.stringify(obj)
}

export function parseReport<T>(content: string | null): T | null {
  if (!content) return null
  try {
    return JSON.parse(content) as T
  } catch {
    return null
  }
}
