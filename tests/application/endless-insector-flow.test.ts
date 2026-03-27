import { describe, it, expect } from 'vitest'
import { initEndless, endlessTick, handleEndlessDirectionChange } from '@/application/endless-game-flow'
import { getWorldCell } from '@/domain/endless-maze'
import type { EndlessGameState } from '@/domain/endless-types'
import type { InsectorState } from '@/domain/insector'

// active状態のインセクターを作るヘルパー
function activeInsector(overrides: Partial<InsectorState> & { position: InsectorState['position'] }): InsectorState {
  return {
    direction: 'left',
    remainingTicks: 20,
    moveCooldown: 2, // tickCount=3 → スキップtick → 移動しない
    status: 'active',
    moved: false,
    unreachable: false,
    ...overrides,
  }
}

describe('initEndless - insector', () => {
  it('初期状態ではinsectorがnullでcooldownが正の値', () => {
    const state = initEndless(42)

    expect(state.insector).toBeNull()
    expect(state.insectorCooldown).toBeGreaterThan(0)
    expect(state.deathCause).toBeNull()
  })
})

describe('endlessTick - insector spawn', () => {
  it('distance < 15ではインセクターがスポーンしない', () => {
    let state = initEndless(42)
    state = { ...state, insectorCooldown: 0 }

    for (let i = 0; i < 10; i++) {
      state = endlessTick(state)
      if (state.status === 'game-over') break
    }

    if (state.status === 'playing') {
      expect(state.distance).toBeLessThan(15)
      expect(state.insector).toBeNull()
    }
  })

  it('cooldown中はスポーンしない', () => {
    let state = initEndless(42)
    state = { ...state, distance: 30, insectorCooldown: 100 }

    state = endlessTick(state)
    if (state.status !== 'game-over') {
      expect(state.insector).toBeNull()
    }
  })
})

describe('endlessTick - insector collision', () => {
  it('プレイヤーの移動先にインセクターがいるとgame-over（tick前判定）', () => {
    // Given: プレイヤーの次の位置にインセクターを配置
    // インセクターはスキップtick（moveCooldown=2）なので移動しない
    // → tick前判定でプレイヤーの移動先 === インセクター位置 で衝突
    let state = initEndless(42)
    const playerPos = state.player.position
    const playerNextPos = {
      row: playerPos.row,
      col: playerPos.col + 1,
    }

    if (getWorldCell(state.maze, playerNextPos.row, playerNextPos.col) !== 'passage') return

    state = {
      ...state,
      insector: activeInsector({ position: playerNextPos }),
    }

    // When
    const next = endlessTick(state)

    // Then
    expect(next.status).toBe('game-over')
    expect(next.deathCause).toBe('insector')
  })

  it('インセクターが移動した結果プレイヤーと同じ位置になるとgame-over（tick後判定）', () => {
    // Given: インセクターがBFSでプレイヤーの位置に向かって移動する状況
    // プレイヤーの2マス先にインセクター、moveCooldown=0で移動可能
    let state = initEndless(42)
    const playerPos = state.player.position
    const playerNextPos = { row: playerPos.row, col: playerPos.col + 1 }
    const insectorPos = { row: playerPos.row, col: playerPos.col + 2 }

    if (getWorldCell(state.maze, playerNextPos.row, playerNextPos.col) !== 'passage') return
    if (getWorldCell(state.maze, insectorPos.row, insectorPos.col) !== 'passage') return

    // moveCooldown=0 → tickCount=1, 1%3!==0 なので移動する
    // BFSでプレイヤー(nextPosition=col+1)に向かうとcol+1に移動 → プレイヤーと同位置
    state = {
      ...state,
      insector: activeInsector({
        position: insectorPos,
        direction: 'left',
        moveCooldown: 0,
      }),
    }

    // When
    const next = endlessTick(state)

    // Then
    expect(next.status).toBe('game-over')
    expect(next.deathCause).toBe('insector')
  })
})

describe('endlessTick - swap collision', () => {
  it('プレイヤーとインセクターがすれ違うとgame-over', () => {
    let state = initEndless(42)

    const playerPos = state.player.position
    const insectorPos = { row: playerPos.row, col: playerPos.col + 2 }

    if (getWorldCell(state.maze, insectorPos.row, insectorPos.col) !== 'passage') return
    if (getWorldCell(state.maze, playerPos.row, playerPos.col + 1) !== 'passage') return

    state = {
      ...state,
      insector: activeInsector({
        position: insectorPos,
        direction: 'left',
        moveCooldown: 0,
      }),
    }

    const next = endlessTick(state)

    expect(next.status).toBe('game-over')
    expect(next.deathCause).toBe('insector')
  })
})

describe('endlessTick - insector lifecycle', () => {
  it('insectorのremainingTicksが0になるとdespawningになる', () => {
    let state = initEndless(42)

    state = {
      ...state,
      insector: activeInsector({
        position: { row: 15, col: 15 },
        remainingTicks: 1,
      }),
    }

    const next = endlessTick(state)
    if (next.status === 'game-over') return

    expect(next.insector).not.toBeNull()
    expect(next.insector!.status).toBe('despawning')
  })

  it('despawning状態の次のtickでinsectorがnullになりcooldownがリセットされる', () => {
    let state = initEndless(42)

    state = {
      ...state,
      insector: activeInsector({
        position: { row: 15, col: 15 },
        remainingTicks: 0,
        status: 'despawning',
      }),
      insectorCooldown: 0,
    }

    const next = endlessTick(state)
    if (next.status === 'game-over') return

    expect(next.insector).toBeNull()
    expect(next.insectorCooldown).toBeGreaterThan(0)
  })

  it('unreachableなインセクターはdespawnし、cooldownが0にリセットされる', () => {
    // Given: unreachable=trueかつdespawningのインセクター
    let state = initEndless(42)

    state = {
      ...state,
      insector: activeInsector({
        position: { row: 15, col: 15 },
        remainingTicks: 0,
        status: 'despawning',
        unreachable: true,
      }),
      insectorCooldown: 0,
    }

    // When
    const next = endlessTick(state)
    if (next.status === 'game-over') return

    // Then: nullになり、cooldownは0（即再スポーン可能）
    expect(next.insector).toBeNull()
    expect(next.insectorCooldown).toBe(0)
  })
})

describe('endlessTick - wall collision regression', () => {
  it('壁衝突時のdeathCauseがwallになる', () => {
    let state = initEndless(42)

    for (let i = 0; i < 100; i++) {
      state = endlessTick(state)
      if (state.status === 'game-over') break
    }

    expect(state.status).toBe('game-over')
    expect(state.deathCause).toBe('wall')
  })
})
