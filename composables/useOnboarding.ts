// composables/useOnboarding.ts
export function useOnboarding() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const loading = ref(true)
  const showOnboarding = ref(false)

  const loadOnboardingStatus = async () => {
    if (!user.value) return

    loading.value = true

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.value.sub)
      .maybeSingle()

    if (!error) {
      showOnboarding.value = !data.onboarding_completed
    }

    loading.value = false
  }

  const completeOnboarding = async () => {
    if (!user.value) return

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.value.sub)

    showOnboarding.value = false
  }

  return {
    loading,
    showOnboarding,
    loadOnboardingStatus,
    completeOnboarding
  }
}
