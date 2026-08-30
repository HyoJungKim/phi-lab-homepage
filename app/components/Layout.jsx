import { NavLink, Outlet, Link, useLocation } from 'react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { SITE_ORIGIN } from '../lib/site'

// PI → 연구 → 성과 → 강의 → 구성원 → 소개 → 수시 업데이트.
const NAV_ROUTES = [
  { to: '/professor', label: 'Professor' },
  { to: '/research', label: 'Current Research' },
  { to: '/publications', label: 'Publications' },
  { to: '/lectures', label: 'Teaching' },
  {
    to: '/events',
    label: 'Events',
    children: [
      // GHMW = 정적 사이트(public/ghmw-2026/) → 전체 페이지 이동(external).
      { to: '/ghmw-2026/', label: 'GHMW 2026', external: true },
      { to: '/events', label: 'LLM Workshop' },
      { to: '/gallery', label: 'Gallery' },
    ],
  },
  { to: '/members', label: 'Members' },
  { to: '/about', label: 'About Lab' },
  { to: '/news', label: 'News' },
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
// children 있는 항목: 데스크톱은 hover 드롭다운, 모바일은 하위 항목을 들여쓰기.
// external 하위 항목(정적 사이트 등)은 NavLink 대신 <a> 로 전체 이동.

function DropChild({ child, onClick }) {
  const cls =
    'block px-4 py-2 text-[15px] normal-case font-normal text-ink no-underline hover:bg-brand-50 whitespace-nowrap'
  return child.external ? (
    <a href={child.to} onClick={onClick} className={cls}>
      {child.label}
    </a>
  ) : (
    <NavLink to={child.to} onClick={onClick} className={cls}>
      {child.label}
    </NavLink>
  )
}

// 로그인(화이트리스트) 구성원에게만 보이는 메뉴 — 외부 방문자에겐 공개 메뉴만 노출.
const MEMBER_ROUTES = [
  { to: '/schedule', label: 'Schedule' },
  { to: '/posts', label: 'Posts' },
]

function NavLinks({ linkClass, onClick, variant = 'desktop', routes = NAV_ROUTES }) {
  return routes.map((item) => {
    const { to, label, children } = item

    if (children && variant === 'mobile') {
      return (
        <div key={to}>
          <NavLink to={to} onClick={onClick} className={(s) => `uppercase ${linkClass(s)}`}>
            {label}
          </NavLink>
          {children.map((c) => (
            <div key={c.to} className="pl-5">
              <DropChild child={c} onClick={onClick} />
            </div>
          ))}
        </div>
      )
    }

    if (children) {
      return (
        <div key={to} className="relative group">
          <NavLink
            to={to}
            className={(s) => `uppercase inline-flex items-center gap-1 ${linkClass(s)}`}
          >
            {label}
            <span aria-hidden="true" className="text-[0.6em] translate-y-[1px]">▼</span>
          </NavLink>
          {/* pt-3 = 트리거와 패널 사이 hover 다리(끊김 방지) */}
          <div className="absolute left-0 top-full pt-3 hidden group-hover:block group-focus-within:block z-50">
            <div className="rounded-lg border border-rule bg-white py-2 shadow-lg min-w-[190px]">
              {children.map((c) => (
                <DropChild key={c.to} child={c} onClick={onClick} />
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <NavLink key={to} to={to} onClick={onClick} className={(s) => `uppercase ${linkClass(s)}`}>
        {label}
      </NavLink>
    )
  })
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const close = () => setMobileOpen(false)
  // 세션만으로 '로그인됨' 을 판단하면, 인증은 됐지만 화이트리스트에 없어
  // 접근이 막힌(Forbidden) 사용자에게도 마이페이지/로그아웃이 뜬다.
  // 실제 admin 권한이 있는 화이트리스트 사용자에게만 관리 메뉴를 노출한다.
  const { isWhitelisted, signOut } = useAuth()
  const navRoutes = isWhitelisted ? [...NAV_ROUTES, ...MEMBER_ROUTES] : NAV_ROUTES

  return (
    <header className="border-b border-rule">
      {/* 상단 가대 블루 띠 — 좌: 대학명 / 우: 로그인 (full width) */}
      <div className="bg-brand-700 text-white text-[13px]">
        <div className="px-6 py-1.5 flex items-center justify-between">
          <a href="https://www.catholic.ac.kr" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white no-underline">
            가톨릭대학교
          </a>
          {isWhitelisted ? (
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
          {/* logo-mark.png = logo.jpg 에서 글자 없이 심볼만 크롭한 버전 */}
          <img src={import.meta.env.BASE_URL + 'logo-mark.png'} alt="PHI Lab" className="h-14 w-auto max-[500px]:hidden" />
          {/* 랩 이름 = 사실상 로고 — 크게, 줄간격은 좁게.
              글자색: 로고 심볼 파랑보다 진한 남색 그라데이션(가대 블루→딥네이비). */}
          <span className="leading-[1.15]">
            <span
              className="block font-semibold text-[20px] lg:text-[24px] xl:text-[26px] tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, #0c2e86 0%, #061a4e 100%)' }}
            >
              Precision &amp; Provenance Health Informatics Lab
            </span>
            <span className="block text-meta text-[11px] lg:text-[12px] xl:text-[13px] tracking-[0.18em] uppercase">
              The Catholic University of Korea
            </span>
          </span>
        </Link>

        {/* 폭이 좁아지면 글씨·간격을 줄여 한 줄을 더 오래 유지(그래도 부족하면 wrap) */}
        <nav className="hidden md:flex gap-4 lg:gap-5 xl:gap-6 text-[14px] lg:text-[16px] xl:text-[18px] font-semibold">
          <NavLinks
            variant="desktop"
            routes={navRoutes}
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
              variant="mobile"
              routes={navRoutes}
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
          {/* 좌측 하단 © 가 우측 이메일과 같은 줄에 오도록 justify-between */}
          <div className="flex flex-col gap-4 md:justify-between">
            <div>
              <p className="font-semibold text-ink my-0">PHI Lab</p>
              <p className="text-muted my-0">Precision &amp; Provenance Health Informatics Lab</p>
            </div>
            <p className="text-xs text-meta my-0">
              © {new Date().getFullYear()} PHI Lab, The Catholic University of Korea. All rights reserved.
            </p>
          </div>

          <div className="md:text-right">
            <p className="font-semibold text-ink my-0 mb-1">Contact</p>
            {/* 주소는 붙은 줄로 — p 기본 마진(0.7em) 제거 */}
            <address className="not-italic text-muted leading-relaxed">
              <p className="my-0">{FOOTER.department}</p>
              <p className="my-0">{FOOTER.institution}</p>
              <p className="my-0">{FOOTER.addressLine1}</p>
              <p className="my-0">{FOOTER.addressLine2}</p>
              <p className="my-0 mt-2">
                <a href={`mailto:${FOOTER.email}`}>{FOOTER.email}</a>
              </p>
            </address>
          </div>
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

// 정규 URL(canonical)을 현재 경로로 맞춘다.
// root.jsx 는 정적 HTML 에 홈 주소를 canonical 로 구워 넣는다(홈에는 맞다). 그런데
// SPA 라 모든 하위 페이지가 같은 HTML 을 받아, 그대로 두면 /events·/members 등이
// 전부 "나는 홈의 사본"이라고 선언해 검색엔진이 색인에서 제외한다.
// 라우트가 바뀔 때마다 실제 주소로 갱신해 각 페이지가 독립적으로 색인되게 한다.
function Canonical() {
  const { pathname } = useLocation()
  useEffect(() => {
    const el = document.head.querySelector('link[rel="canonical"]')
    if (!el) return
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
    el.setAttribute('href', SITE_ORIGIN + path)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Canonical />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
