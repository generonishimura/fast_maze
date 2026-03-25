import Phaser from 'phaser'
import { TILE_SIZE } from '@/config'
import { initStage, tick, handleDirectionChange } from '@/application/game-flow'
import { moveForward } from '@/domain/player'
import type { GameState } from '@/domain/types'
import { MazeRenderer } from '@/infrastructure/phaser-maze-renderer'
import { PlayerRenderer } from '@/infrastructure/phaser-player-renderer'
import { InputHandler } from '@/infrastructure/phaser-input-handler'

export class GameScene extends Phaser.Scene {
  private gameState!: GameState
  private mazeRenderer!: MazeRenderer
  private playerRenderer!: PlayerRenderer
  private inputHandler!: InputHandler
  private movementProgress = 0
  private waitingForInput = true
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
      fontFamily: "'Courier New', monospace",
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 8, y: 4 },
    }
    this.hudStageText = this.add.text(10, 10, `STAGE ${this.gameState.stage.stageNumber}`, hudStyle)
      .setScrollFactor(0)
      .setDepth(100)
    this.hudScoreText = this.add.text(10, 36, `SCORE ${this.gameState.score}`, hudStyle)
      .setScrollFactor(0)
      .setDepth(100)

    // 待機メッセージ（画面中央下部に表示）
    this.waitingText = this.add.text(screenW / 2, screenH - 60, 'WASD で開始', {
      fontFamily: "'Courier New', monospace",
      fontSize: '20px',
      color: '#f5c518',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 16, y: 8 },
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
  }

  update(_time: number, delta: number): void {
    if (this.gameState.status !== 'playing') return

    // 最初のWASD入力を待つ
    if (this.waitingForInput) {
      const queuedDirection = this.inputHandler.getQueuedDirection()
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

      const queuedDirection = this.inputHandler.getQueuedDirection()
      if (queuedDirection !== null) {
        this.gameState = handleDirectionChange(this.gameState, queuedDirection)
      }

      this.movementProgress = remainder

      if (this.gameState.status === 'game-over') {
        this.cleanup()
        this.scene.start('GameOver', {
          score: this.gameState.score,
          stage: this.gameState.stage.stageNumber,
        })
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
    this.playerRenderer.updatePosition(currentPos, nextPos, this.movementProgress, this.gameState.player.direction)
  }

  private cleanup(): void {
    this.mazeRenderer.destroy()
    this.playerRenderer.destroy()
    this.inputHandler.destroy()
    if (this.waitingText?.active) this.waitingText.destroy()
    this.hudStageText.destroy()
    this.hudScoreText.destroy()
  }
}
