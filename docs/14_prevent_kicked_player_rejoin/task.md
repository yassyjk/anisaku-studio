# タスクリスト - キックされたプレイヤーの再参加防止

- [x] ドキュメントの作成 (docs/14_prevent_kicked_player_rejoin/)
    - [x] task.md の作成
    - [x] implementation_plan.md の作成
    - [x] test_list.md の作成
- [x] git ブランチの作成 (feature/14_prevent_kicked_player_rejoin)
- [x] フロントエンドの実装
    - [x] websocket.ts: キックされた際に `sessionStorage` にルームIDを記録する処理を追加
    - [x] App.tsx: `handleJoin` 時に `sessionStorage` をチェックし、キック済みの場合は参加をブロックする処理を追加
- [x] 動作確認・検証
    - [x] walkthrough.md の作成
    - [x] git commit
