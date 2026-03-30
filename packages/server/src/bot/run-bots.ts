import { ColyseusSDK } from "@colyseus/sdk"
import { createEndlessMaze, ensureChunksAround } from "@/domain/endless-maze"
import { chooseBotDirection } from "@/battle/bot-ai"
import type { EndlessMazeState } from "@/domain/endless-maze"
import type { Direction } from "@/domain/types"

const SERVER_URL = process.env.SERVER_URL ?? "ws://localhost:2567"
const BOT_COUNT = parseInt(process.env.BOT_COUNT ?? "7", 10)
const STAGGER_MS = 200

type BotRoom = Awaited<ReturnType<ColyseusSDK['joinOrCreate']>>

async function createBot(serverUrl: string, name: string, roomId?: string): Promise<BotRoom> {
  const client = new ColyseusSDK(serverUrl)
  const room = roomId
    ? await client.joinById(roomId)
    : await client.joinOrCreate("battle")

  console.log(`[${name}] joined room ${room.roomId} as ${room.sessionId}`)

  let maze: EndlessMazeState | null = null
  let myPos = { row: 0, col: 0 }
  let myDir: Direction = 'right'
  let gameStarted = false
  let thinkTimer: ReturnType<typeof setInterval> | null = null

  room.onMessage("gameStart", (data: { seed: number; spawnPositions: Record<string, { row: number; col: number }> }) => {
    console.log(`[${name}] game started`)
    maze = createEndlessMaze(data.seed)
    const spawn = data.spawnPositions[room.sessionId]
    if (spawn) {
      myPos = spawn
      maze = ensureChunksAround(maze!, myPos.row, myPos.col)
    }
    gameStarted = true

    const thinkMs = 200 + Math.floor(Math.random() * 200)
    thinkTimer = setInterval(() => {
      if (!maze || !gameStarted) return
      maze = ensureChunksAround(maze!, myPos.row, myPos.col)
      const newDir = chooseBotDirection(maze, myPos, myDir)
      if (newDir !== myDir) {
        myDir = newDir
        room.send("direction", { direction: newDir })
      }
    }, thinkMs)
  })

  room.onStateChange((state: unknown) => {
    const s = state as { players?: { forEach?: (cb: (p: { row: number; col: number; direction: string; status: string }, id: string) => void) => void } }
    if (!s.players?.forEach) return

    s.players.forEach((p, id) => {
      if (id === room.sessionId) {
        myPos = { row: p.row, col: p.col }
        myDir = p.direction as Direction
        if (p.status === 'eliminated') {
          console.log(`[${name}] eliminated`)
          gameStarted = false
          if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null }
        }
      }
    })
  })

  room.onMessage("gameEnd", () => {
    console.log(`[${name}] game ended`)
    gameStarted = false
    if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null }
  })

  room.onLeave(() => {
    console.log(`[${name}] left`)
    if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null }
  })

  return room
}

async function main() {
  console.log(`Starting ${BOT_COUNT} bots → ${SERVER_URL}`)

  const rooms: BotRoom[] = []

  // 1. まず全員接続（最初のボットがルームを作成、残りは同じルームに参加）
  for (let i = 0; i < BOT_COUNT; i++) {
    try {
      const roomId = rooms.length > 0 ? rooms[0].roomId : undefined
      const room = await createBot(SERVER_URL, `Bot-${i + 1}`, roomId)
      rooms.push(room)
    } catch (e) {
      console.error(`Bot-${i + 1} failed:`, (e as Error).message)
    }
    if (i < BOT_COUNT - 1) await new Promise(r => setTimeout(r, STAGGER_MS))
  }

  console.log(`${rooms.length} bots connected. Sending ready in 1s...`)

  // 2. 1秒待ってから全員一斉にready
  await new Promise(r => setTimeout(r, 1000))
  for (const room of rooms) {
    room.send("ready", {})
  }
  console.log("All bots sent ready")

  // Ctrl+C
  process.on("SIGINT", async () => {
    console.log("\nDisconnecting...")
    await Promise.all(rooms.map(r => r.leave().catch(() => {})))
    process.exit(0)
  })
}

main().catch(console.error)
