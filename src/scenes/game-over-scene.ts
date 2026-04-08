import Phaser from 'phaser'

export class GameOverScene extends Phaser.Scene {
  private score = 0
  private stage = 1
  private mode: 'normal' | 'endless' | 'battle' = 'normal'

  constructor() {
    super({ key: 'GameOver' })
  }

  init(data: { score: number; stage: number; mode?: 'normal' | 'endless' | 'battle' }): void {
    this.score = data.score
    this.stage = data.stage
    this.mode = data.mode ?? 'normal'
  }

  create(): void {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor('#0a0a1a')
    this.cameras.main.fadeIn(400, 0, 0, 0)

    const gameOverText = this.add.text(width / 2, height / 2 - 120, 'GAME OVER', {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '56px',
      color: '#e94560',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    })
    gameOverText.setOrigin(0.5)

    this.shakeText(gameOverText)

    const stageLabel = this.mode === 'battle' ? 'BATTLE' : this.mode === 'endless' ? 'ENDLESS' : `STAGE ${this.stage}`
    const stageText = this.add.text(width / 2, height / 2, stageLabel, {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '28px',
      color: '#8892a4',
    })
    stageText.setOrigin(0.5)
    stageText.setAlpha(0)

    const scoreText = this.add.text(width / 2, height / 2 + 50, `SCORE ${this.score}`, {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '28px',
      color: '#00e5ff',
    })
    scoreText.setOrigin(0.5)
    scoreText.setAlpha(0)

    this.tweens.add({
      targets: [stageText, scoreText],
      alpha: 1,
      duration: 500,
      delay: 600,
      ease: 'Power2',
    })

    const hintStyle = {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '18px',
      color: '#c0ccda',
      backgroundColor: 'rgba(10,10,26,0.6)',
      padding: { x: 12, y: 4 },
    }

    const retryLabel = this.mode === 'endless'
      ? 'Tap or SPACE: Retry'
      : 'Tap or SPACE: Title'
    const retryText = this.add.text(width / 2, height / 2 + 150, retryLabel, hintStyle)
    retryText.setOrigin(0.5)
    retryText.setAlpha(0)

    const retrySameLabel = this.mode === 'endless'
      ? 'T: Back to Title'
      : this.mode === 'battle'
        ? 'R: Battle Again'
        : 'R: Retry Stage'
    const retrySameText = this.add.text(width / 2, height / 2 + 185, retrySameLabel, hintStyle)
    retrySameText.setOrigin(0.5)
    retrySameText.setAlpha(0)

    this.tweens.add({
      targets: [retryText, retrySameText],
      alpha: 1,
      duration: 400,
      delay: 1000,
    })

    this.tweens.add({
      targets: [retryText, retrySameText],
      alpha: 0.6,
      duration: 900,
      delay: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const goToTitle = (): void => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Title')
      })
    }

    const retryStage = (): void => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (this.mode === 'battle') {
          this.scene.start('BattleLobby')
        } else if (this.mode === 'endless') {
          this.scene.start('Endless')
        } else {
          this.scene.start('Game', { stageNumber: this.stage, score: 0 })
        }
      })
    }

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    if (this.mode === 'endless') {
      // エンドレス: SPACE/タップでリトライ、Tでタイトル
      spaceKey.once('down', retryStage)
      enterKey.once('down', retryStage)
      this.input.once('pointerup', retryStage)
      const tKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T)
      tKey.once('down', goToTitle)
    } else {
      // 通常 & バトル: SPACE/タップでタイトル、Rでリトライ
      spaceKey.once('down', goToTitle)
      enterKey.once('down', goToTitle)
      this.input.once('pointerup', goToTitle)
      const rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
      rKey.once('down', retryStage)
    }
  }

  private shakeText(text: Phaser.GameObjects.Text): void {
    const baseX = text.x
    let shakeCount = 0
    const maxShakes = 16

    const doShake = (): void => {
      if (shakeCount >= maxShakes) {
        text.setX(baseX)
        return
      }
      const offset = shakeCount % 2 === 0 ? 6 : -6
      text.setX(baseX + offset)
      shakeCount++
      this.time.delayedCall(50, doShake)
    }

    this.time.delayedCall(200, doShake)
  }
}
