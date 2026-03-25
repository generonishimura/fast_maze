import type { Direction } from '@/domain/types'

const MIN_SWIPE_DISTANCE = 30

export class SwipeHandler {
  private readonly scene: Phaser.Scene
  private startX = 0
  private startY = 0
  private queuedDirection: Direction | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startX = pointer.x
      this.startY = pointer.y
    })

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - this.startX
      const dy = pointer.y - this.startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx < MIN_SWIPE_DISTANCE && absDy < MIN_SWIPE_DISTANCE) return

      if (absDx > absDy) {
        this.queuedDirection = dx > 0 ? 'right' : 'left'
      } else {
        this.queuedDirection = dy > 0 ? 'down' : 'up'
      }
    })
  }

  getQueuedDirection(): Direction | null {
    const direction = this.queuedDirection
    this.queuedDirection = null
    return direction
  }

  destroy(): void {
    this.scene.input.off('pointerdown')
    this.scene.input.off('pointerup')
  }
}
