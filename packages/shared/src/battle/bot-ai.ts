import type { Direction, Position } from '@/domain/types'
import type { EndlessMazeState } from '@/domain/endless-maze'
import { getWorldCell } from '@/domain/endless-maze'

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function dirOffset(dir: Direction): { dr: number; dc: number } {
  switch (dir) {
    case 'up': return { dr: -1, dc: 0 }
    case 'down': return { dr: 1, dc: 0 }
    case 'left': return { dr: 0, dc: -1 }
    case 'right': return { dr: 0, dc: 1 }
  }
}

/**
 * ボットの方向選択ロジック
 *
 * 優先順位:
 * 1. 現在の方向が通路 → 直進
 * 2. 直進が壁 → Uターン以外の通路方向からランダム選択
 * 3. Uターンしか選択肢がない → Uターン（行き止まり）
 */
export function chooseBotDirection(
  maze: EndlessMazeState,
  position: Position,
  currentDirection: Direction,
): Direction {
  // 各方向の通路判定
  const passableDirections = ALL_DIRECTIONS.filter(dir => {
    const { dr, dc } = dirOffset(dir)
    return getWorldCell(maze, position.row + dr, position.col + dc) === 'passage'
  })

  if (passableDirections.length === 0) {
    return currentDirection // どこにも行けない（ありえないが安全策）
  }

  // 1. 直進が通路 → そのまま
  if (passableDirections.includes(currentDirection)) {
    return currentDirection
  }

  // 2. Uターン以外の通路方向を探す
  const nonReverse = passableDirections.filter(d => d !== OPPOSITE[currentDirection])
  if (nonReverse.length > 0) {
    return nonReverse[Math.floor(Math.random() * nonReverse.length)]
  }

  // 3. Uターンのみ（行き止まり）
  return OPPOSITE[currentDirection]
}
