import Phaser from 'phaser'
import type { Direction, Position } from '@/domain/types'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const DIRECTION_ANGLE: Record<Direction, number> = {
  up: -Math.PI / 2,
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
}

export class PlayerRenderer {
  private readonly tileSize: number
  private triangle: Phaser.GameObjects.Triangle | null = null

  constructor(scene: Phaser.Scene, tileSize: number, initialDirection: Direction) {
    this.tileSize = tileSize
    const size = tileSize - 8
    // 右向き(0°)の三角形を基準に作成し、rotationで向きを変える
    this.triangle = scene.add
      .triangle(0, 0, 0, size, size, size / 2, 0, 0, 0xf5c518)
      .setOrigin(0.5, 0.5)
      .setRotation(DIRECTION_ANGLE[initialDirection])
      .setDepth(10)
  }

  updatePosition(currentPos: Position, nextPos: Position, progress: number, direction: Direction): void {
    if (!this.triangle) return

    const x = lerp(
      currentPos.col * this.tileSize + this.tileSize / 2,
      nextPos.col * this.tileSize + this.tileSize / 2,
      progress,
    )
    const y = lerp(
      currentPos.row * this.tileSize + this.tileSize / 2,
      nextPos.row * this.tileSize + this.tileSize / 2,
      progress,
    )

    this.triangle.setPosition(x, y)
    this.triangle.setRotation(DIRECTION_ANGLE[direction])
  }

  destroy(): void {
    if (this.triangle) {
      this.triangle.destroy()
      this.triangle = null
    }
  }
}
