import type { CellType } from '@/domain/types'
import { createRng, type Rng } from '@/utils/random'

export type FruitType = 'cherry' | 'orange' | 'apple' | 'grape' | 'melon'

export type Fruit = {
  readonly type: FruitType
  readonly localRow: number
  readonly localCol: number
}

const FRUIT_SCORES: Record<FruitType, number> = {
  cherry: 50,
  orange: 100,
  apple: 200,
  grape: 500,
  melon: 1000,
}

const FRUIT_WEIGHTS: { type: FruitType; weight: number }[] = [
  { type: 'cherry', weight: 40 },
  { type: 'orange', weight: 25 },
  { type: 'apple', weight: 20 },
  { type: 'grape', weight: 10 },
  { type: 'melon', weight: 5 },
]

const TOTAL_WEIGHT = FRUIT_WEIGHTS.reduce((sum, w) => sum + w.weight, 0)

export function getFruitScore(type: FruitType): number {
  return FRUIT_SCORES[type]
}

export function pickFruitType(rng: Rng): FruitType {
  const roll = rng() * TOTAL_WEIGHT
  let cumulative = 0
  for (const { type, weight } of FRUIT_WEIGHTS) {
    cumulative += weight
    if (roll < cumulative) return type
  }
  return 'cherry'
}

// 10x10セル領域ごとに1個の果物を配置
const REGION_SIZE = 10

export function generateFruitsForChunk(
  baseSeed: number,
  cx: number,
  cy: number,
  cells: CellType[][],
): Fruit[] {
  const seed = (baseSeed * 53 + cx * 8629 + cy * 130657) | 0
  const rng = createRng(seed)
  const height = cells.length
  const width = cells[0].length
  const fruits: Fruit[] = []

  // チャンクを10x10の領域に分割し、各領域に1個配置
  for (let regionRow = 0; regionRow < height; regionRow += REGION_SIZE) {
    for (let regionCol = 0; regionCol < width; regionCol += REGION_SIZE) {
      const passages: { row: number; col: number }[] = []

      const maxRow = Math.min(regionRow + REGION_SIZE, height)
      const maxCol = Math.min(regionCol + REGION_SIZE, width)

      for (let r = regionRow; r < maxRow; r++) {
        for (let c = regionCol; c < maxCol; c++) {
          if (cells[r][c] === 'passage') {
            passages.push({ row: r, col: c })
          }
        }
      }

      if (passages.length === 0) continue

      const idx = Math.floor(rng() * passages.length)
      const pos = passages[idx]
      const type = pickFruitType(rng)

      fruits.push({ type, localRow: pos.row, localCol: pos.col })
    }
  }

  return fruits
}
