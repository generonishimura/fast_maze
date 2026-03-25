import Phaser from 'phaser'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' })
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height

    this.cameras.main.setBackgroundColor('#1a1a2e')

    // 装飾迷路パターンをRenderTextureに焼き込み（1回だけ描画）
    this.drawMazeDecoration(w, h)

    const titleText = this.add.text(w / 2, h / 2 - 80, 'FAST MAZE', {
      fontFamily: "'Courier New', monospace",
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#e94560',
      strokeThickness: 4,
    }).setOrigin(0.5)

    this.tweens.add({
      targets: titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const subText = this.add.text(w / 2, h / 2 + 20, 'Press SPACE to Start', {
      fontFamily: "'Courier New', monospace",
      fontSize: '24px',
      color: '#f5c518',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: subText,
      alpha: 0,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    spaceKey.once('down', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { stageNumber: 1, score: 0 })
      })
    })
  }

  private drawMazeDecoration(w: number, h: number): void {
    const cellSize = 24
    const cols = Math.ceil(w / cellSize)
    const rows = Math.ceil(h / cellSize)

    const pattern = [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ]

    const gfx = this.add.graphics().setVisible(false)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWall = pattern[r % pattern.length][c % pattern[0].length] === 1
        gfx.fillStyle(isWall ? 0x16213e : 0x0f3460)
        gfx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
      }
    }

    const rt = this.add.renderTexture(0, 0, w, h).setOrigin(0).setAlpha(0.15)
    rt.draw(gfx)
    gfx.destroy()
  }
}
