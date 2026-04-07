import { ColyseusSDK } from "@colyseus/sdk"
import { createEndlessMaze, ensureChunksAround } from "@/domain/endless-maze"
import { chooseBotDirection } from "@/battle/bot-ai"
import type { EndlessMazeState } from "@/domain/endless-maze"
import type { Direction } from "@/domain/types"

const SERVER_URL = process.env.SERVER_URL ?? "ws://localhost:2567"
const BOT_COUNT = parseInt(process.env.BOT_COUNT ?? "40", 10)
const STAGGER_MS = 200
const REJOIN_DELAY_MS = 2000

let stopped = false
/** 全ボットが同じルームに入るための共有ID */
let sharedRoomId: string | null = null

/** ルームに参加→ゲーム→onLeaveでresolve */
function playOneRound(client: ColyseusSDK, name: string): Promise<void> {
  return new Promise<void>(async (resolve) => {
    let room: Awaited<ReturnType<ColyseusSDK['joinOrCreate']>>
    try {
      // 既存ルームがあればそこに入る
      if (sharedRoomId) {
        try {
          room = await client.joinById(sharedRoomId, { isBot: true })
        } catch {
          // 既存ルームが無効なら新規作成
          sharedRoomId = null
          room = await client.joinOrCreate("battle", { isBot: true })
        }
      } else {
        room = await client.joinOrCreate("battle", { isBot: true })
      }
    } catch (e) {
      console.error(`[${name}] join failed: ${(e as Error).message}`)
      resolve()
      return
    }

    sharedRoomId = room.roomId
    console.log(`[${name}] joined room ${room.roomId}`)

    let maze: EndlessMazeState | null = null
    let myPos = { row: 0, col: 0 }
    let myDir: Direction = 'right'
    let gameStarted = false
    let thinkTimer: ReturnType<typeof setInterval> | null = null

    function cleanup() {
      gameStarted = false
      if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null }
    }

    function startThinking() {
      if (thinkTimer) return
      const thinkMs = 150 + Math.floor(Math.random() * 100)
      thinkTimer = setInterval(() => {
        if (!maze || !gameStarted) return
        maze = ensureChunksAround(maze!, myPos.row, myPos.col, { skipPrune: true })
        const newDir = chooseBotDirection(maze, myPos, myDir)
        myDir = newDir
        room.send("direction", { direction: newDir })
      }, thinkMs)
    }

    room.onMessage("gameStart", (data: { seed: number; spawnPositions: Record<string, { row: number; col: number }> }) => {
      console.log(`[${name}] game started`)
      maze = createEndlessMaze(data.seed)
      const spawn = data.spawnPositions[room.sessionId]
      if (spawn) {
        myPos = spawn
        maze = ensureChunksAround(maze!, myPos.row, myPos.col, { skipPrune: true })
      }
      gameStarted = true
      startThinking()
    })

    room.onStateChange((state: unknown) => {
      const s = state as { players?: { forEach?: (cb: (p: { row: number; col: number; direction: string; status: string }, id: string) => void) => void } }
      if (!s.players?.forEach) return

      s.players.forEach((p, id) => {
        if (id === room.sessionId) {
          myPos = { row: p.row, col: p.col }
          myDir = p.direction as Direction
          if (p.status === 'eliminated' && gameStarted) {
            console.log(`[${name}] eliminated`)
            gameStarted = false
            if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null }
          }
          // リスポーン検知
          if ((p.status === 'invincible' || p.status === 'alive') && !gameStarted) {
            console.log(`[${name}] respawned`)
            gameStarted = true
            startThinking()
          }
        }
      })
    })

    room.onMessage("gameEnd", () => {
      console.log(`[${name}] game ended`)
      cleanup()
    })

    room.onLeave(() => {
      console.log(`[${name}] left room`)
      cleanup()
      // ルームが破棄されたのでリセット
      if (sharedRoomId === room.roomId) sharedRoomId = null
      resolve()
    })

    room.send("ready", { isBot: true })
  })
}

/** ボット1体の無限ループ */
async function botLoop(client: ColyseusSDK, name: string, index: number) {
  while (!stopped) {
    // スタガー: ボットが一斉にjoinしないように
    await new Promise(r => setTimeout(r, index * STAGGER_MS))
    await playOneRound(client, name)
    if (stopped) break
    console.log(`[${name}] rejoining in ${REJOIN_DELAY_MS / 1000}s...`)
    await new Promise(r => setTimeout(r, REJOIN_DELAY_MS))
  }
}

async function main() {
  console.log(`Starting ${BOT_COUNT} bots → ${SERVER_URL}`)

  const loops: Promise<void>[] = []
  for (let i = 0; i < BOT_COUNT; i++) {
    const client = new ColyseusSDK(SERVER_URL)
    loops.push(botLoop(client, `Bot-${i + 1}`, i))
    if (i < BOT_COUNT - 1) await new Promise(r => setTimeout(r, STAGGER_MS))
  }

  process.on("SIGINT", () => {
    console.log("\nStopping...")
    stopped = true
    setTimeout(() => process.exit(0), 1000)
  })

  await Promise.all(loops)
}

main().catch(console.error)
