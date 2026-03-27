import Phaser from 'phaser'
import { getWorldCell, CHUNK_MAZE_SIZE, CHUNK_INNER_SIZE } from '@/domain/endless-maze'
import type { EndlessMazeState } from '@/domain/endless-maze'

export class EndlessMazeRenderer {
  private readonly scene: Phaser.Scene
  private readonly tileSize: number
  private readonly ignoreCamera: Phaser.Cameras.Scene2D.Camera | null
  private renderTextures: Map<string, Phaser.GameObjects.RenderTexture> = new Map()
  private chunkHashes: Map<string, string> = new Map()
  private lastChunksRef: ReadonlyMap<string, unknown> | null = null

  constructor(
    scene: Phaser.Scene,
    tileSize: number,
    ignoreCamera: Phaser.Cameras.Scene2D.Camera | null = null,
  ) {
    this.scene = scene
    this.tileSize = tileSize
    this.ignoreCamera = ignoreCamera
  }

  renderChunksAround(maze: EndlessMazeState, worldRow: number, worldCol: number): void {
    // #3: chunksの参照が同一なら再描画不要（チャンク内容は不変）
    if (maze.chunks === this.lastChunksRef) return
    this.lastChunksRef = maze.chunks

    const cx = Math.floor(worldCol / CHUNK_INNER_SIZE)
    const cy = Math.floor(worldRow / CHUNK_INNER_SIZE)

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.renderChunkIfChanged(maze, cx + dx, cy + dy)
      }
    }

    // ドメイン層から削除されたチャンクのテクスチャを破棄
    for (const [key, rt] of this.renderTextures) {
      if (!maze.chunks.has(key)) {
        rt.destroy()
        this.renderTextures.delete(key)
        this.chunkHashes.delete(key)
      }
    }
  }

  private computeChunkHash(maze: EndlessMazeState, cx: number, cy: number): string {
    const chunk = maze.chunks.get(`${cx},${cy}`)
    if (!chunk) return ''
    const parts: string[] = []
    for (let row = 0; row < CHUNK_MAZE_SIZE; row++) {
      parts.push(chunk[row][0] === 'passage' ? '1' : '0')
      parts.push(chunk[row][CHUNK_MAZE_SIZE - 1] === 'passage' ? '1' : '0')
    }
    for (let col = 0; col < CHUNK_MAZE_SIZE; col++) {
      parts.push(chunk[0][col] === 'passage' ? '1' : '0')
      parts.push(chunk[CHUNK_MAZE_SIZE - 1][col] === 'passage' ? '1' : '0')
    }
    return parts.join('')
  }

  private renderChunkIfChanged(maze: EndlessMazeState, cx: number, cy: number): void {
    const key = `${cx},${cy}`
    if (!maze.chunks.has(key)) return

    const newHash = this.computeChunkHash(maze, cx, cy)
    if (this.chunkHashes.get(key) === newHash) return

    this.chunkHashes.set(key, newHash)

    const existing = this.renderTextures.get(key)
    if (existing) existing.destroy()

    const offsetCol = cx * CHUNK_INNER_SIZE
    const offsetRow = cy * CHUNK_INNER_SIZE
    const pixelX = offsetCol * this.tileSize
    const pixelY = offsetRow * this.tileSize
    const w = CHUNK_MAZE_SIZE * this.tileSize
    const h = CHUNK_MAZE_SIZE * this.tileSize

    const gfx = this.scene.add.graphics().setVisible(false)

    for (let row = 0; row < CHUNK_MAZE_SIZE; row++) {
      for (let col = 0; col < CHUNK_MAZE_SIZE; col++) {
        const worldR = offsetRow + row
        const worldC = offsetCol + col
        const cell = getWorldCell(maze, worldR, worldC)
        const x = col * this.tileSize
        const y = row * this.tileSize

        if (cell === 'wall') {
          gfx.fillStyle(0x4a6090)
          gfx.fillRect(x, y, this.tileSize, this.tileSize)
          gfx.fillStyle(0x6080b0, 0.5)
          gfx.fillRect(x, y, this.tileSize, 1)
          gfx.fillRect(x, y, 1, this.tileSize)
          gfx.fillStyle(0x2a3a5c, 0.7)
          gfx.fillRect(x, y + this.tileSize - 1, this.tileSize, 1)
          gfx.fillRect(x + this.tileSize - 1, y, 1, this.tileSize)
        } else {
          gfx.fillStyle(0x080810)
          gfx.fillRect(x, y, this.tileSize, this.tileSize)
          gfx.fillStyle(0x12121e, 0.4)
          gfx.fillRect(x, y, this.tileSize, 1)
          gfx.fillRect(x, y, 1, this.tileSize)
        }
      }
    }

    const rt = this.scene.add.renderTexture(pixelX, pixelY, w, h).setOrigin(0, 0)
    rt.draw(gfx)
    gfx.destroy()

    if (this.ignoreCamera) {
      this.ignoreCamera.ignore(rt)
    }

    this.renderTextures.set(key, rt)
  }

  destroy(): void {
    for (const rt of this.renderTextures.values()) {
      rt.destroy()
    }
    this.renderTextures.clear()
    this.chunkHashes.clear()
  }
}
