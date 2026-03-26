import { describe, it, expect } from 'vitest'
import { generateConstrainedMaze, type BorderConstraints } from '@/domain/maze-generator'

const SIZE = 21

// 2x2の通路ブロックがないことを確認（1マス幅を保証）
function hasNo2x2Passage(cells: ReadonlyArray<ReadonlyArray<string>>): boolean {
  for (let r = 0; r < cells.length - 1; r++) {
    for (let c = 0; c < cells[0].length - 1; c++) {
      if (
        cells[r][c] === 'passage' &&
        cells[r][c + 1] === 'passage' &&
        cells[r + 1][c] === 'passage' &&
        cells[r + 1][c + 1] === 'passage'
      ) {
        return false
      }
    }
  }
  return true
}

// 全通路が連結であることを確認
function isFullyConnected(cells: ReadonlyArray<ReadonlyArray<string>>): boolean {
  const h = cells.length
  const w = cells[0].length
  const visited = new Set<string>()

  // 最初のpassageを見つける
  let startR = -1, startC = -1
  for (let r = 0; r < h && startR < 0; r++) {
    for (let c = 0; c < w && startR < 0; c++) {
      if (cells[r][c] === 'passage') { startR = r; startC = c }
    }
  }
  if (startR < 0) return true

  const queue: [number, number][] = [[startR, startC]]
  visited.add(`${startR},${startC}`)

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc
      const key = `${nr},${nc}`
      if (nr >= 0 && nr < h && nc >= 0 && nc < w && cells[nr][nc] === 'passage' && !visited.has(key)) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }

  let totalPassages = 0
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (cells[r][c] === 'passage') totalPassages++
    }
  }

  return visited.size === totalPassages
}

// 孤立壁ブロックがないことを確認
// 孤立壁ブロック = 内部の壁セルで上下左右が全てpassageであるもの
function hasNoIsolatedWallBlock(cells: ReadonlyArray<ReadonlyArray<string>>): boolean {
  const h = cells.length
  const w = cells[0].length
  for (let r = 1; r < h - 1; r++) {
    for (let c = 1; c < w - 1; c++) {
      if (cells[r][c] !== 'wall') continue
      if (
        cells[r - 1][c] === 'passage' &&
        cells[r + 1][c] === 'passage' &&
        cells[r][c - 1] === 'passage' &&
        cells[r][c + 1] === 'passage'
      ) {
        return false
      }
    }
  }
  return true
}

function noBorders(): BorderConstraints {
  const empty = new Array(Math.floor(SIZE / 2)).fill(false)
  return { top: [...empty], bottom: [...empty], left: [...empty], right: [...empty] }
}

describe('generateConstrainedMaze', () => {
  it('制約なしで有効な迷路を生成する', () => {
    const result = generateConstrainedMaze(SIZE, SIZE, 42, noBorders())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.width).toBe(SIZE)
    expect(result.value.height).toBe(SIZE)
    expect(hasNo2x2Passage(result.value.cells)).toBe(true)
    expect(isFullyConnected(result.value.cells)).toBe(true)
  })

  it('境界制約の内部ノードが通路になる', () => {
    const borders = noBorders()
    borders.right[0] = true  // row=1 → 内部ノード (1, SIZE-2)
    borders.right[2] = true  // row=5 → 内部ノード (5, SIZE-2)

    const result = generateConstrainedMaze(SIZE, SIZE, 42, borders)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.cells[1][SIZE - 2]).toBe('passage')
    expect(result.value.cells[5][SIZE - 2]).toBe('passage')
  })

  it('境界通路が内部迷路と連結している', () => {
    const borders = noBorders()
    borders.top[1] = true
    borders.bottom[3] = true
    borders.left[2] = true
    borders.right[4] = true

    const result = generateConstrainedMaze(SIZE, SIZE, 42, borders)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(isFullyConnected(result.value.cells)).toBe(true)
  })

  it('全方向に制約があっても1マス幅を維持する', () => {
    const borders = noBorders()
    for (let i = 0; i < borders.top.length; i++) {
      borders.top[i] = true
      borders.bottom[i] = true
      borders.left[i] = true
      borders.right[i] = true
    }

    const result = generateConstrainedMaze(SIZE, SIZE, 42, borders)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(hasNo2x2Passage(result.value.cells)).toBe(true)
    expect(isFullyConnected(result.value.cells)).toBe(true)
  })

  it('異なるシードで異なる迷路を生成する', () => {
    const a = generateConstrainedMaze(SIZE, SIZE, 42, noBorders())
    const b = generateConstrainedMaze(SIZE, SIZE, 99, noBorders())
    if (!a.ok || !b.ok) return

    expect(a.value.cells).not.toEqual(b.value.cells)
  })

  it('複数シードで不変条件が成り立つ（プロパティテスト）', () => {
    const borders = noBorders()
    borders.right[1] = true
    borders.bottom[2] = true
    borders.left[3] = true

    for (let seed = 0; seed < 50; seed++) {
      const result = generateConstrainedMaze(SIZE, SIZE, seed, borders)
      expect(result.ok).toBe(true)
      if (!result.ok) continue

      expect(hasNo2x2Passage(result.value.cells)).toBe(true)
      expect(isFullyConnected(result.value.cells)).toBe(true)
      expect(hasNoIsolatedWallBlock(result.value.cells)).toBe(true)
      // 境界制約が内部ノードに反映されている
      expect(result.value.cells[3][SIZE - 2]).toBe('passage')  // right[1] -> (3, SIZE-2)
      expect(result.value.cells[SIZE - 2][5]).toBe('passage')  // bottom[2] -> (SIZE-2, 5)
      expect(result.value.cells[7][1]).toBe('passage')         // left[3] -> (7, 1)
    }
  })

  it('全方向に制約があっても孤立壁ブロックが生まれない', () => {
    for (let seed = 0; seed < 50; seed++) {
      const borders = noBorders()
      for (let i = 0; i < borders.top.length; i++) {
        if (i % 2 === 0) {
          borders.top[i] = true
          borders.bottom[i] = true
          borders.left[i] = true
          borders.right[i] = true
        }
      }

      const result = generateConstrainedMaze(SIZE, SIZE, seed, borders)
      expect(result.ok).toBe(true)
      if (!result.ok) continue

      expect(hasNoIsolatedWallBlock(result.value.cells)).toBe(true)
      expect(hasNo2x2Passage(result.value.cells)).toBe(true)
      expect(isFullyConnected(result.value.cells)).toBe(true)
    }
  })
})
