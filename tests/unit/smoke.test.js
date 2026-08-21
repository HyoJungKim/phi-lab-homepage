import { describe, it, expect } from 'vitest'

// 파이프라인 확인용 스모크. 실제 셀 테스트가 채워지면 의미를 다한다.
describe('vitest pipeline', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
