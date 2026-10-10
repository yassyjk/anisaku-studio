# タスクリスト - ゲーム進行中の新規参加制限

- [x] ドキュメントの作成 (docs/15_prevent_joining_in_progress/)
    - [x] task.md の作成
    - [x] implementation_plan.md の作成
    - [x] test_list.md の作成
- [x] git ブランチの作成 (feature/15_prevent_joining_in_progress)
- [x] バックエンドの実装 (backend/handlers/websocket.go)
    - [x] `join` 処理にて、ロビー以外のフェーズでの新規参加（リストにいないプレイヤー）を拒否するロジックを追加
- [x] 動作確認・検証
    - [x] walkthrough.md の作成
    - [x] git commit
