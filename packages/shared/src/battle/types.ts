import type { Position, Direction } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'

export type BattlePlayerState = {
  readonly id: string
  readonly position: Position
  readonly direction: Direction
  readonly score: number
  readonly status: 'waiting' | 'alive' | 'eliminated' | 'invincible'
  readonly eliminatedBy: string | null
  readonly rank: number | null
  readonly isBot: boolean
  readonly invincibleUntilTick: number
}

export type BattlePhase = 'lobby' | 'countdown' | 'playing' | 'finished'

export type FruitCache = Map<string, Map<string, number>>

export type BattleGameState = {
  readonly seed: number
  readonly maze: EndlessMazeState
  readonly players: ReadonlyMap<string, BattlePlayerState>
  readonly collectedFruits: ReadonlySet<string>
  readonly phase: BattlePhase
  readonly tickCount: number
  readonly movementProgress: number
  readonly eliminationOrder: readonly string[]
  readonly fruitCache: FruitCache
}

export type EliminationResult = {
  readonly survivors: readonly string[]
  readonly eliminated: readonly { id: string; eliminatedBy: string }[]
}
