import Phaser from 'phaser'

export class StageClearScene extends Phaser.Scene {
  private score = 0
  private stage = 1

  constructor() {
    super({ key: 'StageClear' })
  }

  init(data: { score: number; stage: number }): void {
    this.score = data.score
    this.stage = data.stage
  }

  create(): void {
    const { width, height } = this.scale
    const bonusScore = this.stage * 1000
    const finalScore = this.score + bonusScore

    this.cameras.main.setBackgroundColor('#0a0a1a')
    this.cameras.main.fadeIn(400, 0, 0, 0)

    this.spawnParticles(width, height)

    const clearText = this.add.text(width / 2, height / 2 - 130, 'STAGE CLEAR!', {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '48px',
      color: '#00e5ff',
      fontStyle: 'bold',
      stroke: '#004d5a',
      strokeThickness: 3,
    })
    clearText.setOrigin(0.5)
    clearText.setScale(0)

    this.tweens.add({
      targets: clearText,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    })

    const stageText = this.add.text(width / 2, height / 2 - 30, `STAGE ${this.stage}`, {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '28px',
      color: '#8892a4',
    })
    stageText.setOrigin(0.5)
    stageText.setAlpha(0)

    this.tweens.add({
      targets: stageText,
      alpha: 1,
      duration: 400,
      delay: 400,
    })

    const bonusLabel = this.add.text(width / 2, height / 2 + 20, `BONUS +${bonusScore}`, {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '22px',
      color: '#e94560',
    })
    bonusLabel.setOrigin(0.5)
    bonusLabel.setAlpha(0)

    this.tweens.add({
      targets: bonusLabel,
      alpha: 1,
      duration: 400,
      delay: 600,
    })

    const scoreText = this.add.text(width / 2, height / 2 + 65, `SCORE ${this.score}`, {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '28px',
      color: '#00e5ff',
    })
    scoreText.setOrigin(0.5)
    scoreText.setAlpha(0)

    this.tweens.add({
      targets: scoreText,
      alpha: 1,
      duration: 400,
      delay: 800,
      onComplete: () => {
        this.animateScore(scoreText, this.score, finalScore, 1000)
      },
    })

    const nextText = this.add.text(width / 2, height / 2 + 170, 'Tap or SPACE: Next Stage', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '18px',
      color: '#c0ccda',
      backgroundColor: 'rgba(10,10,26,0.6)',
      padding: { x: 12, y: 4 },
    })
    nextText.setOrigin(0.5)
    nextText.setAlpha(0)

    this.tweens.add({
      targets: nextText,
      alpha: 1,
      duration: 400,
      delay: 2200,
    })

    this.tweens.add({
      targets: nextText,
      alpha: 0.6,
      duration: 900,
      delay: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const goNextStage = (): void => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { stageNumber: this.stage + 1, score: finalScore })
      })
    }

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    spaceKey.once('down', goNextStage)
    enterKey.once('down', goNextStage)
    this.input.once('pointerup', goNextStage)
  }

  private animateScore(
    textObj: Phaser.GameObjects.Text,
    from: number,
    to: number,
    duration: number,
  ): void {
    const startTime = this.time.now
    const diff = to - from

    const update = (): void => {
      const elapsed = this.time.now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + diff * eased)
      textObj.setText(`SCORE ${current}`)

      if (progress < 1) {
        this.time.delayedCall(16, update)
      } else {
        textObj.setColor('#e94560')
        textObj.setFontStyle('bold')
      }
    }

    this.time.delayedCall(16, update)
  }

  private spawnParticles(width: number, height: number): void {
    const colors = [0x00e5ff, 0xe94560, 0x4fc3f7, 0xa5d6a7, 0xce93d8]
    const count = 25

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, width)
      const startY = Phaser.Math.Between(-40, -10)
      const size = Phaser.Math.Between(4, 10)
      const color = colors[i % colors.length]

      const rect = this.add.rectangle(x, startY, size, size, color)
      rect.setAlpha(0.7)

      const targetY = Phaser.Math.Between(height + 20, height + 80)
      const duration = Phaser.Math.Between(2000, 4000)
      const delay = Phaser.Math.Between(0, 1500)

      this.tweens.add({
        targets: rect,
        y: targetY,
        x: x + Phaser.Math.Between(-60, 60),
        angle: Phaser.Math.Between(180, 540),
        alpha: 0,
        duration,
        delay,
        ease: 'Sine.easeIn',
        repeat: -1,
        onRepeat: () => {
          rect.setX(Phaser.Math.Between(0, width))
          rect.setY(Phaser.Math.Between(-40, -10))
          rect.setAlpha(0.7)
        },
      })
    }
  }
}
