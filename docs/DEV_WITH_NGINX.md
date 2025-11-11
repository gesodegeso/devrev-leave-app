# 開発環境でNginxを使用する方法（ngrokの代わり）

このガイドでは、ngrokの代わりにNginxとSSHトンネルを使用して開発環境を構築する方法を説明します。

---

## なぜNginxを使うのか

### ngrokの制約
- ❌ 無料版はURLが毎回変わる（Azure Bot設定の変更が必要）
- ❌ セッションタイムアウト（8時間）
- ❌ 帯域制限がある
- ❌ 本番環境と設定が異なる

### Nginxのメリット
- ✅ 本番環境と同じ構成でテスト可能
- ✅ 固定ドメインを使用可能
- ✅ SSLの動作確認ができる
- ✅ URLが変わらない
- ✅ 無制限の帯域・セッション

---

## 構成パターン

### パターン1: ローカルマシン + リモートサーバー（推奨）

```
[開発PC]                [リモートサーバー]          [Teams/Azure]
├── Bot (localhost:3978)  ├── Nginx (Port 443)
│   npm run dev          │   SSL終端
│                        │   リバースプロキシ
└── SSHトンネル ─────────→ localhost:3978
     (Port 3978)          │
                          └── https://dev.your-domain.com
                                     ↓
                              Azure Bot Service
                                     ↓
                              Microsoft Teams
```

**メリット:**
- ローカルでコードを編集・デバッグ
- リモートサーバーで公開（固定URL）
- 本番環境と同じNginx設定

### パターン2: ローカルマシンのみ（hosts編集）

```
[開発PC]
├── Bot (localhost:3978)
├── Nginx (Port 443)
│   自己署名証明書
└── /etc/hosts 編集
    127.0.0.1 dev.local

⚠️ Azure Botからはアクセスできない
→ ローカルでのUI/カードテストのみ
```

---

## パターン1: SSHトンネル + リモートNginx（推奨）

### 前提条件

- ✅ 固定IPまたはドメインを持つリモートサーバー
- ✅ サーバーでNginx稼働中
- ✅ SSL証明書設定済み（Let's Encrypt推奨）
- ✅ SSHアクセス可能

### ステップ1: リモートサーバーのNginx設定

#### 開発用のNginx設定を作成

`/etc/nginx/sites-available/teams-bot-dev`

```nginx
# 開発環境用Teams Bot設定
server {
    listen 80;
    server_name dev.your-domain.com;

    # HTTPからHTTPSへリダイレクト
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev.your-domain.com;

    # SSL証明書（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/dev.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.your-domain.com/privkey.pem;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # ログ
    access_log /var/log/nginx/teams-bot-dev-access.log;
    error_log /var/log/nginx/teams-bot-dev-error.log;

    # Bot Framework endpoint
    location /api/messages {
        # SSHトンネル経由でローカルマシンに転送
        proxy_pass http://localhost:3978/api/messages;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ヘルスチェック
    location /health {
        proxy_pass http://localhost:3978/health;
        access_log off;
    }
}
```

#### 設定を有効化

```bash
# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/teams-bot-dev /etc/nginx/sites-enabled/

# 設定テスト
sudo nginx -t

# Nginxをリロード
sudo systemctl reload nginx
```

#### SSL証明書を取得（初回のみ）

```bash
# Let's Encryptで証明書取得
sudo certbot --nginx -d dev.your-domain.com

# 自動更新の確認
sudo certbot renew --dry-run
```

### ステップ2: SSHトンネルの作成

#### 方法A: コマンドラインで手動作成

```bash
# リバーストンネルを作成
ssh -R 3978:localhost:3978 user@your-server.com

# オプション:
# -N : コマンドを実行しない（トンネルのみ）
# -f : バックグラウンド実行
ssh -N -R 3978:localhost:3978 user@your-server.com
```

**説明:**
- `-R 3978:localhost:3978`: リモートサーバーの3978ポートをローカルの3978に転送
- リモートサーバーで `localhost:3978` にアクセスすると、開発PCのBotに届く

#### 方法B: 自動接続スクリプト（推奨）

`dev-tunnel.sh` を作成:

```bash
#!/bin/bash

# 開発用SSHトンネルスクリプト

SERVER="user@your-server.com"
LOCAL_PORT=3978
REMOTE_PORT=3978

echo "開発用SSHトンネルを作成中..."
echo "ローカル: localhost:${LOCAL_PORT}"
echo "リモート: ${SERVER} :${REMOTE_PORT}"
echo ""
echo "Ctrl+C で終了"
echo ""

# SSHトンネルを作成（フォアグラウンド）
ssh -N -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} ${SERVER}
```

実行権限を付与:

```bash
chmod +x dev-tunnel.sh
```

使用方法:

```bash
# ターミナル1: SSHトンネル
./dev-tunnel.sh

# ターミナル2: Bot起動
npm run dev
```

#### 方法C: autossh（自動再接続）

接続が切れても自動再接続:

```bash
# autosshのインストール
# Ubuntu/Debian:
sudo apt-get install autossh

# macOS:
brew install autossh

# 自動再接続トンネル
autossh -M 0 -N -R 3978:localhost:3978 user@your-server.com
```

### ステップ3: Azure Botの設定

#### Messaging Endpointを設定

```
Azure Portal → Azure Bot → 構成

Messaging endpoint:
https://dev.your-domain.com/api/messages
```

この設定は開発中固定なので、変更不要です。

### ステップ4: 開発ワークフロー

#### 1. SSHトンネルを起動

```bash
# ターミナル1
./dev-tunnel.sh
# または
autossh -M 0 -N -R 3978:localhost:3978 user@your-server.com
```

#### 2. Botを起動

```bash
# ターミナル2
npm run dev
```

#### 3. Teamsでテスト

```
@BotName 休暇申請
```

#### 4. ログ確認

**ローカルPC:**
```bash
# Botのログ（ターミナル2に表示）
npm run dev
```

**リモートサーバー:**
```bash
# Nginxアクセスログ
sudo tail -f /var/log/nginx/teams-bot-dev-access.log

# Nginxエラーログ
sudo tail -f /var/log/nginx/teams-bot-dev-error.log
```

---

## パターン2: 完全ローカル（参考）

ローカルマシンのみでテストする場合。

⚠️ **制限**: Azure Botからアクセスできないため、実際のTeamsテストはできません。
Adaptive CardのUIテストなどに使用。

### Nginxをローカルにインストール

#### Ubuntu/Debian:
```bash
sudo apt-get install nginx
```

#### macOS:
```bash
brew install nginx
```

#### Windows (WSL):
```bash
sudo apt-get install nginx
```

### ローカルNginx設定

`/usr/local/etc/nginx/nginx.conf` (macOS) または
`/etc/nginx/sites-available/teams-bot-dev` (Linux)

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    # 自己署名証明書
    ssl_certificate /path/to/localhost.crt;
    ssl_certificate_key /path/to/localhost.key;

    location /api/messages {
        proxy_pass http://localhost:3978/api/messages;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 自己署名証明書の作成

```bash
# 証明書を生成
openssl req -x509 -newkey rsa:4096 -keyout localhost.key -out localhost.crt -days 365 -nodes

# Common Name (CN) に "localhost" を入力
```

---

## 便利なツールとコマンド

### 開発用スクリプトパッケージ

`package.json` に追加:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "dev:tunnel": "bash dev-tunnel.sh",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:tunnel\"",
    "test:devrev": "node test/test-devrev.js"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "concurrently": "^8.2.2"
  }
}
```

インストール:

```bash
npm install --save-dev concurrently
```

使用方法:

```bash
# BotとSSHトンネルを同時起動
npm run dev:all
```

### SSH設定ファイル

`~/.ssh/config` に追加:

```
Host devserver
    HostName your-server.com
    User your-username
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

使用方法:

```bash
# 短縮コマンドで接続
ssh -R 3978:localhost:3978 devserver
```

### VSCode統合

`.vscode/tasks.json` を作成:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start SSH Tunnel",
      "type": "shell",
      "command": "./dev-tunnel.sh",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Start Bot Dev",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

使用方法:
1. `Ctrl+Shift+P` (または `Cmd+Shift+P`)
2. "Tasks: Run Task"
3. "Start SSH Tunnel" または "Start Bot Dev" を選択

---

## トラブルシューティング

### 問題1: SSHトンネルが切断される

**原因:**
ネットワークの不安定性、タイムアウト

**解決方法:**

```bash
# autosshを使用（自動再接続）
autossh -M 0 -N -R 3978:localhost:3978 user@your-server.com

# またはSSH設定に以下を追加
# ~/.ssh/config
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### 問題2: ポート衝突

**エラー:**
```
bind: Address already in use
```

**解決方法:**

```bash
# リモートサーバーで使用中のポートを確認
ssh user@your-server.com "sudo lsof -i :3978"

# プロセスを終了
ssh user@your-server.com "sudo kill <PID>"
```

### 問題3: Nginxがlocalhostに転送できない

**原因:**
SSHトンネルが起動していない

**確認:**

```bash
# リモートサーバーで確認
ssh user@your-server.com "curl http://localhost:3978/health"

# 成功すれば {"status":"healthy"} が返る
```

### 問題4: SSL証明書エラー

**原因:**
開発用ドメインの証明書がない

**解決方法:**

```bash
# Let's Encryptで証明書取得
sudo certbot --nginx -d dev.your-domain.com

# ワイルドカード証明書（DNS認証が必要）
sudo certbot certonly --manual --preferred-challenges dns -d "*.your-domain.com"
```

---

## セキュリティ考慮事項

### SSHキーの使用

パスワード認証の代わりにSSHキーを使用:

```bash
# SSHキーを生成（まだない場合）
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 公開鍵をサーバーにコピー
ssh-copy-id user@your-server.com

# パスワード不要でログイン可能
ssh user@your-server.com
```

### ファイアウォール設定

リモートサーバーで:

```bash
# 必要なポートのみ開放
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### SSHトンネルの制限

リモートサーバーの `/etc/ssh/sshd_config`:

```
# リモートポートフォワーディングを許可
GatewayPorts no  # localhostのみアクセス可能（推奨）

# または特定のユーザーのみ許可
Match User devuser
    GatewayPorts yes
```

設定後、SSHDを再起動:

```bash
sudo systemctl restart sshd
```

---

## まとめ

### 推奨構成

```
開発環境:
├── ローカルPC: Bot開発・デバッグ
├── SSHトンネル: リモートサーバーへの接続
├── リモートサーバー: Nginx + SSL
└── 固定URL: https://dev.your-domain.com
```

### 利点

✅ **本番環境と同じ構成**
- Nginx設定を事前テスト
- SSL動作確認

✅ **固定URL**
- Azure Bot設定が不変
- URL変更の手間なし

✅ **柔軟性**
- ローカルでコード編集
- 即座に反映
- デバッガー使用可能

✅ **コスト効率**
- ngrok有料版不要
- 既存サーバー活用

---

## 次のステップ

1. ✅ リモートサーバーのNginx設定
2. ✅ SSL証明書取得
3. ✅ SSHトンネルスクリプト作成
4. ✅ Azure Bot設定更新
5. 🚀 開発開始！

---

**参考ドキュメント:**
- [LOCAL_DEVELOPMENT.md](../LOCAL_DEVELOPMENT.md) - ローカル開発ガイド
- [README.md](../README.md) - 本番環境デプロイ

**最終更新**: 2025-01-10
