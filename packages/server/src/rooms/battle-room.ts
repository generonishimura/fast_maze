import { Room, Client } from "colyseus"
import { BattleRoomState, PlayerSchema } from "../schema.js"
import { initBattle, battleTick, INVINCIBLE_TICKS } from "@/battle/battle-tick"
import { generateSpawnPositions } from "@/battle/spawn"
import { ensureChunksAround } from "@/domain/endless-maze"
import type { BattleGameState, BattlePlayerState } from "@/battle/types"
import type { Direction } from "@/domain/types"

const MAX_PLAYERS = 64
const COUNTDOWN_TICKS = 60 // 3秒 @ 20Hz
const SERVER_TICK_RATE_MS = 50 // 20Hz

export class BattleRoom extends Room<{ state: BattleRoomState }> {
  state = new BattleRoomState()

  private gameState: BattleGameState | null = null
  private inputQueue = new Map<string, Direction>()
  private botIds = new Set<string>()
  private countdownTicks = 0

  messages = {
    direction: (client: Client, message: { direction: string }) => {
      const dir = message.direction as Direction
      if (['up', 'down', 'left', 'right'].includes(dir)) {
        this.inputQueue.set(client.sessionId, dir)
      }
    },

    ready: (client: Client, message: { isBot?: boolean }) => {
      if (message?.isBot) {
        this.botIds.add(client.sessionId)
      }
      // 誰か1人がreadyしたらカウントダウン開始
      if (this.state.phase === "lobby") {
        this.startCountdown()
      }
    },
  }

  onCreate() {
    this.maxClients = MAX_PLAYERS
    this.state.phase = "lobby"
    this.state.seed = (Date.now() * 7 + Math.floor(Math.random() * 10000)) | 0
    this.state.aliveCount = 0
    this.state.totalPlayers = 0
  }

  onJoin(client: Client, options?: { isBot?: boolean }) {
    // finished以外はいつでも参加OK
    if (this.state.phase === "finished") {
      throw new Error("Game already finished")
    }

    // ボット識別（joinオプション経由）
    if (options?.isBot) {
      this.botIds.add(client.sessionId)
    }

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

    // ゲーム中の途中参加: スポーンして即参戦
    if (this.state.phase === "playing" && this.gameState) {
      this.spawnLateJoiner(client.sessionId)
    }

    this.broadcast("playerJoined", {
      playerId: client.sessionId,
      totalPlayers: this.state.players.size,
    })
  }

  onLeave(client: Client) {
    if (this.state.phase === "lobby" || this.state.phase === "countdown") {
      this.state.players.delete(client.sessionId)
      this.state.totalPlayers = this.state.players.size
    } else if (this.gameState) {
      // ゲーム中の離脱: ゲーム状態から削除 & プレイヤー数更新
      const updated = new Map(this.gameState.players)
      updated.delete(client.sessionId)
      this.gameState = { ...this.gameState, players: updated }

      this.state.players.delete(client.sessionId)
      this.state.totalPlayers = this.state.players.size
    }
  }

  private startCountdown() {
    this.state.phase = "countdown"
    this.countdownTicks = COUNTDOWN_TICKS
    this.broadcast("countdown", { seconds: 3 })

    this.setSimulationInterval((delta) => this.update(delta), SERVER_TICK_RATE_MS)
  }

  private spawnLateJoiner(sessionId: string) {
    if (!this.gameState) return

    // 既存プレイヤーの位置を避けてスポーン（seedベースで決定論的）
    const spawns = generateSpawnPositions(this.gameState.maze, this.state.seed + this.gameState.tickCount, 1)
    if (spawns.length === 0) return

    const spawn = spawns[0]
    let maze = ensureChunksAround(this.gameState.maze, spawn.row, spawn.col, { skipPrune: true })

    const isBot = this.botIds.has(sessionId)
    const currentTick = this.gameState.tickCount
    const newPlayer: BattlePlayerState = {
      id: sessionId,
      position: spawn,
      direction: 'right',
      score: 0,
      status: isBot ? 'invincible' : 'waiting',
      eliminatedBy: null,
      rank: null,
      isBot,
      invincibleUntilTick: currentTick + INVINCIBLE_TICKS,
    }

    const updatedPlayers = new Map(this.gameState.players)
    updatedPlayers.set(sessionId, newPlayer)
    this.gameState = { ...this.gameState, maze, players: updatedPlayers }

    // Schema state反映
    const schemaPlayer = this.state.players.get(sessionId)
    if (schemaPlayer) {
      schemaPlayer.row = spawn.row
      schemaPlayer.col = spawn.col
      schemaPlayer.direction = 'right'
      schemaPlayer.status = newPlayer.status
      schemaPlayer.score = 0
    }

    // 途中参加者にgameStartを送信
    const client = this.clients.find(c => c.sessionId === sessionId)
    if (client) {
      client.send("gameStart", {
        seed: this.state.seed,
        spawnPositions: { [sessionId]: { row: spawn.row, col: spawn.col } },
      })
    }
  }

  private respawnBot = (botId: string) => {
    if (!this.gameState || this.state.phase !== 'playing') return
    const player = this.gameState.players.get(botId)
    if (!player || player.status !== 'eliminated' || !player.isBot) return

    const spawns = generateSpawnPositions(this.gameState.maze, this.state.seed + this.gameState.tickCount, 1)
    if (spawns.length === 0) return

    const spawn = spawns[0]
    const maze = ensureChunksAround(this.gameState.maze, spawn.row, spawn.col, { skipPrune: true })

    const respawned: BattlePlayerState = {
      ...player,
      position: spawn,
      direction: 'right',
      score: 0,
      status: 'invincible',
      eliminatedBy: null,
      rank: null,
      invincibleUntilTick: this.gameState.tickCount + INVINCIBLE_TICKS,
    }

    const updatedPlayers = new Map(this.gameState.players)
    updatedPlayers.set(botId, respawned)
    this.gameState = { ...this.gameState, maze, players: updatedPlayers }

    const schemaPlayer = this.state.players.get(botId)
    if (schemaPlayer) {
      schemaPlayer.row = spawn.row
      schemaPlayer.col = spawn.col
      schemaPlayer.direction = 'right'
      schemaPlayer.status = 'invincible'
      schemaPlayer.score = 0
      schemaPlayer.eliminatedBy = ''
    }
  }

  private startGame() {
    const playerIds = [...this.state.players.keys()]
    this.gameState = initBattle(this.state.seed, playerIds, this.botIds)
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

      if (battlePlayer.status === 'alive' || battlePlayer.status === 'invincible' || battlePlayer.status === 'waiting') {
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

        // ボットのみ3秒後にリスポーン（人間はゲームオーバー）
        if (battlePlayer.isBot) {
          this.clock.setTimeout(() => this.respawnBot(id), 3000)
        }
      }
    }

    this.state.aliveCount = aliveCount
    this.state.tickCount = this.gameState.tickCount

    // ゲーム終了
    if (this.gameState.phase === 'finished') {
      this.lock()
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
