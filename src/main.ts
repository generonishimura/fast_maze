import Phaser from 'phaser'
import { gameConfig } from './config'
import { TitleScene } from './scenes/title-scene'
import { GameScene } from './scenes/game-scene'
import { GameOverScene } from './scenes/game-over-scene'
import { StageClearScene } from './scenes/stage-clear-scene'
import { EndlessGameScene } from './scenes/endless-game-scene'

// URLパスに応じて初期シーンを決定（重複しないよう順序を変える）
const path = window.location.pathname.replace(/\/$/, '')
const isEndless = path.endsWith('/endless')

const allScenes = isEndless
  ? [EndlessGameScene, TitleScene, GameScene, GameOverScene, StageClearScene]
  : [TitleScene, GameScene, GameOverScene, StageClearScene, EndlessGameScene]

const game = new Phaser.Game({
  ...gameConfig,
  scene: allScenes,
})

export default game
