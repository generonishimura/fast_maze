import Phaser from 'phaser'
import { TILE_SIZE } from '@/config'
import { createEndlessMaze, ensureChunksAround, getWorldCell } from '@/domain/endless-maze'
import { moveForward } from '@/domain/player'
import type { Direction } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import { EndlessMazeRenderer } from '@/infrastructure/endless-maze-renderer'
import { PlayerRenderer } from '@/infrastructure/phaser-player-renderer'
import { RemotePlayerRenderer } from '@/infrastructure/remote-player-renderer'
import { InputHandler } from '@/infrastructure/phaser-input-handler'
import { SwipeHandler } from '@/infrastructure/swipe-handler'
import { BATTLE_TILE_SPEED } from '@/battle/battle-tick'
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
  private waitingText!: Phaser.GameObjects.Text
  private waitingForInput = true

  private localPlayerId!: string
  // クライアント予測用のローカル状態
  private localPosition = { row: 0, col: 0 }
  private localDirection: Direction = 'right'
  private movementProgress = 0
  private localScore = 0
  private crashAnimating = false
  // リモートプレイヤー用
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
    this.waitingForInput = true
    this.movementProgress = 0
    this.crashAnimating = false

    this.maze = createEndlessMaze(data.seed)
    const spawn = data.spawnPositions[this.localPlayerId]
    if (spawn) {
      this.localPosition = { row: spawn.row, col: spawn.col }
    }

    this.maze = ensureChunksAround(this.maze, this.localPosition.row, this.localPosition.col)
  }

  create(): void {
    const screenW = this.scale.width
    const screenH = this.scale.height

    this.hudCamera = this.cameras.add(0, 0, screenW, screenH)
    this.hudCamera.transparent = true

    this.mazeRenderer = new EndlessMazeRenderer(this, TILE_SIZE, this.hudCamera)
    this.mazeRenderer.renderChunksAround(this.maze, this.localPosition.row, this.localPosition.col)

    this.playerRenderer = new PlayerRenderer(this, TILE_SIZE, this.localDirection)
    this.playerRenderer.updatePosition(this.localPosition, this.localPosition, 0, this.localDirection)
    this.playerRenderer.ignoreFromCamera(this.hudCamera)

    this.remotePlayerRenderer = new RemotePlayerRenderer(this, TILE_SIZE, this.hudCamera)

    this.inputHandler = new InputHandler(this)
    this.swipeHandler = new SwipeHandler(this)

    this.cameraTarget = this.add.rectangle(
      this.localPosition.col * TILE_SIZE + TILE_SIZE / 2,
      this.localPosition.row * TILE_SIZE + TILE_SIZE / 2,
      1, 1, 0x000000, 0,
    )
    this.hudCamera.ignore(this.cameraTarget)

    const cam = this.cameras.main
    cam.setZoom(1.5)
    cam.startFollow(this.cameraTarget, true, 0.15, 0.15)

    const hudStyle = {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '16px',
      color: '#8892a4',
      backgroundColor: 'rgba(10,10,26,0.8)',
      padding: { x: 10, y: 5 },
    }

    this.hudModeText = this.add.text(screenW - 10, 10, 'BATTLE', {
      ...hudStyle, color: '#ff4444', fontFamily: "'Orbitron', sans-serif",
    }).setOrigin(1, 0).setDepth(200)

    this.hudScoreText = this.add.text(screenW - 10, 38, 'SCORE 0', {
      ...hudStyle, fontSize: '20px', color: '#00e5ff',
    }).setOrigin(1, 0).setDepth(200)

    this.hudAliveText = this.add.text(10, 10, 'ALIVE 0/0', {
      ...hudStyle, color: '#00ff88',
    }).setOrigin(0, 0).setDepth(200)

    this.waitingText = this.add.text(screenW / 2, screenH - 60, 'Swipe or WASD to Start', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '18px',
      color: '#e94560',
      backgroundColor: 'rgba(10,10,26,0.8)',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(200)

    const hudElements = [this.hudModeText, this.hudScoreText, this.hudAliveText, this.waitingText]
    hudElements.forEach(el => cam.ignore(el))

    this.setupNetworkCallbacks()

    // シーン遷移時の残留キー入力をクリア
    this.getDirection()
  }

  private setupNetworkCallbacks(): void {
    this.network.setCallbacks({
      onStateChange: (state) => {
        // リモートプレイヤー状態更新
        this.serverPlayers.clear()
        if (state.players) {
          const players = state.players as Map<string, ServerPlayerState>
          if (typeof players.forEach === 'function') {
            players.forEach((player: ServerPlayerState, id: string) => {
              this.serverPlayers.set(id, player)
            })
          }
        }

        this.remotePlayerRenderer.onServerUpdate(this.serverPlayers, this.localPlayerId)

        const local = this.serverPlayers.get(this.localPlayerId)
        if (local) {
          this.localScore = local.score

          // サーバーからeliminatedが来たら必ず処理（壁もプレイヤー衝突も）
          if (local.status === 'eliminated' && !this.gameOver && !this.crashAnimating) {
            this.localPosition = { row: local.row, col: local.col }
            this.localDirection = local.direction as Direction
            this.movementProgress = 0
            if (local.eliminatedBy === 'wall') {
              this.playCrashEffect()
            } else {
              this.onLocalEliminated()
            }
          }

          // 安全弁: 大きなdesync時のみハードスナップ
          if (local.status !== 'eliminated' && !this.crashAnimating) {
            const dist = Math.abs(local.row - this.localPosition.row) + Math.abs(local.col - this.localPosition.col)
            if (dist >= 3) {
              this.localPosition = { row: local.row, col: local.col }
              this.localDirection = local.direction as Direction
              this.movementProgress = 0
            }
          }
        }

        this.hudAliveText?.setText(`ALIVE ${state.aliveCount}/${state.totalPlayers}`)
        this.hudScoreText?.setText(`SCORE ${this.localScore}`)
      },

      onElimination: (data) => {
        this.showKillFeed(data.playerId, data.eliminatedBy)
      },

      onGameEnd: () => {
        // 生存中にサーバーが終了した場合のフォールバック
        if (!this.gameOver && !this.crashAnimating) {
          this.transitionToResult()
        }
      },
    })
  }

  // エンドレスモードと同一構造のupdateループ
  update(_time: number, delta: number): void {
    if (this.crashAnimating) {
      this.getDirection() // アニメ中の入力を捨てる
      this.updateRemotePlayers(delta)
      return
    }
    if (this.gameOver) {
      this.getDirection() // 死亡中の入力を捨てる
      this.updateRemotePlayers(delta)
      return
    }

    // 入力待ち（エンドレスモードと同じ: 入力があるまで動かない）
    if (this.waitingForInput) {
      const queuedDirection = this.getDirection()
      if (queuedDirection !== null) {
        this.waitingForInput = false
        this.waitingText.destroy()
        this.localDirection = queuedDirection
        this.network.sendDirection(queuedDirection)
      }
      this.updateRemotePlayers(delta)
      return
    }

    // movementProgress蓄積（エンドレスモードと同じ）
    this.movementProgress += (BATTLE_TILE_SPEED / 1000) * delta

    if (this.movementProgress >= 1.0) {
      const remainder = this.movementProgress - 1.0

      // 1. 前進（endlessTickと同じ順序: まず移動）
      const nextPos = moveForward({ position: this.localPosition, direction: this.localDirection })
      this.maze = ensureChunksAround(this.maze, nextPos.row, nextPos.col)

      if (getWorldCell(this.maze, nextPos.row, nextPos.col) === 'wall') {
        // 壁衝突 → 即死（エンドレスのlives=0と同じ挙動）
        this.playCrashEffect()
        return
      }

      // 移動成功
      this.localPosition = nextPos

      // 2. 方向変更（endlessTickの後に方向チェック、と同じ順序）
      const queuedDirection = this.getDirection()
      if (queuedDirection !== null) {
        this.localDirection = queuedDirection
        this.network.sendDirection(queuedDirection)
      }

      this.movementProgress = remainder

      // チャンク描画更新
      this.mazeRenderer.renderChunksAround(
        this.maze,
        this.localPosition.row,
        this.localPosition.col,
      )

      // HUD更新
      this.hudScoreText.setText(`SCORE ${this.localScore}`)
    }

    // プレイヤーの視覚位置を更新（エンドレスモードと同じ）
    const currentPos = this.localPosition
    const nextPos = moveForward({ position: currentPos, direction: this.localDirection })

    const isWall = getWorldCell(this.maze, nextPos.row, nextPos.col) === 'wall'
    const maxProgress = isWall
      ? Math.min(this.movementProgress, 0.3)
      : this.movementProgress

    this.playerRenderer.updatePosition(currentPos, nextPos, maxProgress, this.localDirection)

    // カメラ追従ターゲットを視覚位置に移動（エンドレスモードと同じ）
    const visualCol = currentPos.col + (nextPos.col - currentPos.col) * maxProgress
    const visualRow = currentPos.row + (nextPos.row - currentPos.row) * maxProgress
    this.cameraTarget.setPosition(
      visualCol * TILE_SIZE + TILE_SIZE / 2,
      visualRow * TILE_SIZE + TILE_SIZE / 2,
    )

    // リモートプレイヤー描画
    this.updateRemotePlayers(delta)
  }

  private getDirection(): Direction | null {
    return this.inputHandler.getQueuedDirection() ?? this.swipeHandler.getQueuedDirection()
  }

  private updateRemotePlayers(delta: number): void {
    this.interpolation = Math.min(this.interpolation + delta / 250, 1.0)
    this.remotePlayerRenderer.updatePlayers(this.serverPlayers, this.localPlayerId, this.interpolation, this.localScore, this.cameras.main)
  }

  /** 壁衝突クラッシュ演出（エンドレスモードのplayCrashEffectと同じ） */
  private playCrashEffect(): void {
    this.crashAnimating = true
    this.movementProgress = 0

    const pos = this.localPosition
    const wallPos = moveForward({ position: pos, direction: this.localDirection })
    this.playerRenderer.updatePosition(pos, wallPos, 0.3, this.localDirection)

    this.cameras.main.shake(300, 0.015)

    const cx = (pos.col * 0.7 + wallPos.col * 0.3) * TILE_SIZE + TILE_SIZE / 2
    const cy = (pos.row * 0.7 + wallPos.row * 0.3) * TILE_SIZE + TILE_SIZE / 2
    this.spawnCrashParticles(cx, cy)

    // 壁死 → フェードアウト → 結果画面
    this.time.delayedCall(600, () => {
      this.transitionToResult()
    })
  }

  private spawnCrashParticles(cx: number, cy: number): void {
    const count = 6
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const size = Phaser.Math.Between(2, 4)
      const particle = this.add.rectangle(cx, cy, size, size, 0xe94560, 0.7).setDepth(150)

      this.tweens.add({
        targets: particle,
        x: cx + Math.cos(angle) * Phaser.Math.Between(8, 18),
        y: cy + Math.sin(angle) * Phaser.Math.Between(8, 18),
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      })
    }
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

  /** 他プレイヤーに倒された（サーバーからの通知） */
  private onLocalEliminated(): void {
    if (this.gameOver) return
    this.crashAnimating = true

    this.cameras.main.shake(400, 0.02)

    const cx = this.localPosition.col * TILE_SIZE + TILE_SIZE / 2
    const cy = this.localPosition.row * TILE_SIZE + TILE_SIZE / 2
    this.spawnCrashParticles(cx, cy)

    this.time.delayedCall(600, () => {
      this.transitionToResult()
    })
  }

  /** クラッシュ演出後 → フェードアウト → 結果画面 */
  private transitionToResult(): void {
    this.crashAnimating = false
    this.gameOver = true

    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cleanup()
      this.scene.start('GameOver', {
        score: this.localScore,
        stage: 0,
        mode: 'battle',
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
    if (this.waitingText?.active) this.waitingText.destroy()
    for (const t of this.killFeedTexts) t.destroy()
    this.killFeedTexts = []
    this.cameras.remove(this.hudCamera)
    this.network.leave()
  }
}
