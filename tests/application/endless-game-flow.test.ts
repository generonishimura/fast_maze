import { describe, it, expect } from 'vitest'
import { initEndless, endlessTick, handleEndlessDirectionChange } from '@/application/endless-game-flow'
import { getWorldCell } from '@/domain/endless-maze'

describe('initEndless', () => {
  it('プレイヤーがチャンク中央付近のpassage上に配置される', () => {
    const state = initEndless(42)

    expect(state.status).toBe('playing')
    expect(state.score).toBe(0)
    expect(state.distance).toBe(0)
    expect(state.streak).toBe(0)
    expect(state.visited.size).toBe(1)

    const cell = getWorldCell(state.maze, state.player.position.row, state.player.position.col)
    expect(cell).toBe('passage')
  })
})

describe('endlessTick', () => {
  it('新しいマスを進むとスコアとdistanceが増える', () => {
    let state = initEndless(42)

    const next = endlessTick(state)
    if (next.status !== 'game-over') {
      expect(next.score).toBeGreaterThan(0)
      expect(next.distance).toBe(1)
      expect(next.streak).toBe(1)
    }
  })

  it('同じマスを通るとスコアが増えずstreakがリセットされる', () => {
    let state = initEndless(42)

    // 右に1歩
    state = endlessTick(state)
    if (state.status === 'game-over') return
    const scoreAfterFirst = state.score

    // 左を向いて戻る
    state = handleEndlessDirectionChange(state, 'left')
    state = endlessTick(state)
    if (state.status === 'game-over') return

    // 戻ったマスは訪問済みなのでスコア変わらず
    expect(state.score).toBe(scoreAfterFirst)
    expect(state.streak).toBe(0)
  })

  it('壁に当たるとgame-overになる', () => {
    let state = initEndless(42)

    for (let i = 0; i < 100; i++) {
      state = endlessTick(state)
      if (state.status === 'game-over') break
    }

    expect(state.status).toBe('game-over')
  })
})

describe('handleEndlessDirectionChange', () => {
  it('方向を変更できる', () => {
    const state = initEndless(42)
    const changed = handleEndlessDirectionChange(state, 'left')
    expect(changed.player.direction).toBe('left')
  })
})
