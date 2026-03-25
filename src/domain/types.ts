export type Direction = 'up' | 'down' | 'left' | 'right'

export type Position = {
  readonly row: number
  readonly col: number
}

export type CellType = 'wall' | 'passage'

export type MazeGrid = {
  readonly width: number
  readonly height: number
  readonly cells: ReadonlyArray<ReadonlyArray<CellType>>
}

export type PlayerState = {
  readonly position: Position
  readonly direction: Direction
}

export type StageConfig = {
  readonly stageNumber: number
  readonly mazeWidth: number
  readonly mazeHeight: number
  readonly tileSpeed: number
}

export type GameState = {
  readonly maze: MazeGrid
  readonly player: PlayerState
  readonly goal: Position
  readonly stage: StageConfig
  readonly score: number
  readonly status: 'playing' | 'game-over' | 'stage-clear'
}

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
