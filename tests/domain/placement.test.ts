import { describe, it, expect } from 'vitest'
import { placeStartAndGoal } from '@/domain/placement'
import { generateMaze } from '@/domain/maze-generator'
import { MazeGrid } from '@/domain/types'

// 検証用: 左右ペア or 上下ペアかどうか
function isOppositeWalls(
  maze: MazeGrid,
  start: { row: number; col: number },
  goal: { row: number; col: number }
): boolean {
  const leftWall = start.col === 0 && goal.col === maze.width - 1
  const rightWall = start.col === maze.width - 1 && goal.col === 0
  const topWall = start.row === 0 && goal.row === maze.height - 1
  const bottomWall = start.row === maze.height - 1 && goal.row === 0
  return leftWall || rightWall || topWall || bottomWall
}

describe('placeStartAndGoal', () => {
  it('スタートが外壁上にある', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: startは外壁（row=0, row=height-1, col=0, col=width-1のいずれか）
    const { start } = result.value
    const isOnBorder =
      start.row === 0 ||
      start.row === maze.height - 1 ||
      start.col === 0 ||
      start.col === maze.width - 1
    expect(isOnBorder).toBe(true)
  })

  it('ゴールが外壁上にある', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: goalは外壁上にある
    const { goal } = result.value
    const isOnBorder =
      goal.row === 0 ||
      goal.row === maze.height - 1 ||
      goal.col === 0 ||
      goal.col === maze.width - 1
    expect(isOnBorder).toBe(true)
  })

  it('スタートとゴールは対辺にある', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: 左右ペアまたは上下ペア
    const { start, goal } = result.value
    expect(isOppositeWalls(maze, start, goal)).toBe(true)
  })

  it('スタート位置のセルがpassageに変更されている', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: 変更後の迷路でstart位置がpassage
    const { start, maze: newMaze } = result.value
    expect(newMaze.cells[start.row][start.col]).toBe('passage')
  })

  it('ゴール位置のセルがpassageに変更されている', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: 変更後の迷路でgoal位置がpassage
    const { goal, maze: newMaze } = result.value
    expect(newMaze.cells[goal.row][goal.col]).toBe('passage')
  })

  it('スタートに隣接する内部セルがpassageである', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: startから迷路内部方向の隣接セルがpassage
    const { start, maze: newMaze } = result.value
    let innerRow = start.row
    let innerCol = start.col
    if (start.col === 0) innerCol = 1
    else if (start.col === newMaze.width - 1) innerCol = newMaze.width - 2
    else if (start.row === 0) innerRow = 1
    else if (start.row === newMaze.height - 1) innerRow = newMaze.height - 2

    expect(newMaze.cells[innerRow][innerCol]).toBe('passage')
  })

  it('ゴールに隣接する内部セルがpassageである', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: goalから迷路内部方向の隣接セルがpassage
    const { goal, maze: newMaze } = result.value
    let innerRow = goal.row
    let innerCol = goal.col
    if (goal.col === 0) innerCol = 1
    else if (goal.col === newMaze.width - 1) innerCol = newMaze.width - 2
    else if (goal.row === 0) innerRow = 1
    else if (goal.row === newMaze.height - 1) innerRow = newMaze.height - 2

    expect(newMaze.cells[innerRow][innerCol]).toBe('passage')
  })

  it('startDirectionがスタートから迷路内部へ向かう方向である', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result = placeStartAndGoal(maze, 42)
    if (!result.ok) throw new Error('placement failed')

    // Then: 壁の位置から期待されるdirectionと一致する
    const { start, startDirection } = result.value
    const { maze: newMaze } = result.value
    let expectedDirection: string
    if (start.col === 0) expectedDirection = 'right'
    else if (start.col === newMaze.width - 1) expectedDirection = 'left'
    else if (start.row === 0) expectedDirection = 'down'
    else expectedDirection = 'up'

    expect(startDirection).toBe(expectedDirection)
  })

  it('同じシードで同じ結果を返す（決定論的）', () => {
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

  it('異なるシードで異なる配置になりうる', () => {
    // Given
    const mazeResult = generateMaze(11, 11, 42)
    if (!mazeResult.ok) throw new Error('maze generation failed')
    const maze = mazeResult.value

    // When
    const result1 = placeStartAndGoal(maze, 1)
    const result2 = placeStartAndGoal(maze, 999)
    if (!result1.ok || !result2.ok) throw new Error('placement failed')

    // Then: 同じ迷路に対してシードが違えば結果が異なりうる
    const same =
      result1.value.start.row === result2.value.start.row &&
      result1.value.start.col === result2.value.start.col &&
      result1.value.goal.row === result2.value.goal.row &&
      result1.value.goal.col === result2.value.goal.col
    expect(same).toBe(false)
  })
})
