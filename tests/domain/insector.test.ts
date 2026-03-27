import { describe, it, expect } from 'vitest'
import {
  createInsector,
  insectorTick,
  checkInsectorCollision,
  findSpawnPosition,
  bfsNextDirection,
} from '@/domain/insector'
import type { Position, Direction } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import { getWorldCell } from '@/domain/endless-maze'

// テスト用: 全通路が繋がった迷路（奇数行列は通路、偶数行列も内側は通路）
function createTestMaze(): EndlessMazeState {
  const cells: ('wall' | 'passage')[][] = []
  for (let r = 0; r < 21; r++) {
    const row: ('wall' | 'passage')[] = []
    for (let c = 0; c < 21; c++) {
      if (r % 2 === 1 && c % 2 === 1) {
        row.push('passage')
      } else if (r % 2 === 1 && c % 2 === 0 && c > 0 && c < 20) {
        row.push('passage')
      } else if (r % 2 === 0 && c % 2 === 1 && r > 0 && r < 20) {
        row.push('passage')
      } else {
        row.push('wall')
      }
    }
    cells.push(row)
  }

  const chunks = new Map<string, ('wall' | 'passage')[][]>()
  chunks.set('0,0', cells)

  return { chunks, seed: 42, borderContractCache: new Map() }
}

// テスト用: 壁で分断された迷路（到達不可能テスト用）
function createSplitMaze(): EndlessMazeState {
  const cells: ('wall' | 'passage')[][] = []
  for (let r = 0; r < 21; r++) {
    const row: ('wall' | 'passage')[] = []
    for (let c = 0; c < 21; c++) {
      // col=10の列を全て壁にして左右を分断
      if (c === 10) {
        row.push('wall')
      } else if (r % 2 === 1 && c % 2 === 1) {
        row.push('passage')
      } else if (r % 2 === 1 && c % 2 === 0 && c > 0 && c < 20) {
        row.push('passage')
      } else if (r % 2 === 0 && c % 2 === 1 && r > 0 && r < 20) {
        row.push('passage')
      } else {
        row.push('wall')
      }
    }
    cells.push(row)
  }

  const chunks = new Map<string, ('wall' | 'passage')[][]>()
  chunks.set('0,0', cells)

  return { chunks, seed: 42, borderContractCache: new Map() }
}

describe('createInsector', () => {
  it('spawning状態のInsectorStateを生成する', () => {
    const position: Position = { row: 3, col: 5 }
    const direction: Direction = 'right'
    const durationTicks = 12

    const insector = createInsector(position, direction, durationTicks)

    expect(insector.position).toEqual(position)
    expect(insector.direction).toBe(direction)
    expect(insector.remainingTicks).toBe(durationTicks)
    expect(insector.moveCooldown).toBe(1)
    expect(insector.status).toBe('spawning')
    expect(insector.moved).toBe(false)
    expect(insector.unreachable).toBe(false)
  })
})

describe('bfsNextDirection', () => {
  it('直線的に到達可能な場合、正しい方向を返す', () => {
    const maze = createTestMaze()
    const from: Position = { row: 1, col: 1 }
    const to: Position = { row: 1, col: 7 }

    const dir = bfsNextDirection(maze, from, to)

    expect(dir).toBe('right')
  })

  it('壁を迂回する経路を見つける', () => {
    // col=10で壁分断された迷路では、左右は到達不可能
    const maze = createSplitMaze()
    const from: Position = { row: 1, col: 1 }
    const to: Position = { row: 1, col: 11 }

    const dir = bfsNextDirection(maze, from, to)

    // 壁で分断されているのでnull
    expect(dir).toBeNull()
  })

  it('同じ位置の場合nullを返す', () => {
    const maze = createTestMaze()
    const pos: Position = { row: 1, col: 1 }

    const dir = bfsNextDirection(maze, pos, pos)

    expect(dir).toBeNull()
  })

  it('L字型の経路でも最短経路を見つける', () => {
    const maze = createTestMaze()
    // (1,1)から(3,3)へ: 右→右→下→下 or 下→下→右→右
    const from: Position = { row: 1, col: 1 }
    const to: Position = { row: 3, col: 3 }

    const dir = bfsNextDirection(maze, from, to)

    // BFSなので最短経路の最初の一歩（rightかdown）
    expect(['right', 'down']).toContain(dir)
  })
})

describe('insectorTick', () => {
  it('spawningからactiveに遷移し、移動しない', () => {
    const insector = createInsector({ row: 1, col: 1 }, 'right', 10)
    const maze = createTestMaze()
    const playerPos: Position = { row: 1, col: 5 }

    const next = insectorTick(insector, maze, playerPos)

    expect(next.status).toBe('active')
    expect(next.position).toEqual({ row: 1, col: 1 })
    expect(next.moved).toBe(false)
  })

  it('BFS経路探索でプレイヤーに向かって移動する', () => {
    const insector = createInsector({ row: 1, col: 1 }, 'right', 10)
    const maze = createTestMaze()
    const playerPos: Position = { row: 1, col: 7 }

    const active = insectorTick(insector, maze, playerPos)
    const readyToMove = { ...active, moveCooldown: 0 }

    const next = insectorTick(readyToMove, maze, playerPos)

    expect(next.position.col).toBeGreaterThan(1)
    expect(next.moved).toBe(true)
  })

  it('MOVE_SKIP_INTERVALの倍数tickで移動をスキップする', () => {
    const insector = {
      position: { row: 1, col: 1 } as Position,
      direction: 'right' as Direction,
      remainingTicks: 10,
      moveCooldown: 2, // tickCount=3 → 3%3===0 でスキップ
      status: 'active' as const,
      moved: false,
      unreachable: false,
    }
    const maze = createTestMaze()
    const playerPos: Position = { row: 1, col: 7 }

    const next = insectorTick(insector, maze, playerPos)

    expect(next.position).toEqual({ row: 1, col: 1 })
    expect(next.moved).toBe(false)
  })

  it('到達不可能な場合unreachableフラグが立つ', () => {
    const maze = createSplitMaze()
    // インセクターは左側(col=1)、プレイヤーは右側(col=11) → 壁で分断
    const insector = {
      position: { row: 1, col: 1 } as Position,
      direction: 'right' as Direction,
      remainingTicks: 10,
      moveCooldown: 0,
      status: 'active' as const,
      moved: false,
      unreachable: false,
    }
    const playerPos: Position = { row: 1, col: 11 }

    const next = insectorTick(insector, maze, playerPos)

    expect(next.unreachable).toBe(true)
    expect(next.moved).toBe(false)
  })

  it('remainingTicksをデクリメントする', () => {
    const insector = {
      position: { row: 1, col: 1 } as Position,
      direction: 'right' as Direction,
      remainingTicks: 5,
      moveCooldown: 0,
      status: 'active' as const,
      moved: false,
      unreachable: false,
    }
    const maze = createTestMaze()
    const playerPos: Position = { row: 1, col: 7 }

    const next = insectorTick(insector, maze, playerPos)

    expect(next.remainingTicks).toBe(4)
  })

  it('remainingTicksが0以下でdespawningに遷移する', () => {
    const insector = {
      position: { row: 1, col: 1 } as Position,
      direction: 'right' as Direction,
      remainingTicks: 1,
      moveCooldown: 0,
      status: 'active' as const,
      moved: false,
      unreachable: false,
    }
    const maze = createTestMaze()
    const playerPos: Position = { row: 1, col: 7 }

    const next = insectorTick(insector, maze, playerPos)

    expect(next.status).toBe('despawning')
  })
})

describe('checkInsectorCollision', () => {
  it('同じ位置にいる場合trueを返す', () => {
    const pos: Position = { row: 3, col: 5 }
    expect(checkInsectorCollision(pos, pos)).toBe(true)
  })

  it('異なる位置にいる場合falseを返す', () => {
    const playerPos: Position = { row: 3, col: 5 }
    const insectorPos: Position = { row: 3, col: 6 }
    expect(checkInsectorCollision(playerPos, insectorPos)).toBe(false)
  })
})

describe('findSpawnPosition', () => {
  it('プレイヤー近くの到達可能なpassageセルを返す', () => {
    const maze = createTestMaze()
    const playerPos: Position = { row: 5, col: 5 }
    let callCount = 0
    const rng = () => {
      callCount++
      return (callCount * 0.13) % 1
    }

    const result = findSpawnPosition(maze, playerPos, rng)

    expect(result).not.toBeNull()
    if (result) {
      expect(getWorldCell(maze, result.row, result.col)).toBe('passage')
      // BFSで到達可能であること
      expect(bfsNextDirection(maze, result, playerPos)).not.toBeNull()
    }
  })

  it('候補がない場合nullを返す', () => {
    const cells: ('wall' | 'passage')[][] = []
    for (let r = 0; r < 21; r++) {
      const row: ('wall' | 'passage')[] = []
      for (let c = 0; c < 21; c++) {
        row.push(r === 1 && c === 1 ? 'passage' : 'wall')
      }
      cells.push(row)
    }
    const chunks = new Map<string, ('wall' | 'passage')[][]>()
    chunks.set('0,0', cells)
    const maze: EndlessMazeState = { chunks, seed: 42, borderContractCache: new Map() }

    const playerPos: Position = { row: 1, col: 1 }
    const rng = () => 0.5

    const result = findSpawnPosition(maze, playerPos, rng)

    expect(result).toBeNull()
  })
})
