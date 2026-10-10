# タスクリスト - ロビーでのプレイヤー削除機能

- [x] ドキュメントの作成 (docs/13_lobby_player_kick/)
    - [x] task.md の作成
    - [x] implementation_plan.md の作成
    - [x] test_list.md の作成
- [x] git ブランチの作成 (feature/13_lobby_player_kick)
- [x] バックエンドの実装 (backend/handlers/websocket.go)
    - [x] キック用メッセージ形式の定義
    - [x] キック処理ロジックの追加（ホスト権限確認、本人除外不可）
    - [x] キックされたプレイヤーへの通知送信
- [x] フロントエンドの実装
    - [x] websocket.ts: キック通知メッセージのハンドリングとトップ画面への遷移
    - [x] App.tsx: キック機能の関数追加
    - [x] App.tsx: ロビー画面にキックボタンを表示（ホストのみ、自分以外）
- [x] 動作確認・検証
    - [x] walkthrough.md の作成
    - [x] git commit
