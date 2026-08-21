import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// U2-stub-1 — supabase env 미설정 시 stub 클라이언트 (QA버그5 회귀)
// env 를 비우고 모듈을 다시 로드해 stub 경로를 탄다.
describe('supabase stub (env 미설정)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('supabaseEnabled 가 false 다', async () => {
    const { supabaseEnabled } = await import('../../app/lib/supabase.js')
    expect(supabaseEnabled).toBe(false)
  })

  it('쿼리 체이닝이 깨지지 않고 빈 결과를 반환한다 (thenable)', async () => {
    const { supabase } = await import('../../app/lib/supabase.js')
    const result = await supabase.from('members').select('*').eq('a', 1).order('b').order('c')
    expect(result).toEqual({ data: [], error: null, count: 0 })
  })

  it('maybeSingle 등 임의 메서드 후에도 await 가능', async () => {
    const { supabase } = await import('../../app/lib/supabase.js')
    const result = await supabase.from('news').select('*').eq('id', 'x').maybeSingle()
    expect(result).toEqual({ data: [], error: null, count: 0 })
  })

  it('publicData 의 fetch* 가 stub 위에서도 빈 상태로 성공한다 (공개 페이지 생존)', async () => {
    const { fetchMembers, fetchNews, fetchHomeStats } = await import('../../app/lib/publicData.js')
    expect(await fetchMembers()).toMatchObject({ current: [], alumni: [] })
    expect(await fetchNews()).toEqual([])
    expect(await fetchHomeStats()).toEqual({ activeResearchCount: 0, publicationsCount: 0 })
  })

  it('auth 는 세션 없음, 로그인 시도는 명확한 에러', async () => {
    const { supabase } = await import('../../app/lib/supabase.js')
    const { data } = await supabase.auth.getSession()
    expect(data.session).toBeNull()
    const { error } = await supabase.auth.signInWithPassword({ email: 'a', password: 'b' })
    expect(error).toBeTruthy()
  })
})
