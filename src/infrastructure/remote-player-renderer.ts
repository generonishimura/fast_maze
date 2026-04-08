import Phaser from 'phaser'
import type { Direction } from '@/domain/types'
import { buildSpriteCache, createPalette } from '@/infrastructure/player-sprite-data'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

type RemotePlayerData = {
  id: string
  row: number
  col: number
  direction: string
  score: number
  status: string
}

class RemotePlayerSprite {
  private sprite: Phaser.GameObjects.RenderTexture
  private nameText: Phaser.GameObjects.Text
  private spriteCache: Map<string, Phaser.GameObjects.RenderTexture>
  private prevRow: number
  private prevCol: number
  private targetRow: number
  private targetCol: number
  private currentDirection: Direction = 'down'
  private currentFrame = 0
  readonly id: string

  constructor(scene: Phaser.Scene, data: RemotePlayerData, tileSize: number) {
    this.id = data.id
    this.prevRow = data.row
    this.prevCol = data.col
    this.targetRow = data.row
    this.targetCol = data.col

    // プレイヤーIDから服の色が決まるパレットでスプライト生成
    const palette = createPalette(data.id)
    this.spriteCache = buildSpriteCache(scene, tileSize, palette)

    const x = data.col * tileSize + tileSize / 2
    const y = data.row * tileSize + tileSize / 2

    this.sprite = scene.add.renderTexture(x, y, tileSize, tileSize)
      .setOrigin(0.5, 0.5)
      .setDepth(8)

    this.applySprite('down', 0)

    this.nameText = scene.add.text(x, y - tileSize * 0.6, data.id.slice(0, 4), {
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    })
      .setOrigin(0.5, 1)
      .setDepth(8)
  }

  private applySprite(direction: Direction, frame: number): void {
    const cached = this.spriteCache.get(`${direction}_${frame}`)
    if (!cached) return
    this.sprite.clear()
    this.sprite.draw(cached)
  }

  onServerUpdate(data: RemotePlayerData) {
    if (data.row !== this.targetRow || data.col !== this.targetCol) {
      this.prevRow = this.targetRow
      this.prevCol = this.targetCol
      this.targetRow = data.row
      this.targetCol = data.col
    }
  }

  update(data: RemotePlayerData, tileSize: number, interpolation: number, localScore: number, time: number) {
    if (data.status === 'eliminated') {
      this.setVisible(false)
      return
    }

    this.setVisible(true)

    const x = lerp(
      this.prevCol * tileSize + tileSize / 2,
      this.targetCol * tileSize + tileSize / 2,
      interpolation,
    )
    const y = lerp(
      this.prevRow * tileSize + tileSize / 2,
      this.targetRow * tileSize + tileSize / 2,
      interpolation,
    )

    this.sprite.setPosition(x, y)
    this.nameText.setPosition(x, y - tileSize * 0.6)

    // 自分より得点が高いプレイヤーは点滅
    if (data.score > localScore) {
      const blink = Math.sin(time * 0.008) * 0.3 + 0.7 // 0.4〜1.0で振動
      this.sprite.setAlpha(blink)
      this.nameText.setAlpha(blink)
    } else {
      this.sprite.setAlpha(1)
      this.nameText.setAlpha(1)
    }

    // 方向 & 歩行アニメ更新
    const dir = data.direction as Direction
    const nextFrame = interpolation < 0.5 ? 0 : 1
    if (dir !== this.currentDirection || nextFrame !== this.currentFrame) {
      this.currentDirection = dir
      this.currentFrame = nextFrame
      this.applySprite(dir, nextFrame)
    }
  }

  setVisible(visible: boolean) {
    this.sprite.setVisible(visible)
    this.nameText.setVisible(visible)
  }

  ignoreFromCamera(camera: Phaser.Cameras.Scene2D.Camera) {
    camera.ignore(this.sprite)
    camera.ignore(this.nameText)
    for (const rt of this.spriteCache.values()) {
      camera.ignore(rt)
    }
  }

  destroy() {
    this.sprite.destroy()
    this.nameText.destroy()
    for (const rt of this.spriteCache.values()) {
      rt.destroy()
    }
    this.spriteCache.clear()
  }
}

export class RemotePlayerRenderer {
  private scene: Phaser.Scene
  private tileSize: number
  private sprites = new Map<string, RemotePlayerSprite>()
  private hudCamera: Phaser.Cameras.Scene2D.Camera | null = null

  constructor(scene: Phaser.Scene, tileSize: number, hudCamera?: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.tileSize = tileSize
    this.hudCamera = hudCamera ?? null
  }

  onServerUpdate(players: Map<string, RemotePlayerData>, localPlayerId: string) {
    for (const [id, data] of players) {
      if (id === localPlayerId) continue
      const sprite = this.sprites.get(id)
      if (sprite) {
        sprite.onServerUpdate(data)
      }
    }
  }

  updatePlayers(players: Map<string, RemotePlayerData>, localPlayerId: string, interpolation: number, localScore: number, camera?: Phaser.Cameras.Scene2D.Camera) {
    const cullMargin = 10 * this.tileSize
    const cam = camera ?? this.scene.cameras.main
    const time = this.scene.time.now

    for (const [id, data] of players) {
      if (id === localPlayerId) continue

      const worldX = data.col * this.tileSize
      const worldY = data.row * this.tileSize
      const inView = worldX >= cam.worldView.x - cullMargin
        && worldX <= cam.worldView.right + cullMargin
        && worldY >= cam.worldView.y - cullMargin
        && worldY <= cam.worldView.bottom + cullMargin

      let sprite = this.sprites.get(id)
      if (!inView) {
        if (sprite) sprite.setVisible(false)
        continue
      }

      if (!sprite) {
        sprite = new RemotePlayerSprite(this.scene, data, this.tileSize)
        sprite.onServerUpdate(data)
        if (this.hudCamera) sprite.ignoreFromCamera(this.hudCamera)
        this.sprites.set(id, sprite)
      }
      sprite.update(data, this.tileSize, interpolation, localScore, time)
    }

    for (const [id, sprite] of this.sprites) {
      if (!players.has(id)) {
        sprite.destroy()
        this.sprites.delete(id)
      }
    }
  }

  ignoreFromCamera(camera: Phaser.Cameras.Scene2D.Camera) {
    for (const sprite of this.sprites.values()) {
      sprite.ignoreFromCamera(camera)
    }
  }

  destroy() {
    for (const sprite of this.sprites.values()) {
      sprite.destroy()
    }
    this.sprites.clear()
  }
}
