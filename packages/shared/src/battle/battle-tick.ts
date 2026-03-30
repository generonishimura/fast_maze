import type { Direction, Position, CellType } from '@/domain/types'
import type { BattleGameState, BattlePlayerState } from '@/battle/types'
import { createEndlessMaze, ensureChunksAround, getWorldCell, CHUNK_INNER_SIZE, type EndlessMazeState } from '@/domain/endless-maze'
import { moveForward } from '@/domain/player'
import { resolveCollisions } from '@/battle/player-collision'
import { generateSpawnPositions } from '@/battle/spawn'
import { generateFruitsForChunk, getFruitScore } from '@/domain/fruit'

export const BATTLE_TILE_SPEED = 4.0 // tiles per second
export const INVINCIBLE_TICKS = 60 // 3秒 (20Hz server tick)
const SERVER_TICK_MS = 50 // 20Hz

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

export function initBattle(seed: number, playerIds: string[]): BattleGameState {
  let maze = createEndlessMaze(seed)
  maze = ensureChunksAround(maze, 0, 0)

  const spawns = generateSpawnPositions(maze, seed, playerIds.length)

  const players = new Map<string, BattlePlayerState>()
  for (let i = 0; i < playerIds.length; i++) {
    const spawn = spawns[i]
    players.set(playerIds[i], {
      id: playerIds[i],
      position: spawn,
      direction: 'right',
      score: 0,
      status: 'invincible',
      eliminatedBy: null,
      rank: null,
    })
  }

  return {
    seed,
    maze,
    players,
    collectedFruits: new Set<string>(),
    phase: 'playing',
    tickCount: 0,
    movementProgress: 0,
    eliminationOrder: [],
  }
}

export function battleTick(
  state: BattleGameState,
  inputs: Map<string, Direction>,
): BattleGameState {
  if (state.phase !== 'playing') return state

  const newTickCount = state.tickCount + 1

  // 方向入力は常に受け付ける（移動タイミングに関係なく）
  let playersWithInput = new Map<string, BattlePlayerState>()
  for (const [id, player] of state.players) {
    const inputDir = inputs.get(id)
    if (inputDir && player.status !== 'eliminated') {
      playersWithInput.set(id, { ...player, direction: inputDir })
    } else {
      playersWithInput.set(id, player)
    }
  }

  // 移動アキュムレーター: 4.0 tiles/sec × 50ms/tick = 0.2 per tick
  const newProgress = state.movementProgress + (BATTLE_TILE_SPEED * SERVER_TICK_MS) / 1000

  // まだ1タイル分に達していない → 方向更新 + 終了判定のみ
  if (newProgress < 1.0) {
    const aliveNow = [...playersWithInput.values()].filter(
      p => p.status === 'alive' || p.status === 'invincible'
    ).length
    const phaseNow = (aliveNow <= 1 && playersWithInput.size > 1) ? 'finished' as const : state.phase

    return {
      ...state,
      players: playersWithInput,
      phase: phaseNow,
      tickCount: newTickCount,
      movementProgress: newProgress,
    }
  }

  // 1タイル移動実行
  const remainder = newProgress - 1.0
  let maze = state.maze
  const collectedFruits = new Set(state.collectedFruits)
  const eliminationOrder = [...state.eliminationOrder]
  const updatedPlayers = new Map<string, BattlePlayerState>()

  for (const [id, player] of playersWithInput) {
    if (player.status === 'eliminated') {
      updatedPlayers.set(id, player)
      continue
    }

    // invincible期間のチェック
    let currentStatus = player.status
    if (currentStatus === 'invincible' && newTickCount >= INVINCIBLE_TICKS) {
      currentStatus = 'alive'
    }

    // 前進
    const nextPos = moveForward({ position: player.position, direction: player.direction })

    // チャンク確保
    maze = ensureChunksAround(maze, nextPos.row, nextPos.col)

    // 壁衝突チェック
    if (getWorldCell(maze, nextPos.row, nextPos.col) === 'wall') {
      if (currentStatus === 'invincible') {
        updatedPlayers.set(id, { ...player, status: currentStatus })
        continue
      }
      updatedPlayers.set(id, {
        ...player,
        status: 'eliminated',
        eliminatedBy: 'wall',
        rank: null,
      })
      eliminationOrder.push(id)
      continue
    }

    // 移動成功
    let score = player.score + 10

    // フルーツ収集
    const fruitKey = posKey(nextPos.row, nextPos.col)
    if (!collectedFruits.has(fruitKey)) {
      const fruit = findFruitAtPosition(maze, nextPos)
      if (fruit) {
        score += fruit.score
        collectedFruits.add(fruitKey)
      }
    }

    updatedPlayers.set(id, {
      ...player,
      position: nextPos,
      score,
      status: currentStatus,
    })
  }

  // プレイヤー間衝突解決
  const alivePlayers = [...updatedPlayers.values()].filter(
    p => p.status === 'alive' || p.status === 'invincible'
  )
  const collisionResult = resolveCollisions(alivePlayers)

  for (const elim of collisionResult.eliminated) {
    const player = updatedPlayers.get(elim.id)!
    updatedPlayers.set(elim.id, {
      ...player,
      status: 'eliminated',
      eliminatedBy: elim.eliminatedBy,
    })
    eliminationOrder.push(elim.id)
  }

  // 終了判定
  const aliveCount = [...updatedPlayers.values()].filter(
    p => p.status === 'alive' || p.status === 'invincible'
  ).length
  const totalPlayers = updatedPlayers.size
  const phase = (aliveCount <= 1 && totalPlayers > 1) ? 'finished' : 'playing'

  if (phase === 'finished') {
    for (const [id, player] of updatedPlayers) {
      if (player.status === 'alive' || player.status === 'invincible') {
        updatedPlayers.set(id, { ...player, rank: 1 })
      }
    }
    for (let i = 0; i < eliminationOrder.length; i++) {
      const pid = eliminationOrder[i]
      const p = updatedPlayers.get(pid)!
      if (p.rank === null) {
        updatedPlayers.set(pid, { ...p, rank: totalPlayers - i })
      }
    }
  }

  return {
    ...state,
    maze,
    players: updatedPlayers,
    collectedFruits,
    phase,
    tickCount: newTickCount,
    movementProgress: remainder,
    eliminationOrder,
  }
}

function findFruitAtPosition(
  maze: Pick<EndlessMazeState, 'seed' | 'chunks'>,
  pos: Position,
): { score: number } | null {
  const cx = Math.floor(pos.row / CHUNK_INNER_SIZE)
  const cy = Math.floor(pos.col / CHUNK_INNER_SIZE)
  const localRow = ((pos.row % CHUNK_INNER_SIZE) + CHUNK_INNER_SIZE) % CHUNK_INNER_SIZE
  const localCol = ((pos.col % CHUNK_INNER_SIZE) + CHUNK_INNER_SIZE) % CHUNK_INNER_SIZE

  const chunkKey = `${cx},${cy}`
  const chunk = maze.chunks.get(chunkKey) as CellType[][] | undefined
  if (!chunk) return null

  const fruits = generateFruitsForChunk(maze.seed, cx, cy, chunk)
  const found = fruits.find(f => f.localRow === localRow && f.localCol === localCol)
  if (!found) return null

  return { score: getFruitScore(found.type) }
}
