# 高度なテストとクリーンアップ機能の実装計画

本計画では、ゲームサーバーの安定性を高めるためのルーム自動削除機能と、信頼性を担保するためのテスト強化（WebSocketフォールバック、E2Eテスト）およびCI/CDの整備を行います。

## User Review Required

> [!IMPORTANT]
> **ルーム削除ポリシーについて**:
> 最終更新から **6時間** 経過したルームを削除対象とします。削除処理は **1時間ごと** に実行されます。このポリシーで問題ないか確認してください。

> [!NOTE]
> **E2Eテストツール**:
> Playwrightを使用します。ローカル環境での実行にはNode.js環境が必要です。

## Proposed Changes

### Backend (Go)

#### [MODIFY] [websocket.go](file:///home/yasuni/デスクトップ/makes/game-template/backend/handlers/websocket.go)

- `GameState` 構造体に `UpdatedAt time.Time` フィールドを追加。
- `processLogic` および `HandlePollingState` で `UpdatedAt` を `time.Now()` で更新する処理を追加。
- 定期的に古いルームを削除する `cleanupRooms` 関数を追加および `NewGameHandler` での起動処理。

#### [NEW] [cleanup_test.go](file:///home/yasuni/デスクトップ/makes/game-template/backend/handlers/cleanup_test.go)

- ルーム削除ロジックの単体テスト。

### Frontend (TypeScript)

#### [MODIFY] [websocket.test.ts](file:///home/yasuni/デスクトップ/makes/game-template/frontend/src/websocket.test.ts)

- WebSocket接続失敗後のポーリングモードへの遷移と、その後の状態更新を検証するテストケースを追加。

### E2E Testing

#### [NEW] [playwright.config.ts](file:///home/yasuni/デスクトップ/makes/game-template/playwright.config.ts)

- Playwrightの設定ファイル。

#### [NEW] [tests/game_flow.spec.ts](file:///home/yasuni/デスクトップ/makes/game-template/tests/game_flow.spec.ts)

- ゲームの基本フロー（ルーム作成〜結果）を検証するE2Eテストシナリオ。

### CI/CD

#### [MODIFY] [.github/workflows/ci.yml](file:///home/yasuni/デスクトップ/makes/game-template/.github/workflows/ci.yml)

- Backendテスト（Coverage含む）、Frontendテスト、E2Eテスト（Headlessモード）の実行ステップを追加。

## Verification Plan

### Automated Tests

- **Backend Unit Tests**: `go test ./backend/... -v` を実行し、クリーンアップロジック等が正しく動作することを確認。
- **Frontend Unit Tests**: `npm run test` (Vitest) を実行し、WebSocket周りのロジックを確認。
- **E2E Tests**: `npx playwright test` を実行し、ブラウザ上でのシミュレーションが成功することを確認。

### Manual Verification

- **Cleanup**: サーバーを起動し、ログを確認してクリーンアップタスクが起動していることを確認（必要であれば間隔を短くして動作確認）。
- **Fallback**: ブラウザの開発者ツールでWebSocket接続をブロックし、ポーリングでゲームが継続できるか目視確認。
