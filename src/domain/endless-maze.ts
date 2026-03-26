import type { CellType } from '@/domain/types'
import { generateConstrainedMaze, type BorderConstraints } from '@/domain/maze-generator'
import { createRng } from '@/utils/random'

export const CHUNK_MAZE_SIZE = 21
export const CHUNK_INNER_SIZE = CHUNK_MAZE_SIZE - 1

type ChunkKey = string

export type EndlessMazeState = {
  readonly chunks: ReadonlyMap<ChunkKey, CellType[][]>
  readonly seed: number
}

function chunkKey(cx: number, cy: number): ChunkKey {
  return `${cx},${cy}`
}

function chunkSeed(baseSeed: number, cx: number, cy: number): number {
  return (baseSeed * 31 + cx * 7919 + cy * 104729) | 0
}

// 隣接する2チャンクの共有境界でどの位置を通路にするかを決定
// 座標をソートすることで、どちら側から呼んでも同じ結果を返す
function borderContract(baseSeed: number, ax: number, ay: number, bx: number, by: number): boolean[] {
  const [x1, y1, x2, y2] = ax < bx || (ax === bx && ay < by)
    ? [ax, ay, bx, by]
    : [bx, by, ax, ay]

  const seed = (baseSeed * 17 + x1 * 3571 + y1 * 7919 + x2 * 104729 + y2 * 15487) | 0
  const rng = createRng(seed)
  const nodeCount = Math.floor(CHUNK_MAZE_SIZE / 2) // 奇数位置の数

  const result: boolean[] = new Array(nodeCount).fill(false)
  let prevOpen = false
  let hasOpen = false

  for (let i = 0; i < nodeCount; i++) {
    if (prevOpen) {
      // 連続開放を禁止（孤立ブロック・2マス幅通路を防ぐ）
      prevOpen = false
      continue
    }
    const open = rng() < 0.4
    result[i] = open
    prevOpen = open
    if (open) hasOpen = true
  }

  if (!hasOpen) {
    result[Math.floor(rng() * nodeCount)] = true
  }

  return result
}

function computeBorderConstraints(baseSeed: number, cx: number, cy: number): BorderConstraints {
  return {
    top: borderContract(baseSeed, cx, cy - 1, cx, cy),
    bottom: borderContract(baseSeed, cx, cy, cx, cy + 1),
    left: borderContract(baseSeed, cx - 1, cy, cx, cy),
    right: borderContract(baseSeed, cx, cy, cx + 1, cy),
  }
}

function generateChunkCells(baseSeed: number, cx: number, cy: number): CellType[][] {
  const borders = computeBorderConstraints(baseSeed, cx, cy)
  const seed = chunkSeed(baseSeed, cx, cy)
  const result = generateConstrainedMaze(CHUNK_MAZE_SIZE, CHUNK_MAZE_SIZE, seed, borders)
  if (!result.ok) {
    throw new Error(`Failed to generate chunk: ${result.error}`)
  }
  return result.value.cells.map(row => [...row])
}

function worldToChunk(worldRow: number, worldCol: number): {
  cx: number
  cy: number
  localRow: number
  localCol: number
} {
  const cx = Math.floor(worldCol / CHUNK_INNER_SIZE)
  const cy = Math.floor(worldRow / CHUNK_INNER_SIZE)
  const localCol = worldCol - cx * CHUNK_INNER_SIZE
  const localRow = worldRow - cy * CHUNK_INNER_SIZE

  return { cx, cy, localRow, localCol }
}

export function createEndlessMaze(seed: number): EndlessMazeState {
  const chunks = new Map<ChunkKey, CellType[][]>()
  chunks.set(chunkKey(0, 0), generateChunkCells(seed, 0, 0))
  return { chunks, seed }
}

export function getWorldCell(maze: EndlessMazeState, worldRow: number, worldCol: number): CellType {
  const { cx, cy, localRow, localCol } = worldToChunk(worldRow, worldCol)

  const key = chunkKey(cx, cy)
  const chunk = maze.chunks.get(key)
  if (!chunk) return 'wall'

  if (localRow < 0 || localRow >= CHUNK_MAZE_SIZE || localCol < 0 || localCol >= CHUNK_MAZE_SIZE) {
    return 'wall'
  }

  // 境界セル（奇数位置のみ）: borderContractで開放指定された位置かつ隣接チャンクが存在すれば通路
  // 内部セルの状態ではなくborderContractの結果で判定することで、意図しない仮想通路を防ぐ
  if (localRow === 0 && localCol % 2 === 1) {
    const contract = borderContract(maze.seed, cx, cy - 1, cx, cy)
    const idx = (localCol - 1) / 2
    if (contract[idx] && maze.chunks.has(chunkKey(cx, cy - 1))) {
      return 'passage'
    }
  }
  if (localRow === CHUNK_MAZE_SIZE - 1 && localCol % 2 === 1) {
    const contract = borderContract(maze.seed, cx, cy, cx, cy + 1)
    const idx = (localCol - 1) / 2
    if (contract[idx] && maze.chunks.has(chunkKey(cx, cy + 1))) {
      return 'passage'
    }
  }
  if (localCol === 0 && localRow % 2 === 1) {
    const contract = borderContract(maze.seed, cx - 1, cy, cx, cy)
    const idx = (localRow - 1) / 2
    if (contract[idx] && maze.chunks.has(chunkKey(cx - 1, cy))) {
      return 'passage'
    }
  }
  if (localCol === CHUNK_MAZE_SIZE - 1 && localRow % 2 === 1) {
    const contract = borderContract(maze.seed, cx, cy, cx + 1, cy)
    const idx = (localRow - 1) / 2
    if (contract[idx] && maze.chunks.has(chunkKey(cx + 1, cy))) {
      return 'passage'
    }
  }

  return chunk[localRow][localCol]
}

export function ensureChunkAt(maze: EndlessMazeState, cy: number, cx: number): EndlessMazeState {
  const key = chunkKey(cx, cy)
  if (maze.chunks.has(key)) return maze

  const newChunks = new Map(maze.chunks)
  newChunks.set(key, generateChunkCells(maze.seed, cx, cy))

  return { ...maze, chunks: newChunks }
}

export function ensureChunksAround(
  maze: EndlessMazeState,
  worldRow: number,
  worldCol: number,
): EndlessMazeState {
  const { cx, cy } = worldToChunk(worldRow, worldCol)
  let result = maze

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      result = ensureChunkAt(result, cy + dy, cx + dx)
    }
  }

  return result
}
