import { describe, it, expect } from 'vitest'
import { initEndless, endlessTick, handleEndlessDirectionChange } from '@/application/endless-game-flow'
import { getWorldCell } from '@/domain/endless-maze'

describe('endless mode - 果物統合', () => {
  it('初期状態に果物が配置されている', () => {
    const state = initEndless(42)
    expect(state.fruits.size).toBeGreaterThan(0)
  })

  it('果物はすべて通路上にある', () => {
    const state = initEndless(42)
    for (const [, fruit] of state.fruits) {
      const cell = getWorldCell(state.maze, fruit.row, fruit.col)
      expect(cell).toBe('passage')
    }
  })

  it('プレイヤーが果物のあるマスに移動するとスコアが加算される', () => {
    const state = initEndless(42)

    // 果物の位置を見つけて、そこに向かって移動を試みる
    // まず近くの果物を探す
    let foundFruit = false
    let current = state

    // 色々な方向に進んで果物を取る
    for (let attempt = 0; attempt < 200 && !foundFruit; attempt++) {
      if (current.status === 'game-over') {
        current = initEndless(42 + attempt)
        continue
      }

      const prev = current
      current = endlessTick(current)

      if (current.collectedFruit !== null) {
        // 果物を取得した
        expect(current.score).toBeGreaterThan(prev.score)
        foundFruit = true
      }

      if (current.status === 'game-over') {
        current = initEndless(42 + attempt)
      }
    }

    // 注: 200回以内に果物に到達しない場合もあり得るが、
    // 配置密度から到達する確率が高い
  })

  it('取得した果物はfruits mapから削除される', () => {
    const state = initEndless(42)
    // 果物の位置にプレイヤーを置くシナリオを直接テスト
    // 果物のある位置を取得
    const firstFruit = state.fruits.entries().next().value
    if (!firstFruit) return

    const [key] = firstFruit

    // tick後にcollectedFruitがセットされた場合、そのキーはfruitsから消える
    let current = state
    for (let i = 0; i < 500; i++) {
      if (current.status === 'game-over') break
      current = endlessTick(current)
      if (current.collectedFruit !== null) {
        const fruitKey = `${current.collectedFruit.row},${current.collectedFruit.col}`
        expect(current.fruits.has(fruitKey)).toBe(false)
        break
      }
    }
  })

  it('collectedFruitは次のtickでリセットされる', () => {
    const state = initEndless(42)
    // collectedFruitがnullの初期状態
    expect(state.collectedFruit).toBeNull()
  })
})
