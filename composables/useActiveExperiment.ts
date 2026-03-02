export function useActiveExperiment() {
  return useFetch('/api/ai/experiments/active', {
    key: 'active-experiment',
    server: true
  })
}
