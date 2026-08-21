import { defineConfig } from 'vitest/config'

// 테스트 계층 (docs/test-plan.md)
// - unit:        tests/unit — DB 불필요, 병렬 OK
// - integration: tests/integration — 로컬 Supabase DB 공유.
//   파일 병렬 실행 시 서로의 fixture 를 지울 수 있어 직렬로 강제한다(--no-file-parallelism 은
//   package.json 스크립트에서, 여기서는 기본값으로도 안전하게 fileParallelism: false).
export default defineConfig({
  test: {
    fileParallelism: false,
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    // e2e 는 Playwright 가 담당 — vitest 가 줍지 않게 제외
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    testTimeout: 15000,
  },
})
