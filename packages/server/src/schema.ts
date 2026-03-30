import { schema, type SchemaType, MapSchema } from "@colyseus/schema"

export const PlayerSchema = schema({
  id: "string",
  row: "int16",
  col: "int16",
  direction: "string",
  score: "uint32",
  status: "string",
  eliminatedBy: "string",
  rank: "int8",
})
export type PlayerSchema = SchemaType<typeof PlayerSchema>

export const BattleRoomState = schema({
  seed: "uint32",
  phase: "string",
  tickCount: "uint32",
  aliveCount: "uint8",
  totalPlayers: "uint8",
  players: { map: PlayerSchema },
})
export type BattleRoomState = SchemaType<typeof BattleRoomState>
