import { ColyseusSDK } from "@colyseus/sdk"
import type { Direction } from '@/domain/types'

const DEFAULT_SERVER_URL = 'ws://localhost:2567'

type PlayerState = {
  id: string
  row: number
  col: number
  direction: string
  score: number
  status: string
  eliminatedBy: string
  rank: number
}

type RoomState = {
  seed: number
  phase: string
  tickCount: number
  aliveCount: number
  totalPlayers: number
  players: Map<string, PlayerState>
}

export type BattleCallbacks = {
  onStateChange?: (state: RoomState) => void
  onPlayerJoined?: (data: { playerId: string; totalPlayers: number }) => void
  onPlayerReady?: (data: { playerId: string }) => void
  onCountdown?: (data: { seconds: number }) => void
  onGameStart?: (data: { seed: number; spawnPositions: Record<string, { row: number; col: number }> }) => void
  onElimination?: (data: { playerId: string; eliminatedBy: string; rank: number }) => void
  onGameEnd?: (data: { rankings: { id: string; rank: number; score: number }[] }) => void
  onError?: (code: number, message?: string) => void
  onLeave?: (code: number) => void
}

export class NetworkClient {
  private client: ColyseusSDK
  private room: Awaited<ReturnType<ColyseusSDK['joinOrCreate']>> | null = null
  private callbacks: BattleCallbacks = {}

  constructor(serverUrl?: string) {
    const url = serverUrl ?? import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL
    this.client = new ColyseusSDK(url)
  }

  setCallbacks(callbacks: BattleCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  get sessionId(): string | null {
    return this.room?.sessionId ?? null
  }

  get connected(): boolean {
    return this.room !== null
  }

  async joinBattle(): Promise<void> {
    try {
      this.room = await this.client.joinOrCreate("battle")
      this.setupListeners()
    } catch (e) {
      console.error('Failed to join battle room:', e)
      throw e
    }
  }

  private setupListeners() {
    if (!this.room) return

    this.room.onStateChange((state: unknown) => {
      this.callbacks.onStateChange?.(state as RoomState)
    })

    this.room.onMessage("playerJoined", (data: { playerId: string; totalPlayers: number }) => {
      this.callbacks.onPlayerJoined?.(data)
    })

    this.room.onMessage("playerReady", (data: { playerId: string }) => {
      this.callbacks.onPlayerReady?.(data)
    })

    this.room.onMessage("countdown", (data: { seconds: number }) => {
      this.callbacks.onCountdown?.(data)
    })

    this.room.onMessage("gameStart", (data: { seed: number; spawnPositions: Record<string, { row: number; col: number }> }) => {
      this.callbacks.onGameStart?.(data)
    })

    this.room.onMessage("elimination", (data: { playerId: string; eliminatedBy: string; rank: number }) => {
      this.callbacks.onElimination?.(data)
    })

    this.room.onMessage("gameEnd", (data: { rankings: { id: string; rank: number; score: number }[] }) => {
      this.callbacks.onGameEnd?.(data)
    })

    this.room.onError((code: number, message?: string) => {
      this.callbacks.onError?.(code, message)
    })

    this.room.onLeave((code: number) => {
      this.callbacks.onLeave?.(code)
      this.room = null
    })
  }

  sendDirection(direction: Direction) {
    this.room?.send("direction", { direction })
  }

  sendReady() {
    this.room?.send("ready", {})
  }

  async leave() {
    await this.room?.leave()
    this.room = null
  }
}
