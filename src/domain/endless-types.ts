import type { PlayerState } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import type { FruitType } from '@/domain/fruit'

export type WorldFruit = {
  readonly type: FruitType
  readonly row: number
  readonly col: number
}

export type EndlessGameState = {
  readonly maze: EndlessMazeState
  readonly player: PlayerState
  readonly startPosition: { readonly row: number; readonly col: number }
  readonly score: number
  readonly distance: number
  readonly streak: number
  readonly visited: ReadonlySet<string>
  readonly tileSpeed: number
  readonly status: 'playing' | 'game-over'
  readonly fruits: ReadonlyMap<string, WorldFruit>
  readonly collectedFruit: WorldFruit | null
}
