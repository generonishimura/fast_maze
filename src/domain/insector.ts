import type { Position, Direction } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import { getWorldCell } from '@/domain/endless-maze'
import type { Rng } from '@/utils/random'

export type InsectorState = {
  readonly position: Position
  readonly direction: Direction
  readonly remainingTicks: number
  readonly moveCooldown: number
  readonly status: 'spawning' | 'active' | 'despawning'
  readonly moved: boolean
  readonly unreachable: boolean  // BFSでプレイヤーに到達不可能
}

// 何tickに1回スキップするか（3 = 3tickに1回休む → 2/3速度）
const MOVE_SKIP_INTERVAL = 3

// BFS探索の最大深さ
const BFS_MAX_DEPTH = 50

export function createInsector(
  position: Position,
  direction: Direction,
  durationTicks: number,
): InsectorState {
  return {
    position,
    direction,
    remainingTicks: durationTicks,
    moveCooldown: 1,
    status: 'spawning',
    moved: false,
    unreachable: false,
  }
}

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right']

function directionDelta(dir: Direction): { dRow: number; dCol: number } {
  switch (dir) {
    case 'up': return { dRow: -1, dCol: 0 }
    case 'down': return { dRow: 1, dCol: 0 }
    case 'left': return { dRow: 0, dCol: -1 }
    case 'right': return { dRow: 0, dCol: 1 }
  }
}

/**
 * BFSでインセクターからプレイヤーへの最短経路の最初の一歩を返す。
 * 到達不可能な場合はnullを返す。
 */
export function bfsNextDirection(
  maze: EndlessMazeState,
  from: Position,
  to: Position,
): Direction | null {
  if (from.row === to.row && from.col === to.col) return null

  const visited = new Set<string>()
  visited.add(posKey(from.row, from.col))

  // キューの各要素: [position, このノードに到達するための最初の一歩の方向]
  const queue: Array<{ pos: Position; firstDir: Direction }> = []

  // 起点から4方向を初期キューに
  for (const dir of DIRECTIONS) {
    const { dRow, dCol } = directionDelta(dir)
    const nextPos: Position = { row: from.row + dRow, col: from.col + dCol }
    const key = posKey(nextPos.row, nextPos.col)

    if (visited.has(key)) continue
    if (getWorldCell(maze, nextPos.row, nextPos.col) !== 'passage') continue

    visited.add(key)

    if (nextPos.row === to.row && nextPos.col === to.col) {
      return dir
    }

    queue.push({ pos: nextPos, firstDir: dir })
  }

  let depth = 1
  let queueStart = 0

  while (queueStart < queue.length && depth < BFS_MAX_DEPTH) {
    const levelSize = queue.length - queueStart
    depth++

    for (let i = 0; i < levelSize; i++) {
      const { pos, firstDir } = queue[queueStart++]

      for (const dir of DIRECTIONS) {
        const { dRow, dCol } = directionDelta(dir)
        const nextPos: Position = { row: pos.row + dRow, col: pos.col + dCol }
        const key = posKey(nextPos.row, nextPos.col)

        if (visited.has(key)) continue
        if (getWorldCell(maze, nextPos.row, nextPos.col) !== 'passage') continue

        visited.add(key)

        if (nextPos.row === to.row && nextPos.col === to.col) {
          return firstDir
        }

        queue.push({ pos: nextPos, firstDir })
      }
    }
  }

  return null // 到達不可能
}

export function insectorTick(
  insector: InsectorState,
  maze: EndlessMazeState,
  playerPosition: Position,
): InsectorState {
  // spawning → active（移動なし）
  if (insector.status === 'spawning') {
    return { ...insector, status: 'active', moved: false }
  }

  if (insector.status === 'despawning') {
    return insector
  }

  // remainingTicksデクリメント → 0以下でdespawning
  const remainingTicks = insector.remainingTicks - 1
  if (remainingTicks <= 0) {
    return { ...insector, remainingTicks: 0, status: 'despawning', moved: false }
  }

  // moveCooldownをカウンタとして使用
  // MOVE_SKIP_INTERVAL tick毎に1回だけスキップ（2/3速度）
  const tickCount = insector.moveCooldown + 1
  const shouldSkip = tickCount % MOVE_SKIP_INTERVAL === 0

  if (shouldSkip) {
    return {
      ...insector,
      remainingTicks,
      moveCooldown: tickCount,
      moved: false,
    }
  }

  // BFS経路探索でプレイヤーへの最短経路の最初の一歩を取得
  const nextDir = bfsNextDirection(maze, insector.position, playerPosition)

  if (nextDir === null) {
    // 到達不可能 → unreachableフラグを立てる
    return {
      ...insector,
      remainingTicks,
      moveCooldown: tickCount,
      moved: false,
      unreachable: true,
    }
  }

  const { dRow, dCol } = directionDelta(nextDir)
  const newPosition: Position = {
    row: insector.position.row + dRow,
    col: insector.position.col + dCol,
  }

  return {
    position: newPosition,
    direction: nextDir,
    remainingTicks,
    moveCooldown: tickCount,
    status: 'active',
    moved: true,
    unreachable: false,
  }
}

export function checkInsectorCollision(
  playerPosition: Position,
  insectorPosition: Position,
): boolean {
  return playerPosition.row === insectorPosition.row
    && playerPosition.col === insectorPosition.col
}

export function findSpawnPosition(
  maze: EndlessMazeState,
  playerPosition: Position,
  rng: Rng,
): Position | null {
  const MIN_DIST = 5
  const MAX_DIST = 8
  const MAX_ATTEMPTS = 30

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const dist = MIN_DIST + Math.floor(rng() * (MAX_DIST - MIN_DIST + 1))
    const angle = rng() * Math.PI * 2
    const dRow = Math.round(Math.sin(angle) * dist)
    const dCol = Math.round(Math.cos(angle) * dist)

    const row = playerPosition.row + dRow
    const col = playerPosition.col + dCol

    if (getWorldCell(maze, row, col) !== 'passage') continue

    // BFSで到達可能か事前チェック
    const reachable = bfsNextDirection(maze, { row, col }, playerPosition)
    if (reachable === null) continue

    return { row, col }
  }

  return null
}
