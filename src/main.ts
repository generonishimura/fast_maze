import Phaser from 'phaser'
import { gameConfig } from './config'
import { TitleScene } from './scenes/title-scene'
import { GameScene } from './scenes/game-scene'
import { GameOverScene } from './scenes/game-over-scene'
import { StageClearScene } from './scenes/stage-clear-scene'
import { EndlessGameScene } from './scenes/endless-game-scene'
import { BattleLobbyScene } from './scenes/battle-lobby-scene'
import { BattleGameScene } from './scenes/battle-game-scene'
import { BattleResultScene } from './scenes/battle-result-scene'

// URLパスに応じて初期シーンを決定（重複しないよう順序を変える）
const path = window.location.pathname.replace(/\/$/, '')
const isEndless = path.endsWith('/endless')

const battleScenes = [BattleLobbyScene, BattleGameScene, BattleResultScene]

const allScenes = isEndless
  ? [EndlessGameScene, TitleScene, GameScene, GameOverScene, StageClearScene, ...battleScenes]
  : [TitleScene, GameScene, GameOverScene, StageClearScene, EndlessGameScene, ...battleScenes]

const game = new Phaser.Game({
  ...gameConfig,
  scene: allScenes,
})

// Mキーでミュートトグル
const muteIndicator = document.createElement('div')
muteIndicator.id = 'mute-indicator'
muteIndicator.style.cssText = `
  position: fixed; bottom: 12px; left: 12px; z-index: 1000;
  font-family: 'Share Tech Mono', monospace; font-size: 13px;
  color: #8892a4; background: rgba(10,10,26,0.7);
  padding: 4px 10px; border-radius: 4px; pointer-events: none;
  opacity: 0; transition: opacity 0.3s;
`
document.body.appendChild(muteIndicator)

let hideTimer: ReturnType<typeof setTimeout> | null = null

function showMuteStatus(): void {
  muteIndicator.textContent = game.sound.mute ? '♪ MUTED' : '♪ ON'
  muteIndicator.style.opacity = '1'
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { muteIndicator.style.opacity = '0' }, 1500)
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    game.sound.mute = !game.sound.mute
    showMuteStatus()
  }
})

export default game
