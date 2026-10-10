# Playwright テスト失敗の根本修正計画

前回の修正で `visibilitychange` を無効化したにもかかわらず CI エラーが継続しているため、残る 2 つの大きな懸念点（ID の衝突と通信の不安定化）を解消します。

## 原因分析

1. **ID の衝突 (localStorage の共有)**: Playwright で同じ `context` 内に `page2` を作成すると `localStorage` を共有するため、ホストと Player2 が同じ ID を持ってしまいます。その結果、サーバー側で「同一人物の名前変更」とみなされ、プレイヤーが増えたように見えません。
2. **WebSocket 接続の上書き**: バックエンドで HTTP 経由の `join` 処理が発生すると、既存の WebSocket 接続が `nil` で上書きされてしまうバグがあり、通信が途絶える可能性があります。
3. **テスト環境判定の確実性**: `addInitScript` だけではタイミングによって認識されない可能性があるため、URL パラメータでもテスト環境を判定できるようにします。

## 修正内容

### 1. テストコードの修正 (最重要)

各プレイヤーに独立した `BrowserContext` を割り当て、`localStorage` の衝突を完全に防ぎます。

#### [MODIFY] [game_flow.spec.ts](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/tests/game_flow.spec.ts)

-   `test("...", async ({ browser }) => { ... })` に変更し、`browser.newContext()` を使用します。
-   各プレイヤーの `goto` 先に `test=true` を追加します。

### 2. バックエンドの修正

HTTP 経由のアクション呼び出しによって WebSocket の `Conn` が消されるのを防ぎます。

#### [MODIFY] [websocket.go](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/backend/handlers/websocket.go)

-   `processLogic` の `join` 処理内で、渡された `conn` が `nil` の場合は既存の `Conn` を維持するように変更します。

### 3. フロントエンドの修正

判定の堅牢性を高めます。

#### [MODIFY] [websocket.ts](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/src/websocket.ts)

-   `isTestEnv` 関数を、URL パラメータ `test=true` も確認するように拡張します。

## 検証計画

-   `npx playwright test` を実行し、複数のウィンドウが立ち上がってもそれぞれの ID で正しく参加できることを確認します。
-   CI 上での実行結果を確認します。
