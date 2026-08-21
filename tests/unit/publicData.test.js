import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// U1 — publicData 변환 단위 테스트 (DB 없이 supabase 모듈 모킹)
// 각 함수 × 정상 / 빈 / 결손(null 필드). ledger: docs/test-ledger.md U1
// ─────────────────────────────────────────────────────────────────────────────

const state = vi.hoisted(() => ({ responses: {}, rpcCalls: [] }))

vi.mock('../../app/lib/supabase.js', () => {
  function builder(table) {
    const p = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === 'then') {
          const r = state.responses[table] ?? { data: [], error: null, count: 0 }
          return (resolve, reject) => Promise.resolve(r).then(resolve, reject)
        }
        if (prop === 'maybeSingle') {
          return () => Promise.resolve(state.responses[table] ?? { data: null, error: null })
        }
        return () => p
      },
      apply: () => p,
    })
    return p
  }
  return {
    supabase: {
      from: (t) => builder(t),
      rpc: (name, args) => {
        state.rpcCalls.push([name, args])
        return Promise.resolve({ data: null, error: null })
      },
    },
    supabaseEnabled: true,
  }
})

import {
  fetchRoleOrder, fetchMembers, fetchProfessor, fetchLectures, fetchResearch,
  fetchPublications, fetchCollaboratingInstitutions, fetchNews, fetchNewsItem,
  fetchPosts, fetchPost, incrementPostViews, fetchHomeStats,
} from '../../app/lib/publicData.js'

beforeEach(() => {
  state.responses = {}
  state.rpcCalls = []
})

const set = (table, data, extra = {}) => { state.responses[table] = { data, error: null, ...extra } }

// ── U1-role ──────────────────────────────────────────────────────────────────
describe('fetchRoleOrder', () => {
  it('정상: label 배열 반환', async () => {
    set('member_roles', [{ label: 'Principal Investigator' }, { label: 'Undergraduate Researcher' }])
    expect(await fetchRoleOrder()).toEqual(['Principal Investigator', 'Undergraduate Researcher'])
  })
  it('빈/결손: data null 이어도 []', async () => {
    set('member_roles', null)
    expect(await fetchRoleOrder()).toEqual([])
  })
})

// ── U1-mem ───────────────────────────────────────────────────────────────────
const fullMember = {
  id: 'm1', name: 'Kim HJ', name_ko: '김효정', role: 'Principal Investigator',
  title: 'Prof', degree: 'PhD', student_number: null, college: null, department: 'BMSE',
  institution: 'CUK', photo_url: '/photos/kim.jpg', joined_at: '2020-01-01',
  email: 'k@x.com', personal_site: null, linkedin: null, google_scholar: null,
  research_interests: ['EHR'], bio_short: 'bio', bio_full: null,
  education: [{ t: 'PhD' }], experience: [], service: [], status: 'current',
}

describe('fetchMembers', () => {
  it('정상: camelCase 매핑 + current/alumni 분류 + piRole', async () => {
    set('members', [fullMember, { ...fullMember, id: 'm2', status: 'alumni' }])
    set('member_roles', [{ label: 'Principal Investigator' }])
    const out = await fetchMembers()
    expect(out.current.map((m) => m.id)).toEqual(['m1'])
    expect(out.alumni.map((m) => m.id)).toEqual(['m2'])
    expect(out.piRole).toBe('Principal Investigator')
    const m = out.current[0]
    expect(m).toMatchObject({
      nameKo: '김효정', joinedAt: '2020-01-01', photo: '/photos/kim.jpg',
      researchInterests: ['EHR'], education: [{ t: 'PhD' }],
    })
  })
  it('빈: 목록 비어도 구조 유지, piRole null (QA버그2·3 계열)', async () => {
    set('members', [])
    set('member_roles', [])
    const out = await fetchMembers()
    expect(out).toEqual({ current: [], alumni: [], roleOrder: [], piRole: null })
  })
  it('결손: null 필드가 배열 기본값/null 로 안전 매핑', async () => {
    set('members', [{ id: 'm3', name: 'X', role: 'r', status: 'current' }])
    set('member_roles', [])
    const m = (await fetchMembers()).current[0]
    expect(m.researchInterests).toEqual([])
    expect(m.education).toEqual([])
    expect(m.experience).toEqual([])
    expect(m.service).toEqual([])
    expect(m.photo).toBeUndefined() // photo_url 없음 → withBase(undefined) = undefined
  })
  it('에러: supabase error 는 throw 로 전파', async () => {
    state.responses.members = { data: null, error: new Error('boom') }
    set('member_roles', [])
    await expect(fetchMembers()).rejects.toThrow('boom')
  })
})

// ── U1-prof (QA버그1 회귀: 역할 라벨 폴백) ────────────────────────────────────
describe('fetchProfessor', () => {
  it('정상: roleOrder 맨 앞 라벨과 일치하는 멤버', async () => {
    set('members', [fullMember, { ...fullMember, id: 'm2', role: 'Student' }])
    set('member_roles', [{ label: 'Principal Investigator' }])
    expect((await fetchProfessor()).id).toBe('m1')
  })
  it('폴백: 라벨 불일치 시 한글 "지도교수" → id "hkim" 순서', async () => {
    set('members', [{ ...fullMember, id: 'm9', role: '지도교수' }])
    set('member_roles', [{ label: 'NoMatch' }])
    expect((await fetchProfessor()).id).toBe('m9')

    set('members', [{ ...fullMember, id: 'hkim', role: 'whatever' }])
    expect((await fetchProfessor()).id).toBe('hkim')
  })
  it('빈: 아무도 없으면 null (크래시 금지)', async () => {
    set('members', [])
    set('member_roles', [])
    expect(await fetchProfessor()).toBeNull()
  })
})

// ── U1-lec ───────────────────────────────────────────────────────────────────
describe('fetchLectures', () => {
  it('정상: 매핑 + images withBase', async () => {
    set('lectures', [{ id: 'l1', code: 'C1', title_en: 'T', title_ko: '티', images: ['/img/a.png'], objectives: ['o'], tags: null }])
    const [l] = await fetchLectures()
    expect(l).toMatchObject({ titleEn: 'T', titleKo: '티', images: ['/img/a.png'], objectives: ['o'], tags: [] })
  })
  it('빈: []', async () => {
    set('lectures', [])
    expect(await fetchLectures()).toEqual([])
  })
  it('결손: images/objectives null → []', async () => {
    set('lectures', [{ id: 'l2' }])
    const [l] = await fetchLectures()
    expect(l.images).toEqual([])
    expect(l.objectives).toEqual([])
  })
})

// ── U1-res ───────────────────────────────────────────────────────────────────
describe('fetchResearch', () => {
  it('정상: affiliations position 정렬 + institutions 매핑', async () => {
    set('research', [{
      id: 'r1', title: 'R', tags: ['t'], tags_featured: null, featured: true, status: 'active',
      research_affiliations: [
        { position: 2, department_en: 'D2', institutions: { name_en: 'B', is_internal: false } },
        { position: 1, department_en: 'D1', institutions: { name_en: 'A', is_internal: true } },
      ],
    }])
    const [r] = await fetchResearch()
    expect(r.affiliations.map((a) => a.institution)).toEqual(['A', 'B'])
    expect(r.affiliations[0].isInternal).toBe(true)
    expect(r.tagsFeaturedLive).toEqual([])
  })
  it('빈: []', async () => {
    set('research', [])
    expect(await fetchResearch()).toEqual([])
  })
  it('결손: affiliations/institutions null 안전', async () => {
    set('research', [{ id: 'r2', research_affiliations: [{ position: 1, institutions: null }] }])
    const [r] = await fetchResearch()
    expect(r.affiliations[0].institution).toBe('')
    expect(r.affiliations[0].isInternal).toBe(false)
  })
})

// ── U1-pub ───────────────────────────────────────────────────────────────────
describe('fetchPublications', () => {
  it('정상: 저자 position 정렬 + 플래그 매핑', async () => {
    set('publications', [{
      id: 'p1', category: 'journal', title: 'T', year: 2024,
      publication_authors: [
        { position: 2, is_pi: true, authors: { name: 'Kim HJ', full_name: 'Hyo Jung Kim' } },
        { position: 1, is_pi: false, authors: { name: 'Park TW' } },
      ],
    }])
    const [p] = await fetchPublications()
    expect(p.authors.map((a) => a.name)).toEqual(['Park TW', 'Kim HJ'])
    expect(p.authors[1].isPi).toBe(true)
    expect(p.authors[0].fullName).toBeNull()
  })
  it('빈: []', async () => {
    set('publications', [])
    expect(await fetchPublications()).toEqual([])
  })
  it('결손: publication_authors null / authors null 안전', async () => {
    set('publications', [{ id: 'p2' }, { id: 'p3', publication_authors: [{ position: 1, authors: null }] }])
    const [p2, p3] = await fetchPublications()
    expect(p2.authors).toEqual([])
    expect(p3.authors[0].name).toBe('')
  })
})

// ── U1-inst ──────────────────────────────────────────────────────────────────
describe('fetchCollaboratingInstitutions', () => {
  it('정상: name/logo 매핑', async () => {
    set('institutions', [{ name_en: 'SNU', logo_url: '/logos/snu.svg' }])
    expect(await fetchCollaboratingInstitutions()).toEqual([{ name: 'SNU', logo: '/logos/snu.svg' }])
  })
  it('빈/결손: [] 와 logo null 안전', async () => {
    set('institutions', [])
    expect(await fetchCollaboratingInstitutions()).toEqual([])
    set('institutions', [{ name_en: 'X', logo_url: null }])
    expect((await fetchCollaboratingInstitutions())[0].logo).toBeNull()
  })
})

// ── U1-news / U1-news1 ───────────────────────────────────────────────────────
describe('fetchNews / fetchNewsItem', () => {
  const body = [{ type: 'paragraph' }, { type: 'image', props: { url: '/img/cover.png' } }]
  it('정상: 커버 = 본문 첫 image 블록', async () => {
    set('news', [{ id: 'n1', title: 'N', body_json: body, published_at: '2026-01-01' }])
    const [n] = await fetchNews()
    expect(n.cover).toBe('/img/cover.png')
  })
  it('결손: body_json 이 배열이 아니면 cover null', async () => {
    set('news', [{ id: 'n2', body_json: null }, { id: 'n3', body_json: [{ type: 'image', props: {} }] }])
    const [n2, n3] = await fetchNews()
    expect(n2.cover).toBeNull()
    expect(n3.cover).toBeNull()
  })
  it('단건: 있으면 매핑, 없으면 null', async () => {
    state.responses.news = { data: { id: 'n1', title: 'N', body_json: body }, error: null }
    expect((await fetchNewsItem('n1')).cover).toBe('/img/cover.png')
    state.responses.news = { data: null, error: null }
    expect(await fetchNewsItem('nope')).toBeNull()
  })
})

// ── U1-posts / U1-post1 ──────────────────────────────────────────────────────
describe('fetchPosts / fetchPost', () => {
  it('정상: 매핑 + pinned/views/authorName', async () => {
    set('posts', [{ id: 'p1', title: 'T', author_name: '박태원', views: 3, pinned: true }])
    const [p] = await fetchPosts()
    expect(p).toMatchObject({ authorName: '박태원', views: 3, pinned: true })
  })
  it('결손: author_name null → "관리자", views null → 0, pinned null → false', async () => {
    set('posts', [{ id: 'p2', title: 'T' }])
    const [p] = await fetchPosts()
    expect(p).toMatchObject({ authorName: '관리자', views: 0, pinned: false })
  })
  it('단건: 없으면 null, 있으면 매핑', async () => {
    state.responses.posts = { data: null, error: null }
    expect(await fetchPost('x')).toBeNull()
    state.responses.posts = { data: { id: 'p1', title: 'T', views: null }, error: null }
    expect((await fetchPost('p1')).views).toBe(0)
  })
})

// ── U1-views ─────────────────────────────────────────────────────────────────
describe('incrementPostViews', () => {
  it('rpc increment_post_views 를 p_id 로 호출', async () => {
    await incrementPostViews('2026-07-02-001')
    expect(state.rpcCalls).toEqual([['increment_post_views', { p_id: '2026-07-02-001' }]])
  })
})

// ── U1-stats ─────────────────────────────────────────────────────────────────
describe('fetchHomeStats', () => {
  it('정상: count 매핑', async () => {
    state.responses.research = { count: 5, error: null }
    state.responses.publications = { count: 40, error: null }
    expect(await fetchHomeStats()).toEqual({ activeResearchCount: 5, publicationsCount: 40 })
  })
  it('결손: count null → 0', async () => {
    state.responses.research = { count: null, error: null }
    state.responses.publications = { count: null, error: null }
    expect(await fetchHomeStats()).toEqual({ activeResearchCount: 0, publicationsCount: 0 })
  })
})
