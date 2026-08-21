import { test, expect } from '@playwright/test'

// 파이프라인 확인용 스모크: 홈이 뜨고 연구실 이름이 보인다.
test('home renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toContainText(/PHI Lab/i, { timeout: 15000 })
})
