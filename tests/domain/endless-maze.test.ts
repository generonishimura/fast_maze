import { describe, it, expect } from 'vitest'
import { createEndlessMaze, getWorldCell, ensureChunkAt, ensureChunksAround, CHUNK_MAZE_SIZE, CHUNK_INNER_SIZE } from '@/domain/endless-maze'

const CHUNK_SIZE = CHUNK_MAZE_SIZE
const INNER_SIZE = CHUNK_INNER_SIZE

// ワールド座標で孤立壁ブロックを検出
function findIsolatedWallBlocks(
  maze: ReturnType<typeof createEndlessMaze>,
  minRow: number, maxRow: number, minCol: number, maxCol: number,
): Array<{ row: number; col: number }> {
  const isolated: Array<{ row: number; col: number }> = []
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (getWorldCell(maze, r, c) !== 'wall') continue
      if (
        getWorldCell(maze, r - 1, c) === 'passage' &&
        getWorldCell(maze, r + 1, c) === 'passage' &&
        getWorldCell(maze, r, c - 1) === 'passage' &&
        getWorldCell(maze, r, c + 1) === 'passage'
      ) {
        isolated.push({ row: r, col: c })
      }
    }
  }
  return isolated
}

describe('createEndlessMaze', () => {
  it('初期状態で中央チャンク(0,0)が生成される', () => {
    const maze = createEndlessMaze(42)

    // 中央チャンクのセルが取得できる
    const cell = getWorldCell(maze, 1, 1)
    expect(cell).toBe('passage')
  })

  it('外周の壁セルを返す', () => {
    const maze = createEndlessMaze(42)

    expect(getWorldCell(maze, 0, 0)).toBe('wall')
  })
})

describe('getWorldCell', () => {
  it('未生成チャンクのセルはwallを返す', () => {
    const maze = createEndlessMaze(42)

    // チャンク(1,0)は未生成
    const cell = getWorldCell(maze, 1, INNER_SIZE + 5)
    expect(cell).toBe('wall')
  })

  it('チャンク生成後はpassageセルが取得できる', () => {
    let maze = createEndlessMaze(42)
    maze = ensureChunkAt(maze, 0, 1)

    // 隣のチャンク内の奇数位置は通路
    const cell = getWorldCell(maze, 1, INNER_SIZE + 1)
    expect(cell).toBe('passage')
  })
})

describe('ensureChunkAt', () => {
  it('隣接チャンクを生成すると境界に通路が接続される', () => {
    let maze = createEndlessMaze(42)
    maze = ensureChunkAt(maze, 0, 1)

    // チャンク(0,0)の右端とチャンク(0,1)の左端の境界
    // 少なくとも1つの奇数行で通路が繋がっている
    let connectedCount = 0
    for (let row = 1; row < CHUNK_SIZE - 1; row += 2) {
      const rightEdge = getWorldCell(maze, row, INNER_SIZE)
      const leftEdge = getWorldCell(maze, row, INNER_SIZE)
      if (rightEdge === 'passage' && leftEdge === 'passage') {
        connectedCount++
      }
    }
    expect(connectedCount).toBeGreaterThan(0)
  })

  it('同じチャンクを複数回生成しても冪等', () => {
    let maze = createEndlessMaze(42)
    const maze1 = ensureChunkAt(maze, 0, 1)
    const maze2 = ensureChunkAt(maze1, 0, 1)

    for (let row = 0; row < CHUNK_SIZE; row++) {
      for (let col = INNER_SIZE; col < INNER_SIZE + CHUNK_SIZE; col++) {
        expect(getWorldCell(maze1, row, col)).toBe(getWorldCell(maze2, row, col))
      }
    }
  })

  it('負のチャンク座標にも生成できる', () => {
    let maze = createEndlessMaze(42)
    maze = ensureChunkAt(maze, 0, -1)

    // 負方向のチャンク内の通路セル
    const cell = getWorldCell(maze, 1, -INNER_SIZE + 1)
    expect(cell).toBe('passage')
  })
})

describe('ensureChunksAround', () => {
  it('遠方チャンクがプルーニングされる', () => {
    let maze = createEndlessMaze(42)

    // チャンク(0,0)周辺を生成
    maze = ensureChunksAround(maze, INNER_SIZE / 2, INNER_SIZE / 2)
    const initialChunkCount = maze.chunks.size

    // 遠くに移動（チャンク座標で5以上離れる）
    const farCol = INNER_SIZE * 5 + INNER_SIZE / 2
    maze = ensureChunksAround(maze, INNER_SIZE / 2, farCol)

    // 元の(0,0)付近のチャンクは削除されているはず
    expect(maze.chunks.has('0,0')).toBe(false)
    // 新しい位置の周辺チャンクは存在
    expect(maze.chunks.has('5,0')).toBe(true)
  })

  it('描画範囲チャンクの境界セルが正しくレンダリングされるよう先読みされる', () => {
    let maze = createEndlessMaze(42)

    // チャンク(0,0)中央付近でensureChunksAroundを呼ぶ
    maze = ensureChunksAround(maze, INNER_SIZE / 2, INNER_SIZE / 2)

    // 描画範囲（±1チャンク）の外縁チャンク(1,0)の右境界を確認
    // チャンク(2,0)が存在しないと、境界セルがすべてwallになる
    // 先読みが正しければチャンク(2,0)が生成済みで、境界通路が表示される
    const rightBorderCol = INNER_SIZE * 2 // チャンク(1,0)の右端 = チャンク(2,0)の左端
    let hasPassageAtBorder = false
    for (let row = 1; row < CHUNK_SIZE; row += 2) {
      if (getWorldCell(maze, row, rightBorderCol) === 'passage') {
        hasPassageAtBorder = true
        break
      }
    }
    expect(hasPassageAtBorder).toBe(true)
  })

  it('描画範囲の全方向で境界チャンクの隣接チャンクが先読みされている', () => {
    let maze = createEndlessMaze(42)
    maze = ensureChunksAround(maze, INNER_SIZE / 2, INNER_SIZE / 2)

    // プレイヤーのチャンク(0,0)から描画範囲±1の外縁にあるチャンクの
    // さらに外側のチャンクが存在するか確認
    // 例: チャンク(1,1)の右隣(2,1)、下隣(1,2)が存在すべき
    expect(maze.chunks.has('2,1')).toBe(true)
    expect(maze.chunks.has('1,2')).toBe(true)
    expect(maze.chunks.has('-2,-1')).toBe(true)
    expect(maze.chunks.has('-1,-2')).toBe(true)
  })

  it('borderContractキャッシュが同じ結果を返す', () => {
    const maze = createEndlessMaze(42)

    // 同じ境界セルを複数回取得しても同じ結果
    const cell1 = getWorldCell(maze, 0, 1)
    const cell2 = getWorldCell(maze, 0, 1)
    expect(cell1).toBe(cell2)
  })
})

describe('孤立壁ブロック', () => {
  it('複数チャンクの境界で孤立壁ブロックが生まれない', () => {
    for (let seed = 0; seed < 50; seed++) {
      let maze = createEndlessMaze(seed)
      // 3x3チャンクを生成
      maze = ensureChunksAround(maze, INNER_SIZE / 2, INNER_SIZE / 2)

      // チャンク(0,0)とその周囲の境界領域をチェック
      const isolated = findIsolatedWallBlocks(
        maze,
        1, INNER_SIZE * 2 - 2,
        1, INNER_SIZE * 2 - 2,
      )

      expect(isolated).toEqual([])
    }
  })
})
