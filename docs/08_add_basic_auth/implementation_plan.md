# 実装計画 - ルーム作成時のBasic認証実装

ルーム作成機能にBasic認証を導入し、不特定多数によるルーム作成を制限します。招待されたユーザー（QRコード経由など）は、これまで通り認証なしで参加可能です。

## ユーザーレビューが必要な項目

- Basic認証の情報の管理方法：`.env`ファイルにIDとパスワードを平文で保存します。
- ブラウザの挙動：ルーム作成ボタンを押すと、ブラウザ標準のBasic認証ダイアログが表示されます。

## 変更内容

### バックエンド

#### [MODIFY] [backend/main.go](file:///home/yasuni/デスクトップ/makes/game-template/backend/main.go)

- Basic認証用の中間処理（ミドルウェア）を追加します。
- `POST /create` エンドポイントにこのミドルウェアを適用します。

#### [MODIFY] [.env](file:///home/yasuni/デスクトップ/makes/game-template/.env)

- 管理者用（1つ）とテスト用（2つ）のID/パスワードを追加します。
    - `BASIC_AUTH_ADMIN_USER`, `BASIC_AUTH_ADMIN_PASS`
    - `BASIC_AUTH_TEST1_USER`, `BASIC_AUTH_TEST1_PASS`
    - `BASIC_AUTH_TEST2_USER`, `BASIC_AUTH_TEST2_PASS`

### フロントエンド

#### [MODIFY] [frontend/src/App.tsx](file:///home/yasuni/デスクトップ/makes/game-template/frontend/src/App.tsx)

- ルーム作成失敗時（401エラーなど）に、ユーザーに通知する処理を確認・必要に応じて追加します。

---

## 検証計画

### 自動テスト

- 現状の自動テストを実行して、既存機能に影響がないか確認する。
- `go test ./backend/handlers/...`

### 手動確認

1. フロントエンドのトップ画面から「部屋を作成」ボタンを押す。
2. ブラウザの認証ダイアログが出ることを確認。
3. `.env`に設定した正しいID/パスワードを入力し、部屋が作成できることを確認。
4. 作成された部屋のURL（またはQRコード）を別のブラウザで開き、認証なしで参加できることを確認。
5. ID/パスワードを間違えた場合、またはキャンセルした場合に部屋が作成されないことを確認。
