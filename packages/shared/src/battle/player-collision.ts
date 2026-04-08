import type { BattlePlayerState, EliminationResult } from '@/battle/types'

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

export function resolveCollisions(players: readonly BattlePlayerState[]): EliminationResult {
  const activePlayers = players.filter(p => p.status === 'alive' || p.status === 'invincible')

  // タイルごとにグループ化
  const byTile = new Map<string, BattlePlayerState[]>()
  for (const p of activePlayers) {
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

    // invincibleは人畜無害: 衝突に関与しない（死なないし殺さない）
    const invincibles = group.filter(p => p.status === 'invincible')
    const alives = group.filter(p => p.status === 'alive')

    for (const p of invincibles) {
      survivors.push(p.id)
    }

    if (alives.length <= 1) {
      if (alives.length === 1) survivors.push(alives[0].id)
      continue
    }

    // alive同士の衝突: スコア最高者が勝ち
    const maxScore = Math.max(...alives.map(p => p.score))
    const winners = alives.filter(p => p.score === maxScore)

    if (winners.length === 1) {
      survivors.push(winners[0].id)
      for (const p of alives) {
        if (p.id !== winners[0].id) {
          eliminated.push({ id: p.id, eliminatedBy: winners[0].id })
        }
      }
    } else {
      // 同点 → alive全員脱落
      for (const p of alives) {
        eliminated.push({ id: p.id, eliminatedBy: 'collision' })
      }
    }
  }

  return { survivors, eliminated }
}
