import { Room, Client } from "colyseus"
import { BattleRoomState, PlayerSchema } from "../schema.js"
import { initBattle, battleTick, INVINCIBLE_TICKS } from "@/battle/battle-tick"
import type { BattleGameState } from "@/battle/types"
import type { Direction } from "@/domain/types"

const MAX_PLAYERS = 64
const MIN_PLAYERS = 2
const LOBBY_TIMEOUT_MS = 30_000
const COUNTDOWN_TICKS = 60 // 3秒 @ 20Hz
const SERVER_TICK_RATE_MS = 50 // 20Hz

export class BattleRoom extends Room<{ state: BattleRoomState }> {
  state = new BattleRoomState()

  private gameState: BattleGameState | null = null
  private inputQueue = new Map<string, Direction>()
  private readyPlayers = new Set<string>()
  private lobbyTimer: ReturnType<typeof setTimeout> | null = null
  private countdownTicks = 0

  messages = {
    direction: (client: Client, message: { direction: string }) => {
      const dir = message.direction as Direction
      if (['up', 'down', 'left', 'right'].includes(dir)) {
        this.inputQueue.set(client.sessionId, dir)
      }
    },

    ready: (client: Client) => {
      this.readyPlayers.add(client.sessionId)
      this.broadcast("playerReady", { playerId: client.sessionId })
      this.checkStartCondition()
    },
  }

  onCreate() {
    this.maxClients = MAX_PLAYERS
    this.state.phase = "lobby"
    this.state.seed = (Date.now() * 7 + Math.floor(Math.random() * 10000)) | 0
    this.state.aliveCount = 0
    this.state.totalPlayers = 0
  }

  onJoin(client: Client) {
    const player = new PlayerSchema()
    player.id = client.sessionId
    player.row = 0
    player.col = 0
    player.direction = "right"
    player.score = 0
    player.status = "waiting"
    player.eliminatedBy = ""
    player.rank = -1
    this.state.players.set(client.sessionId, player)
    this.state.totalPlayers = this.state.players.size

    this.broadcast("playerJoined", {
      playerId: client.sessionId,
      totalPlayers: this.state.players.size,
    })
  }

  onLeave(client: Client) {
    this.readyPlayers.delete(client.sessionId)

    if (this.state.phase === "lobby") {
      this.state.players.delete(client.sessionId)
      this.state.totalPlayers = this.state.players.size
    } else if (this.gameState) {
      // ゲーム中の離脱 = 脱落扱い
      const player = this.gameState.players.get(client.sessionId)
      if (player && (player.status === 'alive' || player.status === 'invincible')) {
        const updated = new Map(this.gameState.players)
        updated.set(client.sessionId, {
          ...player,
          status: 'eliminated',
          eliminatedBy: 'disconnect',
        })
        this.gameState = { ...this.gameState, players: updated }
      }
    }
  }

  private checkStartCondition() {
    if (this.state.phase !== "lobby") return

    const playerCount = this.state.players.size
    if (playerCount >= MIN_PLAYERS && this.readyPlayers.size >= playerCount) {
      this.startCountdown()
    } else if (playerCount >= MIN_PLAYERS && !this.lobbyTimer) {
      this.lobbyTimer = setTimeout(() => {
        if (this.readyPlayers.size >= MIN_PLAYERS) {
          this.startCountdown()
        }
      }, LOBBY_TIMEOUT_MS)
    }
  }

  private startCountdown() {
    if (this.lobbyTimer) {
      clearTimeout(this.lobbyTimer)
      this.lobbyTimer = null
    }

    this.state.phase = "countdown"
    this.countdownTicks = COUNTDOWN_TICKS
    this.broadcast("countdown", { seconds: 3 })

    this.setSimulationInterval((delta) => this.update(delta), SERVER_TICK_RATE_MS)
  }

  private startGame() {
    const playerIds = [...this.state.players.keys()]
    this.gameState = initBattle(this.state.seed, playerIds)
    this.state.phase = "playing"
    this.state.aliveCount = playerIds.length

    // スポーン位置をSchema stateに反映
    for (const [id, battlePlayer] of this.gameState.players) {
      const schemaPlayer = this.state.players.get(id)
      if (schemaPlayer) {
        schemaPlayer.row = battlePlayer.position.row
        schemaPlayer.col = battlePlayer.position.col
        schemaPlayer.direction = battlePlayer.direction
        schemaPlayer.status = battlePlayer.status
        schemaPlayer.score = 0
      }
    }

    this.broadcast("gameStart", {
      seed: this.state.seed,
      spawnPositions: Object.fromEntries(
        [...this.gameState.players].map(([id, p]) => [id, { row: p.position.row, col: p.position.col }])
      ),
    })
  }

  private update(_delta: number) {
    // カウントダウン中
    if (this.state.phase === "countdown") {
      this.countdownTicks--
      if (this.countdownTicks <= 0) {
        this.startGame()
      }
      return
    }

    if (this.state.phase !== "playing" || !this.gameState) return

    // ドメインtick実行
    const prevPlayers = this.gameState.players
    this.gameState = battleTick(this.gameState, this.inputQueue)
    this.inputQueue.clear()

    // Schema stateにドメイン状態を反映
    let aliveCount = 0
    for (const [id, battlePlayer] of this.gameState.players) {
      const schemaPlayer = this.state.players.get(id)
      if (!schemaPlayer) continue

      schemaPlayer.row = battlePlayer.position.row
      schemaPlayer.col = battlePlayer.position.col
      schemaPlayer.direction = battlePlayer.direction
      schemaPlayer.score = battlePlayer.score
      schemaPlayer.status = battlePlayer.status
      schemaPlayer.eliminatedBy = battlePlayer.eliminatedBy ?? ""
      schemaPlayer.rank = battlePlayer.rank ?? -1

      if (battlePlayer.status === 'alive' || battlePlayer.status === 'invincible') {
        aliveCount++
      }

      // 脱落イベント送信
      const prev = prevPlayers.get(id)
      if (prev && prev.status !== 'eliminated' && battlePlayer.status === 'eliminated') {
        this.broadcast("elimination", {
          playerId: id,
          eliminatedBy: battlePlayer.eliminatedBy,
          rank: battlePlayer.rank,
        })
      }
    }

    this.state.aliveCount = aliveCount
    this.state.tickCount = this.gameState.tickCount

    // ゲーム終了
    if (this.gameState.phase === 'finished') {
      this.state.phase = "finished"

      const rankings = [...this.gameState.players.values()]
        .filter(p => p.rank !== null)
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
        .map(p => ({ id: p.id, rank: p.rank, score: p.score }))

      this.broadcast("gameEnd", { rankings })

      // 10秒後にルーム破棄
      this.clock.setTimeout(() => this.disconnect(), 10_000)
    }
  }
}
