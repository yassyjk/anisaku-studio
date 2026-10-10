# 包括的なゲームテスト実装計画

## ゴール

WebSocket 通信、ポーリングへのフォールバック、エラーケース（ルーム不在、満室）、およびゲームの進行ロジック（ターン管理、ロビーへの復帰）を検証する網羅的なテストを追加する。

## 変更内容

### ドキュメント管理

-   `docs/04_comprehensive_game_tests/` フォルダを作成し、関連ドキュメントを保存する。

### Backend (`backend/handlers/websocket_test.go`)

以下のテスト項目を追加・強化：

-   `TestServeWsErrors`: ルーム ID 不足、ルーム未発見時のエラーを検証。
-   `TestRoomFullError`: 6 人参加済みのルームへの参加拒否を検証。
-   `TestGameLogicFlow`:
    -   ゲーム開始 (`start`)
    -   ターン交代 (`action`) による `TurnIndex` の遷移
    -   ロビーへの復帰 (`back_to_lobby`) と `IsInterrupted` フラグの検証。

### Frontend (`frontend/src/websocket.test.ts` または新規)

以下のテスト項目を追加：

-   WebSocket の模擬(Mock)を用いた接続テスト。
-   WebSocket 接続失敗時のポーリングへの自動切り替え検証。
-   サーバーからのエラー（満室等）受信時の `store.error` 更新検証。

## 実行手順（ユーザー向け）

1. `git switch -c feature/04_comprehensive_game_tests` でブランチを作成（Agent が行う）。
2. 実装完了後、以下のコマンドで検証してください。

### Backend

```bash
cd backend
go test -v ./handlers/...
```

### Frontend

```bash
cd frontend
npm test
```
