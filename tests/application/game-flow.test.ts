import { describe, it, expect } from 'vitest'
import { initStage, tick, handleDirectionChange } from '@/application/game-flow'

describe('initStage', () => {
  it('ステージ1の有効なGameStateを返す', () => {
    const result = initStage(1, 42)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const state = result.value
    expect(state.stage.stageNumber).toBe(1)
    expect(state.stage.mazeWidth).toBe(21)
    expect(state.stage.mazeHeight).toBe(21)
    expect(state.maze.width).toBe(21)
    expect(state.maze.height).toBe(21)
    expect(state.status).toBe('playing')
    expect(state.score).toBe(0)
  })

  it('プレイヤーが通路セルに配置される', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const { maze, player } = result.value
    expect(maze.cells[player.position.row][player.position.col]).toBe('passage')
  })

  it('ゴールが通路セルに配置される', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const { maze, goal } = result.value
    expect(maze.cells[goal.row][goal.col]).toBe('passage')
  })

  it('プレイヤーとゴールが異なる位置にある', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const { player, goal } = result.value
    expect(
      player.position.row !== goal.row || player.position.col !== goal.col
    ).toBe(true)
  })

  it('プレイヤーの初期方向が壁でない', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const { maze, player } = result.value
    const { row, col } = player.position
    const dir = player.direction

    const offsets = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] } as const
    const [dr, dc] = offsets[dir]
    expect(maze.cells[row + dr][col + dc]).toBe('passage')
  })

  it('既存スコアを引き継げる', () => {
    const result = initStage(2, 42, 1000)
    if (!result.ok) return

    expect(result.value.score).toBe(1000)
    expect(result.value.stage.stageNumber).toBe(2)
  })
})

describe('tick', () => {
  it('プレイヤーを現在の方向に1マス進める', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const state = result.value
    const nextState = tick(state)

    // statusがplayingなら移動している
    if (nextState.status === 'playing') {
      expect(
        nextState.player.position.row !== state.player.position.row ||
        nextState.player.position.col !== state.player.position.col
      ).toBe(true)
    }
  })

  it('壁に衝突するとgame-overになる', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    // 壁に向かう方向を見つけてセット
    const { maze } = result.value
    const offsets = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] } as const
    const directions = ['up', 'down', 'left', 'right'] as const

    // 壁に向いている方向を探す
    let wallDirection: typeof directions[number] | null = null
    const pos = result.value.player.position
    for (const dir of directions) {
      const [dr, dc] = offsets[dir]
      const nextRow = pos.row + dr
      const nextCol = pos.col + dc
      if (
        nextRow >= 0 && nextRow < maze.height &&
        nextCol >= 0 && nextCol < maze.width &&
        maze.cells[nextRow][nextCol] === 'wall'
      ) {
        wallDirection = dir
        break
      }
    }

    if (!wallDirection) return // 全方向通路なら（稀）スキップ

    const stateWithWallDir = handleDirectionChange(result.value, wallDirection)
    const afterTick = tick(stateWithWallDir)

    expect(afterTick.status).toBe('game-over')
  })

  it('ゴールに到達するとstage-clearになる', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    // ゴール位置の隣に強制配置してテスト
    const { maze, goal, stage } = result.value
    const state = {
      ...result.value,
      player: {
        position: { row: goal.row, col: goal.col - 1 },
        direction: 'right' as const,
      },
    }

    // goal.col - 1 が通路でなければスキップ
    if (maze.cells[goal.row][goal.col - 1] !== 'passage') return

    const afterTick = tick(state)
    expect(afterTick.status).toBe('stage-clear')
  })

  it('game-over状態ではtickしても変化しない', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const gameOverState = { ...result.value, status: 'game-over' as const }
    const afterTick = tick(gameOverState)

    expect(afterTick).toEqual(gameOverState)
  })
})

describe('handleDirectionChange', () => {
  it('方向を変更する', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const state = result.value
    const newState = handleDirectionChange(state, 'down')

    expect(newState.player.direction).toBe('down')
  })

  it('game-over状態では方向変更できない', () => {
    const result = initStage(1, 42)
    if (!result.ok) return

    const gameOverState = { ...result.value, status: 'game-over' as const }
    const newState = handleDirectionChange(gameOverState, 'down')

    expect(newState).toEqual(gameOverState)
  })
})
