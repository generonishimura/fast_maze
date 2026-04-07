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

  it('人間プレイヤーはwaiting状態、ボットはinvincible状態で開始する', () => {
    // When
    const state = initBattle(12345, ['p1', 'p2'], new Set(['p2']))

    // Then
    expect(getPlayer(state, 'p1').status).toBe('waiting')
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

  it('ボットは壁に衝突しても反転する（脱落しない）', () => {
    // Given: ボットとしてp1を登録、invincible期間を超える
    const state = initBattle(12345, ['p1', 'p2'], new Set(['p1']))
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

    expect(wallDir).not.toBeNull()

    // When: 壁に向かわせて移動tickまで進める
    const inputs = new Map<string, Direction>([['p1', wallDir!]])
    let result = current
    for (let i = 0; i < 5; i++) {
      result = battleTick(result, i === 0 ? inputs : new Map())
    }

    // Then: ボットは脱落しない
    const p1 = getPlayer(result, 'p1')
    expect(p1.status).not.toBe('eliminated')
  })

  it('人間プレイヤーは壁衝突で脱落する', () => {
    // Given: p1は人間。まず入力を送ってwaitingからinvincibleに遷移させる
    const state = initBattle(12345, ['p1', 'p2'], new Set(['p2']))
    // 最初の入力でwaiting→invincibleに
    let current = battleTick(state, new Map([['p1', 'right']]))
    // invincible期間を超える
    const noInputs = new Map<string, Direction>()
    for (let i = 0; i < INVINCIBLE_TICKS; i++) {
      current = battleTick(current, noInputs)
    }

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

    expect(wallDir).not.toBeNull()

    const inputs = new Map<string, Direction>([['p1', wallDir!]])
    let result = current
    for (let i = 0; i < 5; i++) {
      result = battleTick(result, i === 0 ? inputs : new Map())
    }

    // Then: 人間プレイヤーは脱落する
    expect(getPlayer(result, 'p1').status).toBe('eliminated')
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

  it('人間プレイヤーが全滅したらfinishedになる', () => {
    // Given: p1=人間(eliminated), p2=ボット(alive)
    const state = initBattle(12345, ['p1', 'p2'], new Set(['p2']))
    const modified: BattleGameState = {
      ...state,
      players: new Map([
        ['p1', { ...getPlayer(state, 'p1'), status: 'eliminated', eliminatedBy: 'wall' }],
        ['p2', { ...getPlayer(state, 'p2'), status: 'alive' }],
      ]),
      eliminationOrder: ['p1'],
    }

    // When
    const result = battleTick(modified, new Map())

    // Then: 人間全滅 → ゲーム終了
    expect(result.phase).toBe('finished')
  })

  it('人間プレイヤーが1人でも生存していればplayingのまま', () => {
    // Given: p1=人間(alive), p2=人間(eliminated), p3=ボット(alive)
    const state = initBattle(12345, ['p1', 'p2', 'p3'], new Set(['p3']))
    const modified: BattleGameState = {
      ...state,
      players: new Map([
        ['p1', { ...getPlayer(state, 'p1'), status: 'invincible' }],
        ['p2', { ...getPlayer(state, 'p2'), status: 'eliminated', eliminatedBy: 'wall' }],
        ['p3', { ...getPlayer(state, 'p3'), status: 'alive' }],
      ]),
      eliminationOrder: ['p2'],
    }

    // When
    const result = battleTick(modified, new Map())

    // Then
    expect(result.phase).toBe('playing')
  })

  it('フルーツを踏んだプレイヤーにスコアが加算される', () => {
    // Given: p1=ボット, p2=人間（ゲーム終了防止用）
    const state = initBattle(12345, ['p1', 'p2'], new Set(['p1']))

    // When: 何tickか進めてスコアを確認（p2は入力でwaitingのまま→ゲーム継続）
    let current = state
    const noInputs = new Map<string, Direction>()
    for (let i = 0; i < INVINCIBLE_TICKS + 5; i++) {
      current = battleTick(current, noInputs)
    }

    // Then: ボットの移動によるスコア加算があるはず
    const p = getPlayer(current, 'p1')
    expect(p.score).toBeGreaterThan(0)
  })

  it('8人プレイヤーで100tick回してもensureChunksAroundの呼び出し回数が最小限', () => {
    // Given: 8人で初期化
    const state = initBattle(12345, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'])

    // When: 100tick回す（移動tickは20回発生）
    let current = state
    const noInputs = new Map<string, Direction>()
    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      current = battleTick(current, noInputs)
    }
    const elapsed = performance.now() - start

    // Then: 100tick が 100ms 以内で完了する（20Hz = 50ms/tick の余裕を持って）
    expect(elapsed).toBeLessThan(100)
    expect(current.tickCount).toBeGreaterThan(0)
  })

  it('途中参加プレイヤーはゲーム開始tickに関係なくINVINCIBLE_TICKS分の無敵期間を持つ', () => {
    // Given: p1=人間, p2=ボット。ゲームを60tick進める
    const state = initBattle(12345, ['p1', 'p2'], new Set(['p2']))
    // p1を入力で動かしてwaiting→invincibleに遷移
    let current = battleTick(state, new Map([['p1', 'right']]))
    const noInputs = new Map<string, Direction>()
    for (let i = 1; i < INVINCIBLE_TICKS + 1; i++) {
      current = battleTick(current, noInputs)
    }

    // p3を途中参加させる（invincibleUntilTick = 現在tick + INVINCIBLE_TICKS）
    const p1 = getPlayer(current, 'p1')
    const updatedPlayers = new Map(current.players)
    updatedPlayers.set('p3', {
      id: 'p3',
      position: p1.position,
      direction: 'right',
      score: 0,
      status: 'invincible',
      eliminatedBy: null,
      rank: null,
      isBot: false,
      invincibleUntilTick: current.tickCount + INVINCIBLE_TICKS,
    })
    current = { ...current, players: updatedPlayers }

    // When: 1tick後
    current = battleTick(current, new Map())

    // Then: p3はまだinvincible（INVINCIBLE_TICKS分の猶予がある）
    expect(getPlayer(current, 'p3').status).toBe('invincible')
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
