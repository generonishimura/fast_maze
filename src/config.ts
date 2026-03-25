import Phaser from 'phaser'

export const TILE_SIZE = 32

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0a1a',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
}
