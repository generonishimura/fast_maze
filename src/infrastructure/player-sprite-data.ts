import type { Direction } from '@/domain/types'

// 9x9 ドット絵（上から見た人間）
// 0=透明, 1=肌色, 2=服, 3=髪, 4=靴, 5=襟/ベルト, 6=目
// フレーム0=右足前, フレーム1=左足前
export const SPRITES: Record<Direction, number[][][]> = {
  down: [
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
      [0, 3, 3, 3, 3, 3, 0, 0, 0],
      [0, 3, 6, 1, 3, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 1, 5, 2, 2, 5, 1, 0, 0],
      [0, 0, 2, 2, 5, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 0, 0, 0],
      [0, 0, 2, 0, 0, 2, 0, 0, 0],
      [0, 0, 4, 0, 0, 4, 0, 0, 0],
    ],
    [
      [0, 0, 3, 3, 3, 0, 0, 0, 0],
      [0, 3, 3, 3, 3, 3, 0, 0, 0],
      [0, 3, 6, 1, 3, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 1, 5, 2, 2, 5, 1, 0, 0],
      [0, 1, 2, 2, 5, 2, 0, 0, 0],
      [0, 0, 2, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 2, 2, 0, 0, 0, 0],
      [0, 0, 0, 4, 4, 0, 0, 0, 0],
    ],
  ],
  right: [
    [
      [0, 0, 0, 0, 3, 3, 3, 0, 0],
      [0, 0, 0, 3, 3, 3, 3, 3, 0],
      [0, 0, 0, 0, 3, 1, 6, 3, 0],
      [0, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 1, 5, 2, 2, 5, 1, 0],
      [0, 0, 1, 2, 5, 2, 2, 0, 0],
      [0, 0, 0, 2, 2, 2, 2, 1, 0],
      [0, 0, 2, 0, 0, 2, 0, 0, 0],
      [0, 0, 4, 0, 0, 4, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 3, 3, 3, 0, 0],
      [0, 0, 0, 3, 3, 3, 3, 3, 0],
      [0, 0, 0, 0, 3, 1, 6, 3, 0],
      [0, 0, 0, 0, 1, 1, 1, 0, 0],
      [0, 0, 1, 5, 2, 2, 5, 1, 0],
      [0, 0, 0, 2, 5, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 2, 0, 0],
      [0, 0, 0, 0, 2, 2, 0, 0, 0],
      [0, 0, 0, 0, 4, 4, 0, 0, 0],
    ],
  ],
}

export const SPRITE_SIZE = 9

/** プレイヤーIDからHue(0-360)を生成 */
export function playerHue(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 360
}

/** HSLからRGB数値を生成 */
export function hslToHex(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(color * 255)
  }
  return (f(0) << 16) | (f(8) << 8) | f(4)
}

/** プレイヤーIDからパレット生成（服の色がランダム） */
export function createPalette(id: string): Record<number, number> {
  const hue = playerHue(id)
  const clothingColor = hslToHex(hue, 0.7, 0.55)
  const collarColor = hslToHex(hue, 0.7, 0.4)

  return {
    1: 0xffcc99, // 肌色
    2: clothingColor, // 服
    3: 0x6a4030, // 髪
    4: 0x4a4050, // 靴
    5: collarColor, // 襟・ベルト
    6: 0x1a1a2a, // 目
  }
}

/** デフォルトパレット（ローカルプレイヤー用） */
export const DEFAULT_PALETTE: Record<number, number> = {
  1: 0xffcc99,
  2: 0x00d4f0,
  3: 0x6a4030,
  4: 0x4a4050,
  5: 0x00a0b8,
  6: 0x1a1a2a,
}

/** スプライトキャッシュを構築（全方向×2フレーム） */
export function buildSpriteCache(
  scene: Phaser.Scene,
  tileSize: number,
  palette: Record<number, number>,
): Map<string, Phaser.GameObjects.RenderTexture> {
  const cache = new Map<string, Phaser.GameObjects.RenderTexture>()
  const directions: Direction[] = ['up', 'down', 'left', 'right']
  const pixelSize = Math.floor(tileSize / SPRITE_SIZE)
  const offset = Math.floor((tileSize - pixelSize * SPRITE_SIZE) / 2)

  for (const dir of directions) {
    for (let frame = 0; frame < 2; frame++) {
      const rt = scene.add.renderTexture(0, 0, tileSize, tileSize)
        .setOrigin(0, 0)
        .setVisible(false)
      const pattern = SPRITES[dir][frame]
      const gfx = scene.add.graphics().setVisible(false)

      for (let row = 0; row < SPRITE_SIZE; row++) {
        for (let col = 0; col < SPRITE_SIZE; col++) {
          const value = pattern[row][col]
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
      cache.set(`${dir}_${frame}`, rt)
    }
  }

  return cache
}
