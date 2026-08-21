import { useState } from 'react'
import { useLoaderData } from 'react-router'
import { fetchResearch } from '../lib/publicData'

// CSR: 브라우저에서 로드 — admin 저장이 재배포 없이 즉시 반영된다.
export async function clientLoader() {
  return fetchResearch()
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: '연구실', label: 'PHI Lab' },
  { key: '카카오', label: '카카오헬스케어' },
  { key: '은평성모', label: '은평성모병원' },
  { key: '부천성모', label: '부천성모병원' },
  { key: '삼성서울', label: '삼성서울병원' },
  { key: '숙명여대', label: '숙명여자대학교' },
  { key: '전남대', label: '전남대학교' },
  { key: 'rwd', label: 'RWD / HIRA' },
]

// research.json institutionKo → LIVE data-inst group key
const GROUP_KEY = {
  'PHI Lab': '연구실',
  '가톨릭': '가톨릭',
  '카카오헬스케어': '카카오',
  '은평성모': '은평성모',
  '부천성모': '부천성모',
  '삼성서울': '삼성서울',
  '숙명여대': '숙명여대',
  '전남대': '전남대',
}

function affiliationLine(project) {
  return (project.affiliations ?? [])
    .map((a) =>
      a.departmentKo ? `${a.institutionKo} · ${a.departmentKo}` : a.institutionKo,
    )
    .join(' / ')
}

function matchesFilter(project, filterKey) {
  if (filterKey === 'all') return true
  if (filterKey === 'rwd') {
    const tags = project.tagsLive ?? []
    return tags.includes('RWD') || tags.includes('HIRA')
  }
  return (project.affiliations ?? []).some(
    (a) => GROUP_KEY[a.institutionKo] === filterKey,
  )
}

function ProjectItem({ project }) {
  const collab = project.notes ?? project.collaborators?.international?.join(' · ')
  const affil = affiliationLine(project)
  return (
    <article className="py-6 border-b border-rule last:border-b-0">
      {affil && <p className="my-0 text-[15px] text-meta">{affil}</p>}
      <p className="my-1 font-semibold text-ink">{project.title}</p>
      {project.descriptionKo && (
        <p className="my-1 text-muted">{project.descriptionKo}</p>
      )}
      {project.tagsLive?.length > 0 && (
        <p className="my-1 text-[15px] text-meta">{project.tagsLive.join(', ')}</p>
      )}
      {collab && <p className="my-0 text-[15px] text-meta">{collab}</p>}
    </article>
  )
}

function FeaturedInitiative({ project }) {
  // MOMENTUM uses fullTitle (LIVE Featured paragraph); AI-Trajectory uses title
  const heading = project.fullTitle ?? project.title
  const hashtags = (project.tagsFeaturedLive ?? []).map((t) => `#${t}`).join(' ')
  return (
    <div className="my-4">
      <p className="my-0 font-semibold text-ink">{heading}</p>
      {(hashtags || project.notes) && (
        <p className="my-1 text-[15px] text-muted">
          {hashtags}
          {project.notes && (
            <>
              {hashtags && ' '}
              <em>{project.notes}</em>
            </>
          )}
        </p>
      )}
    </div>
  )
}

function FilterBar({ activeFilter, onChange }) {
  return (
    <p className="text-[15px] my-2">
      {FILTERS.map((f, i) => {
        const isOn = activeFilter === f.key
        return (
          <span key={f.key}>
            {i > 0 && <span className="text-meta"> · </span>}
            <button
              type="button"
              onClick={() => onChange(f.key)}
              className={
                isOn
                  ? 'text-ink underline underline-offset-4 decoration-1'
                  : 'text-muted hover:underline'
              }
            >
              {f.label}
            </button>
          </span>
        )
      })}
    </p>
  )
}

export default function Research() {
  const [activeFilter, setActiveFilter] = useState('all')
  const researchData = useLoaderData() ?? []

  // Featured: LIVE Major Research Initiatives (MOMENTUM, AI-Trajectory)
  const featured = researchData.filter((p) => p.featured)

  // Grid: every item with a LIVE phi-card surface (i.e. has descriptionKo).
  // AI-Trajectory has no grid card on LIVE, so descriptionKo is null and it
  // is excluded from grid. MOMENTUM appears in both Featured and grid per LIVE.
  const gridSource = researchData.filter((p) => p.descriptionKo != null)
  const gridFiltered = gridSource.filter((p) => matchesFilter(p, activeFilter))

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <h1>Current Research</h1>

      {featured.length > 0 && (
        <section className="mt-6 pb-6 border-b border-rule">
          {featured.map((p) => (
            <FeaturedInitiative key={p.id} project={p} />
          ))}
        </section>
      )}

      <div className="mt-6">
        <FilterBar activeFilter={activeFilter} onChange={setActiveFilter} />
        <p className="text-[15px] text-meta my-1">{gridFiltered.length} projects</p>
      </div>

      <div className="mt-2">
        {gridFiltered.length > 0 ? (
          gridFiltered.map((p) => <ProjectItem key={p.id} project={p} />)
        ) : (
          <p className="text-muted py-10">No projects to display yet.</p>
        )}
      </div>
    </div>
  )
}
