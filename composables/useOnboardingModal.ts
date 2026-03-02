export function useOnboardingModal() {
  const isOpen = useState<boolean>('halo:onboarding-manual-open', () => false)

  const open = () => (isOpen.value = true)
  const close = () => (isOpen.value = false)

  return { isOpen, open, close }
}

