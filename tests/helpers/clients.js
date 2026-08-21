import { createClient } from '@supabase/supabase-js'
import { loadTestEnv } from './env.js'

// ─────────────────────────────────────────────────────────────────────────────
// 역할별 supabase 클라이언트 팩토리
//
// - anon():        로그인 안 한 방문자
// - asRole(role):  test 계정으로 로그인한 세션 (admin/professor/researcher/alumni/outsider)
// - serviceRole(): RLS 우회 — ★ 시드/정리 전용. 권한 검증에 절대 쓰지 않는다.
//                  (검증에 쓰면 정책 구멍이 있어도 전부 통과해 보인다)
// ─────────────────────────────────────────────────────────────────────────────

export const TEST_PASSWORD = 'test-philab-123'
export const TEST_EMAILS = {
  admin: 'test-admin@philab.test',
  professor: 'test-professor@philab.test',
  researcher: 'test-researcher@philab.test',
  alumni: 'test-alumni@philab.test',
  outsider: 'test-outsider@philab.test',
}

let envCache = null
async function env() {
  if (!envCache) envCache = await loadTestEnv()
  return envCache
}

export async function anon() {
  const { url, anonKey } = await env()
  return createClient(url, anonKey, { auth: { persistSession: false } })
}

// 로그인 세션 캐시: 같은 역할을 여러 테스트가 쓸 때 로그인 반복 방지
const sessionCache = new Map()

export async function asRole(role) {
  const email = TEST_EMAILS[role]
  if (!email) throw new Error(`알 수 없는 역할: ${role} (가능: ${Object.keys(TEST_EMAILS).join(', ')})`)
  if (sessionCache.has(role)) return sessionCache.get(role)

  const { url, anonKey } = await env()
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (error) {
    throw new Error(
      `${email} 로그인 실패: ${error.message}\n` +
        '  → node scripts/seed-test-accounts.mjs 를 먼저 실행했는지 확인하세요.',
    )
  }
  sessionCache.set(role, client)
  return client
}

export async function serviceRole() {
  const { url, serviceRoleKey } = await env()
  if (!serviceRoleKey) throw new Error('.env.local 에 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.')
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
