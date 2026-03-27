import Phaser from 'phaser'
import type { FruitType } from '@/domain/fruit'
import type { WorldFruit } from '@/domain/endless-types'

// 9x9 ピクセルアート
// 各果物ごとにパレット番号を定義
// 0=透明

// さくらんぼ: 1=赤, 2=濃赤, 3=緑(茎), 4=ハイライト
const CHERRY_SPRITE: number[][] = [
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 3, 0, 3, 0, 0, 0],
  [0, 0, 3, 0, 0, 0, 3, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 1, 4, 1, 0, 1, 4, 1, 0],
  [0, 1, 1, 1, 0, 1, 1, 1, 0],
  [0, 0, 2, 1, 0, 0, 2, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
]
const CHERRY_PALETTE: Record<number, number> = {
  1: 0xe53935, // 赤
  2: 0xb71c1c, // 濃赤
  3: 0x4caf50, // 緑(茎)
  4: 0xff8a80, // ハイライト
}

// みかん: 1=オレンジ, 2=濃オレンジ, 3=緑(葉), 4=ハイライト
const ORANGE_SPRITE: number[][] = [
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 3, 3, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 4, 1, 1, 1, 0, 0],
  [0, 1, 4, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 2, 0, 0],
  [0, 0, 0, 2, 2, 2, 0, 0, 0],
]
const ORANGE_PALETTE: Record<number, number> = {
  1: 0xff9800, // オレンジ
  2: 0xe65100, // 濃オレンジ
  3: 0x4caf50, // 緑(葉)
  4: 0xffcc02, // ハイライト
}

// りんご: 1=赤, 2=濃赤, 3=緑(葉), 4=ハイライト, 5=茎
const APPLE_SPRITE: number[][] = [
  [0, 0, 0, 0, 5, 0, 0, 0, 0],
  [0, 0, 0, 3, 5, 3, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 4, 1, 1, 1, 1, 1, 0],
  [0, 1, 4, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 2, 1, 1, 2, 0, 0],
  [0, 0, 0, 0, 2, 0, 0, 0, 0],
]
const APPLE_PALETTE: Record<number, number> = {
  1: 0xe53935, // 赤
  2: 0xb71c1c, // 濃赤
  3: 0x4caf50, // 緑(葉)
  4: 0xff8a80, // ハイライト
  5: 0x795548, // 茎
}

// ぶどう: 1=紫, 2=濃紫, 3=緑(茎), 4=ハイライト
const GRAPE_SPRITE: number[][] = [
  [0, 0, 0, 3, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 1, 4, 1, 0, 0, 0],
  [0, 0, 1, 4, 1, 4, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 4, 1, 1, 4, 1, 1, 0],
  [0, 1, 1, 2, 1, 1, 2, 1, 0],
  [0, 0, 1, 1, 2, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
]
const GRAPE_PALETTE: Record<number, number> = {
  1: 0x9c27b0, // 紫
  2: 0x6a1b9a, // 濃紫
  3: 0x4caf50, // 緑(茎)
  4: 0xce93d8, // ハイライト
}

// メロン: 1=緑, 2=濃緑, 3=茎, 4=ハイライト, 5=網目
const MELON_SPRITE: number[][] = [
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 3, 3, 3, 0, 0, 0],
  [0, 0, 1, 1, 5, 1, 1, 0, 0],
  [0, 1, 4, 1, 1, 5, 1, 1, 0],
  [0, 1, 1, 5, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 5, 1, 1, 0],
  [0, 1, 5, 1, 1, 1, 5, 1, 0],
  [0, 0, 1, 1, 5, 1, 1, 0, 0],
  [0, 0, 0, 2, 2, 2, 0, 0, 0],
]
const MELON_PALETTE: Record<number, number> = {
  1: 0x66bb6a, // 緑
  2: 0x2e7d32, // 濃緑
  3: 0x795548, // 茎
  4: 0xa5d6a7, // ハイライト
  5: 0x81c784, // 網目
}

const FRUIT_SPRITES: Record<FruitType, { sprite: number[][]; palette: Record<number, number> }> = {
  cherry: { sprite: CHERRY_SPRITE, palette: CHERRY_PALETTE },
  orange: { sprite: ORANGE_SPRITE, palette: ORANGE_PALETTE },
  apple: { sprite: APPLE_SPRITE, palette: APPLE_PALETTE },
  grape: { sprite: GRAPE_SPRITE, palette: GRAPE_PALETTE },
  melon: { sprite: MELON_SPRITE, palette: MELON_PALETTE },
}

// 果物種別ごとのグロー色
const FRUIT_GLOW_COLOR: Record<FruitType, number> = {
  cherry: 0xff4444,
  orange: 0xff9900,
  apple: 0xff2222,
  grape: 0xbb44ff,
  melon: 0x44ff44,
}

const SPRITE_SIZE = 9

type FruitGameObject = {
  sprite: Phaser.GameObjects.RenderTexture
  glow: Phaser.GameObjects.Arc
}

export class FruitRenderer {
  private readonly scene: Phaser.Scene
  private readonly tileSize: number
  private readonly hudCamera: Phaser.Cameras.Scene2D.Camera
  private readonly fruitObjects = new Map<string, FruitGameObject>()
  // #2: 5種類のフルーツスプライトテンプレートを事前キャッシュ
  private readonly spriteTemplates = new Map<FruitType, Phaser.GameObjects.RenderTexture>()

  constructor(scene: Phaser.Scene, tileSize: number, hudCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.tileSize = tileSize
    this.hudCamera = hudCamera
    this.buildSpriteTemplates()
  }

  private buildSpriteTemplates(): void {
    const types: FruitType[] = ['cherry', 'orange', 'apple', 'grape', 'melon']
    const pixelSize = Math.floor(this.tileSize / SPRITE_SIZE)
    const offset = Math.floor((this.tileSize - pixelSize * SPRITE_SIZE) / 2)

    for (const type of types) {
      const rt = this.scene.add.renderTexture(0, 0, this.tileSize, this.tileSize).setVisible(false)
      const { sprite, palette } = FRUIT_SPRITES[type]
      const gfx = this.scene.add.graphics().setVisible(false)

      for (let row = 0; row < SPRITE_SIZE; row++) {
        for (let col = 0; col < SPRITE_SIZE; col++) {
          const value = sprite[row][col]
          if (value === 0) continue
          gfx.fillStyle(palette[value])
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
      this.spriteTemplates.set(type, rt)
    }
  }

  syncFruits(fruits: ReadonlyMap<string, WorldFruit>): void {
    // 消えた果物を削除
    for (const [key, obj] of this.fruitObjects) {
      if (!fruits.has(key)) {
        obj.sprite.destroy()
        obj.glow.destroy()
        this.fruitObjects.delete(key)
      }
    }

    // 新しい果物を追加
    for (const [key, fruit] of fruits) {
      if (this.fruitObjects.has(key)) continue

      const x = fruit.col * this.tileSize + this.tileSize / 2
      const y = fruit.row * this.tileSize + this.tileSize / 2

      // グロー効果
      const glowColor = FRUIT_GLOW_COLOR[fruit.type]
      const glow = this.scene.add
        .circle(x, y, this.tileSize * 0.45, glowColor, 0.1)
        .setDepth(7)

      this.scene.tweens.add({
        targets: glow,
        alpha: 0.03,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      // スプライト
      const sprite = this.scene.add.renderTexture(0, 0, this.tileSize, this.tileSize)
        .setOrigin(0.5, 0.5)
        .setPosition(x, y)
        .setDepth(8)

      const template = this.spriteTemplates.get(fruit.type)
      if (template) {
        sprite.draw(template)
      }

      this.hudCamera.ignore(sprite)
      this.hudCamera.ignore(glow)
      this.fruitObjects.set(key, { sprite, glow })
    }
  }

  playCollectEffect(fruit: WorldFruit): void {
    const x = fruit.col * this.tileSize + this.tileSize / 2
    const y = fruit.row * this.tileSize + this.tileSize / 2
    const color = FRUIT_GLOW_COLOR[fruit.type]

    // パーティクル
    const count = 5
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const size = Phaser.Math.Between(2, 4)
      const particle = this.scene.add.rectangle(x, y, size, size, color, 0.8).setDepth(150)
      this.hudCamera.ignore(particle)

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * Phaser.Math.Between(10, 20),
        y: y + Math.sin(angle) * Phaser.Math.Between(10, 20),
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      })
    }

    // スコアポップアップ
    const scoreText = `+${fruit.type === 'melon' ? '1000' : fruit.type === 'grape' ? '500' : fruit.type === 'apple' ? '200' : fruit.type === 'orange' ? '100' : '50'}`
    const popup = this.scene.add.text(x, y - 8, scoreText, {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(151)
    this.hudCamera.ignore(popup)

    this.scene.tweens.add({
      targets: popup,
      y: y - 24,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    })
  }

  destroy(): void {
    for (const [, obj] of this.fruitObjects) {
      obj.sprite.destroy()
      obj.glow.destroy()
    }
    this.fruitObjects.clear()
    for (const rt of this.spriteTemplates.values()) {
      rt.destroy()
    }
    this.spriteTemplates.clear()
  }
}
