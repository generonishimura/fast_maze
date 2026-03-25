import Phaser from 'phaser'
import type { Direction } from '@/domain/types'

const KEY_DIRECTION_MAP: Record<string, Direction> = {
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
}

export class InputHandler {
  private readonly scene: Phaser.Scene
  private queuedDirection: Direction | null = null
  private readonly keys: Phaser.Input.Keyboard.Key[]

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.keys = []

    if (!this.scene.input.keyboard) return

    for (const keyName of Object.keys(KEY_DIRECTION_MAP)) {
      const key = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes[keyName as keyof typeof Phaser.Input.Keyboard.KeyCodes],
      )
      key.on('down', () => {
        this.queuedDirection = KEY_DIRECTION_MAP[keyName] ?? null
      })
      this.keys.push(key)
    }
  }

  getQueuedDirection(): Direction | null {
    const direction = this.queuedDirection
    this.queuedDirection = null
    return direction
  }

  destroy(): void {
    if (!this.scene.input.keyboard) return
    for (const key of this.keys) {
      key.removeAllListeners()
      this.scene.input.keyboard.removeKey(key)
    }
    this.keys.length = 0
  }
}
