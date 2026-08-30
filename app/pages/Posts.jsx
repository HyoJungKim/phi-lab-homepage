import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchPosts } from '../lib/publicData'
import { usePageMeta } from '../lib/usePageMeta'
import { useAuth } from '../contexts/AuthContext'

// Posts 게시판 — 공지/소통 글 목록(표). News(행사 격자)와 역할이 다르다.
// CSR: 글 올리면 재배포 없이 즉시 반영(prerender 제외).

const PAGE_SIZE = 15

function boardDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

function Gate({ children }) {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <h1>Posts</h1>
      <div className="mt-8 rounded-lg border border-rule bg-beige-50 px-6 py-10 text-center">
        <div className="text-muted">{children}</div>
      </div>
    </div>
  )
}

export default function Posts() {
  const { isAuthenticated, isWhitelisted, loading: authLoading, user } = useAuth()
  const [items, setItems] = useState(null) // null=로딩, []=없음
  const [error, setError] = useState(null)
  usePageMeta({ title: 'Posts' })
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('') // 실제 적용된 검색어
  const [page, setPage] = useState(1)

  useEffect(() => {
    let alive = true
    fetchPosts()
      .then((data) => { if (alive) setItems(data) })
      .catch((e) => { if (alive) setError(e) })
    return () => { alive = false }
  }, [])

  // 고정(공지) / 일반 분리 — 일반에만 순번 매김(최신이 큰 번호)
  const { pinned, normal } = useMemo(() => {
    const list = items ?? []
    return {
      pinned: list.filter((p) => p.pinned),
      normal: list.filter((p) => !p.pinned),
    }
  }, [items])

  // 검색(제목) 적용 — 공지는 항상 위에 유지, 일반은 필터 + 페이지네이션
  const q = search.trim().toLowerCase()
  const filteredPinned = q ? pinned.filter((p) => p.title.toLowerCase().includes(q)) : pinned
  const filteredNormal = q ? normal.filter((p) => p.title.toLowerCase().includes(q)) : normal

  const totalPages = Math.max(1, Math.ceil(filteredNormal.length / PAGE_SIZE))
  const curPage = Math.min(page, totalPages)
  const pagedNormal = filteredNormal.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  function runSearch(e) {
    e?.preventDefault()
    setSearch(query)
    setPage(1)
  }

  // ── 접근 제어 ──
  if (authLoading) {
    return <div className="mx-auto max-w-[1200px] px-6 py-12"><p className="text-muted">Loading…</p></div>
  }
  if (!isAuthenticated) {
    return (
      <Gate>
        <p className="my-0 text-lg font-semibold text-brand-900">로그인이 필요합니다</p>
        <p className="my-0 mt-2">연구실 구성원만 볼 수 있는 게시판입니다.</p>
        <p className="mt-4 mb-0">
          <Link to="/admin/login" className="no-underline">
            <span className="rounded bg-brand-700 px-4 py-2 text-white">로그인</span>
          </Link>
        </p>
      </Gate>
    )
  }
  if (!isWhitelisted) {
    return (
      <Gate>
        <p className="my-0 text-lg font-semibold text-brand-900">접근 권한이 없습니다</p>
        <p className="my-0 mt-2">
          <code>{user?.email}</code> 계정은 연구실 구성원으로 등록되어 있지 않습니다.
        </p>
        <p className="mt-2 mb-0">관리자에게 초대를 요청하세요. (philab.cuk@gmail.com)</p>
      </Gate>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <h1>Posts</h1>

      {/* 검색 */}
      <form onSubmit={runSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목 검색…"
          className="flex-1 max-w-[360px] border border-rule px-3 py-2 text-[15px]"
        />
        <button type="submit" className="bg-brand-700 text-white px-4 py-2 text-[15px]">검색</button>
      </form>

      {error && <p className="mt-6 text-muted">Failed to load posts. Please try again later.</p>}
      {!error && items === null && <p className="mt-6 text-muted">Loading…</p>}

      {!error && items && (
        <>
          <table className="mt-6 w-full text-[15px]">
            <thead>
              <tr className="border-b border-ink/70 text-meta text-left">
                <th className="py-2 w-16 font-normal">No.</th>
                <th className="py-2 font-normal">Title</th>
                <th className="py-2 w-28 font-normal hidden sm:table-cell">Author</th>
                <th className="py-2 w-28 font-normal hidden sm:table-cell">Date</th>
                <th className="py-2 w-16 font-normal text-right hidden sm:table-cell">Views</th>
              </tr>
            </thead>
            <tbody>
              {filteredPinned.length === 0 && filteredNormal.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted">게시글이 없습니다.</td></tr>
              )}

              {/* 공지(Notice) — 항상 위 */}
              {filteredPinned.map((p) => (
                <PostRow key={p.id} post={p} no={<span className="text-[12px] text-brand-700 border border-brand-200 rounded px-1.5 py-0.5">Notice</span>} />
              ))}

              {/* 일반 — 페이지네이션, 순번은 전체 일반글 기준 내림차순 */}
              {pagedNormal.map((p, i) => {
                const no = filteredNormal.length - ((curPage - 1) * PAGE_SIZE + i)
                return <PostRow key={p.id} post={p} no={no} />
              })}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-1">
              <PageBtn disabled={curPage === 1} onClick={() => setPage(curPage - 1)}>Prev</PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <PageBtn key={n} active={n === curPage} onClick={() => setPage(n)}>{n}</PageBtn>
              ))}
              <PageBtn disabled={curPage === totalPages} onClick={() => setPage(curPage + 1)}>Next</PageBtn>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PostRow({ post, no }) {
  return (
    <tr className="border-b border-rule hover:bg-[#fafafa]">
      <td className="py-3 text-center text-meta">{no}</td>
      <td className="py-3">
        <Link to={`/posts/${post.id}`} className="text-ink hover:underline">{post.title}</Link>
      </td>
      <td className="py-3 text-muted hidden sm:table-cell">{post.authorName}</td>
      <td className="py-3 text-muted hidden sm:table-cell">{boardDate(post.publishedAt)}</td>
      <td className="py-3 text-muted text-right hidden sm:table-cell">{post.views}</td>
    </tr>
  )
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-9 px-3 py-1.5 border text-[14px] ${active ? 'bg-brand-700 text-white border-brand-700' : 'border-rule text-ink hover:bg-[#fafafa]'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}
