// composables/useOnboarding.ts
export function useOnboarding() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const loading = ref(true)
  const showOnboarding = ref(false)
  const errorMessage = ref('')
  const hasProfile = ref(false)

  const loadOnboardingStatus = async () => {
    loading.value = true
    showOnboarding.value = false
    errorMessage.value = ''
    hasProfile.value = false
    try {
      if (!user.value) return
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.value.sub)
        .maybeSingle()

      if (error) throw error
      hasProfile.value = data != null
      // A missing profile can still see/dismiss the guide for this session.
      showOnboarding.value = data?.onboarding_completed !== true
    } catch {
      errorMessage.value = 'Could not load your welcome preference. You can open the guide in Settings.'
    } finally {
      loading.value = false
    }
  }

  const completeOnboarding = async () => {
    if (!user.value) return

    errorMessage.value = ''
    try {
      if (!hasProfile.value) return
      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.value.sub)
        .select('id')
        .maybeSingle()
      if (error || !data) throw error || new Error('Profile unavailable')
    } catch {
      errorMessage.value = 'Could not save your welcome preference. You may see this guide again.'
    } finally {
      showOnboarding.value = false
    }
  }

  return {
    loading,
    errorMessage,
    showOnboarding,
    loadOnboardingStatus,
    completeOnboarding
  }
}
