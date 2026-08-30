import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchPost, incrementPostViews } from '../lib/publicData'
import { usePageMeta } from '../lib/usePageMeta'
import { formatNewsDate } from '../components/NewsCard'
import PostBody from '../components/PostBody'
import { useAuth } from '../contexts/AuthContext'

// Posts 상세 — CSR(목록과 같은 사유). 본문은 PostBody(BlockNote 변환)로 렌더.

export default function Post() {
  const { id } = useParams()
  const { isAuthenticated, isWhitelisted, loading: authLoading, user } = useAuth()
  const [post, setPost] = useState(undefined) // undefined=로딩, null=없음
  const [error, setError] = useState(null)
  const countedRef = useRef(null) // 같은 글에서 조회수 중복 증가 방지(StrictMode/재렌더)

  useEffect(() => {
    let alive = true
    setPost(undefined)
    fetchPost(id)
      .then((data) => { if (alive) setPost(data) })
      .catch((e) => { if (alive) setError(e) })
    // 조회수 +1 — 글당 1회만
    if (id && countedRef.current !== id) {
      countedRef.current = id
      incrementPostViews(id).catch(() => {})
    }
    return () => { alive = false }
  }, [id])

  usePageMeta({ title: post?.title })

  // ── 접근 제어 ──
  if (authLoading) {
    return <div className="mx-auto max-w-[1200px] px-6 py-12"><p className="text-muted">Loading…</p></div>
  }
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <h1>Posts</h1>
        <div className="mt-8 rounded-lg border border-rule bg-beige-50 px-6 py-10 text-center">
          <p className="my-0 text-lg font-semibold text-brand-900">로그인이 필요합니다</p>
          <div className="mt-2 text-muted">
            <p className="my-0">연구실 구성원만 볼 수 있는 게시판입니다.</p>
            <p className="mt-4 mb-0">
              <Link to="/admin/login" className="no-underline">
                <span className="rounded bg-brand-700 px-4 py-2 text-white">로그인</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (!isWhitelisted) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <h1>Posts</h1>
        <div className="mt-8 rounded-lg border border-rule bg-beige-50 px-6 py-10 text-center">
          <p className="my-0 text-lg font-semibold text-brand-900">접근 권한이 없습니다</p>
          <div className="mt-2 text-muted">
            <p className="my-0">
              <code>{user?.email}</code> 계정은 연구실 구성원으로 등록되어 있지 않습니다.
            </p>
            <p className="mt-2 mb-0">관리자에게 초대를 요청하세요. (philab.cuk@gmail.com)</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <p className="text-muted">Failed to load the post. Please try again later.</p>
      </div>
    )
  }
  if (post === undefined) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }
  if (post === null) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <h1>Post not found</h1>
        <p className="text-muted">
          The post does not exist or is not published.{' '}
          <Link to="/posts">Back to Posts</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <p className="my-0 text-meta text-[14px]">{formatNewsDate(post.publishedAt)}</p>
      <h1 className="mt-1">{post.title}</h1>
      <PostBody json={post.bodyJson} />
      <p className="mt-10">
        <Link to="/posts">← Back to Posts</Link>
      </p>
    </div>
  )
}
