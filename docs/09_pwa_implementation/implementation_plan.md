# PWA化の実装計画 (再修正)

`virtual:pwa-register` によるビルドエラーを解消するため、`vite-plugin-pwa` の自動インジェクション機能を使用する方式に変更します。これにより `index.tsx` のコード変更が不要になります。

## Proposed Changes

### Frontend

#### [MODIFY] [vite.config.ts](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/vite.config.ts)

- `injectRegister: 'auto'` を明示（またはデフォルト動作を利用）し、HTMLに登録スクリプトを自動挿入させます。
- `manifest` 設定（`start_url`, `display` 等）を維持します。

#### [REVERT] [index.tsx](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/src/index.tsx)

- `registerSW` のインポートと呼び出しを削除し、元の状態に戻します。

#### [MODIFY] [tsconfig.json](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/tsconfig.json)

- `compilerOptions.types` に `"vite-plugin-pwa/client"` を追加し、PWA関連の型定義を有効にします。

#### [DELETE] [manifest.json](file:///home/yasuni/%E3%83%87%E3%82%B9%E3%82%AF%E3%83%88%E3%83%83%E3%83%97/makes/game-template/frontend/public/manifest.json)

- （実施済み）手動のファイルは削除のまま。

## Verification Plan

### Automated Tests

- `npm run build` がエラーなく完了することを確認。

## Verification Plan

### Manual Verification

- （ローカルでは難しいですが）PWAとしてのインストール要件を満たしているか開発者ツールで確認します。
