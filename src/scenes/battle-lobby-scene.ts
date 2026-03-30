import Phaser from 'phaser'
import { NetworkClient } from '@/infrastructure/network-client'

export class BattleLobbyScene extends Phaser.Scene {
  private network!: NetworkClient
  private playerCountText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private readyButton!: Phaser.GameObjects.Text
  private isReady = false

  constructor() {
    super({ key: 'BattleLobby' })
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height

    this.cameras.main.setBackgroundColor('#0a0a1a')
    this.cameras.main.fadeIn(400, 0, 0, 0)

    this.isReady = false
    this.network = new NetworkClient()

    // UI構築（フォント読み込み待ち）
    Promise.all([
      document.fonts.load("bold 48px 'Orbitron'"),
      document.fonts.load("22px 'Orbitron'"),
      document.fonts.load("16px 'Share Tech Mono'"),
    ]).then(() => this.buildUI(w, h))

    this.connectToServer()
  }

  private buildUI(w: number, h: number): void {
    // タイトル
    this.add.text(w / 2, h / 2 - 120, 'BATTLE ROYALE', {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '48px',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#5a0000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    // プレイヤー数
    this.playerCountText = this.add.text(w / 2, h / 2 - 30, 'Connecting...', {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '22px',
      color: '#00e5ff',
    }).setOrigin(0.5)

    // ステータス
    this.statusText = this.add.text(w / 2, h / 2 + 20, '', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '16px',
      color: '#8a9bb0',
    }).setOrigin(0.5)

    // READY ボタン
    this.readyButton = this.add.text(w / 2, h / 2 + 80, '[ READY ]', {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '22px',
      color: '#8892a4',
      backgroundColor: 'rgba(10,10,26,0.5)',
      padding: { x: 30, y: 12 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.toggleReady())

    // キーボードでもREADY
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    spaceKey.on('down', () => this.toggleReady())

    // 戻るキー
    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    escKey.on('down', () => this.backToTitle())

    // 操作説明
    this.add.text(w / 2, h - 40, 'SPACE to ready  |  ESC to back', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '14px',
      color: '#8a9bb0',
    }).setOrigin(0.5)
  }

  private async connectToServer(): Promise<void> {
    this.network.setCallbacks({
      onPlayerJoined: (data) => {
        this.playerCountText?.setText(`PLAYERS: ${data.totalPlayers}/64`)
      },
      onCountdown: (data) => {
        this.statusText?.setText(`STARTING IN ${data.seconds}...`)
      },
      onGameStart: (data) => {
        this.cameras.main.fadeOut(300, 0, 0, 0)
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('BattleGame', {
            network: this.network,
            seed: data.seed,
            spawnPositions: data.spawnPositions,
          })
        })
      },
      onError: (code, message) => {
        this.statusText?.setText(`Error: ${message ?? code}`)
      },
      onLeave: () => {
        this.statusText?.setText('Disconnected')
      },
    })

    try {
      await this.network.joinBattle()
      this.playerCountText?.setText('PLAYERS: 1/64')
      this.statusText?.setText('Waiting for players...')
    } catch {
      this.playerCountText?.setText('OFFLINE')
      this.statusText?.setText('Could not connect to server')
    }
  }

  private toggleReady(): void {
    if (!this.network.connected) return

    this.isReady = !this.isReady
    if (this.isReady) {
      this.network.sendReady()
      this.readyButton?.setColor('#00ff88')
      this.readyButton?.setText('[ READY! ]')
      this.statusText?.setText('Waiting for others...')
    }
  }

  private backToTitle(): void {
    this.network.leave()
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Title')
    })
  }
}
