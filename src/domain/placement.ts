import { Direction, MazeGrid, Position, Result, ok, err } from './types'
import { createRng } from '@/utils/random'

export function placeStartAndGoal(
  maze: MazeGrid,
  seed: number
): Result<{ start: Position; goal: Position }> {
  // 通路セルの候補（奇数行・奇数列）を収集
  const passages: Position[] = []
  for (let row = 1; row < maze.height - 1; row += 2) {
    for (let col = 1; col < maze.width - 1; col += 2) {
      if (maze.cells[row][col] === 'passage') {
        passages.push({ row, col })
      }
    }
  }

  if (passages.length < 2) {
    return err('通路セルが不足しています（2つ以上必要）')
  }

  const rng = createRng(seed)

  // startをランダムに選択
  const startIdx = Math.floor(rng() * passages.length)
  const start = passages[startIdx]

  // goalをstartと異なる位置からランダムに選択
  const remaining = passages.filter((_, i) => i !== startIdx)
  const goalIdx = Math.floor(rng() * remaining.length)
  const goal = remaining[goalIdx]

  return ok({ start, goal })
}

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

const DIRECTION_OFFSETS: Record<Direction, { row: number; col: number }> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

export function chooseInitialDirection(
  maze: MazeGrid,
  position: Position,
  seed: number
): Result<Direction> {
  // 壁でない隣接方向を収集
  const validDirections = DIRECTIONS.filter((dir) => {
    const offset = DIRECTION_OFFSETS[dir]
    const neighborRow = position.row + offset.row
    const neighborCol = position.col + offset.col

    if (
      neighborRow < 0 ||
      neighborRow >= maze.height ||
      neighborCol < 0 ||
      neighborCol >= maze.width
    ) {
      return false
    }

    return maze.cells[neighborRow][neighborCol] === 'passage'
  })

  if (validDirections.length === 0) {
    return err('有効な方向が存在しません')
  }

  const rng = createRng(seed)
  const idx = Math.floor(rng() * validDirections.length)
  return ok(validDirections[idx])
}
