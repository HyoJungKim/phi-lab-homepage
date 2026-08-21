import { test, expect } from '@playwright/test'

// E1-home-1 — 홈 정상 렌더 + 콘솔 에러 0 (파일럿 셀)
test('E1-home-1: 홈이 렌더되고 콘솔 에러가 없다', async ({ page }) => {
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto('/')
  // CSR 로딩이 끝나 실제 콘텐츠가 나올 때까지
  await expect(page.locator('body')).toContainText(/PHI Lab/i, { timeout: 15000 })
  await expect(page.getByRole('navigation')).toBeVisible()

  expect(errors, `콘솔 에러: ${errors.join('\n')}`).toEqual([])
})
