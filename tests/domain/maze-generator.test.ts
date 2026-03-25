import { describe, it, expect } from 'vitest'
import { generateMaze } from '@/domain/maze-generator'

describe('generateMaze', () => {
  it('指定した寸法の迷路を生成する (5x5)', () => {
    const result = generateMaze(5, 5, 42)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.width).toBe(5)
    expect(result.value.height).toBe(5)
    expect(result.value.cells.length).toBe(5)
    expect(result.value.cells[0].length).toBe(5)
  })

  it('外周が全て壁である', () => {
    const result = generateMaze(11, 11, 42)
    if (!result.ok) return

    const { cells, width, height } = result.value
    // 上辺と下辺
    for (let col = 0; col < width; col++) {
      expect(cells[0][col]).toBe('wall')
      expect(cells[height - 1][col]).toBe('wall')
    }
    // 左辺と右辺
    for (let row = 0; row < height; row++) {
      expect(cells[row][0]).toBe('wall')
      expect(cells[row][width - 1]).toBe('wall')
    }
  })

  it('奇数行・奇数列の位置に通路セルが存在する', () => {
    const result = generateMaze(11, 11, 42)
    if (!result.ok) return

    const { cells } = result.value
    let passageCount = 0
    for (let row = 1; row < 10; row += 2) {
      for (let col = 1; col < 10; col += 2) {
        if (cells[row][col] === 'passage') passageCount++
      }
    }
    // 5x5のpassageセル = 25個全てがpassageであるべき
    expect(passageCount).toBe(25)
  })

  it('偶数サイズを指定するとエラーを返す', () => {
    const result = generateMaze(10, 10, 42)
    expect(result.ok).toBe(false)
  })

  it('3未満のサイズを指定するとエラーを返す', () => {
    const result = generateMaze(1, 1, 42)
    expect(result.ok).toBe(false)
  })

  it('同じシードで同じ迷路を生成する', () => {
    const result1 = generateMaze(11, 11, 42)
    const result2 = generateMaze(11, 11, 42)

    expect(result1).toEqual(result2)
  })

  it('異なるシードで異なる迷路を生成する', () => {
    const result1 = generateMaze(11, 11, 42)
    const result2 = generateMaze(11, 11, 99)

    if (!result1.ok || !result2.ok) return
    expect(result1.value.cells).not.toEqual(result2.value.cells)
  })

  it('7x7でも正しく生成する（三角測量）', () => {
    const result = generateMaze(7, 7, 42)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.width).toBe(7)
    expect(result.value.height).toBe(7)
  })
})
