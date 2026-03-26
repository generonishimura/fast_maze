import { describe, it, expect } from 'vitest'
import { calculateEndlessScore } from '@/domain/endless-score'

describe('calculateEndlessScore', () => {
  it('新しいマスを踏むとスコアが増える', () => {
    const result = calculateEndlessScore({ isNewTile: true, streak: 0 })
    expect(result.score).toBe(10)
    expect(result.streak).toBe(1)
  })

  it('既に踏んだマスではスコアが増えない', () => {
    const result = calculateEndlessScore({ isNewTile: false, streak: 5 })
    expect(result.score).toBe(0)
    expect(result.streak).toBe(0)
  })

  it('連続で新マスを踏むとストリークボーナスが付く', () => {
    const result = calculateEndlessScore({ isNewTile: true, streak: 9 })
    // streak=10, base=10 + floor(10/5)=2 → 12
    expect(result.score).toBe(12)
    expect(result.streak).toBe(10)
  })
})
