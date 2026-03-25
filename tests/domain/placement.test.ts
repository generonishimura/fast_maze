import { describe, it, expect } from 'vitest'
import { placeStartAndGoal, chooseInitialDirection } from '@/domain/placement'
import { generateMaze } from '@/domain/maze-generator'

describe('placeStartAndGoal', () => {
  it('startとgoalがok結果として返る', () => {
    // Given: 有効な迷路
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When: start/goalを配置
    const result = placeStartAndGoal(maze, 42)

    // Then: 成功する
    expect(result.ok).toBe(true)
  })

  it('startは通路セル（奇数行・奇数列）に配置される', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then
    const { start } = result.value
    expect(start.row % 2).toBe(1)
    expect(start.col % 2).toBe(1)
    expect(maze.cells[start.row][start.col]).toBe('passage')
  })

  it('goalは通路セル（奇数行・奇数列）に配置される', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then
    const { goal } = result.value
    expect(goal.row % 2).toBe(1)
    expect(goal.col % 2).toBe(1)
    expect(maze.cells[goal.row][goal.col]).toBe('passage')
  })

  it('startとgoalは異なる位置になる', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then
    const { start, goal } = result.value
    expect(start.row !== goal.row || start.col !== goal.col).toBe(true)
  })

  it('異なるシードで異なる配置になる（三角測量）', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result1 = placeStartAndGoal(maze, 1)
    const result2 = placeStartAndGoal(maze, 999)
    if (!result1.ok || !result2.ok) throw new Error('placement failed')

    // Then: 同じシードなら同じ、異なるシードは異なりうる（少なくとも片方は異なるはず）
    const same =
      result1.value.start.row === result2.value.start.row &&
      result1.value.start.col === result2.value.start.col &&
      result1.value.goal.row === result2.value.goal.row &&
      result1.value.goal.col === result2.value.goal.col
    expect(same).toBe(false)
  })

  it('同じシードで常に同じ配置を返す（決定論的）', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result1 = placeStartAndGoal(maze, 42)
    const result2 = placeStartAndGoal(maze, 42)

    // Then
    expect(result1).toEqual(result2)
  })
})

describe('chooseInitialDirection', () => {
  it('有効な方向をok結果として返す', () => {
    // Given: 迷路とその中の通路セル
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    const placementResult = placeStartAndGoal(maze, 42)
    if (!placementResult.ok) throw new Error('placement failed')
    const { start } = placementResult.value

    // When
    const result = chooseInitialDirection(maze, start, 42)

    // Then
    expect(result.ok).toBe(true)
  })

  it('選択された方向が実際に通路である', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    const placementResult = placeStartAndGoal(maze, 42)
    if (!placementResult.ok) throw new Error('placement failed')
    const { start } = placementResult.value

    // When
    const result = chooseInitialDirection(maze, start, 42)
    if (!result.ok) throw new Error('direction selection failed')

    // Then: その方向の隣接セルが通路であることを確認
    const direction = result.value
    const neighborMap = {
      up: { row: start.row - 1, col: start.col },
      down: { row: start.row + 1, col: start.col },
      left: { row: start.row, col: start.col - 1 },
      right: { row: start.row, col: start.col + 1 },
    }
    const neighbor = neighborMap[direction]
    expect(maze.cells[neighbor.row][neighbor.col]).toBe('passage')
  })

  it('返り値はDirection型の値である', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    const placementResult = placeStartAndGoal(maze, 42)
    if (!placementResult.ok) throw new Error('placement failed')
    const { start } = placementResult.value

    // When
    const result = chooseInitialDirection(maze, start, 42)
    if (!result.ok) throw new Error('direction selection failed')

    // Then
    const validDirections = ['up', 'down', 'left', 'right']
    expect(validDirections).toContain(result.value)
  })

  it('有効な方向が存在しない孤立セルではerrを返す', () => {
    // Given: 四方を壁で囲まれた通路セル（完全に孤立）
    const maze = {
      width: 5,
      height: 5,
      cells: [
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'wall', 'passage', 'wall', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall'],
      ] as const,
    }
    const position = { row: 2, col: 2 }

    // When
    const result = chooseInitialDirection(maze, position, 42)

    // Then
    expect(result.ok).toBe(false)
  })

  it('同じシードで同じ方向を返す（決定論的）', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    const placementResult = placeStartAndGoal(maze, 42)
    if (!placementResult.ok) throw new Error('placement failed')
    const { start } = placementResult.value

    // When
    const result1 = chooseInitialDirection(maze, start, 42)
    const result2 = chooseInitialDirection(maze, start, 42)

    // Then
    expect(result1).toEqual(result2)
  })
})
