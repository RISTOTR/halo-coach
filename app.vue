<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout :key="ownerId">
      <NuxtPage :page-key="pageKey" />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const ownerId = computed(() => user.value?.sub || (user.value as { id?: string } | null)?.id || 'signed-out')
const pageKey = (route: { fullPath: string }) => `${ownerId.value}:${route.fullPath}`
const experimentFlow = useExperimentFlow()
const onboardingModal = useOnboardingModal()

// Remount account-specific views and discard cached reads when the owner changes.
watch(ownerId, () => {
  experimentFlow.close()
  onboardingModal.close()
  clearNuxtData()
}, { flush: 'sync' })
</script>
