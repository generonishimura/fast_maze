import type { Direction } from '@/domain/types'
import type { EndlessGameState, WorldFruit } from '@/domain/endless-types'
import { createEndlessMaze, getWorldCell, ensureChunksAround, ensureChunkAt, CHUNK_MAZE_SIZE, CHUNK_INNER_SIZE } from '@/domain/endless-maze'
import { moveForward, changeDirection } from '@/domain/player'
import { calculateEndlessScore } from '@/domain/endless-score'
import { generateFruitsForChunk, getFruitScore } from '@/domain/fruit'
import { createInsector, insectorTick, checkInsectorCollision, findSpawnPosition } from '@/domain/insector'
import { createRng } from '@/utils/random'

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`
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
    lives: 3,
    status: 'playing',
    fruits,
    collectedFruit: null,
    insector: null,
    insectorCooldown: 8,
    deathCause: null,
  }
}

const INSECTOR_MIN_DISTANCE = 15
const INSECTOR_SPAWN_CHANCE = 0.8
const INSECTOR_MIN_DURATION_TICKS = 8
const INSECTOR_MAX_DURATION_TICKS = 20
const INSECTOR_MIN_COOLDOWN = 5
const INSECTOR_MAX_COOLDOWN = 15

export function endlessTick(state: EndlessGameState): EndlessGameState {
  if (state.status !== 'playing') return state

  const nextPosition = moveForward(state.player)

  if (getWorldCell(state.maze, nextPosition.row, nextPosition.col) === 'wall') {
    const newLives = state.lives - 1
    if (newLives > 0) {
      return { ...state, status: 'stunned', lives: newLives, collectedFruit: null, deathCause: 'wall' }
    }
    return { ...state, status: 'game-over', lives: 0, collectedFruit: null, deathCause: 'wall' }
  }

  const prevMaze = state.maze
  const maze = ensureChunksAround(prevMaze, nextPosition.row, nextPosition.col)

  const key = posKey(nextPosition.row, nextPosition.col)
  const isNewTile = !state.visited.has(key)

  const { score: scoreGain, streak } = calculateEndlessScore({
    isNewTile,
    streak: state.streak,
  })

  // #4: mazeが変わった場合のみフルーツ生成・プルーニング（Set生成排除）
  // #5: プルーニングされたチャンクのフルーツも削除
  const mazeChanged = maze !== prevMaze
  const collectedFruit = state.fruits.get(key) ?? null

  let fruits: ReadonlyMap<string, WorldFruit>
  if (!mazeChanged && !collectedFruit) {
    // チャンク変更なし＆果物取得なし → fruitsはそのまま
    fruits = state.fruits
  } else {
    let mutableFruits: Map<string, WorldFruit>
    if (mazeChanged) {
      const prevChunkKeys = new Set(prevMaze.chunks.keys())
      mutableFruits = generateFruitsForNewChunks(maze, state.fruits, prevChunkKeys)

      // プルーニングされたチャンクのフルーツを削除
      for (const [k, fruit] of mutableFruits) {
        const cx = Math.floor(fruit.col / CHUNK_INNER_SIZE)
        const cy = Math.floor(fruit.row / CHUNK_INNER_SIZE)
        if (!maze.chunks.has(chunkKey(cx, cy))) {
          mutableFruits.delete(k)
        }
      }
    } else {
      mutableFruits = new Map(state.fruits)
    }

    if (collectedFruit) {
      mutableFruits.delete(key)
    }
    fruits = mutableFruits
  }

  let fruitScore = 0
  if (collectedFruit) {
    fruitScore = getFruitScore(collectedFruit.type)
  }

  if (isNewTile) (state.visited as Set<string>).add(key)
  const newVisited = state.visited
  const newDistance = isNewTile ? state.distance + 1 : state.distance

  const tileSpeed = 4.0 + newDistance * 0.02

  // --- インセクターロジック ---
  const prevInsector = state.insector
  let insector = prevInsector
  let insectorCooldown = state.insectorCooldown > 0 ? state.insectorCooldown - 1 : 0

  if (insector !== null) {
    if (insector.status === 'despawning') {
      // despawning → 次のtickで削除
      const wasUnreachable = insector.unreachable
      insector = null
      if (wasUnreachable) {
        // 到達不可能だった → cooldown 0で即再スポーン可能
        insectorCooldown = 0
      } else {
        const rng = createRng(state.maze.seed + newDistance)
        insectorCooldown = INSECTOR_MIN_COOLDOWN +
          Math.floor(rng() * (INSECTOR_MAX_COOLDOWN - INSECTOR_MIN_COOLDOWN + 1))
      }
    } else {
      const newLives = state.lives - 1
      const insectorDeathStatus = newLives > 0 ? 'stunned' as const : 'game-over' as const
      const insectorGameOver = {
        ...state, maze, player: { ...state.player, position: nextPosition },
        status: insectorDeathStatus, lives: Math.max(0, newLives), deathCause: 'insector' as const,
        insector, insectorCooldown, collectedFruit: null,
        score: state.score + scoreGain + fruitScore,
        distance: newDistance, streak, visited: newVisited, tileSpeed, fruits,
      }

      // 衝突判定1: プレイヤーの移動先 === インセクターの現在位置（tick前）
      if (insector.status === 'active' && checkInsectorCollision(nextPosition, insector.position)) {
        // スタン時はインセクターを消す（復帰後に虫がいると不自然なため）
        if (insectorDeathStatus === 'stunned') {
          return { ...insectorGameOver, insector: null }
        }
        return insectorGameOver
      }

      const insectorBefore = insector
      // insectorTick実行
      insector = insectorTick(insector, maze, nextPosition)

      // 到達不可能 → 即despawnして次のtickで再スポーン
      if (insector.unreachable) {
        insector = { ...insector, status: 'despawning' }
      } else {
        // 衝突判定2: プレイヤーの新位置 === インセクターの移動後位置
        if (insector.status === 'active' && checkInsectorCollision(nextPosition, insector.position)) {
          if (insectorDeathStatus === 'stunned') {
            return { ...insectorGameOver, insector: null }
          }
          return { ...insectorGameOver, insector }
        }

        // すれ違い衝突: プレイヤーとインセクターが互いの位置を入れ替えた
        if (insectorBefore.status === 'active' && insector.moved) {
          if (
            nextPosition.row === insectorBefore.position.row &&
            nextPosition.col === insectorBefore.position.col &&
            insector.position.row === state.player.position.row &&
            insector.position.col === state.player.position.col
          ) {
            if (insectorDeathStatus === 'stunned') {
              return { ...insectorGameOver, insector: null }
            }
            return { ...insectorGameOver, insector }
          }
        }
      }
    }
  } else if (insectorCooldown <= 0 && newDistance >= INSECTOR_MIN_DISTANCE) {
    // スポーン判定
    const rng = createRng(state.maze.seed + newDistance)
    if (rng() < INSECTOR_SPAWN_CHANCE) {
      const spawnPos = findSpawnPosition(maze, nextPosition, rng)
      if (spawnPos !== null) {
        const durationTicks = INSECTOR_MIN_DURATION_TICKS +
          Math.floor(rng() * (INSECTOR_MAX_DURATION_TICKS - INSECTOR_MIN_DURATION_TICKS + 1))
        insector = createInsector(spawnPos, 'right', durationTicks)
      }
    }
  }

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
    insector,
    insectorCooldown,
    deathCause: null,
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

export function resumeFromStun(
  state: EndlessGameState,
  direction: Direction,
): EndlessGameState {
  if (state.status !== 'stunned') return state

  return {
    ...state,
    status: 'playing',
    player: changeDirection(state.player, direction),
    deathCause: null,
  }
}
