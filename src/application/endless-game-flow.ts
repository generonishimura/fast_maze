import type { Direction } from '@/domain/types'
import type { EndlessGameState, WorldFruit } from '@/domain/endless-types'
import { createEndlessMaze, getWorldCell, ensureChunksAround, ensureChunkAt, CHUNK_MAZE_SIZE, CHUNK_INNER_SIZE } from '@/domain/endless-maze'
import { moveForward, changeDirection } from '@/domain/player'
import { calculateEndlessScore } from '@/domain/endless-score'
import { generateFruitsForChunk, getFruitScore } from '@/domain/fruit'

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

function generateFruitsForAllChunks(
  maze: { chunks: ReadonlyMap<string, import('@/domain/types').CellType[][]>; seed: number },
): Map<string, WorldFruit> {
  const fruits = new Map<string, WorldFruit>()

  for (const [key, cells] of maze.chunks) {
    const [cxStr, cyStr] = key.split(',')
    const cx = Number(cxStr)
    const cy = Number(cyStr)

    const chunkFruits = generateFruitsForChunk(maze.seed, cx, cy, cells)
    const offsetRow = cy * CHUNK_INNER_SIZE
    const offsetCol = cx * CHUNK_INNER_SIZE

    for (const fruit of chunkFruits) {
      const worldRow = offsetRow + fruit.localRow
      const worldCol = offsetCol + fruit.localCol
      const fruitKey = posKey(worldRow, worldCol)
      fruits.set(fruitKey, { type: fruit.type, row: worldRow, col: worldCol })
    }
  }

  return fruits
}

function generateFruitsForNewChunks(
  maze: { chunks: ReadonlyMap<string, import('@/domain/types').CellType[][]>; seed: number },
  existingFruits: ReadonlyMap<string, WorldFruit>,
  existingChunkKeys: ReadonlySet<string>,
): Map<string, WorldFruit> {
  const fruits = new Map(existingFruits)

  for (const [key, cells] of maze.chunks) {
    if (existingChunkKeys.has(key)) continue

    const [cxStr, cyStr] = key.split(',')
    const cx = Number(cxStr)
    const cy = Number(cyStr)

    const chunkFruits = generateFruitsForChunk(maze.seed, cx, cy, cells)
    const offsetRow = cy * CHUNK_INNER_SIZE
    const offsetCol = cx * CHUNK_INNER_SIZE

    for (const fruit of chunkFruits) {
      const worldRow = offsetRow + fruit.localRow
      const worldCol = offsetCol + fruit.localCol
      const fruitKey = posKey(worldRow, worldCol)
      fruits.set(fruitKey, { type: fruit.type, row: worldRow, col: worldCol })
    }
  }

  return fruits
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

  // 全チャンクの果物を生成（プレイヤー開始位置は除外）
  const fruits = generateFruitsForAllChunks(maze)
  fruits.delete(posKey(startRow, startCol))

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
    fruits,
    collectedFruit: null,
  }
}

export function endlessTick(state: EndlessGameState): EndlessGameState {
  if (state.status !== 'playing') return state

  const nextPosition = moveForward(state.player)

  if (getWorldCell(state.maze, nextPosition.row, nextPosition.col) === 'wall') {
    return { ...state, status: 'game-over', collectedFruit: null }
  }

  const prevChunkKeys = new Set(state.maze.chunks.keys())
  const maze = ensureChunksAround(state.maze, nextPosition.row, nextPosition.col)

  // 新チャンクの果物を生成
  const fruits = generateFruitsForNewChunks(maze, state.fruits, prevChunkKeys)

  const key = posKey(nextPosition.row, nextPosition.col)
  const isNewTile = !state.visited.has(key)

  const { score: scoreGain, streak } = calculateEndlessScore({
    isNewTile,
    streak: state.streak,
  })

  // 果物の取得判定
  const collectedFruit = fruits.get(key) ?? null
  let fruitScore = 0
  if (collectedFruit) {
    fruitScore = getFruitScore(collectedFruit.type)
    fruits.delete(key)
  }

  const newVisited = isNewTile ? new Set(state.visited).add(key) : state.visited
  const newDistance = isNewTile ? state.distance + 1 : state.distance

  const tileSpeed = 4.0 + newDistance * 0.02

  return {
    ...state,
    maze,
    player: { ...state.player, position: nextPosition },
    score: state.score + scoreGain + fruitScore,
    distance: newDistance,
    streak,
    visited: newVisited,
    tileSpeed,
    status: 'playing',
    fruits,
    collectedFruit,
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
