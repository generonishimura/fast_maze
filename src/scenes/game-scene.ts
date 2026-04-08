import Phaser from 'phaser'
import { TILE_SIZE } from '@/config'
import { initStage, tick, handleDirectionChange } from '@/application/game-flow'
import { moveForward } from '@/domain/player'
import { isWall } from '@/domain/collision'
import type { Direction, GameState } from '@/domain/types'
import { MazeRenderer } from '@/infrastructure/phaser-maze-renderer'
import { PlayerRenderer } from '@/infrastructure/phaser-player-renderer'
import { InputHandler } from '@/infrastructure/phaser-input-handler'
import { SwipeHandler } from '@/infrastructure/swipe-handler'

export class GameScene extends Phaser.Scene {
  private gameState!: GameState
  private mazeRenderer!: MazeRenderer
  private playerRenderer!: PlayerRenderer
  private inputHandler!: InputHandler
  private swipeHandler!: SwipeHandler
  private movementProgress = 0
  private waitingForInput = true
  private crashAnimating = false
  private waitingText!: Phaser.GameObjects.Text
  private hudStageText!: Phaser.GameObjects.Text
  private hudScoreText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'Game' })
  }

  init(data: { stageNumber?: number; score?: number }): void {
    const stageNumber = data.stageNumber ?? 1
    const score = data.score ?? 0
    const seed = Date.now()

    const result = initStage(stageNumber, seed, score)
    if (!result.ok) {
      throw new Error(`Failed to initialize stage: ${result.error}`)
    }

    this.gameState = result.value
    this.movementProgress = 0
    this.waitingForInput = true
    this.crashAnimating = false
  }

  create(): void {
    const { maze, goal } = this.gameState

    const mazePixelW = maze.width * TILE_SIZE
    const mazePixelH = maze.height * TILE_SIZE

    this.mazeRenderer = new MazeRenderer(this, maze, TILE_SIZE)
    this.mazeRenderer.render()
    this.mazeRenderer.renderGoal(goal)

    this.playerRenderer = new PlayerRenderer(this, TILE_SIZE, this.gameState.player.direction)
    this.inputHandler = new InputHandler(this)
    this.swipeHandler = new SwipeHandler(this)

    const playerPos = this.gameState.player.position
    this.playerRenderer.updatePosition(playerPos, moveForward(this.gameState.player), 0, this.gameState.player.direction)

    // カメラ設定: 迷路全体が画面に収まるようにズーム
    const cam = this.cameras.main
    const screenW = this.scale.width
    const screenH = this.scale.height
    const zoom = Math.min(screenW / mazePixelW, screenH / mazePixelH) * 0.9
    cam.setZoom(zoom)

    // カメラを迷路の中心に固定（プレイヤー追従ではなく迷路全体を見せる）
    cam.centerOn(mazePixelW / 2, mazePixelH / 2)

    // HUD（カメラに固定）
    const hudStyle = {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '14px',
      color: '#8892a4',
      backgroundColor: 'rgba(10,10,26,0.7)',
      padding: { x: 10, y: 5 },
    }
    this.hudStageText = this.add.text(10, 10, `STAGE ${this.gameState.stage.stageNumber}`, hudStyle)
      .setScrollFactor(0)
      .setDepth(100)
    this.hudScoreText = this.add.text(10, 38, `SCORE ${this.gameState.score}`, {
      ...hudStyle,
      color: '#00e5ff',
    })
      .setScrollFactor(0)
      .setDepth(100)

    // 待機メッセージ（画面中央下部に表示）
    this.waitingText = this.add.text(screenW / 2, screenH - 60, 'Swipe or WASD to Start', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '18px',
      color: '#e94560',
      backgroundColor: 'rgba(10,10,26,0.8)',
      padding: { x: 16, y: 8 },
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
  }

  update(_time: number, delta: number): void {
    if (this.crashAnimating) return
    if (this.gameState.status !== 'playing') return

    // 最初のWASD入力を待つ
    if (this.waitingForInput) {
      const queuedDirection = this.getDirection()
      if (queuedDirection !== null) {
        this.gameState = handleDirectionChange(this.gameState, queuedDirection)
        this.waitingForInput = false
        this.waitingText.destroy()
      }
      return
    }

    const { stage } = this.gameState
    this.movementProgress += (stage.tileSpeed / 1000) * delta

    if (this.movementProgress >= 1.0) {
      const remainder = this.movementProgress - 1.0

      this.gameState = tick(this.gameState)

      const queuedDirection = this.getDirection()
      if (queuedDirection !== null) {
        this.gameState = handleDirectionChange(this.gameState, queuedDirection)
      }

      this.movementProgress = remainder

      if (this.gameState.status === 'game-over') {
        this.playCrashEffect()
        return
      }

      if (this.gameState.status === 'stage-clear') {
        this.cleanup()
        this.scene.start('StageClear', {
          score: this.gameState.score,
          stage: this.gameState.stage.stageNumber,
        })
        return
      }
    }

    // プレイヤーの視覚位置を更新
    const currentPos = this.gameState.player.position
    const nextPos = moveForward(this.gameState.player)

    // 次の位置が壁なら手前で止める（壁に突っ込まない）
    const maxProgress = isWall(this.gameState.maze, nextPos)
      ? Math.min(this.movementProgress, 0.3)
      : this.movementProgress

    this.playerRenderer.updatePosition(currentPos, nextPos, maxProgress, this.gameState.player.direction)
  }

  private playCrashEffect(): void {
    this.crashAnimating = true

    // プレイヤーを壁の手前で止める
    const pos = this.gameState.player.position
    const wallPos = moveForward(this.gameState.player)
    this.playerRenderer.updatePosition(pos, wallPos, 0.3, this.gameState.player.direction)

    // 穏やかな画面シェイク
    this.cameras.main.shake(300, 0.015)

    // 衝突パーティクル（壁との境界付近）
    const cx = (pos.col * 0.7 + wallPos.col * 0.3) * TILE_SIZE + TILE_SIZE / 2
    const cy = (pos.row * 0.7 + wallPos.row * 0.3) * TILE_SIZE + TILE_SIZE / 2
    this.spawnCrashParticles(cx, cy)

    // ゆっくり暗転してからGameOverへ
    this.time.delayedCall(600, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.cleanup()
        this.scene.start('GameOver', {
          score: this.gameState.score,
          stage: this.gameState.stage.stageNumber,
        })
      })
    })
  }

  private spawnCrashParticles(cx: number, cy: number): void {
    const count = 6
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const size = Phaser.Math.Between(2, 4)
      const particle = this.add.rectangle(cx, cy, size, size, 0xe94560, 0.7)
        .setDepth(150)

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

  private getDirection(): Direction | null {
    return this.inputHandler.getQueuedDirection() ?? this.swipeHandler.getQueuedDirection()
  }

  private cleanup(): void {
    this.mazeRenderer.destroy()
    this.playerRenderer.destroy()
    this.inputHandler.destroy()
    this.swipeHandler.destroy()
    if (this.waitingText?.active) this.waitingText.destroy()
    this.hudStageText.destroy()
    this.hudScoreText.destroy()
  }
}
