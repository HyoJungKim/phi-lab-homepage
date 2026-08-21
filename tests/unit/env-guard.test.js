import { describe, it, expect } from 'vitest'
import { parseEnvFile, assertSafeUrl, preflight, loadTestEnv } from '../helpers/env.js'

describe('운영 가드 (assertSafeUrl)', () => {
  it('로컬/사설망 URL 은 허용한다', () => {
    expect(() => assertSafeUrl('http://127.0.0.1:54321')).not.toThrow()
    expect(() => assertSafeUrl('http://localhost:54321')).not.toThrow()
    expect(() => assertSafeUrl('http://192.168.1.19:54321')).not.toThrow()
    expect(() => assertSafeUrl('http://10.0.0.5:54321')).not.toThrow()
    expect(() => assertSafeUrl('http://172.20.10.2:54321')).not.toThrow()
  })

  it('운영 Supabase(공인 도메인)는 즉시 거부한다', () => {
    expect(() => assertSafeUrl('https://abcdefg.supabase.co')).toThrow(/운영 가드/)
    expect(() => assertSafeUrl('https://example.com')).toThrow(/운영 가드/)
    // 사설망처럼 보이는 이름의 공인 도메인도 거부
    expect(() => assertSafeUrl('http://192.168.evil.com')).toThrow(/운영 가드/)
  })

  it('URL 형식이 아니면 거부한다', () => {
    expect(() => assertSafeUrl('not-a-url')).toThrow(/URL 형식/)
  })
})

describe('프리플라이트 (preflight)', () => {
  it('죽어 있는 스택이면 supabase start 안내와 함께 중단한다', async () => {
    // 항상 닫혀 있을 포트로 시도
    await expect(preflight('http://127.0.0.1:59999', 'dummy')).rejects.toThrow(/supabase start/)
  })
})

describe('환경 로드 (loadTestEnv)', () => {
  it('.env.local 파싱: 주석/빈 줄 무시, = 포함 값 보존', () => {
    const env = parseEnvFile('# 주석\nA=1\n\nB=x=y\n#C=3\n')
    expect(env).toEqual({ A: '1', B: 'x=y' })
  })

  it('운영 키(SUPABASE_PROD_SERVICE_ROLE_KEY)는 반환값에 없다', async () => {
    const env = await loadTestEnv({ skipPreflight: true })
    expect(env).not.toHaveProperty('SUPABASE_PROD_SERVICE_ROLE_KEY')
    expect(Object.keys(env).sort()).toEqual(['anonKey', 'serviceRoleKey', 'url'])
  })
})
