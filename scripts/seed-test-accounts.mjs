// 테스트 전용 계정 멱등 시드 (docs/test-plan.md 3.3-3)
// - 여러 번 실행해도 같은 상태가 된다.
// - 이메일은 전부 test- 접두사 + @philab.test 도메인 — fixtures 의 추적/정리 기준.
// - 운영 가드: tests/helpers/env.js 를 통과한 로컬 URL 로만 실행된다.
import { createClient } from '@supabase/supabase-js'
import { loadTestEnv } from '../tests/helpers/env.js'

const { url, serviceRoleKey } = await loadTestEnv()
if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다.')
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

export const TEST_PASSWORD = 'test-philab-123'
export const TEST_ACCOUNTS = [
  { email: 'test-admin@philab.test',      role: 'admin',      name: '[TESTACC] admin' },
  { email: 'test-professor@philab.test',  role: 'professor',  name: '[TESTACC] professor' },
  { email: 'test-researcher@philab.test', role: 'researcher', name: '[TESTACC] researcher' },
  { email: 'test-alumni@philab.test',     role: 'alumni',     name: '[TESTACC] alumni' },
  // 비화이트리스트: Auth 계정만 있고 admin_users 매핑 없음
  { email: 'test-outsider@philab.test',   role: null,         name: null },
]

const { data: list, error: listErr } = await admin.auth.admin.listUsers()
if (listErr) { console.error('listUsers failed:', listErr); process.exit(1) }

for (const acc of TEST_ACCOUNTS) {
  const existing = list.users.find((u) => u.email === acc.email)
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: TEST_PASSWORD, email_confirm: true })
    console.log(`✓ updated: ${acc.email}`)
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error) { console.error('createUser failed:', acc.email, error); process.exit(1) }
    console.log(`✓ created: ${acc.email}`)
  }

  if (acc.role) {
    const { error } = await admin.from('admin_users').upsert(
      // invited_by 는 admin_users(email) FK — 시드 계정은 null 로 둔다
      { email: acc.email, role: acc.role, display_name: acc.name, invited_by: null },
      { onConflict: 'email' },
    )
    if (error) { console.error('admin_users upsert failed:', error); process.exit(1) }
    console.log(`  whitelist: ${acc.email} (${acc.role})`)
  } else {
    await admin.from('admin_users').delete().eq('email', acc.email)
    console.log(`  not in whitelist: ${acc.email}`)
  }
}
console.log('\n=== test accounts ready ===')
