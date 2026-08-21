import { useLoaderData } from 'react-router'
import { fetchHomeStats, fetchCollaboratingInstitutions } from '../lib/publicData'

// CSR: 브라우저에서 로드 — admin 저장이 재배포 없이 즉시 반영된다.
export async function clientLoader() {
  const [stats, collaborators] = await Promise.all([
    fetchHomeStats(),
    fetchCollaboratingInstitutions(),
  ])
  return { ...stats, collaborators }
}

// ─── Constants ────────────────────────────────────────────────────────────

// LIVE verbatim — philabcuk.org Home, do not paraphrase or expand.
const HERO = {
  kicker: 'PHI Lab @ CUK — Precision & Provenance Health Informatics',
  headline:
    'Contribute to digital healthcare innovation with data-intensive approaches based on real-world demands',
  tagline: 'from precision medicine to social determinants of health',
}

// 연구 카드 아이콘 — 24px stroke 아이콘, currentColor 로 카드 액센트 색 상속.
const ICONS = {
  network: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <circle cx="5" cy="6" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M6.8 7.7 10.9 16M17.2 7.7 13.1 16M7.2 6h9.6" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <ellipse cx="12" cy="5.5" rx="7" ry="2.8" />
      <path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13" />
      <path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M4 4v16h16" />
      <path d="m7 14 4-4 3 3 5-6" />
      <circle cx="19" cy="7" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
}

// LIVE verbatim — casing and grammar preserved as-is ('representation' lc,
// 'Real-world' hy, 'We deciphering').
// accent* = 가대 시그니처 색상(블루/골드/웜그레이) 카드 포인트.
const PILLARS = [
  {
    title: 'Knowledge representation',
    body: 'Data modeling, Data engineering, Pipeline construction, Data management & governance.',
    icon: 'network',
    accentBorder: 'border-t-brand-700',
    accentText: 'text-brand-700',
  },
  {
    title: 'Real-world Data (RWD)',
    body: 'Secondary use of real-world data including EHR/CDW data, public big data repositories such as FAERS.',
    icon: 'database',
    accentBorder: 'border-t-gold-600',
    accentText: 'text-gold-600',
  },
  {
    title: 'Real-world Evidence (RWE)',
    body: 'We deciphering scientific data processing, analytics methods for systematic evidence generation.',
    icon: 'chart',
    accentBorder: 'border-t-wgray-700',
    accentText: 'text-wgray-700',
  },
]

export default function Home() {
  const data = useLoaderData() ?? {}
  const collaborators = data.collaborators ?? []
  const collaboratorsCount = collaborators.length
  const activeProjectsCount = data.activeResearchCount ?? 0
  const publicationsCount = data.publicationsCount ?? 0

  const stats = [
    { value: activeProjectsCount, label: 'current research' },
    { value: publicationsCount, label: 'publications' },
    { value: collaboratorsCount, label: 'collaborating institutions' },
  ]

  return (
    <>
      {/* ── Hero — 은하수 사진 배경 + 어두운 오버레이 + 밝은 글씨.
           이미지 로드 전에도 흰 글씨가 보이도록 fallback 은 가대 네이비. ── */}
      <section
        className="relative overflow-hidden bg-brand-900 bg-cover bg-center border-b border-rule"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hero-galaxy.jpg)` }}
      >
        {/* 좌측(텍스트 영역)을 더 어둡게 — 우측 은하 디테일은 살린다 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-16">
          <p className="my-0 text-[14px] font-semibold tracking-wide text-gold-100">
            {HERO.kicker}
          </p>
          <h1 className="mt-2 max-w-[880px] text-[2.2rem] leading-[1.25] text-white">
            {HERO.headline}
          </h1>
          <p className="italic text-white/85 text-[1.2rem]">{HERO.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {stats.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-white/35 bg-white/10 px-4 py-1 text-[14px] text-white/85 backdrop-blur-sm"
              >
                <strong className="text-[16px] font-semibold text-white">{s.value}</strong>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-6 py-12">
        {/* ── Research Areas (3 pillars) ───────────────────────────── */}
        <h2 className="flex items-center gap-3">
          <span className="inline-block h-[18px] w-[4px] rounded-full bg-brand-700" aria-hidden="true" />
          Research
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
          {PILLARS.map((p) => (
            <div key={p.title} className={`border border-rule border-t-[3px] ${p.accentBorder} rounded-lg p-5`}>
              <span className={p.accentText}>{ICONS[p.icon]}</span>
              <p className="mt-3 mb-0 font-semibold text-ink">{p.title}</p>
              <p className="mt-2 mb-0 text-muted text-[15px] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        {/* ── Featured Quote ───────────────────────────────────────── */}
        {/* Author spelling corrected to 'McCandless' (LIVE shows 'Maccandless'). */}
        <blockquote className="my-10 not-italic rounded-r-lg bg-beige-50 border-l-4 border-gold-600 px-6 py-5">
          <p className="my-0 text-[2rem] leading-tight font-semibold text-ink">
            &ldquo;Data is the new soil, not oil.&rdquo;
          </p>
          <footer className="my-1 text-[15px] text-wgray-600">
            David McCandless (Author of Information is Beautiful)
          </footer>
        </blockquote>
        <p>Oil is valuable and tradable.</p>
        <p>
          Data only becomes valuable with considerable effort. In the data-driven era,
          the effectiveness of AI machines depends on the granularity and precision of the data.
        </p>
        <p>
          We focus on optimal informative transformation with the right application, so that could
          be a medium that bridges the gap between raw data and actionable knowledge.
        </p>

        {/* ── Collaborating Institutions ────────────────────────────── */}
        <h2 className="flex items-center gap-3">
          <span className="inline-block h-[18px] w-[4px] rounded-full bg-brand-700" aria-hidden="true" />
          Collaborating Institutions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {collaborators.map((inst) => (
            <div
              key={inst.name}
              className="flex flex-col items-center justify-center gap-2 border border-rule rounded-lg p-4 min-h-[7rem] text-center transition-colors hover:border-brand-200"
            >
              {inst.logo && <img src={inst.logo} alt={inst.name} className="max-h-11 max-w-full w-auto object-contain" />}
              <span className="text-muted text-[12px] leading-tight">{inst.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
