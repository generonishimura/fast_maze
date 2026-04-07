import type { Direction, Position, CellType } from '@/domain/types'
import type { BattleGameState, BattlePlayerState } from '@/battle/types'
import { createEndlessMaze, ensureChunksAround, getWorldCell, CHUNK_INNER_SIZE, type EndlessMazeState } from '@/domain/endless-maze'
import { moveForward } from '@/domain/player'
import { resolveCollisions } from '@/battle/player-collision'
import { generateSpawnPositions } from '@/battle/spawn'
import { generateFruitsForChunk, getFruitScore } from '@/domain/fruit'
import { chooseBotDirection } from '@/battle/bot-ai'

export const BATTLE_TILE_SPEED = 4.0 // tiles per second
export const INVINCIBLE_TICKS = 60 // 3秒 (20Hz server tick)
const SERVER_TICK_MS = 50 // 20Hz

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

function hasAliveHuman(players: ReadonlyMap<string, BattlePlayerState>): boolean {
  for (const p of players.values()) {
    if (!p.isBot && (p.status === 'alive' || p.status === 'invincible' || p.status === 'waiting')) {
      return true
    }
  }
  return false
}

export function initBattle(seed: number, playerIds: string[], botIds: ReadonlySet<string> = new Set()): BattleGameState {
  let maze = createEndlessMaze(seed)
  maze = ensureChunksAround(maze, 0, 0)

  const spawns = generateSpawnPositions(maze, seed, playerIds.length)

  const players = new Map<string, BattlePlayerState>()
  for (let i = 0; i < playerIds.length; i++) {
    const spawn = spawns[i]
    const isBot = botIds.has(playerIds[i])
    players.set(playerIds[i], {
      id: playerIds[i],
      position: spawn,
      direction: 'right',
      score: 0,
      status: isBot ? 'invincible' : 'waiting',
      eliminatedBy: null,
      rank: null,
      isBot,
      invincibleUntilTick: INVINCIBLE_TICKS,
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
    fruitCache: new Map(),
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
    if (inputDir && player.status === 'waiting') {
      // 最初の入力で待機→invincibleに遷移
      playersWithInput.set(id, { ...player, direction: inputDir, status: 'invincible', invincibleUntilTick: newTickCount + INVINCIBLE_TICKS })
    } else if (inputDir && player.status !== 'eliminated') {
      playersWithInput.set(id, { ...player, direction: inputDir })
    } else {
      playersWithInput.set(id, player)
    }
  }

  // 移動アキュムレーター: 4.0 tiles/sec × 50ms/tick = 0.2 per tick
  const newProgress = state.movementProgress + (BATTLE_TILE_SPEED * SERVER_TICK_MS) / 1000

  // まだ1タイル分に達していない → 方向更新のみ
  if (newProgress < 1.0) {
    return {
      ...state,
      players: playersWithInput,
      tickCount: newTickCount,
      movementProgress: newProgress,
      phase: hasAliveHuman(playersWithInput) ? 'playing' : 'finished',
    }
  }

  // 1タイル移動実行
  const remainder = newProgress - 1.0
  const collectedFruits = new Set(state.collectedFruits)
  const eliminationOrder = [...state.eliminationOrder]
  const updatedPlayers = new Map<string, BattlePlayerState>()

  // 全aliveプレイヤーの次位置を先にまとめてチャンク確保（Mapコピーを1回に集約）
  // バトルモードではプレイヤーが散らばるため遠方チャンク削除をスキップ
  let maze = state.maze
  for (const [, player] of playersWithInput) {
    if (player.status === 'eliminated' || player.status === 'waiting') continue
    const nextPos = moveForward({ position: player.position, direction: player.direction })
    maze = ensureChunksAround(maze, nextPos.row, nextPos.col, { skipPrune: true })
  }

  for (const [id, player] of playersWithInput) {
    if (player.status === 'eliminated' || player.status === 'waiting') {
      updatedPlayers.set(id, player)
      continue
    }

    // invincible期間のチェック（プレイヤーごとの期限）
    let currentStatus = player.status
    if (currentStatus === 'invincible' && newTickCount >= player.invincibleUntilTick) {
      currentStatus = 'alive'
    }

    // ボット: 移動前にAIでプレイヤー追跡 & 壁回避
    let direction = player.direction
    if (player.isBot) {
      // 自分以外のaliveプレイヤー（人間）の位置をターゲットとして渡す
      const targets = new Set<string>()
      for (const [tid, tp] of playersWithInput) {
        if (tid === id) continue
        if (tp.status === 'eliminated' || tp.status === 'waiting') continue
        if (tp.isBot) continue
        targets.add(posKey(tp.position.row, tp.position.col))
      }
      direction = chooseBotDirection(maze, player.position, player.direction, targets)
    }

    // 前進
    const nextPos = moveForward({ position: player.position, direction })

    // 壁衝突チェック
    if (getWorldCell(maze, nextPos.row, nextPos.col) === 'wall') {
      if (player.isBot) {
        // ボットは壁で死なない: AIが回避しきれなかった場合はその場に留まる
        updatedPlayers.set(id, { ...player, direction, status: currentStatus })
      } else {
        // 人間プレイヤー → 脱落
        updatedPlayers.set(id, {
          ...player,
          status: 'eliminated',
          eliminatedBy: 'wall',
          rank: null,
        })
        eliminationOrder.push(id)
      }
      continue
    }

    // 移動成功
    let score = player.score + 10

    // フルーツ収集
    const fruitKey = posKey(nextPos.row, nextPos.col)
    if (!collectedFruits.has(fruitKey)) {
      const fruit = findFruitAtPosition(state.fruitCache, maze, nextPos)
      if (fruit) {
        score += fruit.score
        collectedFruits.add(fruitKey)
      }
    }

    updatedPlayers.set(id, {
      ...player,
      position: nextPos,
      direction,
      score,
      status: currentStatus,
    })
  }

  // プレイヤー間衝突解決
  // 移動したプレイヤーがいるタイル上の全プレイヤーを衝突判定対象にする
  const movedToTiles = new Set<string>()
  for (const [id, player] of updatedPlayers) {
    const prev = playersWithInput.get(id)
    if (!prev) continue
    if (player.position.row !== prev.position.row || player.position.col !== prev.position.col) {
      movedToTiles.add(posKey(player.position.row, player.position.col))
    }
  }
  const collisionCandidates = [...updatedPlayers.values()].filter(
    p => (p.status === 'alive' || p.status === 'invincible')
      && movedToTiles.has(posKey(p.position.row, p.position.col))
  )
  const collisionResult = resolveCollisions(collisionCandidates)

  for (const elim of collisionResult.eliminated) {
    const player = updatedPlayers.get(elim.id)!
    updatedPlayers.set(elim.id, {
      ...player,
      status: 'eliminated',
      eliminatedBy: elim.eliminatedBy,
    })
    eliminationOrder.push(elim.id)
  }

  // ゲーム終了判定: 人間プレイヤーが全滅したら終了
  const phase = hasAliveHuman(updatedPlayers) ? 'playing' : 'finished'

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

function getFruitMap(
  fruitCache: Map<string, Map<string, number>>,
  maze: Pick<EndlessMazeState, 'seed' | 'chunks'>,
  cx: number,
  cy: number,
): Map<string, number> {
  const cacheKey = `${maze.seed},${cx},${cy}`
  let cached = fruitCache.get(cacheKey)
  if (cached) return cached

  const chunkKey = `${cx},${cy}`
  const chunk = maze.chunks.get(chunkKey) as CellType[][] | undefined
  if (!chunk) return new Map()

  const fruits = generateFruitsForChunk(maze.seed, cx, cy, chunk)
  cached = new Map<string, number>()
  for (const f of fruits) {
    cached.set(`${f.localRow},${f.localCol}`, getFruitScore(f.type))
  }
  fruitCache.set(cacheKey, cached)
  return cached
}

function findFruitAtPosition(
  fruitCache: Map<string, Map<string, number>>,
  maze: Pick<EndlessMazeState, 'seed' | 'chunks'>,
  pos: Position,
): { score: number } | null {
  const cx = Math.floor(pos.row / CHUNK_INNER_SIZE)
  const cy = Math.floor(pos.col / CHUNK_INNER_SIZE)
  const localRow = ((pos.row % CHUNK_INNER_SIZE) + CHUNK_INNER_SIZE) % CHUNK_INNER_SIZE
  const localCol = ((pos.col % CHUNK_INNER_SIZE) + CHUNK_INNER_SIZE) % CHUNK_INNER_SIZE

  const fruitMap = getFruitMap(fruitCache, maze, cx, cy)
  const score = fruitMap.get(`${localRow},${localCol}`)
  if (score === undefined) return null

  return { score }
}
