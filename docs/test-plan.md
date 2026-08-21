# 테스트 인프라 구축 + 버그수정 루프 계획

> 작성: 2026-07-02. 코드 분석 기반 계획 단계 산출물. 구현은 이 문서 검토 후 별도 태스크로 진행.

## 1. 목표

단위 → 통합(RLS) → e2e 전 층위의 테스트를 갖추고, "탐사 → 테스트로 고정 → 수리 → 회귀" 루프를 돌려
커버리지 매트릭스의 모든 셀이 green + 신규 버그가 마를 때까지 반복한다.

## 2. 현황 분석 요약

| 항목 | 상태 |
|---|---|
| 테스트 러너 | 없음 (vitest/jest/playwright 미설치, test 스크립트 없음) |
| 로컬 Supabase | 가동 중 (auth·rest·storage·inbucket 포함, healthy) |
| 기존 검증 자산 | scripts/verify-*.mjs 6종 — supabase-js anon/service_role 클라이언트 + check() 헬퍼 + 잔여물 정리 패턴. 통합 테스트의 원형 |
| QA 이력 | QA_테스트_및_버그리포트.md, QA_버그해결_리포트.md — 과거 버그 유형(빈 데이터 방어, env stub, 역할 표기)이 셀 설계 재료 |
| RLS | 마이그레이션에 정책 47개, helper 함수 7개 (is_site_editor, is_whitelist_member, redeem_invite, increment_post_views 등) |
| 위험 요소 | .env.local에 SUPABASE_PROD_SERVICE_ROLE_KEY 존재 → 테스트가 운영 DB를 만질 수 있는 경로가 열려 있음. 가드 필수 |

### 단위 테스트 후보 (순수/준순수 로직)

- `app/lib/publicData.js` (328줄, export 17개): DB row → 화면용 JSON 변환, withBase/resized 경로 처리, 표시 순서 보존
- `app/lib/publications-import.js`: `parseBibtex()` (순수), `fetchByDoi()` (fetch 모킹)
- `app/lib/supabase.js`: env 미설정 시 thenable stub 동작 (과거 버그 지점)
- 멤버 ID slug 생성 로직 (AdminMembers 내부 함수 — 테스트를 위해 lib로 추출 필요할 수 있음)

## 3. 인프라 설계

### 3.1 계층 구성

| 층 | 도구 | 대상 | 실행 조건 |
|---|---|---|---|
| 단위 | Vitest | publicData 변환, parseBibtex, stub, slug | DB 불필요, 항상 실행 가능 |
| 통합 | Vitest + supabase-js | RLS 47정책 → 테이블×역할×CRUD 매트릭스, RPC(redeem_invite 등), storage 정책 | 로컬 스택 필요 |
| e2e | Playwright (@playwright/test) | 방문자 열람, 로그인, 초대 수락, 글 작성→공개 반영, 프로필 셀프 수정, 삭제 모드 | 로컬 스택 + dev 서버 |

### 3.2 디렉토리

```
tests/
  unit/           # Vitest 단위
  integration/    # Vitest + supabase-js (RLS/RPC)
  e2e/            # Playwright
  helpers/
    env.js        # .env.local 로드 + 운영 가드
    clients.js    # anon/역할별/service_role 클라이언트 팩토리
    fixtures.js   # test- 접두사 데이터 생성/정리
vitest.config.js
playwright.config.js
```

### 3.3 안전장치 (구현 1순위)

1. **운영 가드**: helpers/env.js에서 `VITE_SUPABASE_URL`이 `127.0.0.1`/`localhost`가 아니면 즉시 abort.
   `SUPABASE_PROD_SERVICE_ROLE_KEY`는 테스트 코드에서 import 자체를 금지.
2. **데이터 격리**: 테스트 생성 레코드는 전부 `test-` 접두사(id/slug/email). fixtures 헬퍼가
   생성을 추적하고 afterAll에서 자기가 만든 것만 삭제. 시작 시 이전 실행 잔여물(`test-*`)도 청소.
   (CLAUDE.md: 실데이터 수정 금지, db reset 금지 준수)
3. **테스트 계정**: scripts/seed-dev-accounts.mjs 패턴 재사용해 역할별 계정
   (test-editor@, test-researcher@, test-alumni@, 비화이트리스트 test-outsider@)을 멱등 생성.
4. **service_role은 시드/정리 전용**: 권한 검증 자체는 반드시 해당 역할의 세션 클라이언트로.

### 3.4 package.json 스크립트(예정)

```
test:unit / test:integration / test:e2e / test (unit+integration) / test:all
```

## 4. 커버리지 좌표계 (매트릭스)

"누락 = 아직 안 가본 셀"로 정의하기 위한 지도. 축 3개:

- **장소**: 공개 라우트 11 + admin 라우트 13 + 가드 2(ProtectedRoute/EditorProtectedRoute) + 404
- **인물**: anon / researcher(=whitelist 대표) / editor. alumni는 researcher와 RLS 동일 → 차이점(표기 등)만 스팟체크
- **상황**: 정상 데이터 / 빈 목록 / 결손 필드(null) / 권한 밖 데이터(남의 글·남의 프로필) / 미공개(draft)

### 초기 셀 그룹 (예상 규모)

| 그룹 | 내용 | 층 | 규모 |
|---|---|---|---|
| U1 | publicData 변환 함수 17개 × (정상/빈/결손) | 단위 | ~50 |
| U2 | parseBibtex, slug, supabase stub | 단위 | ~10 |
| I1 | RLS: 콘텐츠 테이블 9종 × 역할 3 × CRUD | 통합 | ~100 (정책 47개가 상한 아님 — 거부 케이스 포함) |
| I2 | RLS: admin_users/invites/member_roles + redeem_invite 흐름(정상/만료/이메일 불일치/재발급) | 통합 | ~25 |
| I3 | storage 버킷 5종 × 역할 × 읽기/쓰기 | 통합 | ~20 |
| E1 | 공개 페이지 11 × (정상/빈/draft 숨김) 렌더 + 콘솔 에러 0 | e2e | ~25 |
| E2 | 인증 흐름: 로그인/로그아웃/비화이트리스트 차단/초대 수락 | e2e | ~10 |
| E3 | admin CRUD 왕복: 글 작성→공개 반영, 프로필 수정→Members 반영, 삭제 모드 | e2e | ~15 |

셀 목록 상세는 구현 단계에서 `docs/test-ledger.md`로 생성하고, 탐사 중 발견되는 새 셀을 계속 추가한다.

## 5. 루프 운영

```
[선택] ledger에서 미탐사 셀 → [작성] 시나리오 상세화 + 테스트 코드
→ [실행] 통과: green 찍고 다음 / 실패: 버그
→ [고정] 실패 테스트를 그대로 회귀 테스트로 남김
→ [수리] 수정 → 해당 테스트 통과 확인
→ [회귀] 전체 스위트 재실행 (다른 방이 깨졌는지)
→ [기록] ledger 갱신 + 새로 발견한 문(기능/상태)은 셀로 추가
```

- 버그 수정은 테스트 고정 없이 하지 않는다.
- 우선순위: 안전장치 → 통합(RLS) → e2e → 단위. (버그 밀도 예상이 높은 순)
- **종료 조건**: 전 셀 green + 2라운드 연속 신규 버그 0.
- DB 스키마를 건드리는 수정이 나오면 CLAUDE.md 규칙대로 마이그레이션 파일 먼저.

## 6. ledger 형식 (docs/test-ledger.md, 구현 단계에서 생성)

```
| 셀 ID | 그룹 | 시나리오 | 상태 | 테스트 파일 | 버그/커밋 |
|-------|-----|---------|------|------------|----------|
| I1-news-anon-read-draft | I1 | anon은 draft news 못 읽음 | 🟢 | integration/news.test.js | - |
```

상태: ⬜ 미탐사 / 📝 작성됨 / 🟢 통과 / 🔴 버그 발견 / 🔧 수정 완료(회귀 대기)

## 7. 구축 순서 (다음 단계 태스크 후보)

1. Vitest + Playwright 설치, config, test 스크립트
2. helpers 3종 (운영 가드 → clients → fixtures) + 테스트 계정 시드
3. ledger 초기 셀 목록 생성
4. 파일럿 셀 3개 (단위 1, 통합 1, e2e 1)로 파이프라인 검증
5. 루프 가동
```
