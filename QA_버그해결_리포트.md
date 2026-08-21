# PHI Lab 홈페이지 — QA 남은 버그 해결 리포트

**작성일**: 2026-07-01
**대상**: PI (Hyo Jung Kim) 교수님
**작성**: 개발 담당
**저장소**: `guboc11/phi-lab-homepage` (main)
**대응 대상**: 교수님 QA 리포트(`QA_테스트_및_버그리포트.md`)의 **미적용(권장) 4건 — 버그 3·5·6·7**

---

## 0. 요약

교수님이 검수 중 직접 고쳐주신 버그 1·2·4(역할 영/한 불일치, Members 분류, 헤더)는 커밋 `d2bfb57`
로 반영되어 있고, 그 위에 **남은 권장 4건(3·5·6·7)을 모두 해결·검증**했습니다.

| 버그 | 내용 | 상태 | 커밋 |
|:-:|------|:-:|------|
| 5 | Supabase 미설정 시 stub 클라이언트가 깨짐 | ✅ 해결 | `3c1ecca` |
| 3 | 공개 페이지 빈 데이터(null) 방어 부족 | ✅ 해결 | `5c84f12` |
| 6 | 빈 테이블에서 빌드(prerender) 전체 실패 | ✅ 해결 | (무커밋 — 5·3의 결과로 자동 충족) |
| 7 | Lint 35건(에러 32) | ✅ 해결 | `469b285` |

버그당 커밋 1개 원칙으로 작업했으며, 각 단계마다 빌드/린트로 검증했습니다. (아직 **push 하지 않았습니다** — 지시 시 반영)

---

## 1. 버그 5 — Supabase 미설정 시 stub 클라이언트가 깨짐  ·  커밋 `3c1ecca`

- **증상**: 환경변수(`VITE_SUPABASE_URL`/`ANON_KEY`)가 없으면 백엔드 없이 디자인 미리보기를
  하려 해도 Home 등 공개 페이지가 500으로 죽음.
- **원인**: env 없을 때 쓰는 stub 이 ① 쿼리 결과로 에러 객체를 돌려줘 공개 로더의
  `if (error) throw error` 가 던지고(→500), ② `from().select()` 가 Promise 를 반환해
  이어지는 `.eq()` 에서 `TypeError` 가 났으며, ③ `getSession` 이 `null` 을 돌려줘 인증
  컨텍스트에서 `.session` 접근이 위험했음.
- **수정내용**: stub 쿼리를 **무한 체이닝되는 thenable 프록시**로 교체 — 어떤 메서드를 이어
  붙여도 깨지지 않고, `await` 하면 `{ data: [], error: null, count: 0 }` 을 반환(에러가
  null 이라 로더가 던지지 않음). `getSession` 은 `{ session: null }` 반환, `signInWithOAuth`
  stub 추가. (변경 파일: `app/lib/supabase.js` 1개)
- **검증방법/결과**:
  - stub 체인 단위 테스트 4/4 통과(`select().eq().order()`·`maybeSingle()` 체인, `error===null`, `data===[]`)
  - env 를 비운 상태에서 `pnpm build` → **EXIT 0**, 공개 전 경로 정상 prerender.

---

## 2. 버그 3 — 공개 페이지 빈 데이터(null) 방어 부족  ·  커밋 `5c84f12`

- **증상**: 콘텐츠가 없는(빈 DB) 상태나 특정 레코드 부재 시 공개 페이지가 흰 화면/500으로 죽을
  수 있음. 데이터 입력 전이나 배포 직후에 특히 위험.
- **원인**: 데이터 로더 자체는 방어가 잘 돼 있으나, **일부 페이지 컴포넌트가 로더 결과(배열·객체)를
  기본값 없이 바로 사용**하는 지점이 남아 있었음(`data.current.find(...)`,
  `lecturesData.filter(...)`, `researchData.filter(...)`, `data.collaborators.length` 등).
- **수정내용** (Publications·Professor 는 이미 가드되어 변경 없음):
  - **Home** — `?? {}` / `?? []` / 카운트 `?? 0` 기본값
  - **Lectures** — `?? []` + 빈 상태 문구("No courses to display yet.")
  - **Research** — `?? []` + 빈 상태 문구("No projects to display yet.")
  - **Members** — 구조분해 기본값(`current = []`, `alumni = []`) 추가
  - (변경 파일: `Home.jsx`, `Lectures.jsx`, `Research.jsx`, `Members.jsx` 4개)
- **검증방법/결과**:
  - env 를 비운(빈 데이터) `pnpm build` → **EXIT 0**, 공개 7경로(/ /about /members
    /professor /research /publications /lectures) 모두 prerender 성공.
  - 생성된 정적 HTML 에서 빈 상태 UI 실제 렌더 확인: Lectures "No courses…", Research
    "No projects…", Publications "No entries found", Professor "교수 정보가 아직
    등록되지 않았습니다".

---

## 3. 버그 6 — 빈 테이블에서 빌드(prerender) 전체 실패  ·  (무커밋 — 5·3의 결과)

- **증상**: 빈 테이블(콘텐츠 0건, PI 미등록) 상태에서 `pnpm build` 의 prerender 가 특정 경로
  500으로 전체 빌드 중단.
- **원인**: 로더가 에러를 전파하거나 페이지가 빈 데이터에서 크래시 → prerender 실패.
  즉 **버그 5(stub 에러)와 버그 3(페이지 빈데이터 방어)이 근본 원인**이었음.
- **수정내용**: 버그 6 전용 코드 변경 없음. 버그 5·3 해결로 자동 충족됨.
- **검증방법/결과** (clean 재현):
  - `build/` 삭제 후 env 를 비운 `pnpm build` → **EXIT 0**, `Build failed` 없음.
  - prerender HTML 7개 전부 생성 확인:

    | 경로 | 파일 | 크기 |
    |------|------|-----:|
    | `/` | index.html | 10,916 B |
    | `/about` | about/index.html | 10,439 B |
    | `/members` | members/index.html | 9,180 B |
    | `/professor` | professor/index.html | 8,939 B |
    | `/research` | research/index.html | 10,086 B |
    | `/publications` | publications/index.html | 9,173 B |
    | `/lectures` | lectures/index.html | 8,922 B |
  - `news`/`posts` 는 CSR(로그인 후 즉시 반영용)이라 prerender 대상이 아님 — 미생성이 정상.

---

## 4. 버그 7 — Lint 35건(에러 32)  ·  커밋 `469b285`

- **증상**: `pnpm lint` 에러 다수. 교수님 검수 환경에서는 빌드 산출물까지 스캔돼 최대 542건까지
  부풀어 보임(소스 기준으로는 교수님 보고대로 35건).
- **원인**: ① eslint 무시 목록에 `build/` 가 빠져 minify 된 번들까지 린트, ② 설정 파일의 node
  전역(`process`) 미지정, ③ react-router 라우트 모듈의 `loader`/`links` 동시 export 를 Fast
  Refresh 룰이 오탐, ④ 미사용 변수, ⑤ 데이터 로딩 effect 의 setState.
- **수정내용**:
  - `build/` 를 lint 제외 → 번들 오탐 제거(542 → 35)
  - `*.config.js` 에 node 전역 지정 → `process` no-undef 해소
  - `react-refresh/only-export-components` 에 router 데이터 export 허용 + 공유 모듈은 사유 주석 예외
  - 미사용 `useEffect`·`STATUSES` 제거
  - `react-hooks/set-state-in-effect`(16건)은 의도된 로딩 표시 패턴이라 경고(warn)로 유지
  - (변경 파일: `eslint.config.js`, `AdminUI.jsx`, `AuthContext.jsx`, `NewsCard.jsx`,
    `AdminMembers.jsx`, `AdminNews.jsx` 6개)
- **검증방법/결과**: `pnpm lint` → **에러 0** (경고 19). env 없는 `pnpm build` EXIT 0 로 편집
  파일 컴파일 안전 확인.

  | 구분 | problems | errors | warnings |
  |------|---:|---:|---:|
  | Before(빌드 산출물 포함) | 542 | 539 | 3 |
  | 빌드 제외(소스 실측) | 35 | 32 | 3 |
  | **After(수정 후)** | **19** | **0** | 19 |

---

## 5. 정직하게 남기는 사항 (잔여·부수 변경)

1. **Lint 경고 19건 잔존(사유 포함)** — 전부 동일한 "화면 진입 시 데이터 로드 → 로딩 상태
   setState" 패턴입니다(`set-state-in-effect` 16 + `exhaustive-deps` 3). 이 자체는 의도된
   동작이며, 없애려면 admin CRUD 데이터 로더 16곳을 구조 변경해야 해 **회귀 위험이 큽니다.**
   그래서 에러가 아닌 경고로 두어 가시성만 유지했고, **정식 리팩터는 별도 과제**로 남겼습니다.

2. **버그 7 정리 중 잠복 버그 1건 함께 수정** — 관리자 News 화면의 "+ 새 뉴스" 버튼이 미완성
   인라인 핸들러를 써서(`setEditing(true)` 누락), 새 뉴스가 **편집이 아닌 '미리보기' 모드로
   열리던 문제**가 있었습니다. 다른 admin 페이지와 동일하게 `openNew` 에 배선해 바로잡았습니다
   (커밋 `469b285` 에 포함).

3. **§5 QA 체크리스트를 로컬 스택으로 라이브 검증 완료** — 처음엔 외부 Supabase 네트워크가
   막혀 빈데이터 prerender 로만 확인했으나, 이후 **로컬 Supabase 스택을 세우고 `data/*.json`
   백업을 시드해 실제 데이터로 dev 서버를 띄운 뒤 Playwright 로 §5 체크리스트를 라이브 검증**했습니다:
   - **공개(비로그인)**: Home 통계(19 연구·40 논문·7 기관)·Members 역할별 분류(지도교수/박사과정/
     학부연구생)·Professor 실 PI 약력·Publications/Research/Lectures·모바일 드로어 — 콘솔 에러 0
   - **관리자**: admin 로그인, 역할 가드(admin=전체 메뉴 / researcher=공통만), 로그아웃
   - **CRUD**: Members 추가→공개 역할그룹 반영→삭제, Professor·Publications·Research·Institutions
     편집 폼 로드, **프로필 이미지 업로드→스토리지 저장** 확인
   - **News/Posts**: 작성→발행→공개 노출, "+새 뉴스/새 글" 편집모드(openNew 수정), 공지고정(Notice),
     상세 조회수 +1, 초안 비노출
   - **엣지**: 잘못된 URL→404 페이지
   **못한 것(정직)**: ① Google OAuth 로그인은 로컬에서 재현 불가라 이메일/비번 로그인으로 대체,
   ② 실제 운영 DB(원격)는 이 환경에서 접근 불가라 미검증 — 운영 배포 후 실 env 에서 한 번 더
   클릭 검증을 권장합니다.

---

## 부록 — 커밋 이력

```
469b285  fix(lint): eslint 에러 0 정리 (버그7)
5c84f12  fix(public): 공개 페이지 null·빈데이터 방어 전수 (버그3)
3c1ecca  fix(supabase): env 미설정 stub 을 체이닝 가능한 thenable 로 교체 (버그5)
d2bfb57  fix: PI역할 영/한 불일치, 헤더 …  ← 교수님 검수 수정(버그 1·2·4)
```
