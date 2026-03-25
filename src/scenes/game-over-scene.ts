import Phaser from 'phaser'

export class GameOverScene extends Phaser.Scene {
  private score = 0
  private stage = 1

  constructor() {
    super({ key: 'GameOver' })
  }

  init(data: { score: number; stage: number }): void {
    this.score = data.score
    this.stage = data.stage
  }

  create(): void {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor('#1a1a2e')
    this.cameras.main.fadeIn(400, 0, 0, 0)

    const gameOverText = this.add.text(width / 2, height / 2 - 120, 'GAME OVER', {
      fontFamily: "'Courier New', monospace",
      fontSize: '64px',
      color: '#e94560',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    })
    gameOverText.setOrigin(0.5)

    this.shakeText(gameOverText)

    const stageText = this.add.text(width / 2, height / 2, `STAGE: ${this.stage}`, {
      fontFamily: "'Courier New', monospace",
      fontSize: '28px',
      color: '#ffffff',
    })
    stageText.setOrigin(0.5)
    stageText.setAlpha(0)

    const scoreText = this.add.text(width / 2, height / 2 + 50, `SCORE: ${this.score}`, {
      fontFamily: "'Courier New', monospace",
      fontSize: '28px',
      color: '#f5c518',
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

    const retryText = this.add.text(width / 2, height / 2 + 150, 'Press SPACE to Title', {
      fontFamily: "'Courier New', monospace",
      fontSize: '20px',
      color: '#aaaacc',
    })
    retryText.setOrigin(0.5)
    retryText.setAlpha(0)

    const retrySameText = this.add.text(
      width / 2,
      height / 2 + 190,
      'Press R to Retry Stage',
      {
        fontFamily: "'Courier New', monospace",
        fontSize: '20px',
        color: '#aaaacc',
      },
    )
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
      alpha: 0.4,
      duration: 800,
      delay: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    spaceKey.once('down', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Title')
      })
    })

    const rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    rKey.once('down', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { stageNumber: this.stage, score: 0 })
      })
    })
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
      const offset = shakeCount % 2 === 0 ? 8 : -8
      text.setX(baseX + offset)
      shakeCount++
      this.time.delayedCall(50, doShake)
    }

    this.time.delayedCall(200, doShake)
  }
}
