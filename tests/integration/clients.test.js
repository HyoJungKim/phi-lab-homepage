import { describe, it, expect } from 'vitest'
import { anon, asRole, serviceRole, TEST_EMAILS } from '../helpers/clients.js'

// 클라이언트 팩토리 자체 검증 — 5개 역할 전부 로그인 가능해야 한다.
describe('클라이언트 팩토리', () => {
  it('anon 클라이언트가 만들어진다', async () => {
    const c = await anon()
    const { data } = await c.auth.getSession()
    expect(data.session).toBeNull()
  })

  for (const role of Object.keys(TEST_EMAILS)) {
    it(`${role} 계정으로 로그인된다`, async () => {
      const c = await asRole(role)
      const { data } = await c.auth.getUser()
      expect(data.user?.email).toBe(TEST_EMAILS[role])
    })
  }

  it('serviceRole 클라이언트가 만들어진다', async () => {
    const c = await serviceRole()
    const { count, error } = await c.from('admin_users').select('*', { count: 'exact', head: true })
    expect(error).toBeNull()
    expect(count).toBeGreaterThan(0)
  })
})
