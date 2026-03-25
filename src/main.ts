import Phaser from 'phaser'
import { gameConfig } from './config'
import { TitleScene } from './scenes/title-scene'
import { GameScene } from './scenes/game-scene'
import { GameOverScene } from './scenes/game-over-scene'
import { StageClearScene } from './scenes/stage-clear-scene'

const game = new Phaser.Game({
  ...gameConfig,
  scene: [TitleScene, GameScene, GameOverScene, StageClearScene],
})

export default game
