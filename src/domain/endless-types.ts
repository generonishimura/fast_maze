import type { PlayerState } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'

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
}
