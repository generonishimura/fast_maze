import Phaser from 'phaser'
import type { Direction, Position } from '@/domain/types'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// 9x9 ドット絵（上から見た人間）
// 0=透明, 1=肌色, 2=服, 3=髪, 4=靴, 5=襟/ベルト, 6=目
// フレーム0=右足前, フレーム1=左足前
const SPRITES: Record<Direction, number[][][]> = {
  down: [
    // フレーム0
    [
      [0, 0, 0, 3, 3, 3, 0, 0, 0],
      [0, 0, 3, 3, 3, 3, 3, 0, 0],
      [0, 0, 3, 1, 1, 1, 3, 0, 0],
      [0, 0, 1, 6, 1, 6, 1, 0, 0],
      [0, 1, 5, 2, 2, 2, 5, 1, 0],
      [0, 0, 2, 2, 5, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 2, 0, 0],
      [0, 0, 0, 2, 0, 2, 0, 0, 0],
      [0, 0, 4, 0, 0, 0, 4, 0, 0],
    ],
    // フレーム1
    [
      [0, 0, 0, 3, 3, 3, 0, 0, 0],
      [0, 0, 3, 3, 3, 3, 3, 0, 0],
      [0, 0, 3, 1, 1, 1, 3, 0, 0],
      [0, 0, 1, 6, 1, 6, 1, 0, 0],
      [0, 1, 5, 2, 2, 2, 5, 1, 0],
      [0, 1, 2, 2, 5, 2, 2, 0, 0],
      [0, 0, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 2, 0, 0, 2, 0, 0, 0],
      [0, 0, 0, 4, 0, 4, 0, 0, 0],
    ],
  ],
  up: [
    [
      [0, 0, 0, 3, 3, 3, 0, 0, 0],
      [0, 0, 3, 3, 3, 3, 3, 0, 0],
      [0, 0, 3, 3, 3, 3, 3, 0, 0],
      [0, 0, 1, 3, 3, 3, 1, 0, 0],
      [0, 1, 5, 2, 2, 2, 5, 1, 0],
      [0, 0, 2, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 2, 0, 0],
      [0, 0, 0, 2, 0, 2, 0, 0, 0],
      [0, 0, 4, 0, 0, 0, 4, 0, 0],
    ],
    [
      [0, 0, 0, 3, 3, 3, 0, 0, 0],
      [0, 0, 3, 3, 3, 3, 3, 0, 0],
      [0, 0, 3, 3, 3, 3, 3, 0, 0],
      [0, 0, 1, 3, 3, 3, 1, 0, 0],
      [0, 1, 5, 2, 2, 2, 5, 1, 0],
      [0, 1, 2, 2, 2, 2, 2, 0, 0],
      [0, 0, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 2, 0, 0, 2, 0, 0, 0],
      [0, 0, 0, 4, 0, 4, 0, 0, 0],
    ],
  ],
  left: [
    [
      [0, 0, 3, 3, 3, 0, 0, 0, 0],
      [0, 3, 3, 3, 3, 0, 0, 0, 0],
      [0, 3, 6, 1, 3, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 1, 5, 2, 2, 1, 0, 0, 0],
      [0, 0, 2, 2, 5, 2, 0, 0, 0],
      [0, 0, 2, 2, 2, 2, 0, 0, 0],
      [0, 0, 0, 2, 0, 2, 0, 0, 0],
      [0, 0, 0, 4, 0, 4, 0, 0, 0],
    ],
    [
      [0, 0, 3, 3, 3, 0, 0, 0, 0],
      [0, 3, 3, 3, 3, 0, 0, 0, 0],
      [0, 3, 6, 1, 3, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 5, 2, 2, 2, 0, 0, 0],
      [0, 1, 2, 2, 5, 1, 0, 0, 0],
      [0, 0, 2, 2, 2, 2, 0, 0, 0],
      [0, 0, 2, 0, 0, 2, 0, 0, 0],
      [0, 0, 4, 0, 0, 4, 0, 0, 0],
    ],
  ],
  right: [
    [
      [0, 0, 0, 0, 3, 3, 3, 0, 0],
      [0, 0, 0, 0, 3, 3, 3, 3, 0],
      [0, 0, 0, 0, 3, 1, 6, 3, 0],
      [0, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 2, 2, 5, 1, 0],
      [0, 0, 0, 2, 5, 2, 2, 0, 0],
      [0, 0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 0, 2, 0, 2, 0, 0, 0],
      [0, 0, 0, 4, 0, 4, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 3, 3, 3, 0, 0],
      [0, 0, 0, 0, 3, 3, 3, 3, 0],
      [0, 0, 0, 0, 3, 1, 6, 3, 0],
      [0, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 2, 2, 2, 5, 0, 0],
      [0, 0, 0, 1, 5, 2, 2, 1, 0],
      [0, 0, 0, 2, 2, 2, 2, 0, 0],
      [0, 0, 0, 2, 0, 0, 2, 0, 0],
      [0, 0, 0, 4, 0, 0, 4, 0, 0],
    ],
  ],
}

const PALETTE: Record<number, number> = {
  1: 0xffcc99, // 肌色（頭・腕）
  2: 0x00d4f0, // 服（明るいシアン）
  3: 0x6a4030, // 髪（ミディアムブラウン）
  4: 0x4a4050, // 靴（暗いグレー紫）
  5: 0x00a0b8, // 襟・ベルト（服の暗め）
  6: 0x1a1a2a, // 目（暗い）
}

const SPRITE_SIZE = 9

export class PlayerRenderer {
  private readonly tileSize: number
  private readonly scene: Phaser.Scene
  private sprite: Phaser.GameObjects.RenderTexture | null = null
  private glow: Phaser.GameObjects.Arc | null = null
  private currentDirection: Direction
  private currentFrame = 0
  // #1: 4方向×2フレーム=8パターンを事前キャッシュ
  private readonly spriteCache: Map<string, Phaser.GameObjects.RenderTexture> = new Map()

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
    this.buildSpriteCache()

    // ドット絵スプライト
    this.sprite = scene.add.renderTexture(0, 0, tileSize, tileSize)
      .setOrigin(0.5, 0.5)
      .setDepth(10)

    this.applySprite(initialDirection, 0)
  }

  private buildSpriteCache(): void {
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    const pixelSize = Math.floor(this.tileSize / SPRITE_SIZE)
    const offset = Math.floor((this.tileSize - pixelSize * SPRITE_SIZE) / 2)

    for (const dir of directions) {
      for (let frame = 0; frame < 2; frame++) {
        const rt = this.scene.add.renderTexture(0, 0, this.tileSize, this.tileSize)
          .setOrigin(0, 0)
          .setVisible(false)
        const pattern = SPRITES[dir][frame]
        const gfx = this.scene.add.graphics().setVisible(false)

        for (let row = 0; row < SPRITE_SIZE; row++) {
          for (let col = 0; col < SPRITE_SIZE; col++) {
            const value = pattern[row][col]
            if (value === 0) continue
            gfx.fillStyle(PALETTE[value])
            gfx.fillRect(
              offset + col * pixelSize,
              offset + row * pixelSize,
              pixelSize,
              pixelSize,
            )
          }
        }

        rt.draw(gfx)
        gfx.destroy()
        this.spriteCache.set(`${dir}_${frame}`, rt)
      }
    }
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
