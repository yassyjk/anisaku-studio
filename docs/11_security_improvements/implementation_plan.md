# 実装計画: セキュリティリスクの改善

## 1. Originチェックの厳格化

### バックエンド (main.go, websocket.go)

- 環境変数 `ALLOWED_ORIGINS` を導入する（カンマ区切りで複数指定可能）。
- `main.go` のCORSミドルウェアにて、`Access-Control-Allow-Origin` を指定されたOriginに制限する。
- `handlers/websocket.go` の `Upgrader` において、`CheckOrigin` 関数内で Origin が許可リストに含まれているか検証する。
- 開発環境（localhostなど）は引き続き許可するように設定。

## 2. 入力値の検証

### バックエンド (websocket.go)

- プレイヤー名 (`JoinPayload.Name`) の文字数を制限（最大15～20文字程度）。
- プレイヤーIDの形式をチェック。
- 不正な入力があった場合、エラーレスポンスを返すか、入力を切り詰める。

### フロントエンド (App.tsx, websocket.ts)

- 名前入力フォームに `maxlength` を追加。
- `sendWs` を呼ぶ前にクライアント側でもトリミングやバリデーションを実施。

## 3. リソース制限 (DoS対策)

### バックエンド (websocket.go)

- `GameHandler` に `MaxRooms` 定数を追加（50ルーム）。
- `CreateRoom` 時に現在のルーム数を確認し、上限に達している場合はエラーを返す。
- WebSocketの `Upgrader` に `ReadBufferSize` と `WriteBufferSize` を明示的に設定し、巨大なパケットを拒否する設定を検討。
- 1つのIPアドレスからの短時間の連続ルーム作成を防止するロジックの検討。

## スケジュール

1. バックエンドのOriginチェック実装
2. バックエンド/フロントエンドの入力バリデーション実装
3. ルーム数制限の実装
4. 動作確認テスト
