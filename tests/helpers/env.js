import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// 테스트 환경 로더 + 운영 가드
//
// 절대 규칙 (docs/test-plan.md 3.3):
// 1. 테스트는 로컬 Supabase 스택만 대상으로 한다. 운영(*.supabase.co)이 감지되면
//    그 자리에서 전체 테스트를 중단한다.
// 2. SUPABASE_PROD_SERVICE_ROLE_KEY 는 여기서 export 하지 않는다.
//    테스트 코드가 운영 키에 접근할 경로 자체를 없앤다.
// ─────────────────────────────────────────────────────────────────────────────

export function parseEnvFile(text) {
  return Object.fromEntries(
    text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i), l.slice(i + 1)]
      }),
  )
}

// 로컬(루프백) 또는 사설망 IP만 허용.
// .env.local 은 폰 테스트를 위해 LAN IP(예: 192.168.x.x:54321)를 쓰기도 하므로
// 사설 대역은 허용하되, 공인 도메인/https(운영 Supabase)는 전부 거부한다.
export function assertSafeUrl(url) {
  let host
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error(`[운영 가드] VITE_SUPABASE_URL 이 URL 형식이 아닙니다: ${url}`)
  }
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  // 사설망 판정은 "진짜 IPv4" 일 때만. 192.168.evil.com 같은 도메인이
  // 앞자리만 흉내내고 통과하는 것을 막는다.
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  const isPrivate =
    isIpv4 &&
    (/^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host))
  if (!isLoopback && !isPrivate) {
    throw new Error(
      `[운영 가드] VITE_SUPABASE_URL 이 로컬/사설망이 아닙니다: ${host}\n` +
        '테스트는 로컬 Supabase 스택에서만 실행할 수 있습니다. .env.local 을 확인하세요.',
    )
  }
}

// 로컬 스택 헬스 프리플라이트. 스택이 죽어 있으면 "테스트 실패" 로 오인되지 않게
// 명확한 안내와 함께 중단한다.
export async function preflight(url, anonKey) {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok && res.status !== 401) {
      throw new Error(`status ${res.status}`)
    }
  } catch (e) {
    throw new Error(
      `[프리플라이트] 로컬 Supabase 스택(${url})이 응답하지 않습니다.\n` +
        '  → supabase start 로 로컬 스택을 먼저 띄우세요.\n' +
        `  (원인: ${e.message})`,
    )
  }
}

// 테스트가 쓰는 유일한 환경 진입점.
// 반환값에 운영 키(SUPABASE_PROD_SERVICE_ROLE_KEY)는 포함하지 않는다.
export async function loadTestEnv({ skipPreflight = false } = {}) {
  const file = resolve(process.cwd(), '.env.local')
  const env = parseEnvFile(readFileSync(file, 'utf8'))

  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    throw new Error('[환경] .env.local 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 필요합니다.')
  }
  assertSafeUrl(url)
  if (!skipPreflight) await preflight(url, anonKey)

  return { url, anonKey, serviceRoleKey }
}
