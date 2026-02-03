<template>
  <div class="h-full flex flex-col rounded-2xl border border-white/10 bg-slate-950/60
           px-5 py-5 lg:px-6 lg:py-6
           shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
    <!-- Header (fixed) -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-slate-100">Today’s insight</h2>
        <p class="mt-1 text-xs text-white/55">A gentle reflection + one small next step.</p>
      </div>

      <div class="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-white/60">
        {{ statusLabel }}
      </div>
    </div>

    <!-- Body: scrollable area (but action + stats stay visible by structure) -->
    <div class="mt-4 flex-1 space-y-3">
      <!-- Loading -->
      <div v-if="loading" class="space-y-2">
        <div class="h-3 w-5/6 rounded bg-white/10" />
        <div class="h-3 w-11/12 rounded bg-white/10" />
        <div class="h-3 w-4/6 rounded bg-white/10" />
        <div class="h-8 w-full rounded-lg bg-white/5" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
        <div class="text-xs font-medium text-red-200">Couldn’t load your reflection</div>
        <div class="mt-1 text-xs text-red-200/80">{{ error }}</div>
      </div>

      <!-- Empty (no AI yet / no check-in) -->
      <div v-else-if="!hasAI && !hasMetrics" class="rounded-xl border border-white/10 bg-black/10 p-3">
        <div class="text-sm text-slate-200">No check-in yet today.</div>
        <p class="mt-1 text-xs text-white/55">
          Complete your daily check-in and you’ll get a reflection here.
        </p>

        <div class="mt-3">
          <NuxtLink to="/check-in"
            class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20">
            Complete check-in →
          </NuxtLink>
        </div>
      </div>

      <!-- Metrics present but no AI summary yet -->
      <div v-else-if="!hasAI && hasMetrics" class="space-y-3">
        <div class="rounded-xl border border-white/10 bg-black/10 p-3">
          <div class="text-sm text-slate-200">Reflection not generated yet.</div>
          <p class="mt-1 text-xs text-white/55">
            Here’s a quick nudge based on today’s snapshot:
          </p>

          <p class="mt-3 text-sm leading-relaxed text-slate-200">{{ fallbackNudge }}</p>

          <div class="mt-3">
            <NuxtLink to="/check-in"
              class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10">
              Open check-in →
            </NuxtLink>
          </div>
        </div>

        <!-- Always visible action -->
        <div class="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Next tiny action
          </div>
          <p class="mt-2 text-sm text-slate-200">{{ nextTinyAction }}</p>
        </div>

        <!-- Stats -->
        <div v-if="hasMetrics" class="grid grid-cols-3 gap-2">
          <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
            <div class="text-[10px] text-white/50">Mood</div>
            <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.mood }}</div>
          </div>
          <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
            <div class="text-[10px] text-white/50">Energy</div>
            <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.energy }}</div>
          </div>
          <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
            <div class="text-[10px] text-white/50">Stress</div>
            <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.stress }}</div>
          </div>
        </div>

        <div class="text-[11px] text-white/45">{{ footerText }}</div>
      </div>

      <!-- AI summary (PREVIEW) -->
      <div v-else class="space-y-3">
        <div class="rounded-xl border border-white/10 bg-black/10 p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Reflection
            </div>

            <button v-if="shouldShowReadMore" type="button"
              class="text-[11px] font-medium text-emerald-200/90 hover:text-emerald-200 hover:underline"
              @click="openModal">
              Read full →
            </button>
          </div>

          <!-- Preview with fade -->
          <div class="relative mt-2">
            <div  ref="previewEl" class="space-y-2 text-sm leading-relaxed text-slate-200"
              :class="isCollapsed ? 'max-h-40 overflow-hidden' : 'max-h-64 overflow-auto pr-1'">
              <p v-for="(p, idx) in previewParagraphs" :key="idx">
                {{ p }}
              </p>
            </div>

            <div
  v-if="isCollapsed && (hasOverflow || paragraphs.length > previewParagraphs.length)"
  class="pointer-events-none absolute bottom-0 left-0 h-10 w-full bg-gradient-to-t from-slate-950/95 to-transparent"
/>

          </div>



          <div v-if="shouldShowReadMore" class="mt-3 flex items-center justify-between">
            <span class="text-[11px] text-white/45">Long reflection</span>
            <button type="button"
              class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
              @click="openModal">
              Read more
            </button>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/10 p-3">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Quick reset</div>
            <div class="mt-1 text-xs text-white/55">60s slow exhale breathing.</div>
          </div>
          <button
            class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
            Start
          </button>
        </div>


        <!-- Always visible action -->
        <div class="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Next tiny action
          </div>
          <p class="mt-2 text-sm text-slate-200">{{ nextTinyAction }}</p>
        </div>

        <!-- Stats -->
        <div v-if="hasMetrics" class="grid grid-cols-3 gap-2">
          <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
            <div class="text-[10px] text-white/50">Mood</div>
            <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.mood }}</div>
          </div>
          <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
            <div class="text-[10px] text-white/50">Energy</div>
            <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.energy }}</div>
          </div>
          <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
            <div class="text-[10px] text-white/50">Stress</div>
            <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.stress }}</div>
          </div>
        </div>

        <div class="text-[11px] text-white/45">{{ footerText }}</div>
      </div>
    </div>

    <!-- MODAL -->
    <Teleport to="body">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        @keydown.esc.prevent="closeModal">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeModal" />

        <div
          class="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/90 shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
          role="dialog" aria-modal="true" aria-label="Full reflection">
          <div class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                Today’s reflection
              </div>
              <div class="mt-1 text-base font-semibold text-slate-100">Full insight</div>
            </div>

            <button type="button"
              class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
              @click="closeModal">
              Close
            </button>
          </div>

          <div class="max-h-[70vh] overflow-auto px-5 py-4">
            <div class="space-y-3 text-sm leading-relaxed text-slate-200">
              <p v-for="(p, idx) in paragraphs" :key="idx">
                {{ p }}
              </p>
            </div>

            <div v-if="measuredLine"
              class="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span
                class="mt-0.5 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-medium text-white/60">
                Data-backed
              </span>
              <p class="text-xs leading-relaxed text-white/75">
                {{ measuredLine }}
              </p>
            </div>



            <div class="mt-5 rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Next tiny action
              </div>
              <p class="mt-2 text-sm text-slate-200">{{ nextTinyAction }}</p>
            </div>

            <div v-if="hasMetrics" class="mt-4 grid grid-cols-3 gap-2">
              <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
                <div class="text-[10px] text-white/50">Mood</div>
                <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.mood }}</div>
              </div>
              <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
                <div class="text-[10px] text-white/50">Energy</div>
                <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.energy }}</div>
              </div>
              <div class="rounded-xl border border-white/10 bg-black/10 p-2.5">
                <div class="text-[10px] text-white/50">Stress</div>
                <div class="mt-1 text-sm font-semibold text-white/90">{{ metrics!.stress }}</div>
              </div>
            </div>

            <div class="mt-4 text-[11px] text-white/45">{{ footerText }}</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

type Metrics = {
  mood: number
  energy: number
  stress: number
  sleep_hours: number
  sleep_quality?: number | null
}

const props = defineProps<{
  collapsed?: boolean
  maxParagraphs?: number
  loading?: boolean
  error?: string
  aiSummary?: string
  metrics?: Metrics | null
  dateLabel?: string
}>()

const maxParagraphs = computed(() => props.maxParagraphs ?? 2)
const isCollapsed = computed(() => props.collapsed ?? false)

const hasAI = computed(() => Boolean((props.aiSummary || '').trim()))
const hasMetrics = computed(() => Boolean(props.metrics))

const statusLabel = computed(() => {
  if (props.loading) return 'Loading'
  if (props.error) return 'Error'
  if (!hasMetrics.value) return 'No check-in'
  if (!hasAI.value) return 'No AI yet'
  return 'Ready'
})

const rawLines = computed(() => {
  const raw = (props.aiSummary || '').trim()
  if (!raw) return []
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
})

const measuredLine = computed(() => {
  // We append:
  // "—" then the measured sentence
  const lines = rawLines.value
  const idx = lines.findIndex((l) => l === '—' || l === '---')
  if (idx === -1) return null
  const next = lines[idx + 1]
  if (!next) return null
  return next
})

const paragraphs = computed(() => {
  const lines = rawLines.value
  if (!lines.length) return []

  const idx = lines.findIndex((l) => l === '—' || l === '---')
  if (idx === -1) return lines

  // everything before separator is the reflection body
  return lines.slice(0, idx)
})

const previewParagraphs = computed(() => {
  const limit = isCollapsed.value ? (props.maxParagraphs ?? 2) : (props.maxParagraphs ?? 999)
  return paragraphs.value.slice(0, limit)
})

const shouldShowReadMore = computed(() => {
  if (!isCollapsed.value) return false
  const overByParagraphs = paragraphs.value.length > (props.maxParagraphs ?? 2)
  return overByParagraphs || hasOverflow.value
})


function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

const nextTinyAction = computed(() => {
  const m = props.metrics
  if (!m) return 'Take 2 minutes to breathe and just notice how you feel — no fixing needed.'

  const mood = clamp(m.mood ?? 0, 0, 10)
  const energy = clamp(m.energy ?? 0, 0, 10)
  const stress = clamp(m.stress ?? 0, 0, 10)
  const sleep = Number(m.sleep_hours ?? 0)

  if (stress >= 7) return 'Do a 90-second “downshift”: slow exhale breathing (inhale 4s, exhale 6s).'
  if (sleep > 0 && sleep < 6) return 'Protect tonight: set a “screens down” moment 15 minutes earlier.'
  if (mood <= 3 && energy <= 4) return 'Keep it gentle: step outside for 5 minutes, no phone, just air + light.'
  if (energy >= 7 && mood >= 6 && stress <= 4) return 'Ride the wave: do one meaningful 20-minute block (walk, workout, or focused work).'
  return 'Pick one habit you can “win” today in under 5 minutes — tiny counts.'
})

const fallbackNudge = computed(() => {
  const m = props.metrics
  if (!m) return 'Complete your check-in to get a reflection.'

  const mood = clamp(m.mood ?? 0, 0, 10)
  const energy = clamp(m.energy ?? 0, 0, 10)
  const stress = clamp(m.stress ?? 0, 0, 10)
  const sleep = Number(m.sleep_hours ?? 0)

  if (stress >= 7 && sleep > 0 && sleep < 6) {
    return 'Today looks a bit loaded: higher stress and short sleep. Keep expectations soft — focus on the basics (food, water, movement) and one small win.'
  }
  if (mood <= 3) {
    return 'Low mood days are real. The goal isn’t intensity — it’s care. A tiny routine (walk + water + 2 minutes of breathing) is progress.'
  }
  if (energy >= 7 && mood >= 6) {
    return 'You’ve got good momentum today. Use it gently: one focused task + one body-supporting habit can make the day feel “complete.”'
  }
  if (sleep >= 7 && stress <= 4) {
    return 'Solid foundation today. Keep it simple: maintain what’s working and avoid over-optimizing.'
  }
  return 'You’re showing up. Keep it small and consistent — consistency beats intensity.'
})

const footerText = computed(() => {
  const label = props.dateLabel || 'Today'
  if (!hasMetrics.value) return `${label}: waiting for check-in.`
  if (!hasAI.value) return `${label}: AI reflection not available yet.`
  return `${label}: reflection based on your check-in.`
})

/* Modal */
const isOpen = ref(false)

function openModal() {
  isOpen.value = true
  nextTick(() => { })
}

function closeModal() {
  isOpen.value = false
}

const previewEl = ref<HTMLElement | null>(null)
const hasOverflow = ref(false)

function measureOverflow() {
  const el = previewEl.value
  if (!el) {
    hasOverflow.value = false
    return
  }
  // small tolerance to avoid off-by-1
  hasOverflow.value = el.scrollHeight > el.clientHeight + 2
}

watch(
  () => [props.aiSummary, isCollapsed.value, props.maxParagraphs],
  async () => {
    await nextTick()
    measureOverflow()
  },
  { immediate: true }
)


watch(
  () => props.aiSummary,
  (val) => {
    if (!val?.trim()) isOpen.value = false
  }
)
</script>
