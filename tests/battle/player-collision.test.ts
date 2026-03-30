import { resolveCollisions } from '@/battle/player-collision'
import type { BattlePlayerState } from '@/battle/types'

function createPlayer(overrides: Partial<BattlePlayerState> & { id: string }): BattlePlayerState {
  return {
    position: { row: 0, col: 0 },
    direction: 'right',
    score: 0,
    status: 'alive',
    eliminatedBy: null,
    rank: null,
    ...overrides,
  }
}

describe('resolveCollisions', () => {
  it('同じタイルにいる2人のうちスコアが高い方が生き残る', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 100 }),
      createPlayer({ id: 'b', position: { row: 5, col: 5 }, score: 50 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors).toEqual(['a'])
    expect(result.eliminated).toEqual([{ id: 'b', eliminatedBy: 'a' }])
  })

  it('スコアが同点の場合は両者生存（すり抜け）', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 100 }),
      createPlayer({ id: 'b', position: { row: 5, col: 5 }, score: 100 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors.sort()).toEqual(['a', 'b'])
    expect(result.eliminated).toEqual([])
  })

  it('異なるタイルにいるプレイヤーは衝突しない', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 100 }),
      createPlayer({ id: 'b', position: { row: 7, col: 3 }, score: 50 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors.sort()).toEqual(['a', 'b'])
    expect(result.eliminated).toEqual([])
  })

  it('3人以上が同じタイルにいる場合、最高スコアが全員に勝つ', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 200 }),
      createPlayer({ id: 'b', position: { row: 5, col: 5 }, score: 100 }),
      createPlayer({ id: 'c', position: { row: 5, col: 5 }, score: 50 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors).toEqual(['a'])
    expect(result.eliminated).toHaveLength(2)
    expect(result.eliminated.find(e => e.id === 'b')?.eliminatedBy).toBe('a')
    expect(result.eliminated.find(e => e.id === 'c')?.eliminatedBy).toBe('a')
  })

  it('3人中2人が同点最高スコアの場合、同点者は生存、他は脱落', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 200 }),
      createPlayer({ id: 'b', position: { row: 5, col: 5 }, score: 200 }),
      createPlayer({ id: 'c', position: { row: 5, col: 5 }, score: 50 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors.sort()).toEqual(['a', 'b'])
    expect(result.eliminated).toEqual([{ id: 'c', eliminatedBy: 'a' }])
  })

  it('eliminated状態のプレイヤーは衝突判定に含まれない', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 100 }),
      createPlayer({ id: 'b', position: { row: 5, col: 5 }, score: 200, status: 'eliminated' }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors).toEqual(['a'])
    expect(result.eliminated).toEqual([])
  })

  it('invincible状態のプレイヤーは衝突で脱落しない', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 100, status: 'invincible' }),
      createPlayer({ id: 'b', position: { row: 5, col: 5 }, score: 200 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors.sort()).toEqual(['a', 'b'])
    expect(result.eliminated).toEqual([])
  })

  it('複数タイルで同時に衝突が発生する場合、それぞれ独立に解決される', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 1, col: 1 }, score: 100 }),
      createPlayer({ id: 'b', position: { row: 1, col: 1 }, score: 50 }),
      createPlayer({ id: 'c', position: { row: 9, col: 9 }, score: 30 }),
      createPlayer({ id: 'd', position: { row: 9, col: 9 }, score: 80 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors.sort()).toEqual(['a', 'd'])
    expect(result.eliminated).toHaveLength(2)
    expect(result.eliminated.find(e => e.id === 'b')?.eliminatedBy).toBe('a')
    expect(result.eliminated.find(e => e.id === 'c')?.eliminatedBy).toBe('d')
  })

  it('プレイヤーが0人の場合は空の結果を返す', () => {
    // When
    const result = resolveCollisions([])

    // Then
    expect(result.survivors).toEqual([])
    expect(result.eliminated).toEqual([])
  })

  it('1人だけの場合は衝突なしでそのまま生存', () => {
    // Given
    const players: BattlePlayerState[] = [
      createPlayer({ id: 'a', position: { row: 5, col: 5 }, score: 100 }),
    ]

    // When
    const result = resolveCollisions(players)

    // Then
    expect(result.survivors).toEqual(['a'])
    expect(result.eliminated).toEqual([])
  })
})
