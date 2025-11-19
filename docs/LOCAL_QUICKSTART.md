# ローカル開発 - クイックスタート（5分）

このガイドでは、最速でローカル開発環境をセットアップします。

## 前提条件

- Node.js 18以上がインストール済み
- Azure BotのApp IDとPasswordを取得済み
- DevRev APIトークンを取得済み

## セットアップ（5ステップ）

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
# .envファイルを作成
cp .env.example .env

# .envを編集
nano .env  # または code .env
```

以下を設定:
```env
MICROSOFT_APP_ID=your-app-id
MICROSOFT_APP_PASSWORD=your-app-password
DEVREV_API_TOKEN=your-devrev-token
DEVREV_DEFAULT_PART_ID=your-part-id
```

### 3. DevRev接続テスト（オプション）

```bash
npm run test:devrev
```

成功すれば、DevRev APIに接続できています。

### 4. Botを起動

```bash
npm run dev
```

以下が表示されれば成功:
```
Bot is ready to receive messages
```

### 5. ngrokでトンネル作成

**別のターミナルで実行:**

```bash
# ngrokインストール（初回のみ）
npm install -g ngrok

# トンネル開始
ngrok http 3978
```

ngrokが表示するHTTPS URLをコピー:
```
https://xxxx-xxx-xxx-xxx.ngrok-free.app
```

## Azure Bot設定

1. [Azure Portal](https://portal.azure.com) → Botリソース
2. 「構成」→ Messaging endpoint に設定:
   ```
   https://xxxx-xxx-xxx-xxx.ngrok-free.app/api/messages
   ```
3. 「適用」をクリック

## Teamsでテスト

1. Teamsで既にインストール済みのBotとチャット
2. 以下を送信:
   ```
   @BotName 休暇申請
   ```
3. Adaptive Cardが表示されればOK！

## デバッグ

### VSCodeデバッガー

1. VSCodeでプロジェクトを開く
2. F5キーを押す
3. 「Debug Teams Bot」を選択
4. ブレークポイントを設定してデバッグ

### ログ確認

Botを起動したターミナルでログが表示されます:
```bash
# リアルタイムログ
npm run dev
```

### ngrok Web UI

ブラウザで開く:
```
http://localhost:4040
```

リクエスト/レスポンスを確認できます。

## よくある問題

### Botが応答しない

1. Botが起動しているか確認: ターミナルで "Bot is ready" が表示されているか
2. ngrokが起動しているか確認
3. Azure BotのMessaging endpointが正しいか確認

### 環境変数エラー

```bash
# .envファイルを確認
cat .env

# Botを再起動
# Ctrl+C で停止 → npm run dev で再起動
```

### ngrokのURLが変わる

ngrokを再起動すると、URLが変わります。
Azure BotのMessaging endpointを毎回更新する必要があります。

**回避策**: ngrokを起動しっぱなしにして、Botのみ再起動する。

## 次のステップ

詳細なデバッグ方法は [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) を参照してください。

## 便利なコマンド

```bash
# Botを起動（開発モード・自動リロード）
npm run dev

# Botを起動（本番モード）
npm start

# DevRev APIテスト
npm run test:devrev

# セットアップウィザード実行
npm run setup
```

## 開発フロー

1. コードを編集
2. 保存（nodemonが自動で再起動）
3. Teamsでテスト
4. ログ/デバッガーで確認
5. 必要に応じて修正

これで開発準備完了です！
