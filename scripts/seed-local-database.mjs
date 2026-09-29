// Synthetic fixtures through normal Auth + PostgREST RLS. No service-role key.
// Only an explicitly supplied loopback URL is accepted. Never reads .env.
const rawUrl = process.env.HALO_LOCAL_URL
const key = process.env.HALO_LOCAL_ANON_KEY
if (!rawUrl || !key) throw new Error('Set HALO_LOCAL_URL and HALO_LOCAL_ANON_KEY from the isolated local stack.')
const url = new URL(rawUrl)
if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.port !== '54321' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('Refusing target: only http://127.0.0.1:54321 (or localhost/::1) is allowed.')
}
const origin = url.origin
async function request(path, body, token = key, method = 'POST', prefer) {
  const response = await fetch(origin + path, {
    method, redirect: 'error', headers: {
      apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  if (!response.ok) throw new Error(`Local fixture request failed: ${method} ${path.split('?')[0]} HTTP ${response.status}. No response body or token logged.`)
  return response.status === 204 ? null : response.json()
}
const day = offset => new Date(Date.UTC(2026, 8, 28 - offset)).toISOString().slice(0, 10)
for (const [i, label] of ['a', 'b'].entries()) {
  const credentials = { email: `halo-demo-${label}@example.test`, password: 'LocalSyntheticOnly-2026!' }
  let auth
  try { auth = await request('/auth/v1/token?grant_type=password', credentials) }
  catch { auth = await request('/auth/v1/signup', credentials) }
  if (!auth?.access_token || !auth?.user?.id) throw new Error('Local Auth must allow synthetic signup without email confirmation; see supabase/config.toml.')
  const token = auth.access_token
  const user_id = auth.user.id
  const upsert = (table, rows, conflict) => request(`/rest/v1/${table}?on_conflict=${conflict}`, rows, token, 'POST', 'resolution=merge-duplicates,return=representation')
  const habits = [0,1].map(n => ({
    id: `${i + 1}0000000-0000-4000-8000-00000000000${n + 1}`, user_id,
    name: n ? 'Quiet reading (synthetic)' : 'Short walk (synthetic)',
    category: n ? 'mind' : 'body', frequency: 'daily', target_per_week: 5, archived: false
  }))
  await upsert('profiles', { id: user_id, onboarding_completed: true }, 'id')
  await upsert('habits', habits, 'id')
  await upsert('daily_metrics', Array.from({ length: 35 }, (_, n) => ({
    user_id, date: day(n), sleep_hours: n % 9 === 0 ? null : 6.5 + (n % 4) * 0.5,
    mood: n % 8 === 0 ? null : 2 + ((n + i) % 4), energy: 2 + ((n + 2 * i) % 4),
    stress: 1 + ((n + i) % 5), steps: n % 6 === 0 ? 0 : 15 + (n % 4) * 10,
    water_liters: n % 7 === 0 ? null : 1.5 + (n % 3) * 0.25,
    outdoor_minutes: n % 5 === 0 ? 0 : 10 + (n % 4) * 5,
    habits_summary: 'Synthetic development fixture', habits_status: 'Synthetic development fixture'
  })), 'user_id,date')
  await upsert('habit_entries', Array.from({ length: 35 }, (_, n) => habits.map((habit, h) => ({
    user_id, habit_id: habit.id, date: day(n), completed: (n + h + i) % 3 !== 0
  }))).flat(), 'user_id,habit_id,date')
  await upsert('experiments', {
    id: `${i + 1}0000000-0000-4000-8000-000000000010`, user_id,
    title: 'Try an evening walk (synthetic)', lever_type: 'custom', lever_ref: 'evening_walk',
    target_metric: 'energy', start_date: day(6), status: 'active', end_date: null,
    baseline_days: 14, recommended_days: 7, hypothesis: 'Practice a small routine; no outcome claim.'
  }, 'id')
  console.log(`Seeded synthetic account ${label}: 35 check-ins, 2 habits, 70 entries, 1 active experiment.`)
}
console.log('Fixed fixture date: 2026-09-28. Reports should use a window covering that date. No AI reports/effects were fabricated.')
