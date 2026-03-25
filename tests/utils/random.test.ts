import { describe, it, expect } from 'vitest'
import { createRng } from '@/utils/random'

describe('createRng', () => {
  it('同じシードから同じ列を生成する', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)

    const seq1 = Array.from({ length: 10 }, () => rng1())
    const seq2 = Array.from({ length: 10 }, () => rng2())

    expect(seq1).toEqual(seq2)
  })

  it('異なるシードから異なる列を生成する', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(99)

    const seq1 = Array.from({ length: 10 }, () => rng1())
    const seq2 = Array.from({ length: 10 }, () => rng2())

    expect(seq1).not.toEqual(seq2)
  })

  it('0以上1未満の値を返す', () => {
    const rng = createRng(123)

    for (let i = 0; i < 100; i++) {
      const val = rng()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })
})
