import type { Direction } from '@/domain/types'
import type { EndlessGameState } from '@/domain/endless-types'
import { createEndlessMaze, getWorldCell, ensureChunksAround, ensureChunkAt, CHUNK_MAZE_SIZE } from '@/domain/endless-maze'
import { moveForward, changeDirection } from '@/domain/player'
import { calculateEndlessScore } from '@/domain/endless-score'

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

export function initEndless(seed: number): EndlessGameState {
  let maze = createEndlessMaze(seed)

  const centerRow = Math.floor(CHUNK_MAZE_SIZE / 2)
  const centerCol = Math.floor(CHUNK_MAZE_SIZE / 2)

  let startRow = centerRow % 2 === 0 ? centerRow + 1 : centerRow
  let startCol = centerCol % 2 === 0 ? centerCol + 1 : centerCol

  if (getWorldCell(maze, startRow, startCol) !== 'passage') {
    startRow = 1
    startCol = 1
  }

  // 周囲2チャンク分を広めに生成
  for (let cy = -2; cy <= 2; cy++) {
    for (let cx = -2; cx <= 2; cx++) {
      maze = ensureChunkAt(maze, cy, cx)
    }
  }

  const visited = new Set<string>()
  visited.add(posKey(startRow, startCol))

  return {
    maze,
    player: { position: { row: startRow, col: startCol }, direction: 'right' },
    startPosition: { row: startRow, col: startCol },
    score: 0,
    distance: 0,
    streak: 0,
    visited,
    tileSpeed: 4.0,
    status: 'playing',
  }
}

export function endlessTick(state: EndlessGameState): EndlessGameState {
  if (state.status !== 'playing') return state

  const nextPosition = moveForward(state.player)

  if (getWorldCell(state.maze, nextPosition.row, nextPosition.col) === 'wall') {
    return { ...state, status: 'game-over' }
  }

  const maze = ensureChunksAround(state.maze, nextPosition.row, nextPosition.col)

  const key = posKey(nextPosition.row, nextPosition.col)
  const isNewTile = !state.visited.has(key)

  const { score: scoreGain, streak } = calculateEndlessScore({
    isNewTile,
    streak: state.streak,
  })

  const newVisited = isNewTile ? new Set(state.visited).add(key) : state.visited
  const newDistance = isNewTile ? state.distance + 1 : state.distance

  const tileSpeed = 4.0 + newDistance * 0.02

  return {
    ...state,
    maze,
    player: { ...state.player, position: nextPosition },
    score: state.score + scoreGain,
    distance: newDistance,
    streak,
    visited: newVisited,
    tileSpeed,
    status: 'playing',
  }
}

export function handleEndlessDirectionChange(
  state: EndlessGameState,
  direction: Direction,
): EndlessGameState {
  if (state.status !== 'playing') return state

  return {
    ...state,
    player: changeDirection(state.player, direction),
  }
}
