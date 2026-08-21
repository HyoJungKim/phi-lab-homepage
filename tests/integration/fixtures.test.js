import { describe, it, expect, afterAll } from 'vitest'
import { createFixtures, sweepStale } from '../helpers/fixtures.js'
import { serviceRole, asRole } from '../helpers/clients.js'

// fixtures 헬퍼 자체 검증: 생성→정리 왕복 후 잔여물 0 + 기존 시드 데이터 무손상
describe('fixtures 헬퍼', () => {
  const fx = createFixtures()
  afterAll(() => fx.cleanup())

  it('생성→cleanup 왕복 후 test- 레코드가 남지 않는다', async () => {
    const svc = await serviceRole()
    const local = createFixtures()

    const { error } = await local.insert(svc, 'members', {
      id: 'test-fx-roundtrip',
      name: 'test-fx',
      role: 'test-role',
      status: 'current',
    })
    expect(error).toBeNull()

    await local.cleanup()
    const { data } = await svc.from('members').select('id').eq('id', 'test-fx-roundtrip')
    expect(data).toEqual([])
  })

  it('트리거가 id 를 자동 부여한 news 도 author_email 로 추적·정리된다', async () => {
    const svc = await serviceRole()
    const researcher = await asRole('researcher')

    // researcher 세션으로 작성 (id 는 트리거가 부여 → test- 접두사 불가 상황 재현)
    const { data, error } = await researcher
      .from('news')
      .insert({ title: 'test-fx news', status: 'draft', author_email: 'test-researcher@philab.test' })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data.id).not.toMatch(/^test-/) // 트리거 부여 id 확인

    const removed = await sweepStale()
    expect(removed.join(',')).toMatch(/news/)

    const { data: after } = await svc
      .from('news').select('id').eq('author_email', 'test-researcher@philab.test')
    expect(after).toEqual([])
  })

  it('sweepStale 은 기존 시드 콘텐츠(실데이터 취급)를 건드리지 않는다', async () => {
    const svc = await serviceRole()
    const before = await svc.from('news').select('id', { count: 'exact', head: true })
    const beforePosts = await svc.from('posts').select('id', { count: 'exact', head: true })

    await sweepStale()

    const after = await svc.from('news').select('id', { count: 'exact', head: true })
    const afterPosts = await svc.from('posts').select('id', { count: 'exact', head: true })
    expect(after.count).toBe(before.count)
    expect(afterPosts.count).toBe(beforePosts.count)
  })

  it('sweepStale 은 시드 테스트 계정 5개를 보존한다', async () => {
    await sweepStale()
    const svc = await serviceRole()
    const { count } = await svc
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .like('email', 'test-%@philab.test')
    expect(count).toBe(4) // outsider 는 whitelist 에 없으므로 4
  })
})
