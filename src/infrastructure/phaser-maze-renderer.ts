import Phaser from 'phaser'
import type { MazeGrid, Position } from '@/domain/types'

export class MazeRenderer {
  private readonly scene: Phaser.Scene
  private readonly maze: MazeGrid
  private readonly tileSize: number
  private renderTexture: Phaser.GameObjects.RenderTexture | null = null
  private goalGlow: Phaser.GameObjects.Rectangle | null = null

  constructor(scene: Phaser.Scene, maze: MazeGrid, tileSize: number) {
    this.scene = scene
    this.maze = maze
    this.tileSize = tileSize
  }

  render(): void {
    const w = this.maze.width * this.tileSize
    const h = this.maze.height * this.tileSize

    const gfx = this.scene.add.graphics().setVisible(false)

    for (let row = 0; row < this.maze.height; row++) {
      for (let col = 0; col < this.maze.width; col++) {
        const cell = this.maze.cells[row][col]
        const x = col * this.tileSize
        const y = row * this.tileSize

        if (cell === 'wall') {
          // 壁: 明るめのブルーで通路との差を確保
          gfx.fillStyle(0x4a6090)
          gfx.fillRect(x, y, this.tileSize, this.tileSize)
          // 壁のハイライト（左上）
          gfx.fillStyle(0x6080b0, 0.5)
          gfx.fillRect(x, y, this.tileSize, 1)
          gfx.fillRect(x, y, 1, this.tileSize)
          // 壁のシャドウ（右下）
          gfx.fillStyle(0x2a3a5c, 0.7)
          gfx.fillRect(x, y + this.tileSize - 1, this.tileSize, 1)
          gfx.fillRect(x + this.tileSize - 1, y, 1, this.tileSize)
        } else {
          // 通路: 十分に暗くして壁との差を明確に
          gfx.fillStyle(0x080810)
          gfx.fillRect(x, y, this.tileSize, this.tileSize)
          // 微かなグリッドライン
          gfx.fillStyle(0x12121e, 0.4)
          gfx.fillRect(x, y, this.tileSize, 1)
          gfx.fillRect(x, y, 1, this.tileSize)
        }
      }
    }

    this.renderTexture = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0)
    this.renderTexture.draw(gfx)
    gfx.setVisible(false)
    gfx.destroy()
  }

  renderGoal(goal: Position): void {
    if (!this.renderTexture) return

    const padding = 6
    const x = goal.col * this.tileSize + padding
    const y = goal.row * this.tileSize + padding
    const size = this.tileSize - padding * 2

    // 静的なゴールマーカーをテクスチャに描画
    const gfx = this.scene.add.graphics().setVisible(false)
    gfx.fillStyle(0xe94560)
    gfx.fillRect(x, y, size, size)
    this.renderTexture.draw(gfx)
    gfx.setVisible(false)
    gfx.destroy()

    // パルスアニメーション用のオーバーレイ
    this.goalGlow = this.scene.add.rectangle(
      goal.col * this.tileSize + this.tileSize / 2,
      goal.row * this.tileSize + this.tileSize / 2,
      size + 4,
      size + 4,
      0xe94560,
      0.3,
    ).setDepth(5)

    this.scene.tweens.add({
      targets: this.goalGlow,
      alpha: 0.05,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  destroy(): void {
    if (this.renderTexture) {
      this.renderTexture.destroy()
      this.renderTexture = null
    }
    if (this.goalGlow) {
      this.goalGlow.destroy()
      this.goalGlow = null
    }
  }
}
