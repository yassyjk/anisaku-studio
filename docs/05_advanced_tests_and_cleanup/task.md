# タスクリスト: 高度なテストとクリーンアップ機能の実装

このタスクでは、ルームの自動クリーンアップ機能の実装、WebSocketフォールバックの検証強化、End-to-Endテストの導入、およびCI/CDの高度化を行います。

## 1. ルーム自動クリーンアップ機能 (Backend)

- [x] `GameState` 構造体に `UpdatedAt` フィールドを追加
- [x] ゲーム状態更新時（`processLogic`）および参照時（`HandlePollingState`）に `UpdatedAt` を更新するロジックを追加
- [x] バックグラウンドで定期的に（例: 1時間ごと）古いルームを削除する `cleanupRooms` ゴルーチンを実装
- [x] クリーンアップ機能の単体テスト (`cleanup_test.go`) を作成
- [x] `websocket_test.go` の既存テストのリファクタリング (サブテスト化、テーブル駆動)

## 2. WebSocketフォールバック検証 (Frontend)

- [x] `frontend/src/websocket.test.ts` を拡張
- [x] WebSocket接続失敗時に `mode` が `polling` に切り替わる挙動を詳細にテスト
- [x] ポーリングモードでのゲーム進行（state更新）が可能であることを確認するテストケースを追加

## 3. End-to-End (E2E) テストの導入 (Playwright)

- [x] Playwright のインストールと初期設定
- [x] シナリオテストの実装 (`tests/game-flow.spec.ts`)
    - [x] ルーム作成
    - [x] プレイヤー参加（複数ウィンドウ/タブ）
    - [x] ゲーム開始
    - [x] カード選択とターン進行
    - [x] 結果表示と確認
- [x] E2Eテスト実行用スクリプトの整備

## 4. CI/CD 高度化 (GitHub Actions)

- [x] `.github/workflows` の更新
- [x] バックエンドのテスト実行とカバレッジ計測設定
- [x] フロントエンドの単体テスト実行設定
- [x] E2Eテスト (Playwright) の実行設定（可能な場合）

## 5. ドキュメントと最終確認

- [x] 実装内容の検証 (Walkthrough作成)
- [x] コードレビューとマージ
