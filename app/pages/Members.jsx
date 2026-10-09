import { useEffect } from 'react'
import { useLocation, useLoaderData } from 'react-router'
import { fetchMembers } from '../lib/publicData'

export async function loader() {
  return fetchMembers()
}

function SocialLine({ member }) {
  const items = []
  if (member.email) {
    items.push(
      <a key="email" href={`mailto:${member.email}`}>
        {member.email}
      </a>,
    )
  }
  if (member.googleScholar) {
    items.push(
      <a key="gs" href={member.googleScholar} target="_blank" rel="noopener noreferrer">
        Google Scholar
      </a>,
    )
  }
  if (member.linkedin) {
    items.push(
      <a key="li" href={member.linkedin} target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>,
    )
  }
  if (items.length === 0) return null
  return (
    <p className="my-2 text-[15px]">
      {items.map((el, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {el}
        </span>
      ))}
    </p>
  )
}

function ResearchInterests({ tags }) {
  if (!tags || tags.length === 0) return null
  return (
    <p className="my-1 text-[15px] text-muted">
      <span className="text-meta">Research interests:</span> {tags.join(', ')}
    </p>
  )
}

// 이름 표기 — 한글 이름 진하게/크게, 그 옆에 영문 이름 연하게.
// 한글 이름이 없으면 영문만 진하게.
function MemberName({ member, korClass = 'text-xl', engClass = 'text-base' }) {
  const ko = member.nameKo
  const en = member.name
  if (!ko) return <span className={`font-bold text-ink ${korClass}`}>{en}</span>
  return (
    <span className="inline-flex items-baseline gap-2 flex-wrap">
      <span className={`font-bold text-ink ${korClass}`}>{ko}</span>
      {en && <span className={`font-normal text-muted ${engClass}`}>{en}</span>}
    </span>
  )
}

function ProfessorRow({ member }) {
  return (
    <div
      id={member.id}
      className="flex flex-col sm:flex-row gap-6 items-start scroll-mt-24 mt-6"
    >
      <img
        src={member.photoLive ?? member.photo}
        alt={member.name}
        className="w-40 sm:w-44 aspect-[3/4] object-cover flex-shrink-0"
      />
      <div className="min-w-0">
        <p className="my-0"><MemberName member={member} korClass="text-2xl" engClass="text-lg" /></p>
        <p className="my-0 text-muted">{member.title}</p>
        <p className="my-0 text-muted">{member.degree}</p>
        {member.bioShort && <p className="text-muted">{member.bioShort}</p>}
        <ResearchInterests tags={member.researchInterests} />
        <SocialLine member={member} />
      </div>
    </div>
  )
}

function StudentRow({ member }) {
  return (
    <div
      id={member.id}
      className="flex flex-col sm:flex-row gap-6 items-start scroll-mt-24 py-6 border-b border-rule last:border-b-0"
    >
      <img
        src={member.photo}
        alt={member.name}
        loading="lazy"
        decoding="async"
        className="w-40 sm:w-44 aspect-[3/4] object-cover flex-shrink-0"
      />
      <div className="min-w-0">
        <p className="my-0"><MemberName member={member} korClass="text-xl" engClass="text-base" /></p>
        <p className="my-0 text-muted">{member.degree}</p>
        <ResearchInterests tags={member.researchInterests} />
        <SocialLine member={member} />
      </div>
    </div>
  )
}

function AlumnusItem({ member }) {
  return (
    <div
      id={member.id}
      className="scroll-mt-24 py-4 border-b border-rule last:border-b-0"
    >
      <p className="my-0">
        <MemberName member={member} korClass="text-lg" engClass="text-[15px]" />
        {[member.degree, member.graduatedYear].filter(Boolean).map((v) => (
          <span key={v} className="text-muted">{' '}· {v}</span>
        ))}
      </p>
      {member.role && <p className="my-0 text-muted text-[15px]">{member.role}</p>}
      {member.currentAffiliation && (
        <p className="my-0 text-muted text-[15px]">Now: {member.currentAffiliation}</p>
      )}
      {(member.googleScholar || member.linkedin) && (
        <p className="my-1 text-[15px]">
          {member.googleScholar && (
            <a href={member.googleScholar} target="_blank" rel="noopener noreferrer">
              Google Scholar
            </a>
          )}
          {member.googleScholar && member.linkedin && ' · '}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          )}
        </p>
      )}
    </div>
  )
}

export default function Members() {
  const data = useLoaderData()
  const location = useLocation()

  const { roleOrder = [], piRole } = data
  // PI(역할 목록 맨 앞)는 별도 섹션. 과거 한글 값('지도교수')도 함께 인정.
  const isPi = (m) => m.role === piRole || m.role === '지도교수'
  const professor = data.current.find(isPi)
  const rest = data.current.filter((m) => !isPi(m))

  // 역할별 그룹 — member_roles 의 순서대로, 목록에 없는 역할은 맨 뒤에 등장 순서로.
  const seen = new Set()
  const orderedRoles = [
    ...roleOrder.filter((r) => r !== piRole),
    ...rest.map((m) => m.role).filter((r) => r && !roleOrder.includes(r)),
  ].filter((r) => (seen.has(r) ? false : seen.add(r)))
  const groups = orderedRoles
    .map((role) => ({ role, members: rest.filter((m) => m.role === role) }))
    .filter((g) => g.members.length > 0)
  const noRole = rest.filter((m) => !m.role)   // 역할 미지정

  const alumni = data.alumni

  // Hash navigation: if URL has #<id>, smooth-scroll to that member's card.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash])

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <h1>Members</h1>

      {professor && (
        <>
          <h2>{professor.role || piRole || 'Principal Investigator'}</h2>
          <ProfessorRow member={professor} />
        </>
      )}
      {groups.map((g) => (
        <section key={g.role}>
          <h2>{g.role}</h2>
          <div>
            {g.members.map((member) => (
              <StudentRow key={member.id} member={member} />
            ))}
          </div>
        </section>
      ))}
      {noRole.length > 0 && (
        <section>
          <h2>Members</h2>
          <div>
            {noRole.map((member) => (
              <StudentRow key={member.id} member={member} />
            ))}
          </div>
        </section>
      )}

      {/* 졸업·수료 멤버 — 현재 멤버 목록 맨 아래 별도 구분 */}
      {alumni.length > 0 && (
        <section>
          <h2>Alumni</h2>
          <div>
            {alumni.map((member) => (
              <AlumnusItem key={member.id} member={member} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
