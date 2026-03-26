import { CellType, MazeGrid, Result, ok, err } from './types'
import { createRng } from '@/utils/random'

// 境界制約: 各配列の i 番目が true なら、奇数位置 (i*2+1) を通路にする
export type BorderConstraints = {
  top: boolean[]     // row=0 の奇数col位置
  bottom: boolean[]  // row=height-1 の奇数col位置
  left: boolean[]    // col=0 の奇数row位置
  right: boolean[]   // col=width-1 の奇数row位置
}

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

export function generateConstrainedMaze(
  width: number,
  height: number,
  seed: number,
  borders: BorderConstraints,
): Result<MazeGrid> {
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

  // 1. 境界制約を適用
  // 外壁セルは触らない（常にwall）。内部の隣接ノードだけ通路にする。
  // チャンク間の接続はgetWorldCell側で外壁セルを仮想的に通路として返す。
  const borderNodes: [number, number][] = []

  borders.top.forEach((open, i) => {
    if (!open) return
    const col = i * 2 + 1
    if (col >= width) return
    cells[1][col] = 'passage'
    borderNodes.push([1, col])
  })

  borders.bottom.forEach((open, i) => {
    if (!open) return
    const col = i * 2 + 1
    if (col >= width) return
    cells[height - 2][col] = 'passage'
    borderNodes.push([height - 2, col])
  })

  borders.left.forEach((open, i) => {
    if (!open) return
    const row = i * 2 + 1
    if (row >= height) return
    cells[row][1] = 'passage'
    borderNodes.push([row, 1])
  })

  borders.right.forEach((open, i) => {
    if (!open) return
    const row = i * 2 + 1
    if (row >= height) return
    cells[row][width - 2] = 'passage'
    borderNodes.push([row, width - 2])
  })

  // 2. 再帰バックトラッキング
  // visited: バックトラッキングの木に組み込まれたノード
  // borderConnected: 境界ノードのうち木に接続済みのもの
  const visited = new Set<string>()
  const borderNodeSet = new Set<string>(borderNodes.map(([r, c]) => `${r},${c}`))

  cells[1][1] = 'passage'
  visited.add('1,1')
  // (1,1)が境界ノードでもある場合
  borderNodeSet.delete('1,1')

  const stack: [number, number][] = [[1, 1]]
  const directions: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]]

  while (stack.length > 0) {
    const [row, col] = stack[stack.length - 1]

    const neighbors = directions
      .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
      .filter(([nr, nc]) =>
        nr > 0 && nr < height - 1 && nc > 0 && nc < width - 1 && !visited.has(`${nr},${nc}`)
      )

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }

    const idx = Math.floor(rng() * neighbors.length)
    const [nextRow, nextCol] = neighbors[idx]
    const key = `${nextRow},${nextCol}`

    visited.add(key)
    const wallRow = (row + nextRow) / 2
    const wallCol = (col + nextCol) / 2
    cells[wallRow][wallCol] = 'passage'
    cells[nextRow][nextCol] = 'passage'

    // 境界ノードに到達したら接続済みとしてマーク（ここから先も掘り進む）
    borderNodeSet.delete(key)
    stack.push([nextRow, nextCol])
  }

  // 3. 境界ノードが孤立していたら内部迷路と接続する
  // まず到達可能なセルを特定
  const reachable = new Set<string>()
  const floodQueue: [number, number][] = [[1, 1]]
  reachable.add('1,1')

  while (floodQueue.length > 0) {
    const [r, c] = floodQueue.shift()!
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc
      const key = `${nr},${nc}`
      if (nr >= 0 && nr < height && nc >= 0 && nc < width && cells[nr][nc] === 'passage' && !reachable.has(key)) {
        reachable.add(key)
        floodQueue.push([nr, nc])
      }
    }
  }

  // 孤立した境界ノードからBFSで到達可能ノードまで壁を掘る
  for (const [bRow, bCol] of borderNodes) {
    if (reachable.has(`${bRow},${bCol}`)) continue

    // このノードから内部に向かって掘り進める
    let cr = bRow, cc = bCol
    const visited = new Set<string>()
    visited.add(`${cr},${cc}`)

    while (!reachable.has(`${cr},${cc}`)) {
      // 隣接ノード（2マス先）のうち、到達可能なノードに最も近いものを選ぶ
      const neighbors = directions
        .map(([dr, dc]) => [cr + dr, cc + dc] as [number, number])
        .filter(([nr, nc]) =>
          nr > 0 && nr < height - 1 && nc > 0 && nc < width - 1 && !visited.has(`${nr},${nc}`)
        )

      if (neighbors.length === 0) break

      // 到達可能なノードを優先
      const reachableNeighbor = neighbors.find(([nr, nc]) => reachable.has(`${nr},${nc}`))
      const [nextR, nextC] = reachableNeighbor ?? neighbors[Math.floor(rng() * neighbors.length)]

      // 壁を掘る
      const wallR = (cr + nextR) / 2
      const wallC = (cc + nextC) / 2
      cells[wallR][wallC] = 'passage'
      cells[nextR][nextC] = 'passage'
      visited.add(`${nextR},${nextC}`)

      cr = nextR
      cc = nextC
    }

    // 掘った経路を到達可能セットに追加
    for (const key of visited) {
      if (!reachable.has(key)) {
        reachable.add(key)
        const [r, c] = key.split(',').map(Number)
        // 壁セルも追加
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < height && nc >= 0 && nc < width && cells[nr][nc] === 'passage') {
            reachable.add(`${nr},${nc}`)
          }
        }
      }
    }
  }

  return ok({
    width,
    height,
    cells: cells.map(row => [...row]),
  })
}
