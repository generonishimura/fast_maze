import type { Position } from '@/domain/types'

export function isGoalReached(playerPosition: Position, goalPosition: Position): boolean {
  return playerPosition.row === goalPosition.row && playerPosition.col === goalPosition.col
}
