# プロジェクト構造

## ディレクトリツリー

```
devrev-leav-app/
├── src/                          # ソースコード
│   ├── index.js                  # アプリケーションエントリーポイント
│   ├── bot.js                    # Bot本体のロジック
│   ├── cards/                    # Adaptive Card定義
│   │   └── leaveRequestCard.json # 休暇申請フォーム
│   └── services/                 # 外部サービス統合
│       └── devrev.js             # DevRev API統合
│
├── teams-manifest/               # Teams App マニフェスト
│   ├── manifest.json             # アプリ定義ファイル
│   ├── create-icons.sh           # アイコン作成スクリプト
│   └── README.md                 # マニフェスト説明
│
├── .env.example                  # 環境変数テンプレート
├── .gitignore                    # Git除外設定
├── package.json                  # Node.js依存関係
├── ecosystem.config.js           # PM2設定
├── nginx.conf.example            # Nginx設定サンプル
├── deploy.sh                     # デプロイスクリプト
├── README.md                     # 詳細ドキュメント
├── QUICKSTART.md                 # クイックスタートガイド
└── PROJECT_STRUCTURE.md          # このファイル
```

## ファイルの説明

### コアファイル

#### `src/index.js`
- **役割**: アプリケーションのメインエントリーポイント
- **機能**:
  - Restifyサーバーの起動
  - Bot Framework Adapterの初期化
  - エラーハンドリング
  - `/api/messages` エンドポイントの提供
  - `/health` ヘルスチェックエンドポイント

#### `src/bot.js`
- **役割**: Bot本体のビジネスロジック
- **機能**:
  - メッセージの受信と処理
  - コマンドの解析（「休暇申請」など）
  - Adaptive Cardの送信
  - フォーム送信の処理
  - 1対1チャットでの承認者自動入力
- **主要メソッド**:
  - `onMessage()`: メッセージハンドラ
  - `handleLeaveRequest()`: 休暇申請コマンド処理
  - `handleCardSubmit()`: フォーム送信処理
  - `removeBotMentions()`: メンション除去
  - `getConversationMembers()`: チャットメンバー取得

#### `src/services/devrev.js`
- **役割**: DevRev API統合
- **機能**:
  - チケット作成
  - チケット情報の取得（将来用）
  - ステータス更新（将来用）
- **主要メソッド**:
  - `createLeaveRequestTicket()`: 休暇申請チケット作成
  - `buildTicketDescription()`: チケット説明文生成
  - `getTicket()`: チケット取得
  - `updateTicketStatus()`: ステータス更新

#### `src/cards/leaveRequestCard.json`
- **役割**: 休暇申請フォームの定義
- **Adaptive Card Schema v1.4準拠**
- **入力フィールド**:
  - `startDate`: Input.Date - 開始日
  - `endDate`: Input.Date - 終了日
  - `reason`: Input.Text (multiline) - 理由
  - `usePaidLeave`: Input.ChoiceSet - 有給利用
  - `approver`: Input.Text - 承認者名
  - `approverUserId`: Input.Text (hidden) - 承認者のTeams ID

### 設定ファイル

#### `.env.example`
環境変数のテンプレート。実際の`.env`にコピーして使用。

**必須変数**:
```env
MICROSOFT_APP_ID          # Azure BotのApp ID
MICROSOFT_APP_PASSWORD    # Azure BotのClient Secret
DEVREV_API_TOKEN         # DevRev APIトークン
DEVREV_DEFAULT_PART_ID   # DevRevのPart ID
```

#### `package.json`
Node.js依存関係の定義。

**主要依存関係**:
- `botbuilder`: Bot Framework SDK
- `restify`: HTTPサーバー
- `axios`: HTTP客户端（DevRev API用）
- `dotenv`: 環境変数管理

#### `ecosystem.config.js`
PM2プロセスマネージャーの設定。

**設定内容**:
- プロセス名: `teams-leave-bot`
- インスタンス数: 1
- 自動再起動: 有効
- ログファイル: `./logs/`

#### `nginx.conf.example`
Nginxリバースプロキシの設定サンプル。

**主要設定**:
- HTTPからHTTPSへのリダイレクト
- SSL/TLS設定
- `/api/messages` のプロキシ
- `/health` のヘルスチェック
- セキュリティヘッダー

### デプロイメント

#### `deploy.sh`
Ubuntu 24.04サーバーへの自動デプロイスクリプト。

**実行内容**:
1. システムパッケージの更新
2. Node.js 20のインストール
3. Nginx、PM2のインストール
4. 依存関係のインストール
5. .envファイルの作成
6. PM2でのアプリ起動
7. システム起動時の自動起動設定

**使用方法**:
```bash
sudo ./deploy.sh
```

### Teams App マニフェスト

#### `teams-manifest/manifest.json`
Microsoft Teamsアプリケーションのマニフェスト（v1.16準拠）。

**主要設定**:
- Bot ID設定
- スコープ: personal, team, groupchat
- コマンド定義
- 権限: identity, messageTeamMembers
- 有効ドメイン設定

#### `teams-manifest/create-icons.sh`
アプリアイコンを自動生成するスクリプト。

**生成ファイル**:
- `color.png`: 192x192ピクセル
- `outline.png`: 32x32ピクセル

**使用方法**:
```bash
cd teams-manifest
./create-icons.sh
```

### ドキュメント

#### `README.md`
プロジェクトの詳細ドキュメント。

**内容**:
- 機能概要
- セットアップ手順（詳細）
- Azure Bot登録手順
- DevRev設定手順
- サーバーデプロイ手順
- Teams App登録手順
- トラブルシューティング
- 開発環境でのテスト方法
- 将来の拡張方法

#### `QUICKSTART.md`
クイックスタートガイド（30分でセットアップ）。

**内容**:
- 簡潔な手順
- チェックリスト形式
- コピー&ペースト可能なコマンド
- よくあるエラーと解決方法

#### `PROJECT_STRUCTURE.md`
このファイル。プロジェクト構造の説明。

## データフロー

### 1. ユーザーがコマンド送信

```
Teams Client
  ↓ (メッセージ送信)
Microsoft Teams Service
  ↓ (Webhook: POST /api/messages)
Nginx (HTTPS終端)
  ↓ (プロキシ: localhost:3978)
Node.js (src/index.js)
  ↓
Bot Framework Adapter
  ↓
TeamsLeaveBot (src/bot.js)
  ↓ (handleLeaveRequest)
Adaptive Card送信
  ↓
Teams Client (カード表示)
```

### 2. ユーザーがフォーム送信

```
Teams Client
  ↓ (カード送信)
Microsoft Teams Service
  ↓ (Webhook: POST /api/messages)
Nginx
  ↓
Node.js
  ↓
Bot Framework Adapter
  ↓
TeamsLeaveBot (handleCardSubmit)
  ↓
DevRevService (src/services/devrev.js)
  ↓ (HTTP POST)
DevRev API
  ↓
チケット作成
  ↓
確認メッセージ送信
  ↓
Teams Client
```

## 拡張ポイント

### 新しいコマンドの追加

1. **Adaptive Cardの作成**:
   ```
   src/cards/newCommandCard.json
   ```

2. **Bot.jsにハンドラー追加**:
   ```javascript
   if (text === '新コマンド') {
       await this.handleNewCommand(context);
   }
   ```

3. **DevRevサービスに新メソッド追加**（必要に応じて）:
   ```javascript
   async createNewTicketType(data) {
       // 実装
   }
   ```

### 他の外部APIへの統合

`src/services/` に新しいサービスファイルを追加:

```
src/services/
├── devrev.js
├── jira.js           # 新規追加例
└── salesforce.js     # 新規追加例
```

### 承認フロー機能の追加

1. DevRevのWebhook設定
2. `src/index.js` に新しいエンドポイント追加:
   ```javascript
   server.post('/api/webhooks/devrev', async (req, res) => {
       // Webhook処理
   });
   ```

3. Webhook処理ロジックを実装

## セキュリティ考慮事項

### 環境変数管理
- `.env` は**絶対にGitにコミットしない**
- `.gitignore` に含まれている
- サーバー上では適切な権限設定（600）

### HTTPS/SSL
- 本番環境では必須
- Let's Encryptで無料取得可能
- Nginxで自動リダイレクト

### Bot認証
- Microsoft App IDとPasswordを使用
- Azure ADでの認証

### API認証
- DevRev APIトークンを使用
- 最小権限の原則（必要な権限のみ付与）

### Nginxセキュリティヘッダー
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security

## モニタリングとログ

### アプリケーションログ
```bash
# PM2ログ
pm2 logs teams-leave-bot

# ログファイル
./logs/out.log       # 標準出力
./logs/err.log       # エラー出力
./logs/combined.log  # 統合ログ
```

### Nginxログ
```bash
/var/log/nginx/teams-bot-access.log  # アクセスログ
/var/log/nginx/teams-bot-error.log   # エラーログ
```

### ヘルスチェック
```bash
curl https://your-domain.com/health
# {"status":"healthy"}
```

## 依存関係

### システム依存
- Ubuntu 24.04
- Node.js 18+
- Nginx
- PM2
- Certbot (SSL用)

### Node.js パッケージ
- botbuilder: ^4.20.0
- restify: ^11.1.0
- axios: ^1.6.2
- dotenv: ^16.3.1
- adaptivecards: ^3.0.0

### 外部サービス
- Microsoft Azure (Bot登録)
- Microsoft Teams
- DevRev

## ライセンス

MIT License

---

**最終更新**: 2025-01-10
