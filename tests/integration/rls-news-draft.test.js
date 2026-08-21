import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { anon, serviceRole } from '../helpers/clients.js'
import { createFixtures } from '../helpers/fixtures.js'

// I1-news-a — anon 은 draft news 를 목록/단건 어디서도 못 읽는다 (파일럿 셀)
describe('RLS: news draft 비공개', () => {
  const fx = createFixtures()
  let draftId

  beforeAll(async () => {
    const svc = await serviceRole()
    const { data, error } = await svc
      .from('news')
      .insert({ id: 'test-rls-draft-news', title: 'test-rls draft', status: 'draft' })
      .select()
      .single()
    if (error) throw error
    draftId = data.id
    fx.track('news', draftId)
  })
  afterAll(() => fx.cleanup())

  it('I1-news-a: anon 목록 조회에 draft 가 없다', async () => {
    const a = await anon()
    const { data, error } = await a.from('news').select('id')
    expect(error).toBeNull()
    expect(data.map((r) => r.id)).not.toContain(draftId)
  })

  it('I1-news-a: anon 단건 조회도 빈 결과다', async () => {
    const a = await anon()
    const { data } = await a.from('news').select('id').eq('id', draftId)
    expect(data).toEqual([])
  })
})
