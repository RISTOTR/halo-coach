// Focused local checks using Node assertions and the already-installed Vue/TS tools.
// No hosted database, credentials, model calls or additional test framework needed.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import * as Vue from 'vue'
import { renderToString } from '@vue/server-renderer'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as marked from 'marked'

const require = createRequire(import.meta.url)
const root = new URL('../', import.meta.url)
const source = path => readFileSync(new URL(path, root), 'utf8')

function evaluate(text, globals = {}, imports = {}) {
  const code = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const module = { exports: {} }
  const bindings = { ...Vue, ...globals }
  new Function('require', 'module', 'exports', ...Object.keys(bindings), code)(
    name => imports[name] ?? (name === 'marked' ? marked : require(name)), module, module.exports, ...Object.values(bindings)
  )
  return module.exports
}

function component(path) {
  const { descriptor } = parse(source(path), { filename: fileURLToPath(new URL(path, root)) })
  return evaluate(compileScript(descriptor, { id: path, inlineTemplate: true }).content).default
}

const { renderSafeMarkdown } = evaluate(source('utils/safeMarkdown.ts'))
const markdown = content => renderToString(Vue.createSSRApp({ render: () => Vue.h('div', renderSafeMarkdown(content)) }))

const hostile = [
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  '<svg onload=alert(1)><a href="javascript:alert(1)">x</a></svg>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '[click](javascript:alert%281%29)',
  '[click](JaVaScRiPt:alert%281%29)',
  '[click](data:text/html;base64,PHNjcmlwdD4=)',
  '[click](https://example.test)',
  '![image](https://example.test/tracker.png)',
  '&lt;img src=x onerror=alert(1)&gt;',
  '**<img src=x onerror=alert(1)>**',
  '```html\n<script>alert(1)</script>\n```'
]
for (const payload of hostile) {
  const html = await markdown(payload)
  assert.doesNotMatch(html, /<(?:script|img|svg|iframe|a)\b/i)
  assert.doesNotMatch(html, /<[^>]+\s(?:on\w+|href|src|srcdoc)\s*=/i)
}
const formatted = await markdown('A **small win** and *rest*.\n\n- One\n- Two\n\n> Reflect\n\n`code`')
for (const tag of ['strong', 'em', 'ul', 'li', 'blockquote', 'code']) assert.match(formatted, new RegExp(`<${tag}(?:\\s[^>]*)?>`))
assert.match(await markdown('<script>alert(1)</script>'), /&lt;script&gt;/)
console.log('PASS: hostile Markdown produces only inert text/allowlisted formatting; useful formatting survives.')

const Snapshot = component('components/dashboard/DailySnapshotCard.vue')
for (const props of [{}, { sleepHours: null, moodScore: null, energyScore: null, stressLevel: null }]) {
  const html = await renderToString(Vue.createSSRApp(Snapshot, props))
  assert.equal((html.match(/Not logged/g) || []).length, 4)
  assert.doesNotMatch(html, /Quality|7\.2|82%|Neutral|width:60%/)
}
const populated = await renderToString(Vue.createSSRApp(Snapshot, {
  sleepHours: 7.5, moodScore: 4, energyScore: 5, stressLevel: 2, habitsCompleted: 0, habitsTotal: 3
}))
assert.match(populated, /7\.5 h/)
assert.match(populated, /Good/)
assert.match(populated, /width:100%/)
assert.match(populated, /0 \/ 3 completed/)
const partial = await renderToString(Vue.createSSRApp(Snapshot, {
  sleepHours: 0, moodScore: null, energyScore: 1, stressLevel: null
}))
assert.match(partial, /0\.0 h/)
assert.match(partial, /width:20%/)
assert.equal((partial.match(/Not logged/g) || []).length, 2)
console.log('PASS: snapshot handles omitted/null measurements without fabricated scores; populated and zero habit values survive.')

function query(result) {
  const chain = new Proxy({}, { get: (_, key) => {
    if (key === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject)
    return () => chain
  } })
  return chain
}

let profileResult = { data: null, error: null }
const user = Vue.ref({ sub: 'owner-a' })
const { useOnboarding } = evaluate(source('composables/useOnboarding.ts'), {
  useSupabaseUser: () => user,
  useSupabaseClient: () => ({ from: () => query(profileResult) })
})
const onboarding = useOnboarding()
await onboarding.loadOnboardingStatus()
assert.equal(onboarding.loading.value, false)
assert.equal(onboarding.showOnboarding.value, true)
await onboarding.completeOnboarding()
assert.equal(onboarding.showOnboarding.value, false)
profileResult = { data: null, error: { message: 'private database detail' } }
await onboarding.loadOnboardingStatus()
assert.equal(onboarding.loading.value, false)
assert.doesNotMatch(onboarding.errorMessage.value, /private database detail/)
assert.ok(onboarding.errorMessage.value)
user.value = null
await onboarding.loadOnboardingStatus()
assert.equal(onboarding.loading.value, false)
assert.equal(onboarding.showOnboarding.value, false)
console.log('PASS: missing/failed profile and signed-out onboarding are controlled; raw errors are not exposed.')

let habitResult = { data: null, error: null }
let writeError = null
let writes = 0
const { default: toggle } = evaluate(source('server/api/habits/toggle.ts'), {}, {
  '#supabase/server': {
    serverSupabaseUser: async () => ({ sub: 'owner-a' }),
    serverSupabaseClient: async () => ({ from: table => {
      if (table === 'habits') return query(habitResult)
      writes++
      return query({ error: writeError })
    } })
  },
  h3: {
    defineEventHandler: fn => fn,
    readBody: async () => ({ habit_id: '00000000-0000-4000-8000-000000000001', date: '2026-09-24', completed: true }),
    createError: fields => Object.assign(new Error(fields.statusMessage), fields)
  }
})
await assert.rejects(toggle({}), error => error.statusCode === 404)
assert.equal(writes, 0)
habitResult = { data: null, error: { message: 'private database detail' } }
await assert.rejects(toggle({}), error => error.statusCode === 500 && !error.message.includes('private'))
habitResult = { data: { user_id: 'other-owner', archived: false }, error: null }
await assert.rejects(toggle({}), error => error.statusCode === 404)
habitResult.data = { user_id: 'owner-a', archived: true }
await assert.rejects(toggle({}), error => error.statusCode === 400)
habitResult.data.archived = false
assert.deepEqual(await toggle({}), { ok: true })
writeError = { message: 'private database detail' }
await assert.rejects(toggle({}), error => error.statusCode === 500 && !error.message.includes('private'))
console.log('PASS: missing/hidden/foreign/archived habits and DB failures produce controlled responses; owned habit can update.')

const states = new Map()
let fetchImpl
const { useExperimentFlow } = evaluate(source('composables/useExperimentFlow.ts'), {
  useState: (key, init) => {
    if (!states.has(key)) states.set(key, Vue.ref(init()))
    return states.get(key)
  },
  $fetch: (...args) => fetchImpl(...args)
})
const flow = useExperimentFlow()
let finish
fetchImpl = () => new Promise(resolve => { finish = resolve })
const activeRequest = flow.loadActive()
flow.ctx.value.subjectiveNote = 'Previous owner note'
flow.close()
finish({ experiment: { id: 'previous-owner-experiment' } })
await activeRequest
assert.equal(flow.ctx.value.activeExperiment, null)
assert.equal(flow.ctx.value.subjectiveNote, '')
assert.equal(flow.state.value, 'idle')
const reviewRequest = flow.openReviewById('previous-owner-experiment')
flow.close()
finish({ id: 'previous-owner-experiment' })
await reviewRequest
assert.equal(flow.ctx.value.reviewDto, null)
assert.equal(flow.state.value, 'idle')
console.log('PASS: owner reset clears shared experiment data and prevents late active/review responses from restoring it.')

// Exercise the actual app owner watcher without a DOM or hosted authentication.
const appUser = Vue.ref(null)
const scope = Vue.effectScope()
let resets = 0
let cacheClears = 0
const appScript = parse(source('app.vue')).descriptor.scriptSetup.content
const app = scope.run(() => evaluate(appScript + '\nexport { ownerId, pageKey }', {
  useSupabaseUser: () => appUser,
  useExperimentFlow: () => ({ close: () => resets++ }),
  useOnboardingModal: () => ({ close: () => {} }),
  clearNuxtData: () => cacheClears++
}))
assert.equal(app.ownerId.value, 'signed-out')
appUser.value = { sub: 'owner-a' }
const aKey = app.pageKey({ fullPath: '/' })
appUser.value = { sub: 'owner-b' }
assert.notEqual(app.pageKey({ fullPath: '/' }), aKey)
appUser.value = null
assert.equal(app.ownerId.value, 'signed-out')
assert.equal(resets, 3)
assert.equal(cacheClears, 3)
scope.stop()
console.log('PASS: sign-in, account switch and sign-out change view keys and reset account caches/state.')
