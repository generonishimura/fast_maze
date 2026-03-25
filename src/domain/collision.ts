import type { MazeGrid, Position } from '@/domain/types'

export function isWall(maze: MazeGrid, position: Position): boolean {
  const { row, col } = position

  if (row < 0 || row >= maze.height || col < 0 || col >= maze.width) {
    return true
  }

  return maze.cells[row][col] === 'wall'
}
