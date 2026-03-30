import { Server } from "colyseus"
import { BattleRoom } from "./rooms/battle-room.js"

const port = Number(process.env.PORT) || 2567

const gameServer = new Server()

gameServer.define("battle", BattleRoom)
  .on("create", (room) => console.log(`[battle] room created: ${room.roomId}`))
  .on("dispose", (room) => console.log(`[battle] room disposed: ${room.roomId}`))

gameServer.listen(port).then(() => {
  console.log(`Fast Maze Battle Server listening on ws://localhost:${port}`)
})
