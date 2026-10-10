# Frontend カバレッジ計測の導入計画

Frontend のテストにおいて、`@vitest/coverage-v8` を使用したカバレッジ計測とレポート出力を可能にします。

## 変更内容

### 1. 依存関係の追加

カバレッジ計測に必要なパッケージをインストールします。

-   `@vitest/coverage-v8` (devDependencies)

### 2. Vite 設定の更新

`vitest` の設定として、カバレッジのプロバイダー（v8）と、レポートの形式（text, json, html など）を指定します。

#### [MODIFY] [vite.config.ts](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/vite.config.ts)

-   `test` プロパティを追加し、`coverage` 設定を記述します。

### 3. package.json の更新

カバレッジ計測付きでテストを実行するためのスクリプトを追加します。

#### [MODIFY] [package.json](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/package.json)

-   `"test:coverage": "vitest run --coverage"` を追加します。

### 4. CI 設定の更新

GitHub Actions でのテスト実行時にカバレッジレポートを出力するように変更します。

#### [MODIFY] [ci.yml](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/.github/workflows/ci.yml)

-   `Frontend CI` ジョブの `Run Tests` ステップで `npm run test:coverage` を実行するように変更します。

## 検証計画

-   `npm run test:coverage` を実行し、`coverage` ディレクトリが作成され、メトリクスが表示されることを確認します。
-   CI 上でカバレッジが計測されていることをログから確認します。
