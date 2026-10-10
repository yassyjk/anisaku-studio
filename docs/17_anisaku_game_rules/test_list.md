# テストリスト

## 自動テスト

- 山札が64枚で、各要素が16枚、カードごとのタグ数が1〜2個である。
- タグ2枚/3枚/4枚の得点と、複数タグ得点の合算が正しい。
- 自分以外のプレイヤーの手札が状態配信から除外される。
- 各プレイヤーが初期手札4枚・コイン5枚で開始する。
- 山札取得後に手札が5枚となり、解決後に手番が交代する。
- 2作品目公開時にゲームが終了し、公開点と残りコインで勝者が決まる。
- Playwrightのゲームフローが山札取得と捨て札操作を完了できる。

## Composeでの確認コマンド

```sh
docker compose run --rm backend go test ./...
docker compose run --rm frontend npm test -- --run
docker compose run --rm frontend npm run build
```
