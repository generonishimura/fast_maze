import Phaser from 'phaser'
import { TILE_SIZE } from '@/config'
import { createEndlessMaze, ensureChunksAround } from '@/domain/endless-maze'
import type { Direction } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import { EndlessMazeRenderer } from '@/infrastructure/endless-maze-renderer'
import { PlayerRenderer } from '@/infrastructure/phaser-player-renderer'
import { RemotePlayerRenderer } from '@/infrastructure/remote-player-renderer'
import { InputHandler } from '@/infrastructure/phaser-input-handler'
import { SwipeHandler } from '@/infrastructure/swipe-handler'
import type { NetworkClient } from '@/infrastructure/network-client'

type BattleGameData = {
  network: NetworkClient
  seed: number
  spawnPositions: Record<string, { row: number; col: number }>
}

type ServerPlayerState = {
  id: string
  row: number
  col: number
  direction: string
  score: number
  status: string
  eliminatedBy: string
  rank: number
}

export class BattleGameScene extends Phaser.Scene {
  private network!: NetworkClient
  private maze!: EndlessMazeState
  private playerRenderer!: PlayerRenderer
  private remotePlayerRenderer!: RemotePlayerRenderer
  private mazeRenderer!: EndlessMazeRenderer
  private inputHandler!: InputHandler
  private swipeHandler!: SwipeHandler
  private hudCamera!: Phaser.Cameras.Scene2D.Camera
  private cameraTarget!: Phaser.GameObjects.Rectangle
  private hudScoreText!: Phaser.GameObjects.Text
  private hudAliveText!: Phaser.GameObjects.Text
  private hudModeText!: Phaser.GameObjects.Text
  private killFeedTexts: Phaser.GameObjects.Text[] = []

  private localPlayerId!: string
  private localPosition = { row: 0, col: 0 }
  private localDirection: Direction = 'right'
  private localScore = 0
  private localStatus = 'invincible'
  private interpolation = 0
  private serverPlayers = new Map<string, ServerPlayerState>()
  private gameOver = false

  constructor() {
    super({ key: 'BattleGame' })
  }

  init(data: BattleGameData): void {
    this.network = data.network
    this.localPlayerId = this.network.sessionId!
    this.gameOver = false

    // ローカルで迷路を生成（サーバーと同じシード）
    this.maze = createEndlessMaze(data.seed)
    const spawn = data.spawnPositions[this.localPlayerId]
    if (spawn) {
      this.localPosition = { row: spawn.row, col: spawn.col }
    }

    // スポーン位置周辺のチャンクを事前生成
    this.maze = ensureChunksAround(this.maze, this.localPosition.row, this.localPosition.col)
  }

  create(): void {
    const screenW = this.scale.width
    const screenH = this.scale.height

    // HUD専用カメラ
    this.hudCamera = this.cameras.add(0, 0, screenW, screenH)
    this.hudCamera.transparent = true

    // 迷路レンダラー
    this.mazeRenderer = new EndlessMazeRenderer(this, TILE_SIZE, this.hudCamera)
    this.mazeRenderer.renderChunksAround(this.maze, this.localPosition.row, this.localPosition.col)

    // プレイヤーレンダラー
    this.playerRenderer = new PlayerRenderer(this, TILE_SIZE, this.localDirection)
    this.playerRenderer.updatePosition(this.localPosition, this.localPosition, 0, this.localDirection)
    this.playerRenderer.ignoreFromCamera(this.hudCamera)

    // リモートプレイヤーレンダラー
    this.remotePlayerRenderer = new RemotePlayerRenderer(this, TILE_SIZE)

    // 入力ハンドラー
    this.inputHandler = new InputHandler(this)
    this.swipeHandler = new SwipeHandler(this)

    // カメラ追従
    this.cameraTarget = this.add.rectangle(
      this.localPosition.col * TILE_SIZE + TILE_SIZE / 2,
      this.localPosition.row * TILE_SIZE + TILE_SIZE / 2,
      1, 1, 0x000000, 0,
    )
    this.hudCamera.ignore(this.cameraTarget)

    const cam = this.cameras.main
    cam.setZoom(1.5) // バトルは少し引いて表示
    cam.startFollow(this.cameraTarget, true, 0.15, 0.15)

    // HUD
    const hudStyle = {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '16px',
      color: '#8892a4',
      backgroundColor: 'rgba(10,10,26,0.8)',
      padding: { x: 10, y: 5 },
    }

    this.hudModeText = this.add.text(screenW - 10, 10, 'BATTLE', {
      ...hudStyle,
      color: '#ff4444',
      fontFamily: "'Orbitron', sans-serif",
    }).setOrigin(1, 0).setDepth(200)

    this.hudScoreText = this.add.text(screenW - 10, 38, 'SCORE 0', {
      ...hudStyle,
      fontSize: '20px',
      color: '#00e5ff',
    }).setOrigin(1, 0).setDepth(200)

    this.hudAliveText = this.add.text(10, 10, 'ALIVE 0/0', {
      ...hudStyle,
      color: '#00ff88',
    }).setOrigin(0, 0).setDepth(200)

    const hudElements = [this.hudModeText, this.hudScoreText, this.hudAliveText]
    hudElements.forEach(el => cam.ignore(el))

    // ネットワークコールバック設定
    this.setupNetworkCallbacks()
  }

  private setupNetworkCallbacks(): void {
    this.network.setCallbacks({
      onStateChange: (state) => {
        if (this.gameOver) return

        // 補間リセット（新しいサーバー状態が来たので）
        this.interpolation = 0

        // プレイヤー状態を更新（MapSchemaはforEachでイテレート）
        this.serverPlayers.clear()
        if (state.players) {
          const players = state.players as Map<string, ServerPlayerState>
          if (typeof players.forEach === 'function') {
            players.forEach((player: ServerPlayerState, id: string) => {
              this.serverPlayers.set(id, player)
            })
          }
        }

        // ローカルプレイヤーの状態をサーバーから同期
        const local = this.serverPlayers.get(this.localPlayerId)
        if (local) {
          this.localPosition = { row: local.row, col: local.col }
          this.localDirection = local.direction as Direction
          this.localScore = local.score
          this.localStatus = local.status

          if (local.status === 'eliminated') {
            this.onLocalEliminated(local.eliminatedBy)
          }
        }

        // HUD更新
        this.hudAliveText?.setText(`ALIVE ${state.aliveCount}/${state.totalPlayers}`)
        this.hudScoreText?.setText(`SCORE ${this.localScore}`)
      },

      onElimination: (data) => {
        this.showKillFeed(data.playerId, data.eliminatedBy)
      },

      onGameEnd: (data) => {
        this.onGameEnd(data.rankings)
      },
    })
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return

    // 方向入力をサーバーに送信
    const queuedDirection = this.inputHandler.getQueuedDirection() ?? this.swipeHandler.getQueuedDirection()
    if (queuedDirection !== null && this.localStatus !== 'eliminated') {
      this.network.sendDirection(queuedDirection)
    }

    // 補間（サーバーtickは20Hz、クライアントは60fps）
    this.interpolation = Math.min(this.interpolation + delta / 50, 1.0)

    // 迷路チャンク更新
    this.maze = ensureChunksAround(this.maze, this.localPosition.row, this.localPosition.col)
    this.mazeRenderer.renderChunksAround(this.maze, this.localPosition.row, this.localPosition.col)

    // ローカルプレイヤー描画
    this.playerRenderer.updatePosition(
      this.localPosition,
      this.localPosition,
      0,
      this.localDirection,
    )

    // カメラ追従
    this.cameraTarget.setPosition(
      this.localPosition.col * TILE_SIZE + TILE_SIZE / 2,
      this.localPosition.row * TILE_SIZE + TILE_SIZE / 2,
    )

    // リモートプレイヤー描画
    this.remotePlayerRenderer.updatePlayers(this.serverPlayers, this.localPlayerId, this.interpolation, this.cameras.main)
  }

  private showKillFeed(playerId: string, eliminatedBy: string): void {
    const screenW = this.scale.width
    const y = 40 + this.killFeedTexts.length * 20

    const message = eliminatedBy === 'wall'
      ? `${playerId.slice(0, 6)} crashed into wall`
      : `${eliminatedBy.slice(0, 6)} eliminated ${playerId.slice(0, 6)}`

    const text = this.add.text(screenW - 10, y, message, {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '12px',
      color: '#e94560',
      backgroundColor: 'rgba(10,10,26,0.6)',
      padding: { x: 6, y: 2 },
    }).setOrigin(1, 0).setDepth(200)

    this.cameras.main.ignore(text)
    this.killFeedTexts.push(text)

    // 5秒後にフェードアウト
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 4000,
      duration: 1000,
      onComplete: () => {
        text.destroy()
        this.killFeedTexts = this.killFeedTexts.filter(t => t !== text)
      },
    })
  }

  private onLocalEliminated(eliminatedBy: string): void {
    if (this.gameOver) return
    this.gameOver = true

    this.cameras.main.shake(400, 0.02)

    // 赤いパーティクル
    const cx = this.localPosition.col * TILE_SIZE + TILE_SIZE / 2
    const cy = this.localPosition.row * TILE_SIZE + TILE_SIZE / 2
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6
      const particle = this.add.rectangle(cx, cy, 3, 3, 0xe94560, 0.7).setDepth(150)
      this.tweens.add({
        targets: particle,
        x: cx + Math.cos(angle) * 15,
        y: cy + Math.sin(angle) * 15,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      })
    }

    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.cleanup()
        this.scene.start('BattleResult', {
          score: this.localScore,
          eliminatedBy,
          rank: null, // サーバーから送られるはず
        })
      })
    })
  }

  private onGameEnd(rankings: { id: string; rank: number; score: number }[]): void {
    if (this.gameOver) return
    this.gameOver = true

    const myRank = rankings.find(r => r.id === this.localPlayerId)

    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.cleanup()
        this.scene.start('BattleResult', {
          score: this.localScore,
          rank: myRank?.rank ?? null,
          rankings,
        })
      })
    })
  }

  private cleanup(): void {
    this.mazeRenderer.destroy()
    this.playerRenderer.destroy()
    this.remotePlayerRenderer.destroy()
    this.inputHandler.destroy()
    this.swipeHandler.destroy()
    this.cameraTarget.destroy()
    this.hudScoreText.destroy()
    this.hudAliveText.destroy()
    this.hudModeText.destroy()
    for (const t of this.killFeedTexts) t.destroy()
    this.killFeedTexts = []
    this.cameras.remove(this.hudCamera)
    this.network.leave()
  }
}
