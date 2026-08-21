import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

export const links = () => {
  const fav = import.meta.env.BASE_URL + 'favicon.png'
  return [
    { rel: 'icon', type: 'image/png', href: fav },
    { rel: 'apple-touch-icon', href: fav },
  ]
}

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

// SPA 첫 로드에서 clientLoader 데이터가 오기 전 잠깐 표시.
// (SPA 모드에선 root 에만 둘 수 있다)
export function HydrateFallback() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <p className="text-muted">Loading…</p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
