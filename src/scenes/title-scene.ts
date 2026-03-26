import Phaser from 'phaser'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' })
  }

  preload(): void {
    this.load.audio('bgm', 'High_Gear_Panic_.mp3')
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

    // モード選択メニュー
    const modes: { label: string; mode: 'normal' | 'endless' }[] = [
      { label: 'STAGE MODE', mode: 'normal' },
      { label: 'ENDLESS MODE', mode: 'endless' },
    ]

    const menuStyle = {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '22px',
      color: '#8892a4',
      backgroundColor: 'rgba(10,10,26,0.5)',
      padding: { x: 20, y: 10 },
    }

    let selectedIndex = 0
    const menuTexts = modes.map((item, i) => {
      const text = this.add.text(w / 2, h / 2 + 20 + i * 55, item.label, menuStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })

      text.on('pointerover', () => {
        selectedIndex = i
        updateSelection()
      })
      text.on('pointerup', () => this.startMode(item.mode))

      return text
    })

    const updateSelection = (): void => {
      menuTexts.forEach((text, i) => {
        if (i === selectedIndex) {
          text.setColor('#00e5ff')
          text.setText(`> ${modes[i].label} <`)
        } else {
          text.setColor('#8892a4')
          text.setText(modes[i].label)
        }
      })
    }
    updateSelection()

    // キーボード操作
    const upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    const downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    const wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    const sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    const moveUp = (): void => {
      selectedIndex = (selectedIndex - 1 + modes.length) % modes.length
      updateSelection()
    }
    const moveDown = (): void => {
      selectedIndex = (selectedIndex + 1) % modes.length
      updateSelection()
    }
    const confirm = (): void => {
      this.startMode(modes[selectedIndex].mode)
    }

    upKey.on('down', moveUp)
    wKey.on('down', moveUp)
    downKey.on('down', moveDown)
    sKey.on('down', moveDown)
    spaceKey.on('down', confirm)
    enterKey.on('down', confirm)

    // 操作説明
    this.add.text(w / 2, h - 60, 'W/S or Up/Down to select  |  SPACE to start', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '14px',
      color: '#8a9bb0',
    }).setOrigin(0.5)
  }

  private transitioning = false

  private startMode(mode: 'normal' | 'endless'): void {
    if (this.transitioning) return
    this.transitioning = true

    if (!this.sound.get('bgm')) {
      this.sound.add('bgm', { loop: true, volume: 0.5 }).play()
    }

    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (mode === 'endless') {
        this.scene.start('Endless')
      } else {
        this.scene.start('Game', { stageNumber: 1, score: 0 })
      }
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
        gfx.fillStyle(isWall ? 0x1e2040 : 0x0a0a18)
        gfx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
      }
    }

    const rt = this.add.renderTexture(0, 0, w, h).setOrigin(0).setAlpha(0.4)
    rt.draw(gfx)
    gfx.destroy()
  }
}
