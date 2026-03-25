import { describe, it, expect } from 'vitest'
import { changeDirection, moveForward } from '@/domain/player'
import type { PlayerState, Direction, Position } from '@/domain/types'

describe('changeDirection', () => {
  it('changes direction from right to up', () => {
    // Given: a player facing right
    const player: PlayerState = { position: { row: 2, col: 2 }, direction: 'right' }

    // When: changing direction to up
    const result = changeDirection(player, 'up')

    // Then: direction should be up, position unchanged
    expect(result.direction).toBe('up')
    expect(result.position).toEqual({ row: 2, col: 2 })
  })

  it('changes direction from up to left', () => {
    // Given: a player facing up
    const player: PlayerState = { position: { row: 1, col: 3 }, direction: 'up' }

    // When: changing direction to left
    const result = changeDirection(player, 'left')

    // Then
    expect(result.direction).toBe('left')
    expect(result.position).toEqual({ row: 1, col: 3 })
  })

  it('returns a new PlayerState object (immutability)', () => {
    // Given
    const player: PlayerState = { position: { row: 0, col: 0 }, direction: 'down' }

    // When
    const result = changeDirection(player, 'right')

    // Then: original player is not mutated
    expect(result).not.toBe(player)
    expect(player.direction).toBe('down')
  })

  it('keeps same direction when changing to the current direction', () => {
    // Given: a player already facing down
    const player: PlayerState = { position: { row: 3, col: 1 }, direction: 'down' }

    // When: changing direction to down again
    const result = changeDirection(player, 'down')

    // Then
    expect(result.direction).toBe('down')
  })
})

describe('moveForward', () => {
  it('moves up by decrementing row by 1', () => {
    // Given: a player facing up at row=2, col=2
    const player: PlayerState = { position: { row: 2, col: 2 }, direction: 'up' }

    // When
    const result: Position = moveForward(player)

    // Then: row decreases by 1
    expect(result).toEqual({ row: 1, col: 2 })
  })

  it('moves down by incrementing row by 1', () => {
    // Given: a player facing down at row=2, col=2
    const player: PlayerState = { position: { row: 2, col: 2 }, direction: 'down' }

    // When
    const result: Position = moveForward(player)

    // Then: row increases by 1
    expect(result).toEqual({ row: 3, col: 2 })
  })

  it('moves left by decrementing col by 1', () => {
    // Given: a player facing left at row=2, col=2
    const player: PlayerState = { position: { row: 2, col: 2 }, direction: 'left' }

    // When
    const result: Position = moveForward(player)

    // Then: col decreases by 1
    expect(result).toEqual({ row: 2, col: 1 })
  })

  it('moves right by incrementing col by 1', () => {
    // Given: a player facing right at row=2, col=2
    const player: PlayerState = { position: { row: 2, col: 2 }, direction: 'right' }

    // When
    const result: Position = moveForward(player)

    // Then: col increases by 1
    expect(result).toEqual({ row: 2, col: 3 })
  })

  it('does not mutate the original player state', () => {
    // Given
    const player: PlayerState = { position: { row: 1, col: 1 }, direction: 'right' }

    // When
    moveForward(player)

    // Then: original position is unchanged
    expect(player.position).toEqual({ row: 1, col: 1 })
  })
})
