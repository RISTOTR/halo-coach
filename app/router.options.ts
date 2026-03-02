// apps/web/app/router.options.ts
import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // If user used back/forward, keep the saved position
    if (savedPosition) {
      return savedPosition
    }

    // For normal navigations, always go to top
    return { left: 0, top: 0 }
  }
}