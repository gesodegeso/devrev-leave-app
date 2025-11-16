# Teams 休暇申請Bot with DevRev統合

Microsoft Teamsで動作する休暇申請ボットです。Adaptive Cardを使用した直感的なフォームで休暇申請を受け付け、DevRevのチケットシステムに自動的に登録します。

## 機能

- **Teamsメンション対応**: Personal chatまたはGroup chatで「@BotName 休暇申請」とメンションすることでフォームを表示
- **Adaptive Cardフォーム**: 以下の項目を含む休暇申請フォーム
  - 休暇開始日
  - 休暇終了日
  - 休暇理由（自由記述）
  - 有給休暇利用の有無
  - 承認者の名前（1対1チャットでは自動入力）
- **DevRev統合**: 申請内容を自動的にDevRevのチケットとして作成
- **拡張可能**: コマンドベースの設計により、将来的に他のコマンドを追加可能

## プロジェクト構成

```
devrev-leav-app/
├── src/
│   ├── index.js              # アプリケーションエントリーポイント
│   ├── bot.js                # Bot本体のロジック
│   ├── cards/
│   │   └── leaveRequestCard.json  # Adaptive Card定義
│   └── services/
│       └── devrev.js         # DevRev API統合
├── .env.example              # 環境変数のテンプレート
├── .gitignore                # Git除外ファイル
├── package.json              # Node.js依存関係
├── ecosystem.config.js       # PM2設定ファイル
├── nginx.conf.example        # Nginx設定のサンプル
├── deploy.sh                 # デプロイスクリプト
└── README.md                 # このファイル
```

## 必要要件

### システム要件
- Ubuntu 24.04 Server
- Node.js 18.x以上
- Nginx
- PM2 (プロセス管理)
- SSL証明書（本番環境）

### 外部サービス
- Microsoft Azure (Botの登録のみ)
- DevRev アカウント

## クイックリンク

- **[クイックスタート（35分）](QUICKSTART.md)** - 最速でセットアップ
- **[マルチテナントBot登録（推奨）](AZURE_SETUP_MULTITENANT.md)** - マルチテナント構成ガイド
- **[その他のBot登録方法](AZURE_BOT_SETUP.md)** - シングルテナント、マネージドIDなど
- **[ローカル開発環境](LOCAL_DEVELOPMENT.md)** - ローカルでのデバッグ方法
- **[プロジェクト構造](PROJECT_STRUCTURE.md)** - 詳細なコード構造
- **[CloudAdapter移行ガイド](docs/CLOUDADAPTER_MIGRATION.md)** - 最新のBot Framework適用

### トラブルシューティング

- **[401認証エラー (本番環境)](docs/PRODUCTION_401_ERROR.md)** - 本番環境での認証エラー対処法
- **[認証エラー全般](docs/TROUBLESHOOTING_AUTH.md)** - 認証関連のトラブルシューティング
- **[JWTトークン取得ガイド](docs/JWT_TOKEN_GUIDE.md)** - トークン取得とテスト方法

---

## セットアップ手順

### 本番環境へのデプロイ

本番環境へのデプロイ手順は以下の通りです。
**ローカルでの開発・デバッグについては [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) を参照してください。**

### 1. Azure Bot Serviceの登録

Azureポータルでマルチテナント構成のBot登録を行います。

✅ **推奨**: マルチテナント構成（最も柔軟で本番環境向き）
詳細な手順は **[AZURE_SETUP_MULTITENANT.md](AZURE_SETUP_MULTITENANT.md)** を参照してください。

#### クイック手順

**ステップA: マルチテナントApp Registrationを作成**

1. [Azure Portal](https://portal.azure.com) → 「Microsoft Entra ID」
2. 「アプリの登録」→「新規登録」
3. サポートされているアカウントの種類: **「任意の組織ディレクトリ内のアカウント (マルチテナント)」**
4. Application (client) IDをコピー

**ステップB: クライアントシークレットを作成**

1. 「証明書とシークレット」→「新しいクライアントシークレット」
2. シークレットの**値**をコピー（一度しか表示されません）

**ステップC: Bot Channel登録を追加**

1. 「APIの公開」→「アプリケーション ID URI」→「追加」
2. `api://botid-YOUR_APP_ID` に変更して保存

**ステップD: Azure Botリソースを作成**

1. Azure Portal → 「Azure Bot」を検索
2. Microsoft App ID: **「既存のアプリ登録を使用する」**
3. App ID: ステップAでコピーしたIDを貼り付け
4. App tenant: **マルチテナント**

**ステップE: Messaging Endpointの設定**

1. Azure Bot → 「構成」
2. Messaging endpoint: `https://your-domain.com/api/messages`
3. 「適用」をクリック

**ステップF: Microsoft Teamsチャネルを有効化**

1. Azure Bot → 「チャネル」→ 「Microsoft Teams」
2. 規約に同意

📖 **詳細な手順は [AZURE_SETUP_MULTITENANT.md](AZURE_SETUP_MULTITENANT.md) を参照**

### 2. DevRev APIトークンの取得

1. [DevRev](https://app.devrev.ai/)にログイン
2. Settings → API tokens に移動
3. 「Create new token」をクリック
4. 適切な権限（Tickets: Create, Read, Update）を付与
5. トークンを生成してコピー（これは一度しか表示されません）
6. Default Part IDも確認してメモ

### 3. サーバーのセットアップ

#### 3.1 リポジトリのクローンまたはファイルの配置

```bash
# SSHでサーバーに接続
ssh user@your-server-ip

# プロジェクトディレクトリに移動または作成
cd /opt
sudo git clone <your-repo-url> teams-leave-bot
# または、ファイルを直接アップロード

cd teams-leave-bot
```

#### 3.2 自動デプロイスクリプトの実行

```bash
sudo ./deploy.sh
```

このスクリプトは以下を自動的に実行します:
- Node.js、Nginx、PM2などの必要なパッケージのインストール
- アプリケーション依存関係のインストール
- `.env`ファイルの作成
- PM2の設定とアプリケーションの起動
- システム起動時の自動起動設定

#### 3.3 環境変数の設定

```bash
nano .env
```

以下の値を実際の値に置き換えます:

```env
PORT=3978
NODE_ENV=production

# Azure Bot Serviceから取得
MICROSOFT_APP_ID=your-bot-app-id-here
MICROSOFT_APP_PASSWORD=your-bot-app-password-here

# DevRevから取得
DEVREV_API_TOKEN=your-devrev-api-token-here
DEVREV_API_BASE_URL=https://api.devrev.ai
DEVREV_DEFAULT_PART_ID=your-default-part-id-here
```

#### 3.4 Nginxの設定

```bash
# Nginx設定ファイルを編集
sudo nano nginx.conf.example

# ドメイン名を実際の値に置き換え（your-domain.com → 実際のドメイン）

# 設定ファイルをコピー
sudo cp nginx.conf.example /etc/nginx/sites-available/teams-bot

# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/teams-bot /etc/nginx/sites-enabled/

# デフォルト設定を無効化（必要に応じて）
sudo rm /etc/nginx/sites-enabled/default
```

#### 3.5 SSL証明書の取得（Let's Encrypt）

```bash
# Certbotを使用してSSL証明書を取得
sudo certbot --nginx -d your-domain.com

# プロンプトに従って設定
# メールアドレスを入力
# 規約に同意
# HTTPSへのリダイレクトを選択（推奨）
```

#### 3.6 Nginxの設定テストと起動

```bash
# 設定ファイルのテスト
sudo nginx -t

# Nginxをリロード
sudo systemctl reload nginx

# Nginxの自動起動を有効化
sudo systemctl enable nginx
```

#### 3.7 アプリケーションの再起動

```bash
pm2 restart teams-leave-bot
pm2 save
```

### 4. Teams Appマニフェストの作成とアップロード

#### 4.1 マニフェストファイルの作成

プロジェクトに `teams-manifest` ディレクトリを作成し、以下のファイルを配置します:

**manifest.json**:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "YOUR_MICROSOFT_APP_ID",
  "packageName": "com.yourcompany.leaverequest",
  "developer": {
    "name": "Your Company Name",
    "websiteUrl": "https://your-domain.com",
    "privacyUrl": "https://your-domain.com/privacy",
    "termsOfUseUrl": "https://your-domain.com/terms"
  },
  "name": {
    "short": "休暇申請Bot",
    "full": "休暇申請管理Bot with DevRev"
  },
  "description": {
    "short": "休暇申請を簡単に管理",
    "full": "Microsoft Teams上で休暇申請を行い、DevRevに自動的にチケットを作成します。"
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "YOUR_MICROSOFT_APP_ID",
      "scopes": [
        "personal",
        "team",
        "groupchat"
      ],
      "supportsFiles": false,
      "isNotificationOnly": false,
      "commandLists": [
        {
          "scopes": [
            "personal",
            "team",
            "groupchat"
          ],
          "commands": [
            {
              "title": "休暇申請",
              "description": "休暇申請フォームを表示します"
            }
          ]
        }
      ]
    }
  ],
  "permissions": [
    "identity",
    "messageTeamMembers"
  ],
  "validDomains": [
    "your-domain.com"
  ]
}
```

**重要**: `YOUR_MICROSOFT_APP_ID` を実際のMicrosoft App IDに置き換えてください。

#### 4.2 アイコンの準備

- **color.png**: 192x192ピクセルのカラーアイコン
- **outline.png**: 32x32ピクセルの白黒アウトラインアイコン

簡単なアイコンを作成するか、既存のアイコンを使用してください。

#### 4.3 Appパッケージの作成

```bash
cd teams-manifest
zip -r teams-app.zip manifest.json color.png outline.png
```

#### 4.4 Teamsへのアップロード

**個人/テスト用:**

1. Microsoft Teamsを開く
2. 左側のメニューから「アプリ」をクリック
3. 「アプリの管理」→「アプリをアップロード」を選択
4. 作成した `teams-app.zip` をアップロード
5. 「追加」をクリックしてBotをインストール

**組織全体への展開:**

1. [Teams管理センター](https://admin.teams.microsoft.com/)にアクセス
2. 「Teamsアプリ」→「アプリを管理」に移動
3. 「アップロード」をクリック
4. `teams-app.zip` をアップロード
5. アプリの設定で適切な権限ポリシーを設定
6. 必要に応じて組織内のユーザーに展開

## 使用方法

### 1. Botとのチャット開始

- **Personal Chat**: Teamsの「チャット」から「休暇申請Bot」を検索して開始
- **Group Chat**: グループチャットにBotを追加

### 2. 休暇申請の送信

1. Botをメンション:
   ```
   @休暇申請Bot 休暇申請
   ```
   または
   ```
   @休暇申請Bot leave request
   ```

2. Adaptive Cardフォームが表示されます

3. フォームに以下を入力:
   - 休暇開始日
   - 休暇終了日
   - 休暇理由
   - 有給休暇の利用有無
   - 承認者の名前（1対1チャットでは自動入力）

4. 「申請を送信」ボタンをクリック

5. Botが確認メッセージとDevRevチケットIDを返します

### 3. DevRevでの確認

DevRevにログインし、作成されたチケットを確認できます。チケットには以下の情報が含まれます:

- 申請者情報（名前、Teams User ID）
- 休暇期間と日数
- 休暇理由
- 有給休暇利用の有無
- 承認者情報

## トラブルシューティング

### Botが応答しない

```bash
# ログを確認
pm2 logs teams-leave-bot

# アプリケーションのステータス確認
pm2 status

# Nginxのエラーログを確認
sudo tail -f /var/log/nginx/teams-bot-error.log
```

### 環境変数の確認

```bash
# .envファイルの内容を確認（秘密情報に注意）
cat .env
```

### アプリケーションの再起動

```bash
pm2 restart teams-leave-bot
```

### Nginxの再起動

```bash
sudo systemctl restart nginx
```

### SSL証明書の更新

```bash
# 証明書の自動更新テスト
sudo certbot renew --dry-run

# 証明書の更新
sudo certbot renew
```

### DevRev API接続の確認

```bash
# 手動でAPIをテスト
curl -X POST https://api.devrev.ai/internal/tickets.create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ticket",
    "title": "Test Ticket",
    "applies_to_part": "YOUR_PART_ID"
  }'
```

## 開発環境でのテスト

ローカル環境でテストする場合:

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
# .envを編集して実際の値を設定
```

### 3. ngrokを使用したローカルトンネル

```bash
# ngrokのインストール（初回のみ）
npm install -g ngrok

# トンネルの開始
ngrok http 3978
```

ngrokが生成したHTTPS URLをAzure BotのMessaging Endpointに設定:
```
https://xxxx-xx-xx-xxx-xxx.ngrok-free.app/api/messages
```

### 4. アプリケーションの起動

```bash
npm run dev
```

## 将来の拡張

コマンドベースの設計により、以下のような機能を簡単に追加できます:

### 新しいコマンドの追加例

[bot.js](src/bot.js) の `onMessage` ハンドラに新しいコマンドを追加:

```javascript
// 経費申請コマンドの例
if (text === '経費申請' || text.toLowerCase() === 'expense') {
    await this.handleExpenseRequest(context);
}
```

### 推奨される拡張機能

- 出張申請
- 経費精算
- 勤怠報告
- 休暇残日数の確認
- 承認フロー（DevRev上でのステータス管理）

## セキュリティ考慮事項

- `.env` ファイルは絶対にGitにコミットしない
- SSL証明書は必ず使用する（本番環境）
- Microsoft App Passwordは安全に保管
- DevRev APIトークンは適切な権限のみ付与
- Nginxのセキュリティヘッダーを適切に設定
- 定期的にSSL証明書を更新（Let's Encryptは自動更新）

## ライセンス

MIT

## サポート

問題が発生した場合は、以下を確認してください:

1. [Bot Framework Documentation](https://docs.microsoft.com/azure/bot-service/)
2. [DevRev API Documentation](https://docs.devrev.ai/)
3. [Teams App Development](https://docs.microsoft.com/microsoftteams/platform/)

## 著者

Your Name / Your Organization
