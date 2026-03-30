import type { BattlePlayerState, EliminationResult } from '@/battle/types'

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

export function resolveCollisions(players: readonly BattlePlayerState[]): EliminationResult {
  const alivePlayers = players.filter(p => p.status === 'alive' || p.status === 'invincible')

  // タイルごとにグループ化
  const byTile = new Map<string, BattlePlayerState[]>()
  for (const p of alivePlayers) {
    const key = posKey(p.position.row, p.position.col)
    const group = byTile.get(key)
    if (group) {
      group.push(p)
    } else {
      byTile.set(key, [p])
    }
  }

  const survivors: string[] = []
  const eliminated: { id: string; eliminatedBy: string }[] = []

  for (const group of byTile.values()) {
    if (group.length <= 1) {
      if (group.length === 1) survivors.push(group[0].id)
      continue
    }

    // invincible は脱落しない
    const hasInvincible = group.some(p => p.status === 'invincible')
    if (hasInvincible) {
      for (const p of group) survivors.push(p.id)
      continue
    }

    const maxScore = Math.max(...group.map(p => p.score))
    const winners = group.filter(p => p.score === maxScore)
    const losers = group.filter(p => p.score < maxScore)

    if (winners.length > 1 && losers.length === 0) {
      // 全員同点 → 全員生存
      for (const p of group) survivors.push(p.id)
    } else if (winners.length > 1) {
      // 同点最高スコアが複数 + 下位がいる → 同点者は生存、下位は脱落
      for (const w of winners) survivors.push(w.id)
      for (const loser of losers) {
        eliminated.push({ id: loser.id, eliminatedBy: winners[0].id })
      }
    } else {
      // 1人の勝者
      survivors.push(winners[0].id)
      for (const loser of losers) {
        eliminated.push({ id: loser.id, eliminatedBy: winners[0].id })
      }
    }
  }

  return { survivors, eliminated }
}
