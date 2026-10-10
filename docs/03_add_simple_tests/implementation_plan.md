# バックエンドとフロントエンドのテスト実装計画 (更新: CIエラー修正)

## ゴール
現在の機能を検証するために、`backend` と `frontend` に簡単なテストファイルを追加する。また、GitHub Actionsでのビルドエラーを防ぐために必要な依存関係を追加する。

## 変更内容

### Backend
- `backend/handlers/websocket_test.go` を作成する。
  - `NewGameHandler` の初期化テスト。
  - `isHost` ロジック（ホスト権限の確認）のテスト。

### Frontend
- **[MODIFY] [package.json](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/package.json)**
  - `devDependencies` に `vitest`, `jsdom`, `@testing-library/jest-dom` を追加。
  - `Scripts` に `"test": "vitest"` を追加。
- **[NEW] [websocket.test.ts](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/src/websocket.test.ts)**
  - `getMyId`（IDがない場合の生成）のテスト。
  - `setNickname` / `getNickname` のテスト。

## 検証計画
1. Backend: `go test ./handlers/...` を実行する（手動）。
2. Frontend: `frontend` ディレクトリ内で `npm test` を実行する（手動）。
3. GitHub Actionsでビルドが通ることを確認する。
