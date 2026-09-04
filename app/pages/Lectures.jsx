import { createContext, useContext, useState } from 'react'
import { useLoaderData } from 'react-router'
import { fetchLectures } from '../lib/publicData'
import Lightbox from '../components/Lightbox'
import { usePageMeta } from '../lib/usePageMeta'

// CSR: 브라우저에서 로드 — admin 저장이 재배포 없이 즉시 반영된다.
export async function clientLoader() {
  return fetchLectures()
}

// Context lets nested CourseImages open the page-level lightbox without
// prop-drilling through SemesterSection → CourseItem.
const LightboxContext = createContext(() => {})

function semesterOrder(s) {
  const [term, year] = s.split(' ')
  const termRank = { Spring: 0, Summer: 1, Fall: 2 }
  return parseInt(year) * 10 + (termRank[term] ?? 5)
}

// LIVE Korean semester heading shown beside the English form.
const SEMESTER_KO = {
  'Spring 2026': '2026학년도 1학기',
  'Fall 2025': '2025학년도 2학기',
  'Spring 2025': '2025학년도 1학기',
}

function groupBySemester(courses) {
  const map = {}
  for (const c of courses) {
    if (!map[c.semester]) map[c.semester] = []
    map[c.semester].push(c)
  }
  return Object.entries(map).sort(([a], [b]) => semesterOrder(b) - semesterOrder(a))
}

const LEVEL_LABEL = { graduate: 'Graduate', undergraduate: 'Undergraduate' }

// 상단 과목 요약 — 주제별 그룹(titleEn 기준). 한 과목이 여러 주제에 속할 수 있다.
// 새 과목이 추가되면 여기에 없는 과목은 'Other' 그룹으로 모인다.
// bg/fg = 주제별 색(연한 배경 + 진한 글자). 라벨·칩에 함께 적용해 색상 코딩.
const COURSE_THEMES = [
  {
    label: 'AI (ML/DL)',
    bg: '#e6eefb',
    fg: '#0c2e86',
    titles: [
      'Artificial Intelligence Programming Design',
      'Digital Health AI System Design',
      'Machine Learning',
    ],
  },
  {
    label: 'Python Programming',
    bg: '#f5ead2',
    fg: '#8a6a2f',
    titles: ['Programming for AI, Graduate Course', 'Computers & Programming 1'],
  },
  {
    label: 'Data Science (R)',
    bg: '#e0f0ea',
    fg: '#0f6e56',
    titles: ['Biomedical Big Data Analysis', 'Machine Learning'],
  },
  {
    label: 'Database (RDB/SQL)',
    bg: '#f5e7e0',
    fg: '#9a4422',
    titles: ['Database for Healthcare'],
  },
  {
    label: 'Capstone / PBL',
    bg: '#ece7f8',
    fg: '#493d8a',
    titles: ['Capstone Design for BMSW 1', 'Digital Health AI System Design'],
  },
]
const OTHER_THEME_COLOR = { bg: '#f1efe8', fg: '#5f5e5a' }

// 아직 개설 전(예정) 과목 — 요약 칩에 'new' 표시. 개설되면 여기서 뺀다.
const UPCOMING_COURSES = new Set()

function CourseImages({ images }) {
  const openLightbox = useContext(LightboxContext)
  if (!images || images.length === 0) return null
  // Events 페이지처럼 높이 고정 썸네일을 가로로 배열 — 1장이든 3장이든 균일한 크기.
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((src, i) => (
        <button
          key={src}
          type="button"
          onClick={() => openLightbox(images, i)}
          aria-label="Enlarge image"
          className="block p-0 m-0 cursor-zoom-in focus:outline-none focus:ring-1 focus:ring-ink"
        >
          <img
            src={src}
            alt=""
            role="presentation"
            loading="lazy"
            decoding="async"
            className="h-[150px] w-auto max-w-full object-cover rounded-lg border border-rule"
          />
        </button>
      ))}
    </div>
  )
}

function CourseItem({ course }) {
  const { code, titleEn, titleKo, level, description, objectives, images, tags } = course
  const paragraphs = description ? description.split('\n\n').filter(Boolean) : []
  return (
    <article id={course.id} className="scroll-mt-24 py-6 border-b border-rule last:border-b-0">
      <p className="my-0 text-[15px] text-meta">
        {code && <span className="font-mono">{code}</span>}
        {code && level && ' · '}
        {level && LEVEL_LABEL[level]}
      </p>
      <p className="mt-1 mb-0">
        <span className="text-lg font-semibold text-ink">{titleKo}</span>
        {titleEn && <span className="ml-2 text-muted text-[15px]">{titleEn}</span>}
      </p>

      {paragraphs.length > 0 && (
        <div className="mt-2">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {objectives && objectives.length > 0 && (
        <ul className="mt-2 list-disc pl-5 marker:text-meta">
          {objectives.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      )}

      {tags && tags.length > 0 && (
        <p className="my-1 text-[15px] text-meta">{tags.join(', ')}</p>
      )}

      <CourseImages images={images} />
    </article>
  )
}

function SemesterSection({ semester, courses }) {
  const ko = SEMESTER_KO[semester]
  return (
    <section className="mt-10">
      <h2 className="mt-1 mb-3 flex items-center gap-3">
        <span className="inline-block h-[20px] w-[4px] rounded-full bg-gold-600" aria-hidden="true" />
        <span>
          <span className="text-brand-900">{semester}</span>
          {ko && <span className="text-muted text-[15px] font-normal"> · {ko}</span>}
        </span>
      </h2>
      {courses.map((c) => (
        <CourseItem key={c.id} course={c} />
      ))}
    </section>
  )
}

export default function Lectures() {
  usePageMeta({ title: 'Teaching', description: '가톨릭대학교 바이오메디컬소프트웨어학과 학부·대학원 강의.' })
  const lecturesData = useLoaderData() ?? []
  const [lightbox, setLightbox] = useState(null)
  // 공용 Lightbox 는 { src, caption } 배열을 받는다 — 강의 이미지(문자열)를 매핑.
  const openLightbox = (images, index) =>
    setLightbox({ images: images.map((src) => ({ src })), index })

  const grouped = groupBySemester(lecturesData)

  // 여러 학기에 걸쳐 반복되는 과목은 1회만 — 상단 과목명 요약(칩)용.
  const uniqueCourses = (() => {
    const seen = new Set()
    const out = []
    for (const c of lecturesData) {
      const key = c.titleEn || c.titleKo
      if (key && !seen.has(key)) {
        seen.add(key)
        out.push(c)
      }
    }
    return out
  })()

  // 주제 요약은 큐레이션(COURSE_THEMES) 기준으로 과목명을 그대로 표시 —
  // 아직 개설 전인 예정 과목도 노출된다. DB에는 있으나 주제에 없는 과목은
  // 누락 방지를 위해 'Other' 그룹으로 모은다.
  const nameOf = (c) => c.titleEn || c.titleKo

  // 과목명 → 가장 최신 학기 강의의 id. 요약 칩 클릭 시 그 강의로 스크롤.
  const latestLectureId = (() => {
    const best = {}
    for (const c of lecturesData) {
      const key = nameOf(c)
      const ord = semesterOrder(c.semester)
      if (key && (!(key in best) || ord > best[key].ord)) best[key] = { id: c.id, ord }
    }
    const out = {}
    Object.keys(best).forEach((k) => (out[k] = best[k].id))
    return out
  })()
  const scrollToCourse = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const themedNames = new Set(COURSE_THEMES.flatMap((t) => t.titles))
  const otherNames = uniqueCourses.map(nameOf).filter((n) => !themedNames.has(n))
  const courseGroups = [
    ...COURSE_THEMES.map((t) => ({ label: t.label, bg: t.bg, fg: t.fg, titles: t.titles })),
    ...(otherNames.length > 0
      ? [{ label: 'Other', ...OTHER_THEME_COLOR, titles: otherNames }]
      : []),
  ]

  return (
    <LightboxContext.Provider value={openLightbox}>
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <h1>Teaching</h1>
        {courseGroups.length > 0 && (
          <div className="mt-3 space-y-2.5">
            {courseGroups.map((g) => (
              <div key={g.label} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-[16px] font-semibold min-w-[165px]" style={{ color: g.fg }}>
                  {g.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {g.titles.map((title) => {
                    const targetId = latestLectureId[title]
                    const inner = (
                      <>
                        {title}
                        {UPCOMING_COURSES.has(title) && (
                          <span className="ml-1 text-[11px] opacity-60">· new</span>
                        )}
                      </>
                    )
                    const cls = 'rounded-sm px-2.5 py-1 text-[13px]'
                    const style = { backgroundColor: g.bg, color: g.fg }
                    return targetId ? (
                      <button
                        key={`${g.label}-${title}`}
                        type="button"
                        onClick={() => scrollToCourse(targetId)}
                        className={`${cls} cursor-pointer transition-opacity hover:opacity-75`}
                        style={style}
                        title="최신 강의로 이동"
                      >
                        {inner}
                      </button>
                    ) : (
                      <span key={`${g.label}-${title}`} className={cls} style={style}>
                        {inner}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {grouped.length > 0 ? (
          grouped.map(([semester, courses]) => (
            <SemesterSection key={semester} semester={semester} courses={courses} />
          ))
        ) : (
          <p className="text-muted py-10">No courses to display yet.</p>
        )}
      </div>
      <Lightbox state={lightbox} setState={setLightbox} onClose={() => setLightbox(null)} />
    </LightboxContext.Provider>
  )
}
