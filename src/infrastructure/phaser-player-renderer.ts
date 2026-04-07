import Phaser from 'phaser'
import type { Direction, Position } from '@/domain/types'
import { buildSpriteCache, DEFAULT_PALETTE } from '@/infrastructure/player-sprite-data'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export class PlayerRenderer {
  private readonly tileSize: number
  private readonly scene: Phaser.Scene
  private sprite: Phaser.GameObjects.RenderTexture | null = null
  private glow: Phaser.GameObjects.Arc | null = null
  private currentDirection: Direction
  private currentFrame = 0
  private readonly spriteCache: Map<string, Phaser.GameObjects.RenderTexture>

  constructor(scene: Phaser.Scene, tileSize: number, initialDirection: Direction) {
    this.scene = scene
    this.tileSize = tileSize
    this.currentDirection = initialDirection

    // グロー効果
    this.glow = scene.add
      .circle(0, 0, tileSize * 0.55, 0x00e5ff, 0.12)
      .setDepth(9)

    scene.tweens.add({
      targets: this.glow,
      alpha: 0.04,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // 全スプライトパターンを事前生成
    this.spriteCache = buildSpriteCache(scene, tileSize, DEFAULT_PALETTE)

    // ドット絵スプライト
    this.sprite = scene.add.renderTexture(0, 0, tileSize, tileSize)
      .setOrigin(0.5, 0.5)
      .setDepth(10)

    this.applySprite(initialDirection, 0)
  }

  private applySprite(direction: Direction, frame: number): void {
    if (!this.sprite) return
    const cached = this.spriteCache.get(`${direction}_${frame}`)
    if (!cached) return
    this.sprite.clear()
    this.sprite.draw(cached)
  }

  updatePosition(currentPos: Position, nextPos: Position, progress: number, direction: Direction): void {
    if (!this.sprite) return

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

    this.sprite.setPosition(x, y)

    // 歩行アニメ: progressの前半=フレーム0, 後半=フレーム1
    const nextFrame = progress < 0.5 ? 0 : 1

    if (direction !== this.currentDirection || nextFrame !== this.currentFrame) {
      this.currentDirection = direction
      this.currentFrame = nextFrame
      this.applySprite(direction, nextFrame)
    }

    if (this.glow) {
      this.glow.setPosition(x, y)
    }
  }

  blink(durationMs: number): void {
    if (!this.sprite) return
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.2,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(durationMs / 200) - 1,
      ease: 'Sine.easeInOut',
    })
  }

  ignoreFromCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (this.sprite) camera.ignore(this.sprite)
    if (this.glow) camera.ignore(this.glow)
  }

  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy()
      this.sprite = null
    }
    if (this.glow) {
      this.glow.destroy()
      this.glow = null
    }
    for (const rt of this.spriteCache.values()) {
      rt.destroy()
    }
    this.spriteCache.clear()
  }
}
