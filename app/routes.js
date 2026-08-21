import { index, route, layout } from '@react-router/dev/routes'

export default [
  // 공개 페이지 (헤더/푸터 공통 Layout) — 전면 CSR (2026-07-02 prerender 폐지,
  // admin 저장이 재배포 없이 즉시 반영되도록 clientLoader 로 로드)
  layout('components/Layout.jsx', [
    index('pages/Home.jsx'),
    route('about', 'pages/About.jsx'),
    route('members', 'pages/Members.jsx'),
    route('professor', 'pages/Professor.jsx'),
    route('research', 'pages/Research.jsx'),
    route('publications', 'pages/Publications.jsx'),
    route('lectures', 'pages/Lectures.jsx'),
    route('news', 'pages/News.jsx'),
    route('news/:id', 'pages/NewsItem.jsx'),
    route('posts', 'pages/Posts.jsx'),
    route('posts/:id', 'pages/Post.jsx'),
  ]),

  // admin 로그인 / 초대 수락 (가드 밖 — 로그인 전 접근)
  route('admin/login', 'pages/admin/AdminLogin.jsx'),
  route('admin/accept', 'pages/admin/AdminAccept.jsx'),

  // admin — 클라이언트 렌더(CSR). 인증+whitelist 가드 → 레이아웃 → 페이지
  layout('components/ProtectedRoute.jsx', [
    route('admin', 'components/AdminLayout.jsx', [
      index('pages/admin/AdminDashboard.jsx'),
      // whitelist 전원 (researcher/alumni 포함)
      route('my-profile', 'pages/admin/AdminMyProfile.jsx'),
      route('news', 'pages/admin/AdminNews.jsx'),
      route('posts', 'pages/admin/AdminPosts.jsx'),
      // editor(admin/professor) 전용
      layout('components/EditorProtectedRoute.jsx', [
        route('users', 'pages/admin/AdminUsers.jsx'),
        route('members', 'pages/admin/AdminMembers.jsx'),
        route('professor', 'pages/admin/AdminProfessor.jsx'),
        route('publications', 'pages/admin/AdminPublications.jsx'),
        route('research', 'pages/admin/AdminResearch.jsx'),
        route('institutions', 'pages/admin/AdminInstitutions.jsx'),
        route('lectures', 'pages/admin/AdminLectures.jsx'),
      ]),
    ]),
  ]),

  // 404
  route('*', 'pages/NotFound.jsx'),
]
