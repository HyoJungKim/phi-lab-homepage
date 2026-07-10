import { NavLink, Outlet, Link, useLocation } from 'react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const NAV_ROUTES = [
  { to: '/professor', label: 'Professor' },
  { to: '/publications', label: 'Publications' },
  { to: '/lectures', label: 'Lectures' },
  { to: '/research', label: 'Current Research' },
  { to: '/members', label: 'Members' },
  { to: '/news', label: 'News' },
  { to: '/posts', label: 'Posts' },
  { to: '/about', label: 'About Lab' },
]

const FOOTER = {
  tagline:
    'Precision & Provenance Health Informatics Lab at the Catholic University of Korea',
  department: 'Department of Biomedical Software Engineering',
  institution: 'The Catholic University of Korea',
  addressLine1: '43, Jibong-ro, Bucheon',
  addressLine2: '14662, Gyeonggi-do, South Korea',
  email: 'hyojung.kim@catholic.ac.kr',
}

// 메뉴 링크 렌더링을 한 곳에서 — 데스크톱 nav 와 모바일 drawer 가 공유한다.
// 대문자 표기(uppercase)·라벨도 여기서만 정하므로 두 번 관리할 필요가 없다.
// linkClass: 위치별(가로/세로) 스타일만 각 nav 가 넘긴다.
function NavLinks({ linkClass, onClick }) {
  return NAV_ROUTES.map(({ to, label }) => (
    <NavLink
      key={to}
      to={to}
      onClick={onClick}
      className={(state) => `uppercase ${linkClass(state)}`}
    >
      {label}
    </NavLink>
  ))
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const close = () => setMobileOpen(false)
  const { isAuthenticated, signOut } = useAuth()

  return (
    <header className="border-b border-rule">
      {/* 상단 가대 블루 띠 — 좌: 대학명 / 우: 로그인 (full width) */}
      <div className="bg-brand-700 text-white text-[13px]">
        <div className="px-6 py-1.5 flex items-center justify-between">
          <a href="https://www.catholic.ac.kr" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white no-underline">
            가톨릭대학교
          </a>
          {isAuthenticated ? (
            <span className="flex items-center gap-4">
              <Link to="/admin" className="text-white/90 hover:text-white no-underline">
                마이페이지
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-white/90 hover:text-white no-underline bg-transparent border-0 p-0 m-0 cursor-pointer text-[13px]"
              >
                로그아웃
              </button>
            </span>
          ) : (
            <Link to="/admin/login" className="text-white/90 hover:text-white no-underline">
              로그인
            </Link>
          )}
        </div>
      </div>

      {/* 네브바 — full width. 폭이 좁으면 메뉴가 아래 줄로 내려간다(겹침 방지). */}
      <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <Link to="/" onClick={close} className="flex items-center gap-3 no-underline shrink-0">
          <img src={import.meta.env.BASE_URL + 'logo.jpg'} alt="PHI Lab" className="h-12 w-auto max-[500px]:hidden" />
          <span className="leading-tight">
            <span className="block font-semibold text-ink text-[14px] lg:text-[16px] xl:text-[18px] tracking-tight">
              Precision &amp; Provenance Health Informatics Lab
            </span>
            <span className="block text-meta text-[10px] lg:text-[11px] xl:text-[12px] tracking-[0.18em] uppercase mt-0.5">
              The Catholic University of Korea
            </span>
          </span>
        </Link>

        {/* 폭이 좁아지면 글씨·간격을 줄여 한 줄을 더 오래 유지(그래도 부족하면 wrap) */}
        <nav className="hidden md:flex gap-4 lg:gap-5 xl:gap-6 text-[14px] lg:text-[16px] xl:text-[18px] font-semibold">
          <NavLinks
            linkClass={({ isActive }) =>
              isActive
                ? 'text-brand-700 underline underline-offset-[6px] decoration-[1.5px]'
                : 'text-ink no-underline hover:underline'
            }
          />
        </nav>

        <button
          className="md:hidden text-[15px] font-semibold text-ink"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-label="메뉴 열기"
        >
          Menu
        </button>
      </div>

      {/* 우측 슬라이드 드로어 (md 미만). 항상 마운트하고 transform 으로 토글해
          슬라이드 애니메이션이 동작하게 한다. 닫혔을 땐 클릭 통과. */}
      <div className={`md:hidden fixed inset-0 z-50 overflow-hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <div
          onClick={close}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute top-0 right-0 h-full w-[270px] max-w-[80vw] bg-white shadow-xl transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 h-14 border-b border-rule">
            <span className="font-bold text-ink">PHI Lab</span>
            <button onClick={close} aria-label="메뉴 닫기" className="text-2xl leading-none text-meta">×</button>
          </div>
          <nav className="flex flex-col py-2 text-[17px] font-semibold">
            <NavLinks
              onClick={close}
              linkClass={({ isActive }) =>
                `px-5 py-3 no-underline ${isActive ? 'text-brand-700 bg-brand-50' : 'text-ink hover:bg-[#fafafa]'}`
              }
            />
          </nav>
        </aside>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-20">
      {/* 구분선을 풀폭 <footer> 가 아니라 1200 래퍼에 둬서 바디와 같은 폭으로 */}
      <div className="mx-auto max-w-[1200px] border-t border-rule">
        <div className="px-6 py-10 flex flex-col gap-8 md:flex-row md:justify-between md:gap-12 text-[15px]">
          <div>
            <p className="font-semibold text-ink mb-1">PHI Lab</p>
            <p className="text-muted">{FOOTER.tagline}</p>
          </div>

          <div className="md:text-right">
            <p className="font-semibold text-ink mb-1">Contact</p>
            <address className="not-italic text-muted">
              <p>{FOOTER.department}</p>
              <p>{FOOTER.institution}</p>
              <p>{FOOTER.addressLine1}</p>
              <p>{FOOTER.addressLine2}</p>
              <p className="mt-2">
                <a href={`mailto:${FOOTER.email}`}>{FOOTER.email}</a>
              </p>
            </address>
          </div>
        </div>

        <div className="px-6 pb-8 text-xs text-meta">
          © {new Date().getFullYear()} PHI Lab.
        </div>
      </div>
    </footer>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
