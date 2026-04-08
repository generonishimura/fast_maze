# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phaser 3ベースの迷路ゲーム。プレイヤーは自動前進し、方向転換（WASD/スワイプ）でゴールを目指す。壁に衝突するとゲームオーバー。

3つのゲームモード:
- **ステージモード** (`/`): ステージクリアごとに迷路が大きく・速くなる
- **エンドレスモード** (`/endless`): チャンクベースの無限迷路を走り続ける
- **バトルモード**: 最大64人同時対戦。同じシード迷路でスコア勝負、プレイヤー同士の衝突で高スコアが勝ち

## Commands

```bash
npm run dev          # Viteの開発サーバー起動
npm run dev:server   # Colyseusバトルサーバー起動（port 2567）
npm run build        # tsc + vite build
npm run typecheck    # tsc --noEmit（型チェックのみ）
npm test             # vitest（watchモード）
npm run test:run     # vitest run（単発実行）
npx vitest run tests/domain/player.test.ts  # 単一テスト実行
```

## Architecture

DDD/Clean Architecture。ドメイン層はPhaserに一切依存しない純粋TypeScript。

### Monorepo Structure

npm workspacesによるモノレポ構成。ドメインロジックはクライアントとサーバーで共有。

- **`packages/shared/`** — クライアント・サーバー共有コード
  - `src/domain/`: 迷路・プレイヤー・衝突等のドメインロジック
  - `src/utils/`: シード付き乱数（`createRng`）
  - `src/battle/`: バトルモード専用ドメイン（衝突解決、スポーン、tick関数）
- **`packages/server/`** — Colyseusゲームサーバー（バトルモード用、20Hz tick）

パスエイリアス: `@/domain/*`→`packages/shared/src/domain/*`, `@/utils/*`→`packages/shared/src/utils/*`, `@/battle/*`→`packages/shared/src/battle/*`, `@/*`→`src/*`

### Layer Structure

- **`packages/shared/src/domain/`** — 純粋なドメインロジック（Phaserインポート禁止）
  - `types.ts`: 共通型定義（`Result<T,E>`, `MazeGrid`, `GameState`, `Direction`等）
  - `maze-generator.ts`: 再帰バックトラッキングによる迷路生成（通常 + 境界制約付き）
  - `endless-maze.ts`: チャンクベース無限迷路（`CHUNK_MAZE_SIZE=21`、境界契約で接続）
  - `player.ts`, `collision.ts`, `goal.ts`, `placement.ts`, `stage.ts`: 各ドメインルール
  - `insector.ts`: エンドレスモードの敵（BFS経路探索、スポーン、衝突判定）
- **`src/application/`** — ゲームフロー（ドメインの組み合わせ）
  - `game-flow.ts`: ステージモードの`initStage`/`tick`/`handleDirectionChange`
  - `endless-game-flow.ts`: エンドレスモードのフロー
- **`src/infrastructure/`** — Phaser依存のレンダラー・入力ハンドラー
- **`src/scenes/`** — Phaserシーン（`TitleScene`, `GameScene`, `EndlessGameScene`, etc.）
- **`src/config.ts`** — ゲーム設定（`TILE_SIZE=32`）

### Key Patterns

- **Result型**: ドメイン層のエラーは例外ではなく`Result<T,E>`で返す（`ok()`, `err()`ヘルパー使用）
- **Immutable state**: `GameState`/`EndlessGameState`はreadonly。状態更新は新オブジェクトを返す
- **シード付き乱数**: 迷路生成は決定論的。`createRng(seed)`で再現可能

### Tests

テストは`tests/`ディレクトリにソースと同じ構造で配置。vitestのglobalsモードが有効（importなしで`describe`/`it`/`expect`使用可）。パスエイリアスは上記Monorepo Structure参照。
