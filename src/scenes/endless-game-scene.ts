import Phaser from 'phaser'
import { TILE_SIZE } from '@/config'
import { initEndless, endlessTick, handleEndlessDirectionChange, resumeFromStun } from '@/application/endless-game-flow'
import { moveForward } from '@/domain/player'
import { getWorldCell } from '@/domain/endless-maze'
import type { Direction } from '@/domain/types'
import type { EndlessGameState } from '@/domain/endless-types'
import { EndlessMazeRenderer } from '@/infrastructure/endless-maze-renderer'
import { PlayerRenderer } from '@/infrastructure/phaser-player-renderer'
import { FruitRenderer } from '@/infrastructure/fruit-renderer'
import { InsectorRenderer } from '@/infrastructure/insector-renderer'
import { InputHandler } from '@/infrastructure/phaser-input-handler'
import { SwipeHandler } from '@/infrastructure/swipe-handler'

export class EndlessGameScene extends Phaser.Scene {
  private gameState!: EndlessGameState
  private mazeRenderer!: EndlessMazeRenderer
  private playerRenderer!: PlayerRenderer
  private fruitRenderer!: FruitRenderer
  private inputHandler!: InputHandler
  private swipeHandler!: SwipeHandler
  private movementProgress = 0
  private waitingForInput = true
  private crashAnimating = false
  private waitingText!: Phaser.GameObjects.Text
  private hudScoreText!: Phaser.GameObjects.Text
  private hudDistanceText!: Phaser.GameObjects.Text
  private hudModeText!: Phaser.GameObjects.Text
  private hudCamera!: Phaser.Cameras.Scene2D.Camera
  private cameraTarget!: Phaser.GameObjects.Rectangle
  private insectorRenderer: InsectorRenderer | null = null
  private prevInsectorPosition: { row: number; col: number } | null = null
  private insectorDespawning = false
  private stunTimer = 0
  private stunText: Phaser.GameObjects.Text | null = null
  private hudLivesText!: Phaser.GameObjects.Text
  private stunEffectAnimating = false
  private stunEffectTimer = 0

  constructor() {
    super({ key: 'Endless' })
  }

  preload(): void {
    if (!this.cache.audio.exists('bgm')) {
      this.load.audio('bgm', 'High_Gear_Panic_.mp3')
    }
  }

  init(): void {
    const seed = Date.now()
    this.gameState = initEndless(seed)
    this.movementProgress = 0
    this.waitingForInput = true
    this.crashAnimating = false
    this.stunTimer = 0
    this.stunText = null
    this.stunEffectAnimating = false
    this.stunEffectTimer = 0
  }

  create(): void {
    const screenW = this.scale.width
    const screenH = this.scale.height

    // HUD専用カメラ（ズームなし、スクロールなし、透明背景）
    this.hudCamera = this.cameras.add(0, 0, screenW, screenH)
    this.hudCamera.transparent = true

    // 迷路レンダラー（HUDカメラからは除外する）
    this.mazeRenderer = new EndlessMazeRenderer(this, TILE_SIZE, this.hudCamera)
    this.mazeRenderer.renderChunksAround(
      this.gameState.maze,
      this.gameState.player.position.row,
      this.gameState.player.position.col,
    )

    this.playerRenderer = new PlayerRenderer(this, TILE_SIZE, this.gameState.player.direction)
    this.fruitRenderer = new FruitRenderer(this, TILE_SIZE, this.hudCamera)
    this.inputHandler = new InputHandler(this)
    this.swipeHandler = new SwipeHandler(this)

    const playerPos = this.gameState.player.position
    this.playerRenderer.updatePosition(
      playerPos,
      moveForward(this.gameState.player),
      0,
      this.gameState.player.direction,
    )

    // 果物を初期描画
    this.fruitRenderer.syncFruits(this.gameState.fruits)

    // カメラ追従用の透明オブジェクト
    this.cameraTarget = this.add.rectangle(
      playerPos.col * TILE_SIZE + TILE_SIZE / 2,
      playerPos.row * TILE_SIZE + TILE_SIZE / 2,
      1, 1, 0x000000, 0,
    )

    // ゲーム要素をHUDカメラから除外
    this.hudCamera.ignore(this.cameraTarget)
    this.playerRenderer.ignoreFromCamera(this.hudCamera)

    // メインカメラ: ズーム＋プレイヤー追従
    const cam = this.cameras.main
    cam.setZoom(2.0)
    cam.startFollow(this.cameraTarget, true, 0.15, 0.15)

    // HUD要素を作成
    const hudStyle = {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '16px',
      color: '#8892a4',
      backgroundColor: 'rgba(10,10,26,0.8)',
      padding: { x: 10, y: 5 },
    }

    this.hudModeText = this.add.text(screenW - 10, 10, 'ENDLESS', {
      ...hudStyle,
      color: '#e94560',
      fontFamily: "'Orbitron', sans-serif",
    }).setOrigin(1, 0).setDepth(200)

    this.hudScoreText = this.add.text(screenW - 10, 38, 'SCORE 0', {
      ...hudStyle,
      fontSize: '20px',
      color: '#00e5ff',
    }).setOrigin(1, 0).setDepth(200)

    this.hudDistanceText = this.add.text(screenW - 10, 66, '0m', hudStyle)
      .setOrigin(1, 0).setDepth(200)

    this.hudLivesText = this.add.text(10, 10, `LIVES ${this.gameState.lives}`, {
      ...hudStyle,
      color: '#e94560',
    }).setOrigin(0, 0).setDepth(200)

    this.waitingText = this.add.text(screenW / 2, screenH - 60, 'Swipe or WASD to Start', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '18px',
      color: '#e94560',
      backgroundColor: 'rgba(10,10,26,0.8)',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(200)

    // メインカメラからHUD要素を除外（ズームの影響を受けさせない）
    const hudElements = [this.hudModeText, this.hudScoreText, this.hudDistanceText, this.hudLivesText, this.waitingText]
    hudElements.forEach(el => cam.ignore(el))
  }

  update(_time: number, delta: number): void {
    if (this.crashAnimating) return
    if (this.gameState.status === 'game-over') return

    // スタンエフェクト中: 0.8秒間入力無効
    if (this.stunEffectAnimating) {
      this.stunEffectTimer += delta
      // 入力を捨てる
      this.getDirection()
      if (this.stunEffectTimer >= 800) {
        this.stunEffectAnimating = false
        this.showStunGuide()
      }
      return
    }

    if (this.gameState.status === 'stunned') {
      this.handleStunned(delta)
      return
    }

    if (this.waitingForInput) {
      const queuedDirection = this.getDirection()
      if (queuedDirection !== null) {
        if (!this.sound.get('bgm')) {
          this.sound.add('bgm', { loop: true, volume: 0.5 }).play()
        }
        this.gameState = handleEndlessDirectionChange(this.gameState, queuedDirection)
        this.waitingForInput = false
        this.waitingText.destroy()
      }
      return
    }

    this.movementProgress += (this.gameState.tileSpeed / 1000) * delta

    if (this.movementProgress >= 1.0) {
      const remainder = this.movementProgress - 1.0

      this.gameState = endlessTick(this.gameState)

      const queuedDirection = this.getDirection()
      if (queuedDirection !== null) {
        this.gameState = handleEndlessDirectionChange(this.gameState, queuedDirection)
      }

      this.movementProgress = remainder

      // チャンク描画更新
      this.mazeRenderer.renderChunksAround(
        this.gameState.maze,
        this.gameState.player.position.row,
        this.gameState.player.position.col,
      )

      // 果物の取得エフェクト＆描画更新
      if (this.gameState.collectedFruit) {
        this.fruitRenderer.playCollectEffect(this.gameState.collectedFruit)
      }
      this.fruitRenderer.syncFruits(this.gameState.fruits)

      // インセクター描画管理
      this.updateInsector()

      // HUD更新
      this.hudScoreText.setText(`SCORE ${this.gameState.score}`)
      this.hudDistanceText.setText(`${this.gameState.distance}m`)
      this.hudLivesText.setText(`LIVES ${this.gameState.lives}`)

      if (this.gameState.status === 'game-over') {
        if (this.gameState.deathCause === 'insector') {
          this.playInsectorDeathEffect()
        } else {
          this.playCrashEffect()
        }
        return
      }

      if (this.gameState.status === 'stunned') {
        this.playStunEffect()
        return
      }
    }

    // プレイヤーの視覚位置を更新
    const currentPos = this.gameState.player.position
    const nextPos = moveForward(this.gameState.player)

    const isWall = getWorldCell(this.gameState.maze, nextPos.row, nextPos.col) === 'wall'
    const maxProgress = isWall
      ? Math.min(this.movementProgress, 0.3)
      : this.movementProgress

    this.playerRenderer.updatePosition(currentPos, nextPos, maxProgress, this.gameState.player.direction)

    // インセクターの視覚位置を更新
    if (this.insectorRenderer && this.gameState.insector && this.gameState.insector.status === 'active') {
      const ins = this.gameState.insector
      if (ins.moved && this.prevInsectorPosition) {
        // 移動した場合: 前の位置から現在の位置へ補間
        this.insectorRenderer.updatePosition(
          this.prevInsectorPosition, ins.position, this.movementProgress, ins.direction,
        )
      } else {
        // 移動していない場合: 現在位置に留まる
        this.insectorRenderer.updatePosition(ins.position, ins.position, 0, ins.direction)
      }
    }

    // カメラ追従ターゲットを視覚位置に移動
    const visualCol = currentPos.col + (nextPos.col - currentPos.col) * maxProgress
    const visualRow = currentPos.row + (nextPos.row - currentPos.row) * maxProgress
    this.cameraTarget.setPosition(
      visualCol * TILE_SIZE + TILE_SIZE / 2,
      visualRow * TILE_SIZE + TILE_SIZE / 2,
    )
  }

  private updateInsector(): void {
    const insector = this.gameState.insector

    if (insector && !this.insectorRenderer && insector.status === 'spawning') {
      // 新規スポーン
      this.insectorRenderer = new InsectorRenderer(this, TILE_SIZE, this.hudCamera)
      this.insectorRenderer.spawn(insector.position)
      this.prevInsectorPosition = insector.position
      this.insectorDespawning = false
    }

    if (insector && insector.status === 'active' && this.insectorRenderer) {
      // 移動した場合は前の位置を更新
      if (insector.moved && this.prevInsectorPosition) {
        this.prevInsectorPosition = insector.position
      }
    }

    if (insector && insector.status === 'despawning' && this.insectorRenderer && !this.insectorDespawning) {
      this.insectorDespawning = true
      this.insectorRenderer.despawn(() => {
        this.insectorRenderer?.destroy()
        this.insectorRenderer = null
        this.prevInsectorPosition = null
        this.insectorDespawning = false
      })
    }

    if (!insector && this.insectorRenderer && !this.insectorDespawning) {
      this.insectorRenderer.destroy()
      this.insectorRenderer = null
      this.prevInsectorPosition = null
    }
  }

  private readonly STUN_TIMEOUT_MS = 5000

  private readonly STUN_EFFECT_DURATION_MS = 800

  private playStunEffect(): void {
    this.movementProgress = 0
    this.cameras.main.shake(300, 0.015)

    const pos = this.gameState.player.position

    if (this.gameState.deathCause === 'insector') {
      // 虫衝突: プレイヤー位置でエフェクト、インセクターを消す
      const px = pos.col * TILE_SIZE + TILE_SIZE / 2
      const py = pos.row * TILE_SIZE + TILE_SIZE / 2
      this.spawnCrashParticles(px, py)
      this.playerRenderer.updatePosition(pos, pos, 0, this.gameState.player.direction)

      if (this.insectorRenderer) {
        this.insectorRenderer.destroy()
        this.insectorRenderer = null
        this.prevInsectorPosition = null
        this.insectorDespawning = false
      }
    } else {
      // 壁衝突: 壁方向に寄せてエフェクト
      const wallPos = moveForward(this.gameState.player)
      this.playerRenderer.updatePosition(pos, wallPos, 0.3, this.gameState.player.direction)

      const cx = (pos.col * 0.7 + wallPos.col * 0.3) * TILE_SIZE + TILE_SIZE / 2
      const cy = (pos.row * 0.7 + wallPos.row * 0.3) * TILE_SIZE + TILE_SIZE / 2
      this.spawnCrashParticles(cx, cy)
    }

    // プレイヤー点滅エフェクト（0.8秒間）
    this.playerRenderer.blink(this.STUN_EFFECT_DURATION_MS)

    // HUD更新
    this.hudLivesText.setText(`LIVES ${this.gameState.lives}`)

    // 0.8秒間エフェクト → 入力無効
    this.stunEffectAnimating = true
    this.stunEffectTimer = 0
    this.stunTimer = 0
  }

  private showStunGuide(): void {
    const screenW = this.scale.width
    const screenH = this.scale.height
    this.stunText = this.add.text(screenW / 2, screenH - 60, 'WASD to Resume (5s)', {
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '18px',
      color: '#e94560',
      backgroundColor: 'rgba(10,10,26,0.8)',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(200)
    this.cameras.main.ignore(this.stunText)
  }

  private handleStunned(delta: number): void {
    this.stunTimer += delta

    // カウントダウン更新
    const remaining = Math.ceil((this.STUN_TIMEOUT_MS - this.stunTimer) / 1000)
    if (this.stunText) {
      this.stunText.setText(`WASD to Resume (${remaining}s)`)
    }

    const queuedDirection = this.getDirection()

    if (queuedDirection !== null) {
      this.gameState = resumeFromStun(this.gameState, queuedDirection)
      this.destroyStunText()
      return
    }

    if (this.stunTimer >= this.STUN_TIMEOUT_MS) {
      // タイムアウト: 現在の方向で再開
      this.gameState = resumeFromStun(this.gameState, this.gameState.player.direction)
      this.destroyStunText()
    }
  }

  private destroyStunText(): void {
    if (this.stunText) {
      this.stunText.destroy()
      this.stunText = null
    }
  }

  private playInsectorDeathEffect(): void {
    this.crashAnimating = true

    const playerPos = this.gameState.player.position
    const px = playerPos.col * TILE_SIZE + TILE_SIZE / 2
    const py = playerPos.row * TILE_SIZE + TILE_SIZE / 2

    this.cameras.main.shake(400, 0.02)

    // 赤いパーティクル
    this.spawnCrashParticles(px, py)

    this.time.delayedCall(600, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.cleanup()
        this.scene.start('GameOver', {
          score: this.gameState.score,
          stage: 0,
          mode: 'endless',
        })
      })
    })
  }

  private playCrashEffect(): void {
    this.crashAnimating = true

    const pos = this.gameState.player.position
    const wallPos = moveForward(this.gameState.player)
    this.playerRenderer.updatePosition(pos, wallPos, 0.3, this.gameState.player.direction)

    this.cameras.main.shake(300, 0.015)

    const cx = (pos.col * 0.7 + wallPos.col * 0.3) * TILE_SIZE + TILE_SIZE / 2
    const cy = (pos.row * 0.7 + wallPos.row * 0.3) * TILE_SIZE + TILE_SIZE / 2
    this.spawnCrashParticles(cx, cy)

    this.time.delayedCall(600, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.cleanup()
        this.scene.start('GameOver', {
          score: this.gameState.score,
          stage: 0,
          mode: 'endless',
        })
      })
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

  private getDirection(): Direction | null {
    return this.inputHandler.getQueuedDirection() ?? this.swipeHandler.getQueuedDirection()
  }

  private cleanup(): void {
    this.mazeRenderer.destroy()
    this.playerRenderer.destroy()
    this.fruitRenderer.destroy()
    this.insectorRenderer?.destroy()
    this.insectorRenderer = null
    this.inputHandler.destroy()
    this.swipeHandler.destroy()
    this.cameraTarget.destroy()
    if (this.waitingText?.active) this.waitingText.destroy()
    this.destroyStunText()
    this.hudScoreText.destroy()
    this.hudDistanceText.destroy()
    this.hudModeText.destroy()
    this.hudLivesText.destroy()
    this.cameras.remove(this.hudCamera)
  }
}
