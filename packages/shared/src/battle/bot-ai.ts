import type { Direction, Position } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import { getWorldCell } from '@/domain/endless-maze'

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function dirOffset(dir: Direction): { dr: number; dc: number } {
  switch (dir) {
    case 'up': return { dr: -1, dc: 0 }
    case 'down': return { dr: 1, dc: 0 }
    case 'left': return { dr: 0, dc: -1 }
    case 'right': return { dr: 0, dc: 1 }
  }
}

/**
 * BFSで最寄りターゲットへの最初の一歩方向を返す。
 * 見つからなければnull。
 */
function bfsTowardTarget(
  maze: EndlessMazeState,
  start: Position,
  targets: ReadonlySet<string>,
  maxSteps: number,
): Direction | null {
  if (targets.size === 0) return null

  // startの隣接4方向から探索開始し、どの初手方向から到達したかを記録
  const visited = new Set<string>()
  visited.add(`${start.row},${start.col}`)

  const queue: Array<{ row: number; col: number; firstDir: Direction }> = []

  for (const dir of ALL_DIRECTIONS) {
    const { dr, dc } = dirOffset(dir)
    const nr = start.row + dr
    const nc = start.col + dc
    const key = `${nr},${nc}`
    if (getWorldCell(maze, nr, nc) === 'passage') {
      // ターゲットが隣接にいたら即返す
      if (targets.has(key)) return dir
      visited.add(key)
      queue.push({ row: nr, col: nc, firstDir: dir })
    }
  }

  let steps = 0
  while (queue.length > 0 && steps < maxSteps) {
    const pos = queue.shift()!
    steps++

    for (const dir of ALL_DIRECTIONS) {
      const { dr, dc } = dirOffset(dir)
      const nr = pos.row + dr
      const nc = pos.col + dc
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      if (getWorldCell(maze, nr, nc) !== 'passage') continue
      visited.add(key)

      if (targets.has(key)) return pos.firstDir
      queue.push({ row: nr, col: nc, firstDir: pos.firstDir })
    }
  }

  return null
}

/**
 * 指定位置から到達可能な通路マスの数を数える（BFS、最大maxSteps）
 */
function floodCount(
  maze: EndlessMazeState,
  startRow: number,
  startCol: number,
  maxSteps: number,
): number {
  const visited = new Set<string>()
  const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }]
  visited.add(`${startRow},${startCol}`)
  let count = 0

  while (queue.length > 0 && count < maxSteps) {
    const pos = queue.shift()!
    count++

    for (const dir of ALL_DIRECTIONS) {
      const { dr, dc } = dirOffset(dir)
      const nr = pos.row + dr
      const nc = pos.col + dc
      const key = `${nr},${nc}`
      if (!visited.has(key) && getWorldCell(maze, nr, nc) === 'passage') {
        visited.add(key)
        queue.push({ row: nr, col: nc })
      }
    }
  }

  return count
}

/**
 * ボットの方向選択ロジック
 *
 * 1. BFSで最寄りプレイヤーへの方向を探す（追跡モード）
 * 2. 見つからなければflood fillで広い方向へ（探索モード）
 * 3. 壁に絶対ぶつからない方向のみ選択
 */
export function chooseBotDirection(
  maze: EndlessMazeState,
  position: Position,
  currentDirection: Direction,
  targetPositions?: ReadonlySet<string>,
): Direction {
  // 通行可能な方向のみ（壁回避保証）
  const passableDirections = ALL_DIRECTIONS.filter(dir => {
    const { dr, dc } = dirOffset(dir)
    return getWorldCell(maze, position.row + dr, position.col + dc) === 'passage'
  })

  if (passableDirections.length === 0) {
    return currentDirection
  }

  if (passableDirections.length === 1) {
    return passableDirections[0]
  }

  // 追跡モード: 最寄りプレイヤーへのBFS
  if (targetPositions && targetPositions.size > 0) {
    const chaseDir = bfsTowardTarget(maze, position, targetPositions, 200)
    if (chaseDir && passableDirections.includes(chaseDir)) {
      return chaseDir
    }
  }

  // 探索モード: Uターン以外でflood fillが広い方向へ
  const nonReverse = passableDirections.filter(d => d !== OPPOSITE[currentDirection])
  const candidates = nonReverse.length > 0 ? nonReverse : passableDirections

  if (candidates.length === 1) {
    return candidates[0]
  }

  let bestDir = candidates[0]
  let bestScore = -1

  for (const dir of candidates) {
    const { dr, dc } = dirOffset(dir)
    const nr = position.row + dr
    const nc = position.col + dc
    const score = floodCount(maze, nr, nc, 20)
    const bonus = dir === currentDirection ? 3 : 0
    if (score + bonus > bestScore) {
      bestScore = score + bonus
      bestDir = dir
    }
  }

  return bestDir
}
