import { describe, it, expect } from 'vitest'
import { isWall } from '@/domain/collision'
import type { MazeGrid, Position } from '@/domain/types'

const smallMaze: MazeGrid = {
  width: 5,
  height: 5,
  cells: [
    ['wall', 'wall', 'wall', 'wall', 'wall'],
    ['wall', 'passage', 'passage', 'passage', 'wall'],
    ['wall', 'wall', 'wall', 'passage', 'wall'],
    ['wall', 'passage', 'passage', 'passage', 'wall'],
    ['wall', 'wall', 'wall', 'wall', 'wall'],
  ],
}

describe('isWall', () => {
  it('returns true when the position is a wall cell', () => {
    // Given: a maze and a position that is a wall
    const position: Position = { row: 0, col: 0 }

    // When: checking if the position is a wall
    const result = isWall(smallMaze, position)

    // Then: it should return true
    expect(result).toBe(true)
  })

  it('returns false when the position is a passage cell', () => {
    // Given: a maze and a position that is a passage
    const position: Position = { row: 1, col: 1 }

    // When: checking if the position is a wall
    const result = isWall(smallMaze, position)

    // Then: it should return false
    expect(result).toBe(false)
  })

  it('returns true when the position is an inner wall cell', () => {
    // Given: an inner wall cell at row=2, col=1
    const position: Position = { row: 2, col: 1 }

    // When
    const result = isWall(smallMaze, position)

    // Then
    expect(result).toBe(true)
  })

  it('returns false when the position is a passage in the middle of the maze', () => {
    // Given: a passage cell at row=1, col=3
    const position: Position = { row: 1, col: 3 }

    // When
    const result = isWall(smallMaze, position)

    // Then
    expect(result).toBe(false)
  })

  it('returns true when the position is out of bounds (row below 0)', () => {
    // Given: a position outside the maze boundary
    const position: Position = { row: -1, col: 0 }

    // When
    const result = isWall(smallMaze, position)

    // Then: out-of-bounds is treated as wall
    expect(result).toBe(true)
  })

  it('returns true when the position is out of bounds (row exceeds height)', () => {
    // Given: a position beyond the bottom edge
    const position: Position = { row: 5, col: 0 }

    // When
    const result = isWall(smallMaze, position)

    // Then
    expect(result).toBe(true)
  })

  it('returns true when the position is out of bounds (col below 0)', () => {
    // Given: a position beyond the left edge
    const position: Position = { row: 0, col: -1 }

    // When
    const result = isWall(smallMaze, position)

    // Then
    expect(result).toBe(true)
  })

  it('returns true when the position is out of bounds (col exceeds width)', () => {
    // Given: a position beyond the right edge
    const position: Position = { row: 0, col: 5 }

    // When
    const result = isWall(smallMaze, position)

    // Then
    expect(result).toBe(true)
  })
})
