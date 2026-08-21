import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // 공개 페이지는 supabase 를 호출하지 않으므로, env 누락이어도 페이지가
  // 죽지는 않도록 stub client 를 export. admin 기능을 쓰려면 .env.local
  // (dev) 또는 hosting 환경변수 (prod) 에 VITE_SUPABASE_URL +
  // VITE_SUPABASE_ANON_KEY 등록 필요.
  console.warn(
    '[supabase] env 누락 — admin 기능 비활성화. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 설정 필요.',
  )
}

const stubError = new Error('Supabase env 미설정')

// env 미설정 시 쓰는 stub 쿼리 빌더.
// from(...).select(...).eq(...).order(...) 처럼 메서드를 이어 호출해도 깨지지 않도록,
// 어떤 속성 접근이든 다시 자기 자신(체이닝)을 돌려주고, await(then) 하면
// { data: [], error: null, count: 0 } 을 반환하는 thenable 프록시.
// error 가 null 이라 공개 loader 의 `if (error) throw error` 가 던지지 않아,
// 백엔드 없이도 공개 페이지가 빈 상태로 렌더/빌드된다.
function stubQuery() {
  const query = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve) => resolve({ data: [], error: null, count: 0 })
      }
      return () => query
    },
    apply: () => query,
  })
  return query
}

function stubClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: stubError }),
      signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: stubError }),
      signOut: async () => ({ error: null }),
    },
    from: () => stubQuery(),
    rpc: () => stubQuery(),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: stubError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : stubClient()

export const supabaseEnabled = !!(url && anonKey)
