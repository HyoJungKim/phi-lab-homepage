import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseBibtex, fetchByDoi } from '../../app/lib/publications-import.js'

// U2-bib-1 / U2-bib-2 — BibTeX 파서
describe('parseBibtex', () => {
  it('U2-bib-1: 일반 article 엔트리를 매핑한다', () => {
    const out = parseBibtex(`@article{kim2024,
      title   = {Precision Health Informatics},
      author  = {Kim, Hyo Jung and Park, Tae Won},
      journal = {JMIR},
      volume  = {26},
      number  = {3},
      pages   = {e100--e110},
      year    = {2024},
      doi     = {10.1000/xyz},
    }`)
    expect(out.title).toBe('Precision Health Informatics')
    expect(out.venue).toBe('JMIR')
    expect(out.venue_details).toBe('26(3)e100--e110')
    expect(out.year).toBe(2024)
    expect(out.doi).toBe('10.1000/xyz')
    expect(out.authors).toEqual([
      { name: 'Kim HJ', full_name: 'Kim, Hyo Jung' },
      { name: 'Park TW', full_name: 'Park, Tae Won' },
    ])
  })

  it('U2-bib-1: 따옴표 값과 중첩 브레이스를 처리한다', () => {
    const out = parseBibtex('@inproceedings{x, title = {A {Nested} Title}, booktitle = "AMIA", year = "2023" }')
    expect(out.title).toBe('A {Nested} Title')
    expect(out.venue).toBe('AMIA')
    expect(out.year).toBe(2023)
  })

  it('U2-bib-2: BibTeX 형식이 아니면 명확한 에러를 던진다', () => {
    expect(() => parseBibtex('')).toThrow(/BibTeX/)
    expect(() => parseBibtex('그냥 텍스트')).toThrow(/BibTeX/)
  })

  it('U2-bib-2: 필드가 비어 있어도 죽지 않는다 (author/year 없음)', () => {
    const out = parseBibtex('@misc{empty, title = {Only Title} }')
    expect(out.title).toBe('Only Title')
    expect(out.year).toBeNull()
    expect(out.authors).toEqual([])
  })
})

// U2-doi-1 — CrossRef 응답 매핑 (fetch 모킹)
describe('fetchByDoi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('U2-doi-1: CrossRef 응답을 publications row 로 매핑한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: {
          title: ['A Title'],
          'container-title': ['JMIR'],
          volume: '26', issue: '3', page: 'e100',
          issued: { 'date-parts': [[2024, 5, 1]] },
          DOI: '10.1000/xyz', URL: 'https://doi.org/10.1000/xyz',
          author: [{ family: 'Kim', given: 'Hyo Jung' }],
        },
      }),
    })))
    const out = await fetchByDoi(' 10.1000/xyz ')
    expect(out).toMatchObject({
      title: 'A Title', venue: 'JMIR', venue_details: '26(3)e100',
      year: 2024, date: '2024-5-1', doi: '10.1000/xyz',
    })
    expect(out.authors).toEqual([{ name: 'Kim HJ', full_name: 'Hyo Jung Kim' }])
    // doi 는 trim + encode 되어 호출
    expect(fetch).toHaveBeenCalledWith(
      'https://api.crossref.org/works/10.1000%2Fxyz',
      expect.anything(),
    )
  })

  it('U2-doi-1: 404 응답이면 명확한 에러', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    await expect(fetchByDoi('10.1/none')).rejects.toThrow(/CrossRef 404/)
  })
})
