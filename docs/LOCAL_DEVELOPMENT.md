# ローカル開発環境セットアップガイド

このガイドでは、ローカルマシンでTeams Botを開発・デバッグする手順を説明します。

## 前提条件

### 必要なソフトウェア
- Node.js 18以上
- npm または yarn
- **公開用ツール（以下のいずれか）:**
  - **Option A: ngrok**（簡単・クイックスタート）
  - **Option B: SSH + Nginx**（推奨・本番環境と同じ構成）
- VSCode（推奨）
- Git

### 必要なアカウント
- Azureアカウント（Bot登録済み）
- DevRevアカウント（APIトークン取得済み）

---

## セットアップ手順

### 1. プロジェクトのクローン

```bash
# プロジェクトをクローン
git clone <your-repo-url>
cd devrev-leav-app
```

### 2. 依存関係のインストール

```bash
# Node.jsのバージョン確認
node --version  # v18以上であることを確認

# 依存関係をインストール
npm install
```

### 3. 環境変数の設定

```bash
# .envファイルを作成
cp .env.example .env
```

`.env`ファイルを編集:

```bash
# エディタで開く（VSCodeの場合）
code .env

# または
nano .env
# または
vim .env
```

以下の値を設定:

```env
# ローカル開発用ポート
PORT=3978
NODE_ENV=development

# Azure Bot Serviceから取得（本番と同じ値）
MICROSOFT_APP_ID=your-bot-app-id-here
MICROSOFT_APP_PASSWORD=your-bot-app-password-here

# DevRev API（テスト用トークンを推奨）
DEVREV_API_TOKEN=your-devrev-api-token-here
DEVREV_API_BASE_URL=https://api.devrev.ai
DEVREV_DEFAULT_PART_ID=your-default-part-id-here

# ログレベル
LOG_LEVEL=debug
```

### 4. 公開方法の選択

ローカルのBotをインターネットに公開する方法を選びます。

#### Option A: ngrok（クイックスタート）

**メリット:**
- ✅ 最も簡単
- ✅ 5分でセットアップ完了

**デメリット:**
- ❌ 無料版はURLが毎回変わる
- ❌ 本番環境と構成が異なる

#### Option B: SSH + Nginx（推奨）

**メリット:**
- ✅ 固定URL使用可能
- ✅ 本番環境と同じ構成
- ✅ SSL動作確認可能

**デメリット:**
- ❌ リモートサーバーが必要
- ❌ 初期セットアップがやや複雑

📖 **詳細ガイド**: [DEV_WITH_NGINX.md](docs/DEV_WITH_NGINX.md) を参照

---

### 4-A. ngrokを使用する場合

ngrokは、ローカルサーバーをインターネットに公開するためのトンネルツールです。

#### ngrokのインストール

**Option A: npm経由（推奨）**
```bash
npm install -g ngrok
```

**Option B: 公式サイトからダウンロード**
1. https://ngrok.com/download にアクセス
2. お使いのOSに応じたバージョンをダウンロード
3. 解凍してPATHに追加

#### ngrokの認証設定（初回のみ）

```bash
# ngrokアカウントにサインアップ（無料）
# https://dashboard.ngrok.com/signup

# Authtokenを取得（ダッシュボードから）
ngrok config add-authtoken YOUR_AUTHTOKEN
```

### 5. Botの起動

#### ターミナル1: Botアプリケーションを起動

```bash
# 開発モード（自動リロード）
npm run dev

# または通常起動
npm start
```

以下のようなメッセージが表示されれば成功:

```
restify listening to http://[::]:3978

Bot is ready to receive messages
```

#### ターミナル2: ngrokトンネルを開始

新しいターミナルを開いて:

```bash
ngrok http 3978
```

ngrokが起動すると以下のような画面が表示されます:

```
ngrok

Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        Japan (jp)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://xxxx-xxx-xxx-xxx.ngrok-free.app -> http://localhost:3978

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**重要**: `Forwarding` の**HTTPSのURL**をコピーしてください:
```
https://xxxx-xxx-xxx-xxx.ngrok-free.app
```

### 6. Azure BotのMessaging Endpointを更新

1. [Azure Portal](https://portal.azure.com)にアクセス
2. 作成したBotリソースに移動
3. 「構成」セクションを開く
4. **Messaging endpoint**を以下のように更新:
   ```
   https://xxxx-xxx-xxx-xxx.ngrok-free.app/api/messages
   ```
   （xxxx...の部分はngrokのURLに置き換え）
5. 「適用」をクリック

**注意**: ngrokを再起動するたびにURLが変わるため、その都度更新が必要です。
（有料版ngrokを使用すると固定URLが使えます）

---

### 4-B. SSH + Nginxを使用する場合（推奨）

固定URLで、本番環境と同じ構成でテストできます。

#### 前提条件
- 固定IPまたはドメインを持つリモートサーバー
- リモートサーバーへのSSHアクセス
- リモートサーバーでNginx稼働中

#### セットアップ（初回のみ）

**1. リモートサーバーにNginx設定**

```bash
# リモートサーバーにSSH接続
ssh user@your-server.com

# 開発用Nginx設定をコピー
sudo nano /etc/nginx/sites-available/teams-bot-dev

# nginx-dev.conf.exampleの内容を貼り付け
# dev.your-domain.com を実際のドメインに置き換え

# 設定を有効化
sudo ln -s /etc/nginx/sites-available/teams-bot-dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL証明書取得
sudo certbot --nginx -d dev.your-domain.com
```

**2. SSH設定ファイル（ローカルPC）**

`~/.ssh/config` に追加:

```
Host devserver
    HostName your-server.com
    User your-username
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

**3. トンネル設定ファイル（ローカルPC）**

```bash
# プロジェクトルートで
cp .dev-tunnel.conf.example .dev-tunnel.conf
nano .dev-tunnel.conf

# SERVER設定を変更
SERVER="devserver"  # または user@your-server.com
```

#### 日常の使用方法

**ターミナル1: SSHトンネル**

```bash
# SSHトンネルを起動
./dev-tunnel.sh
```

**ターミナル2: Bot起動**

```bash
# Bot起動
npm run dev
```

#### Azure Bot設定

Messaging endpointに固定URLを設定（一度だけ）:

```
https://dev.your-domain.com/api/messages
```

これ以降、URLの変更は不要です。

📖 **詳細**: [DEV_WITH_NGINX.md](docs/DEV_WITH_NGINX.md) を参照

---

### 5. Botの起動

#### ターミナル1: Botアプリケーションを起動

```bash
# 開発モード（自動リロード）
npm run dev
```

#### ターミナル2: 公開ツールを起動

**ngrok使用時:**
```bash
ngrok http 3978
```

**SSH + Nginx使用時:**
```bash
./dev-tunnel.sh
```

### 6. Azure BotのMessaging Endpoint設定

#### ngrok使用時:
毎回変更が必要:
```
https://xxxx-xxx-xxx-xxx.ngrok-free.app/api/messages
```

#### SSH + Nginx使用時:
一度設定すれば変更不要:
```
https://dev.your-domain.com/api/messages
```

### 7. Teams Appをテスト

#### Option A: Teams Web版でテスト（推奨）

1. https://teams.microsoft.com にアクセス
2. 既にインストール済みのBotとチャット開始
3. コマンドを送信:
   ```
   @休暇申請Bot 休暇申請
   ```

#### Option B: Teams デスクトップアプリ

1. Microsoft Teamsアプリを開く
2. Botとチャット
3. コマンドを送信

---

## デバッグ方法

### 1. コンソールログでのデバッグ

コードに`console.log()`を追加:

```javascript
// src/bot.js
async handleLeaveRequest(context) {
    console.log('=== handleLeaveRequest called ===');
    console.log('Context:', context.activity);
    console.log('User:', context.activity.from);
    // ...既存のコード
}
```

ターミナルでログを確認:
```bash
# Bot起動中のターミナルでログが表示される
```

### 2. VSCodeデバッガーを使用

#### デバッグ設定を作成

`.vscode/launch.json`を作成:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Teams Bot",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.js",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "node",
      "runtimeArgs": ["--inspect"]
    }
  ]
}
```

#### デバッグの開始

1. VSCodeでブレークポイントを設定:
   - `src/bot.js`の任意の行番号をクリック（赤い点が表示される）

2. VSCodeのデバッグビューを開く（Ctrl+Shift+D / Cmd+Shift+D）

3. 「Debug Teams Bot」を選択して実行（F5）

4. Teamsからメッセージを送信

5. ブレークポイントで停止し、変数を確認できます

#### デバッガーの操作

- **F5**: 続行
- **F10**: ステップオーバー（次の行へ）
- **F11**: ステップイン（関数内に入る）
- **Shift+F11**: ステップアウト（関数から出る）

### 3. ngrok Web UIでリクエストを確認

ngrok起動中に以下のURLにアクセス:
```
http://localhost:4040
```

ここで以下を確認できます:
- Teamsからのリクエスト内容
- レスポンス内容
- リクエスト/レスポンスのヘッダー
- タイミング

**便利な機能**:
- リクエストの詳細を確認
- リプレイ機能（同じリクエストを再送信）

### 4. DevRev APIのテスト

DevRev APIを単体でテスト:

```bash
# curlでテスト
curl -X POST https://api.devrev.ai/internal/tickets.create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ticket",
    "title": "Test Ticket",
    "body": "This is a test",
    "applies_to_part": "YOUR_PART_ID"
  }'
```

または、Node.jsスクリプトでテスト:

`test-devrev.js`を作成:

```javascript
require('dotenv').config();
const axios = require('axios');

async function testDevRevAPI() {
    try {
        const response = await axios.post(
            'https://api.devrev.ai/internal/tickets.create',
            {
                type: 'ticket',
                title: 'Test Ticket from Local',
                body: 'This is a test ticket',
                applies_to_part: process.env.DEVREV_DEFAULT_PART_ID
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEVREV_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Success!');
        console.log('Ticket ID:', response.data.ticket.id);
        console.log('Full response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testDevRevAPI();
```

実行:
```bash
node test-devrev.js
```

---

## よくある問題と解決方法

### 問題1: Botが応答しない

**確認事項**:

1. **Botが起動しているか確認**
   ```bash
   # ターミナルで以下が表示されているか
   # "Bot is ready to receive messages"
   ```

2. **ngrokが起動しているか確認**
   ```bash
   # 別のターミナルでngrokが動いているか確認
   ```

3. **Azure BotのMessaging Endpointが正しいか確認**
   - Azure Portal → Bot → 構成
   - ngrokのHTTPS URLが設定されているか
   - URLの末尾が`/api/messages`になっているか

4. **ログを確認**
   ```bash
   # Botのターミナルでエラーが出ていないか確認
   ```

### 問題2: 環境変数が読み込まれない

**解決方法**:

```bash
# .envファイルが存在するか確認
ls -la .env

# .envファイルの内容を確認（機密情報に注意）
cat .env

# Botを再起動
# Ctrl+C で停止して、再度 npm run dev
```

### 問題3: ngrokのURLが変わる

**解決方法**:

**Option A: 無料版の場合**
- ngrokを再起動するたびにAzure BotのMessaging Endpointを更新

**Option B: ngrok有料版を使用**
```bash
# 固定ドメインを使用（有料プラン）
ngrok http 3978 --domain=your-fixed-domain.ngrok-free.app
```

**Option C: 開発中はngrokを起動しっぱなし**
- コーディング中はngrokを停止せず、Botのみ再起動

### 問題4: "401 Unauthorized"エラー

**原因**: Microsoft App IDまたはPasswordが間違っている

**解決方法**:
1. Azure Portal → Bot → 構成でApp IDを確認
2. 証明書とシークレット → クライアントシークレットの値を再取得
3. `.env`ファイルを更新
4. Botを再起動

### 問題5: DevRev APIエラー

**確認事項**:

```bash
# APIトークンをテスト
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.devrev.ai/internal/dev-users.self

# 成功すれば、自分のユーザー情報が返ってくる
```

**よくあるエラー**:

- **401**: APIトークンが無効 → DevRevで新しいトークンを生成
- **403**: 権限不足 → トークンに適切な権限を付与
- **404**: Part IDが間違っている → DevRevでPart IDを確認

### 問題6: Adaptive Cardが表示されない

**確認事項**:

1. **JSONの構文エラー**
   ```bash
   # JSONを検証
   cat src/cards/leaveRequestCard.json | python3 -m json.tool
   ```

2. **Adaptive Cardのバージョン確認**
   - `src/cards/leaveRequestCard.json`の`version`が`1.4`以下か確認

3. **ログを確認**
   ```javascript
   // src/bot.js の handleLeaveRequest に追加
   console.log('Sending card:', JSON.stringify(card, null, 2));
   ```

---

## 開発ワークフロー

### 1. 機能開発の流れ

```bash
# 1. 新しいブランチを作成
git checkout -b feature/new-command

# 2. コードを編集
# 3. 保存すると自動リロード（npm run dev使用時）

# 4. Teamsでテスト

# 5. 動作確認できたらコミット
git add .
git commit -m "Add new command feature"

# 6. プッシュ
git push origin feature/new-command
```

### 2. ホットリロード（自動再起動）

`package.json`の`dev`スクリプトで`nodemon`を使用:

```json
{
  "scripts": {
    "dev": "nodemon src/index.js"
  }
}
```

ファイルを保存すると自動的にBotが再起動されます。

### 3. 新しいコマンドの追加手順

#### Step 1: Adaptive Cardを作成

`src/cards/newCommandCard.json`:

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "新しいコマンド",
      "weight": "bolder",
      "size": "large"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "送信"
    }
  ]
}
```

#### Step 2: Botにハンドラーを追加

`src/bot.js`:

```javascript
// onMessageハンドラーに追加
if (text === '新コマンド') {
    await this.handleNewCommand(context);
}

// 新しいメソッドを追加
async handleNewCommand(context) {
    const card = require('./cards/newCommandCard.json');
    await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)]
    });
}
```

#### Step 3: テスト

```
@BotName 新コマンド
```

### 4. DevRevサービスの拡張

`src/services/devrev.js`に新しいメソッドを追加:

```javascript
async createCustomTicket(data) {
    try {
        const response = await axios.post(
            `${this.apiBaseUrl}/internal/tickets.create`,
            {
                type: 'ticket',
                title: data.title,
                body: data.description,
                applies_to_part: this.defaultPartId
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            ticketId: response.data.ticket.id
        };
    } catch (error) {
        console.error('Error creating ticket:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

---

## 便利なツールとコマンド

### ログ監視

```bash
# リアルタイムでログを監視（別ターミナル）
tail -f logs/out.log

# エラーログのみ監視
tail -f logs/err.log
```

### JSON整形

```bash
# JSONを整形して表示
echo '{"key":"value"}' | python3 -m json.tool
```

### HTTPリクエストのテスト

```bash
# Botのヘルスチェック
curl http://localhost:3978/health

# 結果: {"status":"healthy"}
```

### デバッグ用の環境変数

`.env`に追加:

```env
# 詳細なログを出力
DEBUG=*
LOG_LEVEL=debug

# Bot Frameworkのデバッグ
DEBUG=botbuilder:*
```

---

## VSCode拡張機能（推奨）

開発効率を上げるための推奨拡張機能:

1. **ESLint** - コードの品質チェック
2. **Prettier** - コードフォーマット
3. **REST Client** - APIテスト
4. **GitLens** - Git履歴の可視化
5. **Thunder Client** - API クライアント（Postmanの代替）

---

## 次のステップ

1. ✅ ローカル環境で動作確認
2. ✅ 新しい機能を追加してテスト
3. ✅ DevRev連携を確認
4. 🚀 本番環境へデプロイ（[README.md](README.md)参照）

---

## 参考リンク

- [Bot Framework Documentation](https://docs.microsoft.com/azure/bot-service/)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [ngrok Documentation](https://ngrok.com/docs)
- [DevRev API Documentation](https://docs.devrev.ai/)
- [VSCode Debugging](https://code.visualstudio.com/docs/editor/debugging)

---

**最終更新**: 2025-01-10
