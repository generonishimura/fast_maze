import Phaser from 'phaser'
import type { Direction, Position } from '@/domain/types'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// 9x9 ドット絵（上から見た虫）
// 0=透明, 1=暗緑ボディ, 2=明緑, 3=赤い目, 4=翅ハイライト, 5=脚
// フレーム0=脚A, フレーム1=脚B
const SPRITES: Record<Direction, number[][][]> = {
  down: [
    [
      [0, 0, 5, 0, 0, 0, 5, 0, 0],
      [0, 5, 0, 4, 4, 4, 0, 5, 0],
      [0, 0, 4, 2, 2, 2, 4, 0, 0],
      [5, 0, 2, 3, 2, 3, 2, 0, 5],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [5, 0, 1, 2, 1, 2, 1, 0, 5],
      [0, 0, 0, 1, 1, 1, 0, 0, 0],
      [0, 5, 0, 1, 0, 1, 0, 5, 0],
      [0, 0, 5, 0, 0, 0, 5, 0, 0],
    ],
    [
      [0, 5, 0, 0, 0, 0, 0, 5, 0],
      [0, 0, 5, 4, 4, 4, 5, 0, 0],
      [0, 0, 4, 2, 2, 2, 4, 0, 0],
      [0, 5, 2, 3, 2, 3, 2, 5, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 5, 1, 2, 1, 2, 1, 5, 0],
      [0, 0, 0, 1, 1, 1, 0, 0, 0],
      [5, 0, 0, 1, 0, 1, 0, 0, 5],
      [0, 0, 0, 5, 0, 5, 0, 0, 0],
    ],
  ],
  up: [
    [
      [0, 0, 5, 0, 0, 0, 5, 0, 0],
      [0, 5, 0, 1, 1, 1, 0, 5, 0],
      [0, 0, 1, 2, 1, 2, 1, 0, 0],
      [5, 0, 1, 1, 1, 1, 1, 0, 5],
      [0, 0, 2, 1, 2, 1, 2, 0, 0],
      [5, 0, 4, 2, 2, 2, 4, 0, 5],
      [0, 0, 0, 4, 4, 4, 0, 0, 0],
      [0, 5, 0, 4, 0, 4, 0, 5, 0],
      [0, 0, 5, 0, 0, 0, 5, 0, 0],
    ],
    [
      [0, 5, 0, 0, 0, 0, 0, 5, 0],
      [0, 0, 5, 1, 1, 1, 5, 0, 0],
      [0, 0, 1, 2, 1, 2, 1, 0, 0],
      [0, 5, 1, 1, 1, 1, 1, 5, 0],
      [0, 0, 2, 1, 2, 1, 2, 0, 0],
      [0, 5, 4, 2, 2, 2, 4, 5, 0],
      [0, 0, 0, 4, 4, 4, 0, 0, 0],
      [5, 0, 0, 4, 0, 4, 0, 0, 5],
      [0, 0, 0, 5, 0, 5, 0, 0, 0],
    ],
  ],
  left: [
    [
      [0, 0, 0, 5, 0, 0, 5, 0, 0],
      [0, 0, 5, 0, 4, 5, 0, 0, 0],
      [0, 0, 0, 4, 2, 4, 0, 0, 0],
      [0, 0, 3, 2, 1, 2, 0, 5, 0],
      [0, 0, 3, 1, 1, 1, 0, 0, 0],
      [0, 0, 2, 1, 1, 2, 0, 5, 0],
      [0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 5, 0, 1, 0, 5, 0, 0],
      [0, 0, 0, 5, 0, 5, 0, 0, 0],
    ],
    [
      [0, 0, 5, 0, 0, 5, 0, 0, 0],
      [0, 0, 0, 5, 4, 0, 5, 0, 0],
      [0, 0, 0, 4, 2, 4, 0, 0, 0],
      [0, 5, 3, 2, 1, 2, 0, 0, 0],
      [0, 0, 3, 1, 1, 1, 0, 0, 0],
      [0, 5, 2, 1, 1, 2, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 5, 1, 5, 0, 0, 0],
      [0, 0, 5, 0, 0, 0, 5, 0, 0],
    ],
  ],
  right: [
    [
      [0, 0, 5, 0, 0, 5, 0, 0, 0],
      [0, 0, 0, 5, 4, 0, 5, 0, 0],
      [0, 0, 0, 4, 2, 4, 0, 0, 0],
      [0, 5, 0, 2, 1, 2, 3, 0, 0],
      [0, 0, 0, 1, 1, 1, 3, 0, 0],
      [0, 5, 0, 2, 1, 1, 2, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 5, 0, 1, 0, 5, 0, 0],
      [0, 0, 0, 5, 0, 5, 0, 0, 0],
    ],
    [
      [0, 0, 0, 5, 0, 0, 5, 0, 0],
      [0, 0, 5, 0, 4, 5, 0, 0, 0],
      [0, 0, 0, 4, 2, 4, 0, 0, 0],
      [0, 0, 0, 2, 1, 2, 3, 5, 0],
      [0, 0, 0, 1, 1, 1, 3, 0, 0],
      [0, 0, 0, 2, 1, 1, 2, 5, 0],
      [0, 0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 5, 1, 5, 0, 0, 0],
      [0, 0, 5, 0, 0, 0, 5, 0, 0],
    ],
  ],
}

const PALETTE: Record<number, number> = {
  1: 0x2d5016, // 暗緑ボディ
  2: 0x4a8c2a, // 明緑
  3: 0xe53935, // 赤い目
  4: 0x88cc55, // 翅ハイライト
  5: 0x1a3300, // 脚
}

const SPRITE_SIZE = 9

export class InsectorRenderer {
  private readonly tileSize: number
  private readonly scene: Phaser.Scene
  private sprite: Phaser.GameObjects.RenderTexture | null = null
  private glow: Phaser.GameObjects.Arc | null = null
  private glowTween: Phaser.Tweens.Tween | null = null
  private currentDirection: Direction = 'right'
  private currentFrame = 0
  private readonly spriteCache: Map<string, Phaser.GameObjects.RenderTexture> = new Map()
  private despawning = false

  constructor(scene: Phaser.Scene, tileSize: number, hudCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.tileSize = tileSize
    this.buildSpriteCache()

    // 赤紫グロー（危険感）
    this.glow = scene.add
      .circle(0, 0, tileSize * 0.55, 0xe94560, 0.15)
      .setDepth(9)
      .setVisible(false)

    this.glowTween = scene.tweens.add({
      targets: this.glow,
      alpha: 0.05,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.sprite = scene.add.renderTexture(0, 0, tileSize, tileSize)
      .setOrigin(0.5, 0.5)
      .setDepth(10)
      .setVisible(false)

    hudCamera.ignore(this.sprite)
    hudCamera.ignore(this.glow)
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

  spawn(position: Position): void {
    if (!this.sprite || !this.glow) return

    const x = position.col * this.tileSize + this.tileSize / 2
    const y = position.row * this.tileSize + this.tileSize / 2

    this.sprite.setPosition(x, y).setVisible(true).setAlpha(0).setScale(0)
    this.glow.setPosition(x, y).setVisible(true).setAlpha(0)
    this.applySprite('right', 0)

    // スポーン演出: スケール0→1 + フェードイン
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    })

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.15,
      duration: 300,
      ease: 'Sine.easeIn',
    })
  }

  updatePosition(currentPos: Position, nextPos: Position, progress: number, direction: Direction): void {
    if (!this.sprite || this.despawning) return

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

  despawn(onComplete: () => void): void {
    if (this.despawning) return
    this.despawning = true

    if (this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        rotation: Math.PI,
        duration: 400,
        ease: 'Back.easeIn',
        onComplete: () => {
          onComplete()
        },
      })
    }

    if (this.glow) {
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeOut',
      })
    }
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
    if (this.glowTween) {
      this.glowTween.destroy()
      this.glowTween = null
    }
    for (const rt of this.spriteCache.values()) {
      rt.destroy()
    }
    this.spriteCache.clear()
    this.despawning = false
  }
}
