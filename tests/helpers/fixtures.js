import { serviceRole, TEST_EMAILS } from './clients.js'

// ─────────────────────────────────────────────────────────────────────────────
// 테스트 데이터 생성 추적 + 정리 (docs/test-plan.md 3.3-2)
//
// 원칙:
// 1. 테스트가 만드는 모든 데이터는 식별 가능해야 한다.
//    - text pk: 'test-' 접두사 id/slug
//    - uuid pk(authors/institutions/member_roles): 이름 필드에 'test-' 접두사
//    - news/posts: 트리거(assign_news_id/assign_post_id)가 id 를 자동 부여하므로
//      id 접두사가 불가 → author_email(test-*@philab.test) 로 추적
// 2. cleanup 은 "자기가 track 한 것"만 지운다 (생성 역순).
// 3. sweepStale 은 크래시한 이전 실행의 잔여물 청소용 — 조건을 좁게 못박는다.
//    로컬 DB 의 기존 시드 콘텐츠([TEST-DRAFT] 제목, admin@philab.org 작성 등)는
//    실데이터로 취급하며 절대 건드리지 않는다 (CLAUDE.md 규칙).
// ─────────────────────────────────────────────────────────────────────────────

const PK = {
  admin_users: 'email',
  authors: 'id',
  institutions: 'id',
  invites: 'token',
  lectures: 'id',
  member_roles: 'id',
  members: 'id',
  news: 'id',
  pages: 'slug',
  posts: 'id',
  publications: 'id',
  research: 'id',
}

export const STORAGE_BUCKETS = [
  'profile-photos',
  'news-images',
  'post-images',
  'page-images',
  'lecture-images',
]

const TEST_EMAIL_LIST = Object.values(TEST_EMAILS)

export function createFixtures() {
  const records = [] // { table, value }
  const files = [] // { bucket, path }

  return {
    // 이미 생성된 레코드를 추적에 등록 (예: UI/트리거 경유로 생성된 것)
    track(table, pkValue) {
      if (!PK[table]) throw new Error(`알 수 없는 테이블: ${table}`)
      records.push({ table, value: pkValue })
    },
    trackFile(bucket, path) {
      files.push({ bucket, path })
    },

    // client(해당 역할 세션)로 insert 하고 자동 추적. RLS 검증을 겸한다.
    async insert(client, table, row) {
      const { data, error } = await client.from(table).insert(row).select().single()
      if (!error) records.push({ table, value: data[PK[table]] })
      return { data, error }
    },

    // 자기가 만든 것만, 생성 역순으로 삭제 (junction → parent 순서 보장)
    async cleanup() {
      const svc = await serviceRole()
      for (const { bucket, path } of files.reverse()) {
        await svc.storage.from(bucket).remove([path])
      }
      for (const { table, value } of records.reverse()) {
        const { error } = await svc.from(table).delete().eq(PK[table], value)
        if (error) console.warn(`cleanup 실패: ${table}/${value} — ${error.message}`)
      }
      records.length = 0
      files.length = 0
    },
  }
}

// 시드 계정 5개는 sweep 에서 보존 (scripts/seed-test-accounts.mjs 산출물)
const SEEDED_ACCOUNT_EMAILS = TEST_EMAIL_LIST

// 이전 실행 잔여물 청소. 아래 좁은 조건만 지운다:
//   ① text pk 가 'test-' 로 시작
//   ② news/posts 의 author_email 이 테스트 계정
//   ③ invites 의 intended_email 이 test-*@philab.test
//   ④ admin_users 중 test-*@philab.test (시드 5계정 제외)
//   ⑤ uuid 테이블은 이름 필드가 'test-' 로 시작하는 행만
//   ⑥ storage 각 버킷에서 이름이 'test-' 로 시작하는 파일
export async function sweepStale() {
  const svc = await serviceRole()
  const deleted = []

  for (const table of ['members', 'publications', 'research', 'lectures', 'news', 'posts']) {
    const { data } = await svc.from(table).delete().like(PK[table], 'test-%').select(PK[table])
    if (data?.length) deleted.push(`${table}:${data.length}`)
  }
  const { data: pg } = await svc.from('pages').delete().like('slug', 'test-%').select('slug')
  if (pg?.length) deleted.push(`pages:${pg.length}`)

  for (const table of ['news', 'posts']) {
    const { data } = await svc.from(table).delete().in('author_email', TEST_EMAIL_LIST).select('id')
    if (data?.length) deleted.push(`${table}(author):${data.length}`)
  }

  const { data: inv } = await svc
    .from('invites').delete().like('intended_email', 'test-%@philab.test').select('token')
  if (inv?.length) deleted.push(`invites:${inv.length}`)

  const { data: au } = await svc
    .from('admin_users').delete()
    .like('email', 'test-%@philab.test')
    .not('email', 'in', `(${SEEDED_ACCOUNT_EMAILS.join(',')})`)
    .select('email')
  if (au?.length) deleted.push(`admin_users:${au.length}`)

  const NAME_COL = { authors: 'name', institutions: 'name', member_roles: 'label' }
  for (const [table, col] of Object.entries(NAME_COL)) {
    const { data } = await svc.from(table).delete().like(col, 'test-%').select(PK[table])
    if (data?.length) deleted.push(`${table}:${data.length}`)
  }

  for (const bucket of STORAGE_BUCKETS) {
    const { data: list } = await svc.storage.from(bucket).list('', { search: 'test-', limit: 200 })
    const names = (list || []).map((f) => f.name).filter((n) => n.startsWith('test-'))
    if (names.length) {
      await svc.storage.from(bucket).remove(names)
      deleted.push(`storage/${bucket}:${names.length}`)
    }
  }

  return deleted
}
