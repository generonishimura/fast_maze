import Phaser from 'phaser'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// プレイヤーIDからカラーを生成（ハッシュ）
function playerColor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  const hue = Math.abs(hash) % 360
  return Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.55).color
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
  private dot: Phaser.GameObjects.Arc
  private nameText: Phaser.GameObjects.Text
  private prevRow: number
  private prevCol: number
  readonly id: string

  constructor(scene: Phaser.Scene, data: RemotePlayerData, tileSize: number) {
    this.id = data.id
    this.prevRow = data.row
    this.prevCol = data.col

    const color = playerColor(data.id)
    const x = data.col * tileSize + tileSize / 2
    const y = data.row * tileSize + tileSize / 2

    this.dot = scene.add.circle(x, y, tileSize * 0.35, color, 0.9)
      .setDepth(8)

    this.nameText = scene.add.text(x, y - tileSize * 0.6, data.id.slice(0, 4), {
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1,
    })
      .setOrigin(0.5, 1)
      .setDepth(8)
  }

  update(data: RemotePlayerData, tileSize: number, interpolation: number) {
    if (data.status === 'eliminated') {
      this.setVisible(false)
      return
    }

    this.setVisible(true)

    const x = lerp(
      this.prevCol * tileSize + tileSize / 2,
      data.col * tileSize + tileSize / 2,
      interpolation,
    )
    const y = lerp(
      this.prevRow * tileSize + tileSize / 2,
      data.row * tileSize + tileSize / 2,
      interpolation,
    )

    this.dot.setPosition(x, y)
    this.nameText.setPosition(x, y - tileSize * 0.6)

    this.prevRow = data.row
    this.prevCol = data.col
  }

  setVisible(visible: boolean) {
    this.dot.setVisible(visible)
    this.nameText.setVisible(visible)
  }

  ignoreFromCamera(camera: Phaser.Cameras.Scene2D.Camera) {
    camera.ignore(this.dot)
    camera.ignore(this.nameText)
  }

  destroy() {
    this.dot.destroy()
    this.nameText.destroy()
  }
}

export class RemotePlayerRenderer {
  private scene: Phaser.Scene
  private tileSize: number
  private sprites = new Map<string, RemotePlayerSprite>()

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene
    this.tileSize = tileSize
  }

  updatePlayers(players: Map<string, RemotePlayerData>, localPlayerId: string, interpolation: number, camera?: Phaser.Cameras.Scene2D.Camera) {
    // カメラビューポートからカリング範囲を計算（タイル単位で余裕を持たせる）
    const cullMargin = 10 * this.tileSize
    const cam = camera ?? this.scene.cameras.main

    // 新しいプレイヤーを追加、既存を更新
    for (const [id, data] of players) {
      if (id === localPlayerId) continue

      // カメラ外のプレイヤーはスキップ（カリング）
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
        this.sprites.set(id, sprite)
      }
      sprite.update(data, this.tileSize, interpolation)
    }

    // 消えたプレイヤーを削除
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
