import Phaser from 'phaser'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' })
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height

    this.cameras.main.setBackgroundColor('#0a0a1a')
    this.cameras.main.fadeIn(400, 0, 0, 0)

    this.drawMazeDecoration(w, h)

    // タイトル
    const titleText = this.add.text(w / 2, h / 2 - 80, 'FAST MAZE', {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '64px',
      color: '#00e5ff',
      fontStyle: 'bold',
      stroke: '#004d5a',
      strokeThickness: 3,
    }).setOrigin(0.5)

    this.tweens.add({
      targets: titleText,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // サブタイトル
    const subText = this.add.text(w / 2, h / 2 + 20, 'Tap or Press SPACE', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '22px',
      color: '#e94560',
      backgroundColor: 'rgba(10,10,26,0.5)',
      padding: { x: 12, y: 4 },
    }).setOrigin(0.5)

    this.tweens.add({
      targets: subText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // 操作説明
    this.add.text(w / 2, h - 60, 'WASD / Arrow Keys / Swipe', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '14px',
      color: '#8a9bb0',
    }).setOrigin(0.5)

    const startGame = (): void => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { stageNumber: 1, score: 0 })
      })
    }

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    spaceKey.once('down', startGame)
    enterKey.once('down', startGame)
    this.input.once('pointerup', startGame)
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
        gfx.fillStyle(isWall ? 0x1e2040 : 0x0a0a18)
        gfx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
      }
    }

    const rt = this.add.renderTexture(0, 0, w, h).setOrigin(0).setAlpha(0.4)
    rt.draw(gfx)
    gfx.destroy()
  }
}
