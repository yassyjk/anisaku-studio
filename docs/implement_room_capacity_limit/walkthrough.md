# 部屋の人数制限（最大 6 人）の実装完了

部屋の参加人数を最大 6 人に制限する機能を、バックエンドとフロントエンドの両方に実装しました。

## 変更内容

### Backend

- [websocket.go](file:///home/yasuni/デスクトップ/makes/game-template/backend/handlers/websocket.go) の `join` 処理にて、新規プレイヤー追加前に人数チェック（`len(state.Players) >= 6`）を追加しました。

### Frontend

- [websocket.ts](file:///home/yasuni/デスクトップ/makes/game-template/frontend/src/websocket.ts) の `checkRoomExists` 関数が参加時に現在の部屋情報を取得できるように変更しました。
- [App.tsx](file:///home/yasuni/デスクトップ/makes/game-template/frontend/src/App.tsx) の `handleJoin` にて、満室時に「満室で入れません」というアラートを表示して入室をブロックするロジックを追加しました。

## 検証結果

### 手動確認

- 6 人が参加している部屋に 7 人目として参加しようとした際、フロントエンドで「満室で入れません」というアラートが表示され、入室が阻止されることを確認しました。
- 既に参加しているプレイヤーがページをリロードした場合、再接続として正常に入室できることを確認しました。
- バックエンド側でも、不正な手段で直接接続を試みた場合に 7 人目として追加されないことをコードレベルで担保しました。
