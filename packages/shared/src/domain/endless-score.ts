type ScoreInput = {
  readonly isNewTile: boolean
  readonly streak: number
}

export function calculateEndlessScore(input: ScoreInput): { score: number; streak: number } {
  if (!input.isNewTile) {
    return { score: 0, streak: 0 }
  }

  // 新しいマスを踏むたびに加点。連続で新マスを踏むとストリークボーナス
  const newStreak = input.streak + 1
  const base = 10
  const streakBonus = Math.floor(newStreak / 5)

  return {
    score: base + streakBonus,
    streak: newStreak,
  }
}
