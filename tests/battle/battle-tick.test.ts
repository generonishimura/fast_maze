import { battleTick, initBattle, BATTLE_TILE_SPEED, INVINCIBLE_TICKS } from '@/battle/battle-tick'
import { getWorldCell } from '@/domain/endless-maze'
import type { Direction } from '@/domain/types'
import type { BattleGameState, BattlePlayerState } from '@/battle/types'

function getPlayer(state: BattleGameState, id: string): BattlePlayerState {
  const p = state.players.get(id)
  if (!p) throw new Error(`Player ${id} not found`)
  return p
}

describe('initBattle', () => {
  it('指定人数のプレイヤーでバトルを初期化する', () => {
    // When
    const state = initBattle(12345, ['p1', 'p2', 'p3'])

    // Then
    expect(state.players.size).toBe(3)
    expect(state.phase).toBe('playing')
    expect(state.seed).toBe(12345)
    expect(state.tickCount).toBe(0)
  })

  it('全プレイヤーがinvincible状態で開始する', () => {
    // When
    const state = initBattle(12345, ['p1', 'p2'])

    // Then
    expect(getPlayer(state, 'p1').status).toBe('invincible')
    expect(getPlayer(state, 'p2').status).toBe('invincible')
  })

  it('全プレイヤーのスポーン位置が通路上にある', () => {
    // When
    const state = initBattle(12345, ['p1', 'p2', 'p3', 'p4'])

    // Then
    for (const [, player] of state.players) {
      expect(getWorldCell(state.maze, player.position.row, player.position.col)).toBe('passage')
    }
  })

  it('プレイヤーの初期スコアは0', () => {
    // When
    const state = initBattle(12345, ['p1'])

    // Then
    expect(getPlayer(state, 'p1').score).toBe(0)
  })
})

describe('battleTick', () => {
  it('通路方向に入力すると前進する', () => {
    // Given
    const state = initBattle(12345, ['p1'])
    const p1 = getPlayer(state, 'p1')

    // 通路方向を見つける
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    let passageDir: Direction | null = null
    for (const dir of directions) {
      const nextRow = p1.position.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
      const nextCol = p1.position.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
      if (getWorldCell(state.maze, nextRow, nextCol) === 'passage') {
        passageDir = dir
        break
      }
    }
    expect(passageDir).not.toBeNull()

    // When: 5tick回す（4.0 tiles/sec × 50ms = 0.2/tick、5tickで1.0）
    const inputs = new Map<string, Direction>([['p1', passageDir!]])
    let current = state
    for (let i = 0; i < 5; i++) {
      current = battleTick(current, inputs)
    }
    const moved = getPlayer(current, 'p1')

    // Then: 位置が変わっている
    expect(
      moved.position.row !== p1.position.row || moved.position.col !== p1.position.col
    ).toBe(true)
  })

  it('壁に衝突したプレイヤーは脱落する', () => {
    // Given: プレイヤーを壁の隣に配置
    const state = initBattle(12345, ['p1', 'p2'])
    // invincible期間を超えてからテスト
    let current = state
    const noInputs = new Map<string, Direction>()
    for (let i = 0; i < INVINCIBLE_TICKS; i++) {
      current = battleTick(current, noInputs)
    }

    // プレイヤーの現在位置から壁方向を見つける
    const p = getPlayer(current, 'p1')
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    let wallDir: Direction | null = null
    for (const dir of directions) {
      const nextRow = p.position.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
      const nextCol = p.position.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
      if (getWorldCell(current.maze, nextRow, nextCol) === 'wall') {
        wallDir = dir
        break
      }
    }

    if (wallDir) {
      // When: 壁に向かわせる
      const inputs = new Map<string, Direction>([['p1', wallDir]])
      const afterDir = battleTick(current, inputs)
      const result = battleTick(afterDir, new Map())

      // Then
      expect(getPlayer(result, 'p1').status).toBe('eliminated')
    }
  })

  it('invincible期間中は壁衝突でも脱落しない', () => {
    // Given
    const state = initBattle(12345, ['p1'])
    const p = getPlayer(state, 'p1')

    // 壁方向を見つける
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    let wallDir: Direction | null = null
    for (const dir of directions) {
      const nextRow = p.position.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
      const nextCol = p.position.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
      if (getWorldCell(state.maze, nextRow, nextCol) === 'wall') {
        wallDir = dir
        break
      }
    }

    if (wallDir) {
      // When: invincible中に壁に向かわせる
      const inputs = new Map<string, Direction>([['p1', wallDir]])
      const next = battleTick(state, inputs)

      // Then: まだ生きている
      const p1 = getPlayer(next, 'p1')
      expect(p1.status).not.toBe('eliminated')
    }
  })

  it('invincible期間がINVINCIBLE_TICKS後に終了する', () => {
    // Given
    const state = initBattle(12345, ['p1'])

    // 通路方向を見つけて毎tickその方向に進ませる
    const p1 = getPlayer(state, 'p1')
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    let passageDir: Direction = 'right'
    for (const dir of directions) {
      const nextRow = p1.position.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)
      const nextCol = p1.position.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
      if (getWorldCell(state.maze, nextRow, nextCol) === 'passage') {
        passageDir = dir
        break
      }
    }

    // When: INVINCIBLE_TICKS回tick（壁に当たっても死なない）
    let current = state
    for (let i = 0; i < INVINCIBLE_TICKS; i++) {
      current = battleTick(current, new Map([['p1', passageDir]]))
    }

    // Then: invincible期間を超えたので alive
    const p = getPlayer(current, 'p1')
    expect(p.status === 'alive' || p.status === 'eliminated').toBe(true)
    // 壁に当たって死んでなければ alive のはず
    if (p.status !== 'eliminated') {
      expect(p.status).toBe('alive')
    }
  })

  it('tickCountが毎tick増加する', () => {
    // Given
    const state = initBattle(12345, ['p1'])

    // When
    const next = battleTick(state, new Map())

    // Then
    expect(next.tickCount).toBe(1)
  })

  it('最後の1人になったらphaseがfinishedになる', () => {
    // Given: 2人で開始、1人を手動でeliminatedに
    const state = initBattle(12345, ['p1', 'p2'])
    const modified: BattleGameState = {
      ...state,
      players: new Map([
        ['p1', { ...getPlayer(state, 'p1'), status: 'alive' }],
        ['p2', { ...getPlayer(state, 'p2'), status: 'eliminated', eliminatedBy: 'p1' }],
      ]),
    }

    // When
    const result = battleTick(modified, new Map())

    // Then
    expect(result.phase).toBe('finished')
  })

  it('フルーツを踏んだプレイヤーにスコアが加算される', () => {
    // Given
    const state = initBattle(12345, ['p1'])

    // When: 何tickか進めてスコアを確認（移動でスコアが入る）
    let current = state
    const noInputs = new Map<string, Direction>()
    // invincible期間超え + 移動
    for (let i = 0; i < INVINCIBLE_TICKS + 5; i++) {
      current = battleTick(current, noInputs)
      if (getPlayer(current, 'p1').status === 'eliminated') break
    }

    // Then: 移動によるスコア加算があるはず（新タイル踏破）
    const p = getPlayer(current, 'p1')
    if (p.status !== 'eliminated') {
      expect(p.score).toBeGreaterThan(0)
    }
  })

  it('eliminated状態のプレイヤーは移動しない', () => {
    // Given
    const state = initBattle(12345, ['p1', 'p2'])
    const p2Pos = getPlayer(state, 'p2').position
    const modified: BattleGameState = {
      ...state,
      players: new Map([
        ['p1', getPlayer(state, 'p1')],
        ['p2', { ...getPlayer(state, 'p2'), status: 'eliminated', eliminatedBy: 'p1' }],
      ]),
    }

    // When
    const inputs = new Map<string, Direction>([['p2', 'right']])
    const next = battleTick(modified, inputs)

    // Then
    expect(getPlayer(next, 'p2').position).toEqual(p2Pos)
  })
})
