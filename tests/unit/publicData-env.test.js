import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// U2-base-1 — withBase / resized 환경 분기 (publicData 내부 함수 → fetch* 경유 검증)
// BASE_URL prefix 와 VITE_SUPABASE_IMAGE_TRANSFORM 플래그는 모듈 로드 시점에
// 읽히므로 resetModules + 동적 import 로 검증한다.

const state = vi.hoisted(() => ({ rows: [] }))

vi.mock('../../app/lib/supabase.js', () => {
  function builder() {
    const p = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === 'then') return (resolve) => resolve({ data: state.rows, error: null })
        return () => p
      },
      apply: () => p,
    })
    return p
  }
  return { supabase: { from: () => builder(), rpc: async () => ({}) }, supabaseEnabled: true }
})

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllEnvs())

const STORAGE_URL = 'http://127.0.0.1:54321/storage/v1/object/public/profile-photos/x.jpg'

describe('withBase (BASE_URL prefix)', () => {
  it('base 가 하위 경로면 내부 경로에 prefix, 외부 URL 은 그대로', async () => {
    vi.stubEnv('BASE_URL', '/phi-lab-homepage/')
    const { fetchLectures } = await import('../../app/lib/publicData.js')
    state.rows = [{ id: 'l1', images: ['/img/a.png', 'https://ext.com/b.png'] }]
    const [l] = await fetchLectures()
    expect(l.images).toEqual(['/phi-lab-homepage/img/a.png', 'https://ext.com/b.png'])
  })

  it('base 가 "/" 면 경로 불변', async () => {
    vi.stubEnv('BASE_URL', '/')
    const { fetchLectures } = await import('../../app/lib/publicData.js')
    state.rows = [{ id: 'l1', images: ['/img/a.png'] }]
    const [l] = await fetchLectures()
    expect(l.images).toEqual(['/img/a.png'])
  })
})

describe('resized (이미지 변환 플래그)', () => {
  it('플래그 off(기본): storage URL 원본 그대로', async () => {
    vi.stubEnv('BASE_URL', '/')
    const { fetchMembers } = await import('../../app/lib/publicData.js')
    state.rows = [{ id: 'm1', status: 'current', photo_url: STORAGE_URL }]
    const out = await fetchMembers()
    expect(out.current[0].photo).toBe(STORAGE_URL)
  })

  it('플래그 on: render/image 변환 URL + 크기 파라미터', async () => {
    vi.stubEnv('BASE_URL', '/')
    vi.stubEnv('VITE_SUPABASE_IMAGE_TRANSFORM', 'true')
    const { fetchMembers } = await import('../../app/lib/publicData.js')
    state.rows = [{ id: 'm1', status: 'current', photo_url: STORAGE_URL }]
    const out = await fetchMembers()
    expect(out.current[0].photo).toContain('/storage/v1/render/image/public/')
    expect(out.current[0].photo).toContain('width=450&height=600')
  })

  it('storage 경로가 아닌 URL 은 변환하지 않는다', async () => {
    vi.stubEnv('BASE_URL', '/')
    vi.stubEnv('VITE_SUPABASE_IMAGE_TRANSFORM', 'true')
    const { fetchMembers } = await import('../../app/lib/publicData.js')
    state.rows = [{ id: 'm1', status: 'current', photo_url: 'https://ext.com/a.jpg' }]
    const out = await fetchMembers()
    expect(out.current[0].photo).toBe('https://ext.com/a.jpg')
  })
})
