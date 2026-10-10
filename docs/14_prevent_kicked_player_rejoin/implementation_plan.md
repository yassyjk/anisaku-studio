# 実装計画 - キックされたプレイヤーの再参加防止

ホストによってキックされたプレイヤーが、ブラウザのセッションが有効な間（タブを閉じるまで等）は同じ部屋に再参加できないように制限を強化します。

## ユーザーレビューが必要な項目
- 制限はブラウザの `sessionStorage` を使用するため、タブを閉じたりブラウザを再起動したりすると制限が解除されます。これはユーザーの「セッションがリセットされたら再度joinできるようにしたい」という要望に合致しています。

## 変更内容

### [Frontend] 通信処理の修正

#### [MODIFY] [websocket.ts](file:///home/yasuni/デスクトップ/makes/game-template/frontend/src/websocket.ts)
- `kicked` メッセージ受信時に、現在の `store.roomId` をキーにして `sessionStorage` にキックされたフラグを保存します。
- 保存形式例: `sessionStorage.setItem("kicked_room_" + roomId, "true")`

### [Frontend] UI・参加ロジックの修正

#### [MODIFY] [App.tsx](file:///home/yasuni/デスクトップ/makes/game-template/frontend/src/App.tsx)
- `handleJoin` 関数の冒頭で、入力された `tempRoomId` に基づいて `sessionStorage` をチェックします。
- フラグが存在する場合、アラートを表示して処理を中断（`return`）します。

## 検証計画

### 手動確認
1. ホストがプレイヤーをキックする。
2. キックされたプレイヤーが、同じタブで再度同じ部屋IDを入力して「参加」を試みる。
3. 「キックされたため再参加できません」というアラートが表示され、参加できないことを確認する。
4. 一度タブを閉じ、新しいタブで同じ部屋IDを入力して「参加」を試みる。
5. 正常に参加できることを確認する。
