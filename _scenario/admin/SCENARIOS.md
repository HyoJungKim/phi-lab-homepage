# Admin 페이지 — 시나리오 스펙 v3

> 작성일: 2026-05-21
> 상태: 확정 (SQL 스키마 작업으로 이행 가능)
> 다음 단계: SQL 스키마 + RLS 정책 + RPC 함수 초안

## 1. 결정 요약

### 아키텍처
- **백엔드**: Supabase (managed Postgres + Auth + Storage). API 서버 없음.
- **인증**: Google OAuth (Supabase Auth)
- **권한 게이트**: `admin_users` 테이블 화이트리스트 + Postgres RLS (이중 방어)
- **초대 시스템**: `invites` 테이블 + `redeem_invite` RPC (SECURITY DEFINER)
- **공개 사이트 렌더링**: **하이브리드 (SSG + CSR)**
  - SSG (`vite-react-ssg`): About / Home / Professor / Members / Publications / Research / Lectures / News
  - CSR (SPA): 게시판 (`/posts`, `/posts/:id`) — 즉시 반영 우선, SEO 일부 양보
- **`/admin/*` 라우트**: SPA/CSR (인증 후 Supabase 직접 호출)
- **콘텐츠 변경 → 라이브 반영**:
  - SSG 도메인: Supabase Database Webhook → Render Deploy Hook 자동 재배포 (1-2분), admin 에 "지금 재발행" 버튼 안전망
  - CSR 게시판: 발행 즉시 반영 (재배포 불필요)
- **페이지 본문 DB 이전**: About/Home/Professor 의 본문은 JSX 하드코딩 → `pages` 테이블 이전

### 권한 모델
| 역할 | 로그인 | 게시판/뉴스 | 사이트 콘텐츠 | 멤버 초대/제거 | 비고 |
|---|---|---|---|---|---|
| 외부인 (비화이트리스트) | ❌ | ❌ | ❌ | ❌ | — |
| `admin` (박태원) | ✅ | **모두** 수정/삭제 | ✅ | ✅ | 사이트 관리자/개발자 |
| `professor` (김효정) | ✅ | **모두** 수정/삭제 | ✅ | ✅ | PI |
| `researcher` | ✅ | **본인 글만** 수정/삭제 | ❌ | ❌ | 일반 연구원 |
| `alumni` | ✅ | TBD (RLS 라운드에서 확정) | ❌ | ❌ | 졸업생 — 추후 확장용 |

**그룹 식별자 (RLS 에서 사용):**
- "사이트 전체 콘텐츠 권한자" = `role in ('admin', 'professor')`
- "화이트리스트 통과" = 4개 role 전부

### 도메인별 결정
| 도메인 | 본문 형식 | 이미지 | status (draft/published) |
|---|---|---|---|
| 뉴스 (news) | 짧은 plain text | JSONB 배열 `[{url, caption}]` | ✅ |
| 게시판 (posts) | Rich text (`body_json jsonb`) | 본문 inline | ✅ |
| 페이지 (pages: about/home/professor) | Rich text (`body_json jsonb`) | 본문 inline | ✅ |
| 멤버 (members) | 구조화 필드 | 단일 프로필 사진 | ❌ (즉시 공개) |
| 논문 (publications) | 구조화 필드 | — | ❌ |
| 연구 (research) | 구조화 필드 | — | ❌ (LIVE 순서 보존) |
| 강의 (lectures) | 구조화 필드 | — | ❌ |

### 정책 default
- **삭제**: hard delete (실수 방지는 admin UI 확인 모달)
- **이미지 업로드**: 10MB 한도, jpg / png / webp
- **초대 잠금**: `intended_email` **필수** (특정 이메일에만 사용 가능)
- **부가기능** (댓글/태그/조회수/공감/검색): v1 제외, 추후 별도 기획

### 하이브리드 채택의 결과
- **SSG 도메인** (대부분): 공개 사이트가 Supabase 런타임 호출 안 함, API 호출량 = 빌드 횟수에만 비례, SEO 우수, Supabase 장애 시에도 정상
- **CSR 도메인** (게시판): 즉시 반영, 단 SEO 약함 (Google 만 일부 인덱싱, 네이버/다음/학술봇은 빈 HTML 가능), 방문자 진입 시 ~500ms 빈 화면 → 데이터 도착 후 렌더
- **anon RLS select 정책**: `posts` 테이블에만 `where status='published'` 정책 필요 (게시판 CSR 때문). 나머지 테이블은 anon SELECT 차단 가능
- 빌드 시 Node 프로세스가 Supabase 호출 → 사용 키는 `SUPABASE_SERVICE_ROLE_KEY` (빌드 환경변수, 브라우저 노출 안 됨)
- 게시판 CSR 호출은 `SUPABASE_ANON_KEY` (브라우저 노출 OK, RLS 가 보호)

## 2. 시나리오 테이블

### Group A — 인증 / 권한

| # | Actor | Screen | Action | Result | Data Flow | State Change | Permission |
|---|---|---|---|---|---|---|---|
| S-A1 | 비로그인 | `/admin/*` | URL 접근 | 로그인 화면 리다이렉트 | 라우터 가드 | — | 차단 |
| S-A2 | 교수님 | `/admin/login` | Google 로그인 | 전체 대시보드 | OAuth → `admin_users.role='professor'` 확인 | 세션 발급 | 화이트리스트 |
| S-A3 | 연구원 | `/admin/login` | Google 로그인 | 제한 대시보드 (게시판/뉴스만) | OAuth → `role='researcher'` | 세션 발급 | 화이트리스트 |
| S-A4 | 미허가 | `/admin/login` | Google 로그인 (화이트리스트 외) | "권한 없음" + 자동 로그아웃 | 즉시 signOut | 세션 폐기 | 차단 |
| S-A5 | 교수님 | `/admin/users` | "초대" → 역할 + **이메일 입력 (필수)** | 링크 + 클립보드 복사 | `invites INSERT` (intended_email 포함) | row 추가 | 교수님 |
| S-A6 | 신규 | `/admin/accept-invite?token=…` | Google 로그인 | 대시보드 진입 | `redeem_invite` RPC → 이메일 매치 확인 | `admin_users INSERT` + `invites.used_at` | 토큰 보유자 + 이메일 일치 |
| S-A7 | 교수님 | `/admin/users` | "제거" | 다음 요청부터 차단 | `admin_users DELETE` | row 삭제 | 교수님 |

### Group B — 뉴스

| # | Actor | Screen | Action | Data Flow | Permission |
|---|---|---|---|---|---|
| S-B1 | 화이트리스트 전원 | `/admin/news/new` | 제목 + 짧은 본문 + 이미지 N장 + status | `news INSERT (title, body_short, images jsonb, status, author_email)` | 전원 |
| S-B2 | 연구원 | `/admin/news/:id` | 수정 | `news UPDATE` | **본인 글만** (RLS) |
| S-B2' | 교수님 | `/admin/news/:id` | 수정 | `news UPDATE` | **전체** |
| S-B3 | 연구원 | `/admin/news/:id` | 삭제 (확인 모달) | `news DELETE` | 본인 글만 (RLS) |
| S-B3' | 교수님 | `/admin/news/:id` | 삭제 | `news DELETE` | 전체 |

### Group B' — 게시판

| # | Actor | Screen | Action | Data Flow | Permission |
|---|---|---|---|---|---|
| S-B'1 | 전원 | `/admin/posts/new` | 제목 + rich text 본문 (이미지 inline) + status | `posts INSERT (title, body_json jsonb, status, author_email)` | 전원 |
| S-B'2 | 연구원 | `/admin/posts/:id` | 수정 | `posts UPDATE` | 본인 글만 (RLS) |
| S-B'2' | 교수님 | `/admin/posts/:id` | 수정 | `posts UPDATE` | 전체 |
| S-B'3 | 연구원 | `/admin/posts/:id` | 삭제 (확인 모달) | `posts DELETE` | 본인 글만 |
| S-B'3' | 교수님 | `/admin/posts/:id` | 삭제 | `posts DELETE` | 전체 |

### Group C — 사이트 콘텐츠 (교수님 전용)

| # | Actor | Screen | Action | Data Flow | Permission |
|---|---|---|---|---|---|
| S-C1 | 교수님 | `/admin/members` | 멤버 CRUD (졸업 처리 포함) | `members CRUD` | 교수님 |
| S-C2 | 교수님 | `/admin/publications` | 논문 CRUD | `publications CRUD` | 교수님 |
| S-C3 | 교수님 | `/admin/research` | 연구주제 CRUD | `research CRUD` (LIVE 순서 보존) | 교수님 |
| S-C4 | 교수님 | `/admin/lectures` | 강의 CRUD | `lectures CRUD` | 교수님 |
| S-C5 | 교수님 | `/admin/pages/:slug` | rich text 편집 + status 토글 | `pages UPSERT (slug PK, body_json jsonb, status)` | 교수님 |
| S-C6 | 권한자 | 모든 폼 | 이미지 업로드 | Supabase Storage → public URL → 해당 테이블 컬럼 | 도메인 권한 종속 |

### Group D — 인프라 / 빌드 / 배포

| # | Actor | Action | Data Flow |
|---|---|---|---|
| S-D1 | 개발자 | 마이그레이션 (테이블/RLS/RPC) | SQL → `supabase db push` |
| S-D2 | 개발자 | 기존 JSON 4개 + LIVE 사진 → DB/Storage 시딩 | 1회 스크립트 |
| S-D3 | 빌드 (Render) | `vite-react-ssg build` — Node 가 service role 키로 Supabase 호출 → 모든 공개 페이지 HTML prerender | 정적 파일 생성 → Render CDN 배포 |
| S-D4 | 개발자 | pg_dump → Google Drive 백업 | 수동 시작, 나중에 cron |
| **S-D5** | **Supabase Webhook → Render** | **news / pages / members / publications / research / lectures INSERT/UPDATE/DELETE 시 자동 Deploy Hook 호출** (posts 는 CSR 이라 제외) | **자동 재배포 → 1-2분 후 라이브** |
| **S-D6** | **교수님 / 연구원** | **`/admin` 우측 상단 "지금 재발행" 버튼** | **수동 Deploy Hook 호출 (안전망)** |

### Group E — 라우팅 (SSG/CSR 분리)

| 라우트 | 렌더링 | 데이터 출처 | 키 |
|---|---|---|---|
| `/`, `/about`, `/professor`, `/members`, `/publications`, `/research`, `/lectures` | SSG | 빌드 시 Supabase fetch | service role (빌드 env) |
| `/news`, `/news/:id` | SSG (글마다 페이지 prerender) | 빌드 시 Supabase fetch | service role |
| `/posts`, `/posts/:id` | **CSR / SPA** | 런타임 Supabase fetch | anon key (RLS published 만 통과) |
| `/admin/*` | SPA / CSR (prerender 제외) | 런타임 Supabase 호출 | anon key + 세션 JWT |

## 3. 데이터 모델 윤곽 (다음 단계에서 SQL 로 확정)

```
admin_users        (email PK, role, invited_by, added_at)
invites            (token PK, role, intended_email NOT NULL, created_by, created_at, expires_at, used_at, used_by_email)

pages              (slug PK, title, body_json jsonb, status, updated_at, updated_by)
news               (id PK, title, body_short, images jsonb, status, published_at, author_email, created_at, updated_at)
posts              (id PK, title, body_json jsonb, status, published_at, author_email, created_at, updated_at)

members            (기존 members.json 구조 + id PK)
publications       (기존 publications.json 구조 + id PK)
research           (기존 research.json 구조 + id PK + display_order)
lectures           (기존 lectures.json 구조 + id PK)

storage buckets:
  - profile-photos  (멤버 프로필)
  - news-images     (뉴스 첨부)
  - post-images     (게시판 본문 inline)
  - page-images     (페이지 본문 inline)
```

## 4. RLS 정책 윤곽 (다음 단계에서 SQL 로 확정)

```
SSG 도메인은 빌드 시 service role 사용 → anon SELECT 정책 불필요.
CSR 도메인(게시판)만 anon SELECT 정책 필요.
RLS 는 admin (authenticated) 작업 권한 중심으로.

posts ANON SELECT:
  - where status = 'published' 인 row 만 (공개 사이트 게시판 표시용)

news / posts INSERT:
  - admin_users 에 존재하는 사용자만 (전원)
  - author_email = auth.jwt()->>'email' 강제

news / posts UPDATE/DELETE:
  - 연구원: author_email = auth.jwt()->>'email' (본인 글만)
  - 교수님: 무제한

pages / members / publications / research / lectures INSERT/UPDATE/DELETE:
  - admin_users.role='professor' 만
(이들은 anon SELECT 차단 — SSG 라 필요 없음)

admin_users / invites INSERT/UPDATE/DELETE:
  - admin_users.role='professor' 만
```

## 5. 미해결 / 추후 라운드

- 댓글, 태그, 카테고리, 조회수, 좋아요, 검색 (전부 v1 제외)
- 예약 발행 (`published_at` 미래 시각 + cron 재빌드)
- 자동 백업 자동화 (pg_dump → Drive cron)
- DOI/PubMed 자동 메타데이터 fetch
- 미허가 로그인 시도 교수님 알림 (필요해지면)
- 연구원 제거 시 기존 세션 강제 종료 (Supabase Auth admin API 필요)
- 빌드 시간이 길어지면 incremental build 검토
