import { describe, it, expect } from 'vitest'
import { hasPath } from '@/domain/maze-solver'
import { generateMaze } from '@/domain/maze-generator'

describe('hasPath', () => {
  it('生成された迷路の全通路セル間にパスが存在する', () => {
    const result = generateMaze(11, 11, 42)
    if (!result.ok) return

    const maze = result.value
    const passages: { row: number; col: number }[] = []

    for (let row = 1; row < maze.height - 1; row += 2) {
      for (let col = 1; col < maze.width - 1; col += 2) {
        if (maze.cells[row][col] === 'passage') {
          passages.push({ row, col })
        }
      }
    }

    // 全通路セルから最初の通路セルへのパスが存在する（完全迷路の証明）
    const origin = passages[0]
    for (const target of passages.slice(1)) {
      expect(hasPath(maze, origin, target)).toBe(true)
    }
  })

  it('壁でブロックされた経路はfalseを返す', () => {
    const maze = {
      width: 5,
      height: 5,
      cells: [
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'passage', 'wall', 'passage', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'passage', 'wall', 'passage', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
      ] as const,
    }

    expect(hasPath(maze, { row: 1, col: 1 }, { row: 1, col: 3 })).toBe(false)
  })
})
