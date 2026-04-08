import { MazeGrid, Position } from './types'

export function hasPath(maze: MazeGrid, from: Position, to: Position): boolean {
  const visited = new Set<string>()
  const queue: Position[] = [from]
  const key = (p: Position) => `${p.row},${p.col}`

  visited.add(key(from))

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (current.row === to.row && current.col === to.col) {
      return true
    }

    for (const [dr, dc] of directions) {
      const next: Position = { row: current.row + dr, col: current.col + dc }
      const k = key(next)

      if (
        next.row >= 0 &&
        next.row < maze.height &&
        next.col >= 0 &&
        next.col < maze.width &&
        maze.cells[next.row][next.col] === 'passage' &&
        !visited.has(k)
      ) {
        visited.add(k)
        queue.push(next)
      }
    }
  }

  return false
}
