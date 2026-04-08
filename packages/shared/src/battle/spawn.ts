import type { Position } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import { getWorldCell, CHUNK_INNER_SIZE } from '@/domain/endless-maze'
import { createRng } from '@/utils/random'

export const SPAWN_SALT = 777_777
export const MIN_SPAWN_DISTANCE = 3

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
]

function isValidSpawn(maze: EndlessMazeState, row: number, col: number): boolean {
  if (getWorldCell(maze, row, col) !== 'passage') return false

  const adjacentPassages = DIRECTIONS.filter(
    d => getWorldCell(maze, row + d.dr, col + d.dc) === 'passage'
  ).length

  return adjacentPassages >= 2
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

export function generateSpawnPositions(
  maze: EndlessMazeState,
  seed: number,
  count: number,
): Position[] {
  const rng = createRng(seed + SPAWN_SALT)
  const spawns: Position[] = []

  // 2×2チャンク領域内で近くにスポーン
  const range = CHUNK_INNER_SIZE * 2
  const offset = 0

  const maxAttempts = count * 200

  for (let attempt = 0; attempt < maxAttempts && spawns.length < count; attempt++) {
    const row = offset + Math.floor(rng() * range)
    const col = offset + Math.floor(rng() * range)

    if (!isValidSpawn(maze, row, col)) continue

    const tooClose = spawns.some(s => manhattanDistance(s, { row, col }) < MIN_SPAWN_DISTANCE)
    if (tooClose) continue

    spawns.push({ row, col })
  }

  return spawns
}
