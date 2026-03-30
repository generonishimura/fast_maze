import type { Direction, Position, CellType } from '@/domain/types'
import type { BattleGameState, BattlePlayerState } from '@/battle/types'
import { createEndlessMaze, ensureChunksAround, getWorldCell, CHUNK_INNER_SIZE, type EndlessMazeState } from '@/domain/endless-maze'
import { moveForward } from '@/domain/player'
import { resolveCollisions } from '@/battle/player-collision'
import { generateSpawnPositions } from '@/battle/spawn'
import { generateFruitsForChunk, getFruitScore } from '@/domain/fruit'


export const BATTLE_TILE_SPEED = 4.0
export const INVINCIBLE_TICKS = 60 // 3秒 (20Hz server tick)

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
    eliminationOrder: [],
  }
}

export function battleTick(
  state: BattleGameState,
  inputs: Map<string, Direction>,
): BattleGameState {
  if (state.phase !== 'playing') return state

  const newTickCount = state.tickCount + 1
  let maze = state.maze
  const collectedFruits = new Set(state.collectedFruits)
  const eliminationOrder = [...state.eliminationOrder]
  const updatedPlayers = new Map<string, BattlePlayerState>()

  // 各プレイヤーの状態を個別に更新（visited tracking per player isn't needed for battle - just score for new tiles）
  for (const [id, player] of state.players) {
    if (player.status === 'eliminated') {
      updatedPlayers.set(id, player)
      continue
    }

    // invincible期間のチェック
    let currentStatus = player.status
    if (currentStatus === 'invincible' && newTickCount >= INVINCIBLE_TICKS) {
      currentStatus = 'alive'
    }

    // 方向変更
    const inputDir = inputs.get(id)
    let playerState = inputDir
      ? { ...player, direction: inputDir }
      : player

    // 前進
    const nextPos = moveForward({ position: playerState.position, direction: playerState.direction })

    // チャンク確保
    maze = ensureChunksAround(maze, nextPos.row, nextPos.col)

    // 壁衝突チェック
    if (getWorldCell(maze, nextPos.row, nextPos.col) === 'wall') {
      if (currentStatus === 'invincible') {
        // invincible中は壁で止まる（位置変わらず）
        updatedPlayers.set(id, { ...playerState, status: currentStatus })
        continue
      }
      // 脱落
      updatedPlayers.set(id, {
        ...playerState,
        status: 'eliminated',
        eliminatedBy: 'wall',
        rank: null,
      })
      eliminationOrder.push(id)
      continue
    }

    // 移動成功
    let score = playerState.score

    // 新タイルによるスコア加算（簡易版: 毎tick10点）
    score += 10

    // フルーツ収集
    const fruitKey = posKey(nextPos.row, nextPos.col)
    if (!collectedFruits.has(fruitKey)) {
      // チャンク内のフルーツを確認
      const fruit = findFruitAtPosition(maze, nextPos)
      if (fruit) {
        score += fruit.score
        collectedFruits.add(fruitKey)
      }
    }

    updatedPlayers.set(id, {
      ...playerState,
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

  // 勝者にランクを付ける
  if (phase === 'finished') {
    for (const [id, player] of updatedPlayers) {
      if (player.status === 'alive' || player.status === 'invincible') {
        updatedPlayers.set(id, { ...player, rank: 1 })
      }
    }
    // 脱落者のランク付け（後に脱落した方がランクが高い）
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
    eliminationOrder,
  }
}

function findFruitAtPosition(
  maze: Pick<EndlessMazeState, 'seed' | 'chunks'>,
  pos: Position,
): { score: number } | null {
  // チャンク座標を計算
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
