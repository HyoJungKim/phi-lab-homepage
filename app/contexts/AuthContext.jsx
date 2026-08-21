/* eslint-disable react-refresh/only-export-components -- context 모듈(Provider + useAuth 훅), Fast Refresh 대상 아님 */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) {
        setProfile(null)
        setProfileError(null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return

    let cancelled = false
    setLoading(true)
    setProfileError(null)

    supabase
      .from('admin_users')
      .select('email, role, display_name')
      .eq('email', session.user.email)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setProfileError(error)
        setProfile(data)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [session])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // 구글 로그인. redirectTo 로 로그인 후 돌아올 URL 지정 (기본: 현재 URL).
  // prompt=select_account: 로그아웃 후 재로그인 시 항상 계정 선택 화면 표시
  // (구글 세션 캐시로 바로 통과되는 것 방지).
  const signInWithGoogle = (redirectTo) =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || window.location.href,
        queryParams: { prompt: 'select_account' },
      },
    })

  const signOut = () => supabase.auth.signOut()

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    profileError,
    isAuthenticated: !!session,
    isWhitelisted: !!profile,
    isEditor: profile?.role === 'admin' || profile?.role === 'professor',
    signIn,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
