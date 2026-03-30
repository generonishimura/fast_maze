import Phaser from 'phaser'

type BattleResultData = {
  score: number
  rank: number | null
  eliminatedBy?: string
  rankings?: { id: string; rank: number; score: number }[]
}

export class BattleResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleResult' })
  }

  create(data: BattleResultData): void {
    const w = this.scale.width
    const h = this.scale.height

    this.cameras.main.setBackgroundColor('#0a0a1a')
    this.cameras.main.fadeIn(400, 0, 0, 0)

    Promise.all([
      document.fonts.load("bold 48px 'Orbitron'"),
      document.fonts.load("22px 'Orbitron'"),
      document.fonts.load("16px 'Share Tech Mono'"),
    ]).then(() => this.buildUI(w, h, data))
  }

  private buildUI(w: number, h: number, data: BattleResultData): void {
    // ランク表示
    const isWinner = data.rank === 1
    const rankText = data.rank !== null ? `#${data.rank}` : 'ELIMINATED'
    const rankColor = isWinner ? '#ffd700' : '#e94560'

    this.add.text(w / 2, h / 2 - 100, rankText, {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: isWinner ? '64px' : '48px',
      color: rankColor,
      fontStyle: 'bold',
      stroke: isWinner ? '#8b6914' : '#5a0000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    if (isWinner) {
      this.add.text(w / 2, h / 2 - 50, 'WINNER!', {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '28px',
        color: '#ffd700',
      }).setOrigin(0.5)
    }

    // スコア
    this.add.text(w / 2, h / 2, `SCORE  ${data.score}`, {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '22px',
      color: '#00e5ff',
    }).setOrigin(0.5)

    // ランキング（上位5名）
    if (data.rankings && data.rankings.length > 0) {
      const top5 = data.rankings.slice(0, 5)
      let yOffset = h / 2 + 50

      this.add.text(w / 2, yOffset, '── TOP 5 ──', {
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '14px',
        color: '#8a9bb0',
      }).setOrigin(0.5)
      yOffset += 25

      for (const entry of top5) {
        const color = entry.rank === 1 ? '#ffd700' : '#8a9bb0'
        this.add.text(w / 2, yOffset, `#${entry.rank}  ${entry.id.slice(0, 8)}  ${entry.score}pt`, {
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '14px',
          color,
        }).setOrigin(0.5)
        yOffset += 22
      }
    }

    // 操作
    this.add.text(w / 2, h - 60, 'SPACE to play again  |  T to title', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '14px',
      color: '#8a9bb0',
    }).setOrigin(0.5)

    // キー操作
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    spaceKey.on('down', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BattleLobby')
      })
    })

    const tKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T)
    tKey.on('down', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Title')
      })
    })

    this.input.on('pointerup', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BattleLobby')
      })
    })
  }
}
