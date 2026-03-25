import { Direction, GameState, Result, ok, err } from '@/domain/types'
import { generateMaze } from '@/domain/maze-generator'
import { placeStartAndGoal } from '@/domain/placement'
import { calculateStageConfig } from '@/domain/stage'
import { moveForward, changeDirection } from '@/domain/player'
import { isWall } from '@/domain/collision'
import { isGoalReached } from '@/domain/goal'

export function initStage(stageNumber: number, seed: number, currentScore = 0): Result<GameState> {
  const stage = calculateStageConfig(stageNumber)

  const mazeResult = generateMaze(stage.mazeWidth, stage.mazeHeight, seed)
  if (!mazeResult.ok) return err(mazeResult.error)

  const placementResult = placeStartAndGoal(mazeResult.value, seed + 1)
  if (!placementResult.ok) return err(placementResult.error)

  const { start, goal, startDirection, maze } = placementResult.value

  return ok({
    maze,
    player: { position: start, direction: startDirection },
    goal,
    stage,
    score: currentScore,
    status: 'playing',
  })
}

export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state

  const nextPosition = moveForward(state.player)

  if (isWall(state.maze, nextPosition)) {
    return { ...state, status: 'game-over' }
  }

  if (isGoalReached(nextPosition, state.goal)) {
    return {
      ...state,
      player: { ...state.player, position: nextPosition },
      status: 'stage-clear',
    }
  }

  return {
    ...state,
    player: { ...state.player, position: nextPosition },
  }
}

export function handleDirectionChange(state: GameState, direction: Direction): GameState {
  if (state.status !== 'playing') return state

  return {
    ...state,
    player: changeDirection(state.player, direction),
  }
}
