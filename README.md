# Fast Maze

ステージが進むほど迷路が大きく、スピードが速くなるアーケードスタイルの迷路ゲーム。

**Play now:** https://generonishimura.github.io/fast_maze/

## 遊び方

- ゴールにたどり着くとステージクリア
- ステージが上がるごとに迷路が広くなり、移動速度もアップ
- 壁にぶつかると跳ね返される

### 操作方法

| 入力 | 操作 |
|------|------|
| WASD / 矢印キー | 移動 |
| スワイプ | 移動（モバイル） |
| SPACE / Enter / タップ | ゲーム開始 |

## 技術スタック

- [Phaser 3](https://phaser.io/) - ゲームフレームワーク
- TypeScript
- Vite

## 開発

```bash
npm install
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm test         # テスト実行
```

## ライセンス

MIT
