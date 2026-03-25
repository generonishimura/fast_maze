import Phaser from 'phaser'
import type { MazeGrid, Position } from '@/domain/types'

export class MazeRenderer {
  private readonly scene: Phaser.Scene
  private readonly maze: MazeGrid
  private readonly tileSize: number
  private renderTexture: Phaser.GameObjects.RenderTexture | null = null

  constructor(scene: Phaser.Scene, maze: MazeGrid, tileSize: number) {
    this.scene = scene
    this.maze = maze
    this.tileSize = tileSize
  }

  render(): void {
    const w = this.maze.width * this.tileSize
    const h = this.maze.height * this.tileSize

    // 一時Graphicsに描画してRenderTextureに焼き込む
    const gfx = this.scene.add.graphics().setVisible(false)

    for (let row = 0; row < this.maze.height; row++) {
      for (let col = 0; col < this.maze.width; col++) {
        const cell = this.maze.cells[row][col]
        gfx.fillStyle(cell === 'wall' ? 0x16213e : 0x0f3460)
        gfx.fillRect(col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize)
      }
    }

    this.renderTexture = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0)
    this.renderTexture.draw(gfx)
    gfx.setVisible(false)
    gfx.destroy()
  }

  renderGoal(goal: Position): void {
    if (!this.renderTexture) return

    const padding = 4
    const gfx = this.scene.add.graphics().setVisible(false)
    gfx.fillStyle(0xe94560)
    gfx.fillRect(
      goal.col * this.tileSize + padding,
      goal.row * this.tileSize + padding,
      this.tileSize - padding * 2,
      this.tileSize - padding * 2,
    )
    this.renderTexture.draw(gfx)
    gfx.setVisible(false)
    gfx.destroy()
  }

  destroy(): void {
    if (this.renderTexture) {
      this.renderTexture.destroy()
      this.renderTexture = null
    }
  }
}
