import { defineConfig, devices } from '@playwright/test'

// e2e 구성 (docs/test-plan.md)
// - chromium(데스크톱 기본) + webkit(Desktop Safari) 전 스펙 실행
// - 모바일 뷰포트 2종은 *.mobile.spec.js 만 실행 (렌더 스모크 전용)
// - webServer 로 dev 서버 자동 기동 (이미 떠 있으면 재사용)
// - 같은 로컬 DB 를 공유하므로 워커 1개 직렬 실행 (fixture 간섭 방지)
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*\.mobile\.spec\.js/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /.*\.mobile\.spec\.js/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /.*\.mobile\.spec\.js/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      testMatch: /.*\.mobile\.spec\.js/,
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000,
  },
})
