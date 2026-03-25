import { describe, it, expect } from 'vitest'
import { isGoalReached } from '@/domain/goal'
import type { Position } from '@/domain/types'

describe('isGoalReached', () => {
  it('returns true when player position equals goal position', () => {
    // Given: player and goal at the same position
    const playerPosition: Position = { row: 3, col: 3 }
    const goalPosition: Position = { row: 3, col: 3 }

    // When
    const result = isGoalReached(playerPosition, goalPosition)

    // Then
    expect(result).toBe(true)
  })

  it('returns false when player row differs from goal row', () => {
    // Given: player and goal with different rows
    const playerPosition: Position = { row: 2, col: 3 }
    const goalPosition: Position = { row: 3, col: 3 }

    // When
    const result = isGoalReached(playerPosition, goalPosition)

    // Then
    expect(result).toBe(false)
  })

  it('returns false when player col differs from goal col', () => {
    // Given: player and goal with different cols
    const playerPosition: Position = { row: 3, col: 2 }
    const goalPosition: Position = { row: 3, col: 3 }

    // When
    const result = isGoalReached(playerPosition, goalPosition)

    // Then
    expect(result).toBe(false)
  })

  it('returns false when both row and col differ', () => {
    // Given: player and goal at completely different positions
    const playerPosition: Position = { row: 1, col: 1 }
    const goalPosition: Position = { row: 3, col: 3 }

    // When
    const result = isGoalReached(playerPosition, goalPosition)

    // Then
    expect(result).toBe(false)
  })

  it('returns true when both player and goal are at origin', () => {
    // Given: both at row=0, col=0
    const playerPosition: Position = { row: 0, col: 0 }
    const goalPosition: Position = { row: 0, col: 0 }

    // When
    const result = isGoalReached(playerPosition, goalPosition)

    // Then
    expect(result).toBe(true)
  })
})
