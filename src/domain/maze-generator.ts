import { CellType, MazeGrid, Result, ok, err } from './types'
import { createRng } from '@/utils/random'

export function generateMaze(width: number, height: number, seed: number): Result<MazeGrid> {
  if (width < 3 || height < 3) {
    return err('迷路のサイズは3以上である必要があります')
  }
  if (width % 2 === 0 || height % 2 === 0) {
    return err('迷路のサイズは奇数である必要があります')
  }

  const cells: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'wall' as CellType)
  )

  const rng = createRng(seed)

  // 再帰バックトラッキング（スタック版で深い迷路にも対応）
  const startRow = 1
  const startCol = 1
  cells[startRow][startCol] = 'passage'

  const stack: [number, number][] = [[startRow, startCol]]
  const directions: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]]

  while (stack.length > 0) {
    const [row, col] = stack[stack.length - 1]

    // 未訪問の隣接セルを探す
    const unvisited = directions
      .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
      .filter(([nr, nc]) =>
        nr > 0 && nr < height - 1 && nc > 0 && nc < width - 1 && cells[nr][nc] === 'wall'
      )

    if (unvisited.length === 0) {
      stack.pop()
      continue
    }

    // ランダムに隣接セルを選択
    const idx = Math.floor(rng() * unvisited.length)
    const [nextRow, nextCol] = unvisited[idx]

    // 間の壁を壊す
    const wallRow = (row + nextRow) / 2
    const wallCol = (col + nextCol) / 2
    cells[wallRow][wallCol] = 'passage'
    cells[nextRow][nextCol] = 'passage'

    stack.push([nextRow, nextCol])
  }

  return ok({
    width,
    height,
    cells: cells.map(row => [...row]),
  })
}
