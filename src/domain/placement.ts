import { Direction, MazeGrid, Position, Result, ok, err } from './types'
import { createRng } from '@/utils/random'

type WallSide = 'left' | 'right' | 'top' | 'bottom'

function getCandidates(maze: MazeGrid, side: WallSide): Position[] {
  const { width, height, cells } = maze
  const candidates: Position[] = []

  if (side === 'left') {
    for (let row = 1; row < height - 1; row += 2) {
      if (cells[row][1] === 'passage') {
        candidates.push({ row, col: 0 })
      }
    }
  } else if (side === 'right') {
    for (let row = 1; row < height - 1; row += 2) {
      if (cells[row][width - 2] === 'passage') {
        candidates.push({ row, col: width - 1 })
      }
    }
  } else if (side === 'top') {
    for (let col = 1; col < width - 1; col += 2) {
      if (cells[1][col] === 'passage') {
        candidates.push({ row: 0, col })
      }
    }
  } else {
    for (let col = 1; col < width - 1; col += 2) {
      if (cells[height - 2][col] === 'passage') {
        candidates.push({ row: height - 1, col })
      }
    }
  }

  return candidates
}

function getDirectionForSide(side: WallSide): Direction {
  switch (side) {
    case 'left':
      return 'right'
    case 'right':
      return 'left'
    case 'top':
      return 'down'
    case 'bottom':
      return 'up'
  }
}

function pickRandom<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function withHole(maze: MazeGrid, pos: Position): MazeGrid {
  const newCells = maze.cells.map((row, r) =>
    r === pos.row
      ? row.map((cell, c) => (c === pos.col ? 'passage' : cell))
      : row
  )
  return { ...maze, cells: newCells }
}

export function placeStartAndGoal(
  maze: MazeGrid,
  seed: number
): Result<{ start: Position; goal: Position; startDirection: Direction; maze: MazeGrid }> {
  const rng = createRng(seed)

  // 左右ペア or 上下ペアをランダムに選ぶ
  const pairType: 'horizontal' | 'vertical' = rng() < 0.5 ? 'horizontal' : 'vertical'

  let startSide: WallSide
  let goalSide: WallSide

  if (pairType === 'horizontal') {
    // 左壁スタート・右壁ゴール or 右壁スタート・左壁ゴール
    if (rng() < 0.5) {
      startSide = 'left'
      goalSide = 'right'
    } else {
      startSide = 'right'
      goalSide = 'left'
    }
  } else {
    // 上壁スタート・下壁ゴール or 下壁スタート・上壁ゴール
    if (rng() < 0.5) {
      startSide = 'top'
      goalSide = 'bottom'
    } else {
      startSide = 'bottom'
      goalSide = 'top'
    }
  }

  const startCandidates = getCandidates(maze, startSide)
  if (startCandidates.length === 0) {
    return err('スタート候補が存在しません')
  }

  const goalCandidates = getCandidates(maze, goalSide)
  if (goalCandidates.length === 0) {
    return err('ゴール候補が存在しません')
  }

  const start = pickRandom(startCandidates, rng)
  const goal = pickRandom(goalCandidates, rng)

  const startDirection = getDirectionForSide(startSide)

  // 外壁に穴を開けた迷路を返す
  const mazeWithStart = withHole(maze, start)
  const mazeWithBoth = withHole(mazeWithStart, goal)

  return ok({ start, goal, startDirection, maze: mazeWithBoth })
}
