import type { StageConfig } from '@/domain/types'

export const calculateStageConfig = (stageNumber: number): StageConfig => {
  const mazeSize = 19 + stageNumber * 2
  const tileSpeed = 5.0 + (stageNumber - 1) * 0.5

  return {
    stageNumber,
    mazeWidth: mazeSize,
    mazeHeight: mazeSize,
    tileSpeed,
  }
}

export const calculateScore = (currentScore: number, stageNumber: number): number => {
  return currentScore + stageNumber * 1000
}
