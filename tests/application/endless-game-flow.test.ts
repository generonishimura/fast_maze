import { describe, it, expect } from 'vitest'
import { initEndless, endlessTick, handleEndlessDirectionChange } from '@/application/endless-game-flow'
import { getWorldCell, ensureChunksAround, ensureChunkAt, CHUNK_INNER_SIZE } from '@/domain/endless-maze'

describe('initEndless', () => {
  it('プレイヤーがチャンク中央付近のpassage上に配置される', () => {
    const state = initEndless(42)

    expect(state.status).toBe('playing')
    expect(state.score).toBe(0)
    expect(state.distance).toBe(0)
    expect(state.streak).toBe(0)
    expect(state.visited.size).toBe(1)

    const cell = getWorldCell(state.maze, state.player.position.row, state.player.position.col)
    expect(cell).toBe('passage')
  })
})

describe('endlessTick', () => {
  it('新しいマスを進むとスコアとdistanceが増える', () => {
    let state = initEndless(42)

    const next = endlessTick(state)
    if (next.status !== 'game-over') {
      expect(next.score).toBeGreaterThan(0)
      expect(next.distance).toBe(1)
      expect(next.streak).toBe(1)
    }
  })

  it('同じマスを通るとスコアが増えずstreakがリセットされる', () => {
    let state = initEndless(42)

    // 右に1歩
    state = endlessTick(state)
    if (state.status === 'game-over') return
    const scoreAfterFirst = state.score

    // 左を向いて戻る
    state = handleEndlessDirectionChange(state, 'left')
    state = endlessTick(state)
    if (state.status === 'game-over') return

    // 戻ったマスは訪問済みなのでスコア変わらず
    expect(state.score).toBe(scoreAfterFirst)
    expect(state.streak).toBe(0)
  })

  it('壁に当たるとgame-overになる', () => {
    let state = initEndless(42)

    for (let i = 0; i < 100; i++) {
      state = endlessTick(state)
      if (state.status === 'game-over') break
    }

    expect(state.status).toBe('game-over')
  })
})

describe('handleEndlessDirectionChange', () => {
  it('方向を変更できる', () => {
    const state = initEndless(42)
    const changed = handleEndlessDirectionChange(state, 'left')
    expect(changed.player.direction).toBe('left')
  })
})

describe('endlessTick - パフォーマンス最適化', () => {
  it('チャンクが変わらない場合fruitsのMapインスタンスが同一', () => {
    let state = initEndless(42)

    // 1歩進む（同一チャンク内）
    const next = endlessTick(state)
    if (next.status === 'game-over') return

    // もう1歩（まだ同一チャンク内のはず）
    const next2 = endlessTick(next)
    if (next2.status === 'game-over') return

    // 果物を取得していなければ、fruitsは同じインスタンスであるべき
    if (next2.collectedFruit === null && next.maze === next2.maze) {
      expect(next2.fruits).toBe(next.fruits)
    }
  })

  it('チャンクがプルーニングされたら対応するフルーツも削除される', () => {
    const state = initEndless(42)

    // 初期状態でチャンク(0,0)に果物がある
    const chunk00Fruits = [...state.fruits].filter(([, f]) => {
      const cx = Math.floor(f.col / CHUNK_INNER_SIZE)
      const cy = Math.floor(f.row / CHUNK_INNER_SIZE)
      return cx === 0 && cy === 0
    })
    expect(chunk00Fruits.length).toBeGreaterThan(0)

    // プレイヤーをKEEP_RADIUS境界ギリギリに配置し、1歩でプルーニングを発生させる
    // CHUNK_KEEP_RADIUS=3なので、プレイヤーがチャンク(4,0)にいて右に進むと
    // チャンク(0,0)は|0 - 4| = 4 > 3でプルーニング対象になる
    // ただしensureChunksAroundはプレイヤーの「次の位置」で呼ばれるため、
    // プレイヤーをチャンク(3,0)の右端に置き、次の位置がチャンク(4,0)に入るようにする
    const playerCol = CHUNK_INNER_SIZE * 3 + CHUNK_INNER_SIZE - 2 // チャンク(3,0)の右端付近

    // チャンク(3,0)周辺を事前生成（プレイヤーが通路上にいるために必要）
    let maze = state.maze
    for (let cx = -2; cx <= 5; cx++) {
      for (let cy = -1; cy <= 1; cy++) {
        maze = ensureChunkAt(maze, cy, cx)
      }
    }

    // 通路のセルを見つける
    let startCol = playerCol
    for (let c = playerCol; c > CHUNK_INNER_SIZE * 3; c--) {
      if (getWorldCell(maze, 1, c) === 'passage' &&
          getWorldCell(maze, 1, c + 1) === 'passage') {
        startCol = c
        break
      }
    }

    const farState: typeof state = {
      ...state,
      maze,
      player: { position: { row: 1, col: startCol }, direction: 'right' },
    }

    // tickで1歩進む → ensureChunksAroundがチャンク(3 or 4, 0)中心で実行される
    const result = endlessTick(farState)
    if (result.status === 'game-over') return

    // プレイヤーの位置のチャンク座標
    const resultCx = Math.floor(result.player.position.col / CHUNK_INNER_SIZE)

    // 結果のmaze内に存在しないチャンクのフルーツが含まれていないことを確認
    for (const [, fruit] of result.fruits) {
      const cx = Math.floor(fruit.col / CHUNK_INNER_SIZE)
      const cy = Math.floor(fruit.row / CHUNK_INNER_SIZE)
      const key = `${cx},${cy}`
      expect(result.maze.chunks.has(key)).toBe(true)
    }
  })
})
