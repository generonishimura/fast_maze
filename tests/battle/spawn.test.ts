import { generateSpawnPositions, SPAWN_SALT, MIN_SPAWN_DISTANCE } from '@/battle/spawn'
import { createEndlessMaze, ensureChunksAround, getWorldCell } from '@/domain/endless-maze'

describe('generateSpawnPositions', () => {
  const seed = 12345
  const maze = ensureChunksAround(createEndlessMaze(seed), 0, 0, 3)

  it('64箇所のスポーン位置を生成する', () => {
    // When
    const spawns = generateSpawnPositions(maze, seed, 64)

    // Then
    expect(spawns).toHaveLength(64)
  })

  it('全てのスポーン位置が通路上にある', () => {
    // When
    const spawns = generateSpawnPositions(maze, seed, 64)

    // Then
    for (const pos of spawns) {
      expect(getWorldCell(maze, pos.row, pos.col)).toBe('passage')
    }
  })

  it('各スポーンは隣接通路を2つ以上持つ（行き止まりでない）', () => {
    // When
    const spawns = generateSpawnPositions(maze, seed, 64)

    // Then
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ]
    for (const pos of spawns) {
      const adjacentPassages = directions.filter(
        d => getWorldCell(maze, pos.row + d.dr, pos.col + d.dc) === 'passage'
      ).length
      expect(adjacentPassages).toBeGreaterThanOrEqual(2)
    }
  })

  it('スポーン間の最小マンハッタン距離を満たす', () => {
    // When
    const spawns = generateSpawnPositions(maze, seed, 64)

    // Then
    for (let i = 0; i < spawns.length; i++) {
      for (let j = i + 1; j < spawns.length; j++) {
        const dist = Math.abs(spawns[i].row - spawns[j].row) + Math.abs(spawns[i].col - spawns[j].col)
        expect(dist).toBeGreaterThanOrEqual(MIN_SPAWN_DISTANCE)
      }
    }
  })

  it('同じシードなら同じスポーン位置を返す（決定論的）', () => {
    // When
    const spawns1 = generateSpawnPositions(maze, seed, 64)
    const spawns2 = generateSpawnPositions(maze, seed, 64)

    // Then
    expect(spawns1).toEqual(spawns2)
  })

  it('異なるシードなら異なるスポーン位置を返す', () => {
    const maze2 = ensureChunksAround(createEndlessMaze(99999), 0, 0, 3)

    // When
    const spawns1 = generateSpawnPositions(maze, seed, 64)
    const spawns2 = generateSpawnPositions(maze2, 99999, 64)

    // Then
    const set1 = new Set(spawns1.map(p => `${p.row},${p.col}`))
    const set2 = new Set(spawns2.map(p => `${p.row},${p.col}`))
    // 完全一致はほぼありえない
    const overlap = [...set1].filter(k => set2.has(k)).length
    expect(overlap).toBeLessThan(spawns1.length)
  })

  it('少数のスポーン（8人）でも動作する', () => {
    // When
    const spawns = generateSpawnPositions(maze, seed, 8)

    // Then
    expect(spawns).toHaveLength(8)
  })

  it('全スポーンが重複しない', () => {
    // When
    const spawns = generateSpawnPositions(maze, seed, 64)

    // Then
    const keys = spawns.map(p => `${p.row},${p.col}`)
    expect(new Set(keys).size).toBe(64)
  })
})
