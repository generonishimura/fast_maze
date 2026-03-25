import type { PlayerState, Direction, Position } from '@/domain/types'

export function changeDirection(player: PlayerState, newDirection: Direction): PlayerState {
  return { ...player, direction: newDirection }
}

export function moveForward(player: PlayerState): Position {
  const { row, col } = player.position

  switch (player.direction) {
    case 'up':
      return { row: row - 1, col }
    case 'down':
      return { row: row + 1, col }
    case 'left':
      return { row, col: col - 1 }
    case 'right':
      return { row, col: col + 1 }
  }
}
