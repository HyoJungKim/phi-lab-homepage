# 테스트 커버리지 원장 (ledger)

> "누락 = 아직 안 가본 셀". 루프를 돌 때마다 이 파일의 상태를 갱신한다.
> 탐사 중 새로 발견한 기능/상태는 셀로 추가한다. 계획: docs/test-plan.md

**상태**: ⬜ 미탐사 · 📝 작성됨 · 🟢 통과 · 🔴 버그 발견 · 🔧 수정 완료(회귀 대기) · 🚫 스코프 밖(사유 명기)

**역할 축**: A=anon(비로그인) · R=researcher(whitelist 대표) · E=editor(admin, professor 스팟체크)
alumni 는 RLS 상 R 과 동일 — 차이(표기 등)만 E1-mem-3 에서 스팟체크.

**전제**: 전면 CSR (2026-07-02 prerender 폐지). AdminPages.jsx 는 죽은 파일로 삭제됨(2026-07-02).
AdminRoles 는 /admin/members 내장 패널 → E4-adm-mem 셀에 귀속.

**과거 QA 버그 → 회귀 셀 매핑**
| QA 버그 | 내용 | 회귀 셀 |
|---|---|---|
| 버그1 | 역할 값 영/한 불일치 Professor 크래시 | U1-prof-2, E1-prof-1 |
| 버그2 | Members 분류 오류 | U1-mem-2, E1-mem-2 |
| 버그3 | 공개 페이지 null 방어 | U1-* 결손 케이스 전체, E1-*-empty |
| 버그5 | supabase stub 깨짐 | U2-stub-1 |
| 버그6 | 빈 테이블에서 빌드 실패 | (prerender 폐지로 재정의) E1-*-empty + 마감 게이트 pnpm build |
| 버그7 | lint 에러 | 마감 게이트 pnpm lint |

---

## U1 — publicData 단위 (13함수 × 정상/빈/결손) — 39셀

mock supabase 로 DB row → 화면 JSON 변환만 검증. 파일: tests/unit/publicData.test.js

파일: tests/unit/publicData.test.js (+ 에러 전파 1셀 추가 발견분)

| 셀 | 함수 | 정상 | 빈 | 결손(null 필드) |
|---|---|---|---|---|
| U1-role | fetchRoleOrder | 🟢 | 🟢 | 🟢 |
| U1-mem | fetchMembers (분류·순서·경로 처리 포함) | 🟢 | 🟢 | 🟢 |
| U1-prof | fetchProfessor (라벨 폴백 3단 포함, QA버그1) | 🟢 | 🟢 | 🟢 |
| U1-lec | fetchLectures | 🟢 | 🟢 | 🟢 |
| U1-res | fetchResearch (position 정렬) | 🟢 | 🟢 | 🟢 |
| U1-pub | fetchPublications (저자 정렬) | 🟢 | 🟢 | 🟢 |
| U1-inst | fetchCollaboratingInstitutions | 🟢 | 🟢 | 🟢 |
| U1-news | fetchNews (커버 추출 포함) | 🟢 | 🟢 | 🟢 |
| U1-news1 | fetchNewsItem | 🟢 | 🟢(404) | 🟢 |
| U1-posts | fetchPosts (authorName/views/pinned 기본값) | 🟢 | 🟢 | 🟢 |
| U1-post1 | fetchPost | 🟢 | 🟢(404) | 🟢 |
| U1-views | incrementPostViews (rpc 인자) | 🟢 | — | — |
| U1-stats | fetchHomeStats | 🟢 | 🟢 | 🟢 |
| U1-err | supabase error → throw 전파 (탐사 중 추가) | 🟢 | — | — |

## U2 — 기타 순수 로직 — 6셀

| 셀 | 시나리오 | 상태 |
|---|---|---|
| U2-bib-1 | parseBibtex 정상 엔트리 | 🟢 |
| U2-bib-2 | parseBibtex 깨진 입력(중괄호 불일치·빈 문자열) | 🟢 |
| U2-doi-1 | fetchByDoi 응답 매핑 + 404 에러 (fetch mock) | 🟢 |
| U2-slug-1 | ~~멤버 ID slug 생성~~ 폐기: 현재 구현은 crypto.randomUUID() (AdminMembers.jsx:85) — E3-mem-1 에서 커버 | 🚫 |
| U2-stub-1 | supabase env 미설정 stub 체이너블 + 공개 fetch* 생존 (QA버그5 회귀) | 🟢 |
| U2-base-1 | withBase/resized (외부 URL/base prefix/IMAGE_TRANSFORM 플래그) | 🟢 |

## I1 — 콘텐츠 테이블 RLS — 역할×CRUD (거부 케이스 포함)

파일: tests/integration/rls-content.test.js. 기대: 사이트 콘텐츠는 A 읽기/E 쓰기, news·posts 는 A published 읽기 + R 본인 글.

| 셀 | 테이블 | A read | R read | E write | R write(거부) | A write(거부) |
|---|---|---|---|---|---|---|
| I1-mem | members | ⬜ | ⬜ | ⬜ | ⬜(셀프 예외: I1-mem-self) | ⬜ |
| I1-pub | publications(+authors, publication_authors) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| I1-res | research(+research_affiliations) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| I1-lec | lectures | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| I1-inst | institutions | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| I1-page | pages | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| I1-role | member_roles | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

| 셀 | 시나리오 | 상태 |
|---|---|---|
| I1-mem-self | R 이 자기 연결 멤버 행만 insert/update 가능, 남의 행 거부 | ⬜ |
| I1-news-a | A 는 published news 만 read (draft 불가) | 🟢 rls-news-draft.test.js |
| I1-news-r | R 은 draft 포함 read + 본인 글 insert(author=self 강제) | ⬜ |
| I1-news-own | R 은 본인 글만 update/delete, 남의 글 거부. E 는 남의 글 가능 | ⬜ |
| I1-post-a | A 는 published posts 만 read | ⬜ |
| I1-post-r | R insert(author=self)·본인 글 update/delete, 남의 글 거부 | ⬜ |
| I1-news-forge | R 이 author_email 을 남으로 위조한 insert 거부 | ⬜ |

## I2 — 계정·초대 — 12셀

| 셀 | 시나리오 | 상태 |
|---|---|---|
| I2-au-1 | R 은 admin_users 에서 자기 행만 read | ⬜ |
| I2-au-2 | E 는 전체 read/insert/update/delete | ⬜ |
| I2-au-3 | R 의 admin_users 쓰기 전부 거부 | ⬜ |
| I2-au-4 | professor 역할도 editor 권한 동작 (스팟체크) | ⬜ |
| I2-inv-1 | invites: E 만 발급·조회·회수, R/A 거부 | ⬜ |
| I2-red-1 | redeem_invite 정상 수락 → admin_users 등록 | ⬜ |
| I2-red-2 | 만료 토큰 거부 | ⬜ |
| I2-red-3 | 이메일 불일치 거부 (outsider 가 남의 초대 사용 시도) | ⬜ |
| I2-red-4 | 같은 이메일 재발급 시 기존 활성 초대 자동 만료 (expire_prior_invites) | ⬜ |
| I2-red-5 | 사용된 토큰 재사용 거부 | ⬜ |
| I2-role-1 | member_roles: A read 허용 / E 만 쓰기 (드롭다운용) | ⬜ |
| I2-out-1 | outsider(비화이트리스트 인증 계정)는 whitelist 전용 리소스 접근 불가 | ⬜ |

## I3 — storage 버킷 정책 — 버킷 5종

| 셀 | 버킷 | A read | 업로드 권한 | 무권한 업로드 거부 | 삭제 권한 |
|---|---|---|---|---|---|
| I3-prof | profile-photos | ⬜ | ⬜(whitelist) | ⬜(A) | ⬜ |
| I3-news | news-images | ⬜ | ⬜(whitelist) | ⬜(A) | ⬜ |
| I3-post | post-images | ⬜ | ⬜(whitelist) | ⬜(A) | ⬜ |
| I3-page | page-images | ⬜ | ⬜(editor) | ⬜(R) | ⬜ |
| I3-lec | lecture-images | ⬜ | ⬜(editor) | ⬜(R) | ⬜ |

## I4 — DB 트리거·RPC — 7셀

| 셀 | 시나리오 | 상태 |
|---|---|---|
| I4-nid-1 | assign_news_id: 빈 id → YYYY-MM-DD-NNN 자동 부여, 같은 날 연번 증가 | ⬜ |
| I4-nid-2 | 지정 id 는 트리거가 존중 | ⬜ |
| I4-pid-1 | assign_post_id 동일 검증 | ⬜ |
| I4-view-1 | increment_post_views: published 글 +1 | ⬜ |
| I4-view-2 | anon 이 draft 글 조회수 못 올림 (SECURITY DEFINER 구멍 확인) | ⬜ |
| I4-view-3 | 없는 id → no-op (에러/부작용 없음) | ⬜ |
| I4-exp-1 | expire_prior_invites_for_email 트리거 동작 (I2-red-4 와 교차 확인) | ⬜ |

## E1 — 공개 페이지 e2e (chromium+webkit)

파일: tests/e2e/public-*.spec.js. 공통 검증: 렌더 + 콘솔 에러 0.

| 셀 | 시나리오 | 상태 |
|---|---|---|
| E1-home-1 | / 정상 렌더 + 콘솔 에러 0 | 🟢 public-home.spec.js |
| E1-about-1 | /about | ⬜ |
| E1-mem-1 | /members 정상 (사진·역할 라벨) | ⬜ |
| E1-mem-2 | current/alumni 분류 정확 (QA버그2 회귀) | ⬜ |
| E1-mem-3 | alumni 계정 관련 표기 스팟체크 | ⬜ |
| E1-prof-1 | /professor (QA버그1 회귀) | ⬜ |
| E1-res-1 | /research + display_order = 표시 순서 | ⬜ |
| E1-pub-1 | /publications 정상 | ⬜ |
| E1-pub-2 | 연도·타입 필터 동작 | ⬜ |
| E1-pub-3 | BibTeX 복사 버튼 | ⬜ |
| E1-lec-1 | /lectures (이미지 라이트박스 포함) | ⬜ |
| E1-news-1 | /news 격자 + published 만 노출 | ⬜ |
| E1-news-2 | /news/:id 상세, draft 상세 직접 URL 도 차단 | ⬜ |
| E1-post-1 | /posts 게시판 (pinned 상단 고정) | ⬜ |
| E1-post-2 | /posts 검색·페이지네이션 | ⬜ |
| E1-post-3 | /posts/:id 상세 + 조회수 증가 | ⬜ |
| E1-404-1 | 없는 경로 → 404 페이지 | ⬜ |
| E1-deep-1 | 딥링크 새로고침: /posts/:id 등에서 F5 → 404 아님 (rewrite 회귀, 로컬 dev 기준) | ⬜ |
| E1-err-1 | DB 요청 실패 모의 → 무한 스피너/빈 화면 아님 | ⬜ |
| E1-empty-1 | 빈 데이터 상태 방어 (QA버그3 회귀 — 대표 3페이지) | ⬜ |
| E1-mob-1 | 모바일 뷰포트 2종: 홈·members·posts 렌더 스모크 (*.mobile.spec.js) | ⬜ |

## E2 — 인증 흐름 e2e — 9셀

| 셀 | 시나리오 | 상태 |
|---|---|---|
| E2-login-1 | 이메일 로그인 성공 → /admin 진입 | ⬜ |
| E2-login-2 | 잘못된 비밀번호 → 에러 표시, 진입 불가 | ⬜ |
| E2-guard-1 | 비로그인 /admin 직접 접근 → login 리다이렉트 | ⬜ |
| E2-guard-2 | outsider 로그인 → whitelist 아님 Forbidden 분기 | ⬜ |
| E2-guard-3 | R 이 editor 전용 7라우트 접근 → Forbidden (전 라우트) | ⬜ |
| E2-guard-4 | ProtectedRoute 의 Forbidden 3분기 각각 재현 | ⬜ |
| E2-accept-1 | 초대 수락: 로그인 상태에서 ?token= 접근 → redeem → 등록 (비번 로그인 우회 경로) | ⬜ |
| E2-accept-2 | 구글 OAuth 버튼 경로 | 🚫 로컬 e2e 불가 — 운영 반영 후 수동 체크 항목 |
| E2-logout-1 | 로그아웃 → /admin 재접근 시 login | ⬜ |

## E3 — admin CRUD 왕복 e2e — 11셀

| 셀 | 시나리오 | 상태 |
|---|---|---|
| E3-post-1 | R: 게시글 작성(BlockNote) → 공개 게시판 즉시 노출 | ⬜ |
| E3-post-2 | 에디터 왕복: 저장 → 재편집 → 내용·이미지 보존 → 공개 렌더 일치 | ⬜ |
| E3-post-3 | draft 저장 → 공개 안 보임 → published 전환 → 보임 | ⬜ |
| E3-post-4 | author_name 비정규화: 작성 후 display_name 변경 시 표기 확인 | ⬜ |
| E3-news-1 | E: news 작성 → 공개 /news 반영 | ⬜ |
| E3-prof-1 | R: My Profile 작성·수정 → 공개 Members 카드 반영 | ⬜ |
| E3-mem-1 | E: 멤버 등록(slug 자동 생성) → 공개 반영 | ⬜ |
| E3-mem-2 | E: alumni 전환 → 공개 분류 이동 | ⬜ |
| E3-ord-1 | E: 재정렬(display_order) → 공개 순서 반영 | ⬜ |
| E3-del-1 | 삭제 모드 OFF 땐 삭제 불가, ON 후 삭제 동작 | ⬜ |
| E3-form-1 | 폼 방어: 필수 필드 누락 거부, 특수문자·HTML 태그 이스케이프(스크립트 미실행) | ⬜ |

## E4 — admin 페이지 스모크 + 나머지 편집 UI — 10셀

| 셀 | 시나리오 | 상태 |
|---|---|---|
| E4-smoke-1 | admin 13페이지 × E 렌더 + 콘솔 에러 0 | ⬜ |
| E4-smoke-2 | 공통 4페이지 × R 렌더 (dashboard/my-profile/news/posts) | ⬜ |
| E4-adm-mem | Members 페이지: 역할 라벨 관리(AdminRoles 패널)·계정 연결 드롭다운 | ⬜ |
| E4-pub-1 | Publications: BibTeX 붙여넣기 import | ⬜ |
| E4-pub-2 | Publications: DOI 조회 import (외부 API — 실패 시 graceful) | ⬜ |
| E4-inst-1 | Institutions: 로고 업로드 → 홈 로고 그리드 반영 | ⬜ |
| E4-lec-1 | Lectures: 강의 이미지 추가 → 공개 반영 | ⬜ |
| E4-res-1 | Research 편집 → 공개 반영 | ⬜ |
| E4-prof-2 | Professor 편집 → 공개 반영 | ⬜ |
| E4-photo-1 | My Profile 사진 파일 업로드 → storage 저장·카드 표시 | ⬜ |

## 마감 게이트 (docs/test-plan.md 5절)

- [ ] 전 셀 🟢 (🚫 제외)
- [ ] 2라운드 연속 신규 버그 0
- [ ] pnpm build 통과 · pnpm lint 에러 0 · supabase db diff 변경 없음
- [ ] DB·storage 의 test-* 잔여물 0
- [ ] (여유 시) 동시성·세션 셀 추가: 두 탭 편집, 세션 만료 후 저장

## 발견 버그 로그

| # | 발견 셀/경위 | 내용 | 상태 |
|---|---|---|---|
| B1 | e2e 스모크 구축 중 | .env.local 활성 URL 이 낡은 LAN IP(192.168.1.19) → 전 페이지 "Loading…" 멈춤. 127.0.0.1 로 교체 | 🔧 (env 파일 수정, 커밋 대상 아님) |
