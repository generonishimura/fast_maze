import { describe, it, expect } from 'vitest'
import { pickFruitType, getFruitScore, generateFruitsForChunk, type FruitType } from '@/domain/fruit'
import { createRng } from '@/utils/random'

describe('getFruitScore', () => {
  it('さくらんぼは50点', () => {
    expect(getFruitScore('cherry')).toBe(50)
  })

  it('みかんは100点', () => {
    expect(getFruitScore('orange')).toBe(100)
  })

  it('りんごは200点', () => {
    expect(getFruitScore('apple')).toBe(200)
  })

  it('ぶどうは500点', () => {
    expect(getFruitScore('grape')).toBe(500)
  })

  it('メロンは1000点', () => {
    expect(getFruitScore('melon')).toBe(1000)
  })
})

describe('pickFruitType', () => {
  it('FruitTypeのいずれかを返す', () => {
    const rng = createRng(42)
    const validTypes: FruitType[] = ['cherry', 'orange', 'apple', 'grape', 'melon']
    const result = pickFruitType(rng)
    expect(validTypes).toContain(result)
  })

  it('同じseedなら同じ結果を返す（決定的）', () => {
    const result1 = pickFruitType(createRng(123))
    const result2 = pickFruitType(createRng(123))
    expect(result1).toBe(result2)
  })

  it('さくらんぼが最も多く出現する', () => {
    const counts: Record<FruitType, number> = { cherry: 0, orange: 0, apple: 0, grape: 0, melon: 0 }
    for (let i = 0; i < 1000; i++) {
      const rng = createRng(i)
      counts[pickFruitType(rng)]++
    }
    expect(counts.cherry).toBeGreaterThan(counts.orange)
    expect(counts.orange).toBeGreaterThan(counts.apple)
    expect(counts.apple).toBeGreaterThan(counts.grape)
    expect(counts.grape).toBeGreaterThan(counts.melon)
  })
})

describe('generateFruitsForChunk', () => {
  it('チャンクに対して果物を生成する', () => {
    // 21x21チャンクの通路セルデータが必要
    // 簡易的な通路データを用意（奇数行・奇数列が通路）
    const cells: ('wall' | 'passage')[][] = Array.from({ length: 21 }, (_, row) =>
      Array.from({ length: 21 }, (_, col) =>
        row % 2 === 1 && col % 2 === 1 ? 'passage' : 'wall',
      ),
    )

    const fruits = generateFruitsForChunk(42, 0, 0, cells)
    expect(fruits.length).toBeGreaterThan(0)
  })

  it('果物は通路セルにのみ配置される', () => {
    const cells: ('wall' | 'passage')[][] = Array.from({ length: 21 }, (_, row) =>
      Array.from({ length: 21 }, (_, col) =>
        row % 2 === 1 && col % 2 === 1 ? 'passage' : 'wall',
      ),
    )

    const fruits = generateFruitsForChunk(42, 0, 0, cells)
    for (const fruit of fruits) {
      expect(cells[fruit.localRow][fruit.localCol]).toBe('passage')
    }
  })

  it('同じseedとチャンク座標なら同じ果物が生成される（決定的）', () => {
    const cells: ('wall' | 'passage')[][] = Array.from({ length: 21 }, (_, row) =>
      Array.from({ length: 21 }, (_, col) =>
        row % 2 === 1 && col % 2 === 1 ? 'passage' : 'wall',
      ),
    )

    const fruits1 = generateFruitsForChunk(42, 0, 0, cells)
    const fruits2 = generateFruitsForChunk(42, 0, 0, cells)
    expect(fruits1).toEqual(fruits2)
  })

  it('10x10セル領域ごとに約1個の果物が配置される', () => {
    const cells: ('wall' | 'passage')[][] = Array.from({ length: 21 }, (_, row) =>
      Array.from({ length: 21 }, (_, col) =>
        row % 2 === 1 && col % 2 === 1 ? 'passage' : 'wall',
      ),
    )

    const fruits = generateFruitsForChunk(42, 0, 0, cells)
    // 21x21 → 約4つの10x10領域 → 約4個前後
    expect(fruits.length).toBeGreaterThanOrEqual(1)
    expect(fruits.length).toBeLessThanOrEqual(6)
  })
})
