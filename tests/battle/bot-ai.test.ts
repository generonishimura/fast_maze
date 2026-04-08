import { chooseBotDirection } from '@/battle/bot-ai'
import { createEndlessMaze, ensureChunksAround, getWorldCell } from '@/domain/endless-maze'
import type { Direction } from '@/domain/types'

describe('chooseBotDirection', () => {
  const seed = 12345
  const maze = ensureChunksAround(createEndlessMaze(seed), 0, 0)

  // テスト用に通路上の位置を見つける
  function findPassagePosition(): { row: number; col: number } {
    for (let r = 1; r < 19; r++) {
      for (let c = 1; c < 19; c++) {
        if (getWorldCell(maze, r, c) === 'passage') {
          return { row: r, col: c }
        }
      }
    }
    throw new Error('No passage found')
  }

  it('壁でない方向を返す', () => {
    // Given
    const pos = findPassagePosition()

    // When
    const dir = chooseBotDirection(maze, pos, 'right')

    // Then
    const nextRow = pos.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
    const nextCol = pos.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
    expect(getWorldCell(maze, nextRow, nextCol)).toBe('passage')
  })

  it('現在の方向が通路ならそのまま直進を優先する', () => {
    // Given: 直進可能な位置を見つける
    const pos = findPassagePosition()
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    let straightDir: Direction | null = null
    for (const dir of directions) {
      const nr = pos.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
      const nc = pos.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
      if (getWorldCell(maze, nr, nc) === 'passage') {
        straightDir = dir
        break
      }
    }
    if (!straightDir) return // skip if no straight passage

    // When
    const dir = chooseBotDirection(maze, pos, straightDir)

    // Then: 直進が通路ならそのまま直進するはず
    expect(dir).toBe(straightDir)
  })

  it('直進が壁の場合は別の通路方向を選ぶ', () => {
    // Given: 壁に面した位置と方向を見つける
    const pos = findPassagePosition()
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    let wallDir: Direction | null = null
    for (const dir of directions) {
      const nr = pos.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
      const nc = pos.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
      if (getWorldCell(maze, nr, nc) === 'wall') {
        wallDir = dir
        break
      }
    }
    if (!wallDir) return // skip if no wall adjacent

    // When
    const dir = chooseBotDirection(maze, pos, wallDir)

    // Then: 壁方向は選ばない
    expect(dir).not.toBe(wallDir)
    const nextRow = pos.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
    const nextCol = pos.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
    expect(getWorldCell(maze, nextRow, nextCol)).toBe('passage')
  })

  it('Uターン（逆方向）を避ける', () => {
    // Given: 2方向以上に通路がある位置を見つける
    let testPos = findPassagePosition()
    let currentDir: Direction = 'right'
    const directions: Direction[] = ['up', 'down', 'left', 'right']

    for (let r = 1; r < 19; r++) {
      for (let c = 1; c < 19; c++) {
        if (getWorldCell(maze, r, c) !== 'passage') continue
        const passageCount = directions.filter(d => {
          const nr = r + (d === 'down' ? 1 : d === 'up' ? -1 : 0)
          const nc = c + (d === 'right' ? 1 : d === 'left' ? -1 : 0)
          return getWorldCell(maze, nr, nc) === 'passage'
        }).length
        if (passageCount >= 3) {
          testPos = { row: r, col: c }
          // 通路方向を現在の方向として壁方向に設定
          for (const d of directions) {
            const nr = r + (d === 'down' ? 1 : d === 'up' ? -1 : 0)
            const nc = c + (d === 'right' ? 1 : d === 'left' ? -1 : 0)
            if (getWorldCell(maze, nr, nc) === 'wall') {
              currentDir = d
              break
            }
          }
          break
        }
      }
    }

    // When: 複数回試行
    const opposite: Record<Direction, Direction> = {
      up: 'down', down: 'up', left: 'right', right: 'left',
    }
    for (let i = 0; i < 10; i++) {
      const dir = chooseBotDirection(maze, testPos, currentDir)
      // Then: Uターンしない（他に選択肢がある場合）
      expect(dir).not.toBe(opposite[currentDir])
    }
  })
})
