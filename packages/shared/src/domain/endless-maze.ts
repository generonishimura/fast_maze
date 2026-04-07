import type { CellType } from '@/domain/types'
import { generateConstrainedMaze, type BorderConstraints } from '@/domain/maze-generator'
import { createRng } from '@/utils/random'

export const CHUNK_MAZE_SIZE = 21
export const CHUNK_INNER_SIZE = CHUNK_MAZE_SIZE - 1

type ChunkKey = string

export type EndlessMazeState = {
  readonly chunks: ReadonlyMap<ChunkKey, CellType[][]>
  readonly seed: number
  readonly borderContractCache: Map<string, boolean[]>
}

function chunkKey(cx: number, cy: number): ChunkKey {
  return `${cx},${cy}`
}

function chunkSeed(baseSeed: number, cx: number, cy: number): number {
  return (baseSeed * 31 + cx * 7919 + cy * 104729) | 0
}

// 隣接する2チャンクの共有境界でどの位置を通路にするかを決定
// 座標をソートすることで、どちら側から呼んでも同じ結果を返す
function computeBorderContract(baseSeed: number, ax: number, ay: number, bx: number, by: number): boolean[] {
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

function borderContractCacheKey(ax: number, ay: number, bx: number, by: number): string {
  return ax < bx || (ax === bx && ay < by)
    ? `${ax},${ay},${bx},${by}`
    : `${bx},${by},${ax},${ay}`
}

function borderContract(cache: Map<string, boolean[]>, baseSeed: number, ax: number, ay: number, bx: number, by: number): boolean[] {
  const key = borderContractCacheKey(ax, ay, bx, by)
  let result = cache.get(key)
  if (result) return result
  result = computeBorderContract(baseSeed, ax, ay, bx, by)
  cache.set(key, result)
  return result
}

function computeBorderConstraints(cache: Map<string, boolean[]>, baseSeed: number, cx: number, cy: number): BorderConstraints {
  return {
    top: borderContract(cache, baseSeed, cx, cy - 1, cx, cy),
    bottom: borderContract(cache, baseSeed, cx, cy, cx, cy + 1),
    left: borderContract(cache, baseSeed, cx - 1, cy, cx, cy),
    right: borderContract(cache, baseSeed, cx, cy, cx + 1, cy),
  }
}

function generateChunkCells(cache: Map<string, boolean[]>, baseSeed: number, cx: number, cy: number): CellType[][] {
  const borders = computeBorderConstraints(cache, baseSeed, cx, cy)
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
  const borderContractCache = new Map<string, boolean[]>()
  const chunks = new Map<ChunkKey, CellType[][]>()
  chunks.set(chunkKey(0, 0), generateChunkCells(borderContractCache, seed, 0, 0))
  return { chunks, seed, borderContractCache }
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
  const cache = maze.borderContractCache
  if (localRow === 0 && localCol % 2 === 1) {
    const contract = borderContract(cache, maze.seed, cx, cy - 1, cx, cy)
    const idx = (localCol - 1) / 2
    if (contract[idx] && maze.chunks.has(chunkKey(cx, cy - 1))) {
      return 'passage'
    }
  }
  if (localRow === CHUNK_MAZE_SIZE - 1 && localCol % 2 === 1) {
    const contract = borderContract(cache, maze.seed, cx, cy, cx, cy + 1)
    const idx = (localCol - 1) / 2
    if (contract[idx] && maze.chunks.has(chunkKey(cx, cy + 1))) {
      return 'passage'
    }
  }
  if (localCol === 0 && localRow % 2 === 1) {
    const contract = borderContract(cache, maze.seed, cx - 1, cy, cx, cy)
    const idx = (localRow - 1) / 2
    if (contract[idx] && maze.chunks.has(chunkKey(cx - 1, cy))) {
      return 'passage'
    }
  }
  if (localCol === CHUNK_MAZE_SIZE - 1 && localRow % 2 === 1) {
    const contract = borderContract(cache, maze.seed, cx, cy, cx + 1, cy)
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
  newChunks.set(key, generateChunkCells(maze.borderContractCache, maze.seed, cx, cy))

  return { ...maze, chunks: newChunks }
}

/** 描画チャンクの境界セルを正しく表示するための先読み半径 */
const CHUNK_LOAD_RADIUS = 2
/** レンダラーが描画するチャンクの半径 */
export const CHUNK_RENDER_RADIUS = 2
const CHUNK_KEEP_RADIUS = 3
const MAX_CHUNKS = 200

export function ensureChunksAround(
  maze: EndlessMazeState,
  worldRow: number,
  worldCol: number,
  options?: { skipPrune?: boolean },
): EndlessMazeState {
  const { cx, cy } = worldToChunk(worldRow, worldCol)

  // 描画チャンクの境界セルが正しく表示されるよう先読みする
  const needed: Array<[number, number, ChunkKey]> = []
  for (let dy = -CHUNK_LOAD_RADIUS; dy <= CHUNK_LOAD_RADIUS; dy++) {
    for (let dx = -CHUNK_LOAD_RADIUS; dx <= CHUNK_LOAD_RADIUS; dx++) {
      const key = chunkKey(cx + dx, cy + dy)
      if (!maze.chunks.has(key)) {
        needed.push([cx + dx, cy + dy, key])
      }
    }
  }

  // 遠方チャンクを削除（バトルモードではskipPruneで無効化）
  const toDelete: ChunkKey[] = []
  if (!options?.skipPrune) {
    for (const key of maze.chunks.keys()) {
      const [kcx, kcy] = key.split(',').map(Number)
      if (Math.abs(kcx - cx) > CHUNK_KEEP_RADIUS || Math.abs(kcy - cy) > CHUNK_KEEP_RADIUS) {
        toDelete.push(key)
      }
    }
  }

  // skipPruneでもチャンク数上限を超えたら古いものから削除
  if (options?.skipPrune && needed.length > 0 && maze.chunks.size + needed.length > MAX_CHUNKS) {
    const excess = maze.chunks.size + needed.length - MAX_CHUNKS
    let count = 0
    for (const key of maze.chunks.keys()) {
      if (count >= excess) break
      // 現在位置の近くは消さない
      const [kcx, kcy] = key.split(',').map(Number)
      if (Math.abs(kcx - cx) <= CHUNK_LOAD_RADIUS && Math.abs(kcy - cy) <= CHUNK_LOAD_RADIUS) continue
      toDelete.push(key)
      count++
    }
  }

  if (needed.length === 0 && toDelete.length === 0) return maze

  const newChunks = new Map(maze.chunks)

  for (const [ncx, ncy, key] of needed) {
    newChunks.set(key, generateChunkCells(maze.borderContractCache, maze.seed, ncx, ncy))
  }

  for (const key of toDelete) {
    newChunks.delete(key)
  }

  return { ...maze, chunks: newChunks }
}
