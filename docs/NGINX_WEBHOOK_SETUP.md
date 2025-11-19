# NGINX Webhook設定ガイド

このドキュメントでは、DevRevからのWebhookリクエストを受け取るためのNGINX設定方法を説明します。

---

## 概要

Teams Leave Request Botは以下のエンドポイントを公開する必要があります：

| エンドポイント | 用途 | アクセス元 |
|---------------|------|-----------|
| `/api/messages` | Bot Frameworkメッセージング | Microsoft Teams / Azure Bot Service |
| `/api/devrev-webhook` | DevRevからのWebhook | DevRev API |
| `/health` | ヘルスチェック | 監視システム |

このガイドでは、`/api/devrev-webhook` の設定に焦点を当てます。

---

## 前提条件

- ✅ NGINXがインストール済み
- ✅ SSL証明書が設定済み（Let's Encrypt推奨）
- ✅ Botアプリケーションがポート3978で起動中
- ✅ ドメイン名が設定済み

---

## 設定方法

### ステップ1: NGINX設定ファイルの更新

本番環境用の設定ファイルを編集します：

```bash
sudo nano /etc/nginx/sites-available/teams-bot
```

#### 本番環境設定（nginx.conf.example）

プロジェクトの `nginx.conf.example` をベースに、以下の設定を追加してください：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... (その他のSSL設定)

    # Bot Framework endpoint
    location /api/messages {
        proxy_pass http://localhost:3978/api/messages;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # DevRev Webhook endpoint
    location /api/devrev-webhook {
        proxy_pass http://localhost:3978/api/devrev-webhook;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Webhook timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffer settings for webhook payloads
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Log webhook requests
        access_log /var/log/nginx/teams-bot-webhook.log;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3978/health;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        access_log off;
    }
}
```

#### 開発環境設定（nginx-dev.conf.example）

開発環境の場合は、SSHトンネル経由でローカルのBotに転送します：

```nginx
server {
    listen 443 ssl http2;
    server_name dev.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/dev.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.your-domain.com/privkey.pem;

    # ... (その他のSSL設定)

    # DevRev Webhook エンドポイント
    location /api/devrev-webhook {
        # SSHトンネル経由でローカルマシンのBotに転送
        proxy_pass http://localhost:3978/api/devrev-webhook;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Webhookタイムアウト設定
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # バッファ設定（Webhookペイロード用）
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Webhookリクエストをログに記録
        access_log /var/log/nginx/teams-bot-dev-webhook.log;
    }
}
```

### ステップ2: 設定ファイルのコピー

プロジェクトのサンプル設定をサーバーにコピーします：

```bash
# 本番環境
sudo cp nginx.conf.example /etc/nginx/sites-available/teams-bot

# または開発環境
sudo cp nginx-dev.conf.example /etc/nginx/sites-available/teams-bot-dev
```

### ステップ3: ドメイン名の置き換え

設定ファイル内の `your-domain.com` を実際のドメイン名に置き換えます：

```bash
sudo nano /etc/nginx/sites-available/teams-bot

# 以下を置き換え：
# your-domain.com → 実際のドメイン名
```

### ステップ4: 設定の有効化

シンボリックリンクを作成して設定を有効化します：

```bash
# 本番環境
sudo ln -s /etc/nginx/sites-available/teams-bot /etc/nginx/sites-enabled/

# または開発環境
sudo ln -s /etc/nginx/sites-available/teams-bot-dev /etc/nginx/sites-enabled/
```

### ステップ5: 設定のテスト

NGINX設定にエラーがないか確認します：

```bash
sudo nginx -t
```

**期待される出力:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### ステップ6: NGINXのリロード

設定を反映させます：

```bash
sudo systemctl reload nginx
```

---

## DevRev Webhook設定

NGINXの設定が完了したら、DevRev側でWebhookを設定します。

### Webhook URLの設定

1. **DevRev Dashboard** にログイン
2. **Settings** (⚙️) をクリック
3. **Webhooks** を選択
4. **+ Create Webhook** をクリック

### Webhook設定例

#### カスタムオブジェクトを使用する場合

```
Name: Teams Leave Request Webhook
URL: https://your-domain.com/api/devrev-webhook
Events:
  - custom_object.created
Filter: leaf_type = 'leave_request'
```

#### チケットを使用する場合

```
Name: Teams Leave Request Webhook
URL: https://your-domain.com/api/devrev-webhook
Events:
  - work.created
Filter: custom_fields.tnt__request_type = 'leave_request'
```

または Subtypeを使用する場合：

```
Filter: type = 'ticket' AND subtype = 'leave_request'
```

### Webhook Secretの設定（オプション）

Webhook検証のためにSecretを設定できます：

1. DevRevでWebhook Secretを生成
2. `.env` ファイルに追加：
   ```env
   DEVREV_WEBHOOK_SECRET=your-webhook-secret-here
   ```
3. Botを再起動

---

## 動作確認

### 1. NGINXアクセスログの確認

```bash
# Webhookログをリアルタイムで監視
sudo tail -f /var/log/nginx/teams-bot-webhook.log
```

### 2. Botアプリケーションのログ確認

```bash
# Botのログを確認（systemdで起動している場合）
sudo journalctl -u teams-bot -f

# または直接起動している場合
npm start
```

### 3. テストWebhookの送信

DevRev Dashboardから手動でテストWebhookを送信します：

1. DevRev Dashboard → Webhooks → あなたのWebhook
2. **Test** ボタンをクリック
3. サンプルペイロードを送信

**期待される動作:**
- NGINXログにリクエストが記録される
- Botログに `[DevRev Webhook] Received event:` が表示される
- 承認者にTeamsメッセージが届く

### 4. 実際の休暇申請でテスト

1. Teamsで `@BotName 休暇申請` とメンション
2. フォームを入力して送信
3. DevRevにカスタムオブジェクトまたはチケットが作成される
4. DevRevからWebhookが送信される
5. 承認者に承認依頼カードが届く

---

## トラブルシューティング

### 問題1: 404 Not Found

**症状:**
```
[DevRev Webhook] 404 Not Found
```

**原因:**
- NGINX設定に `/api/devrev-webhook` が含まれていない
- NGINXが設定をリロードしていない

**解決方法:**

```bash
# 設定ファイルを確認
sudo cat /etc/nginx/sites-enabled/teams-bot | grep devrev-webhook

# 設定が見つからない場合、再度追加
sudo nano /etc/nginx/sites-available/teams-bot

# NGINXをリロード
sudo nginx -t
sudo systemctl reload nginx
```

### 問題2: 502 Bad Gateway

**症状:**
```
[DevRev Webhook] 502 Bad Gateway
```

**原因:**
- Botアプリケーションが起動していない
- ポート3978が使用できない

**解決方法:**

```bash
# Botが起動しているか確認
sudo netstat -tlnp | grep 3978

# 起動していない場合、起動
npm start

# systemdで管理している場合
sudo systemctl status teams-bot
sudo systemctl start teams-bot
```

### 問題3: 504 Gateway Timeout

**症状:**
```
[DevRev Webhook] 504 Gateway Timeout
```

**原因:**
- Botの処理が30秒以上かかっている
- プロキシタイムアウトが短すぎる

**解決方法:**

NGINXのタイムアウトを延長：

```nginx
location /api/devrev-webhook {
    # タイムアウトを60秒に延長
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

```bash
sudo systemctl reload nginx
```

### 問題4: SSL証明書エラー

**症状:**
DevRevからのWebhookリクエストが失敗する

**原因:**
- SSL証明書が期限切れ
- SSL証明書が無効

**解決方法:**

```bash
# 証明書の有効期限を確認
sudo certbot certificates

# 証明書を更新
sudo certbot renew

# 自動更新の設定を確認
sudo systemctl status certbot.timer
```

### 問題5: Webhookペイロードが大きすぎる

**症状:**
```
[error] 413 Request Entity Too Large
```

**解決方法:**

NGINXの設定でリクエストサイズ制限を増やす：

```nginx
server {
    # リクエストボディの最大サイズを増やす
    client_max_body_size 10M;

    location /api/devrev-webhook {
        # バッファサイズを増やす
        proxy_buffer_size 8k;
        proxy_buffers 16 8k;
        proxy_busy_buffers_size 16k;
    }
}
```

```bash
sudo systemctl reload nginx
```

---

## セキュリティ考慮事項

### 1. Webhook Secret検証

Webhookリクエストの真正性を検証するため、Secretを使用してください：

```env
DEVREV_WEBHOOK_SECRET=your-webhook-secret-here
```

Botアプリケーション側で署名を検証します（実装済み）。

### 2. IPアドレス制限

DevRevのIPアドレスからのみアクセスを許可する場合：

```nginx
location /api/devrev-webhook {
    # DevRevのIPアドレスレンジを許可
    allow 1.2.3.4/24;  # DevRevのIPレンジに置き換え
    deny all;

    proxy_pass http://localhost:3978/api/devrev-webhook;
}
```

### 3. レート制限

Webhook エンドポイントへのリクエストレートを制限：

```nginx
# http {} ブロック内に追加
limit_req_zone $binary_remote_addr zone=webhook:10m rate=10r/s;

server {
    location /api/devrev-webhook {
        limit_req zone=webhook burst=20 nodelay;
        proxy_pass http://localhost:3978/api/devrev-webhook;
    }
}
```

### 4. SSL/TLS設定の強化

```nginx
server {
    # TLS 1.2以上のみ許可
    ssl_protocols TLSv1.2 TLSv1.3;

    # 強力な暗号スイートのみ使用
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTSヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

## ログとモニタリング

### Webhookログの分析

```bash
# 今日のWebhookリクエスト数を確認
sudo grep "$(date +%d/%b/%Y)" /var/log/nginx/teams-bot-webhook.log | wc -l

# エラーレスポンス（4xx, 5xx）を確認
sudo grep -E " (4[0-9]{2}|5[0-9]{2}) " /var/log/nginx/teams-bot-webhook.log

# 特定のステータスコードを確認
sudo grep " 404 " /var/log/nginx/teams-bot-webhook.log
```

### ログローテーション

Webhookログが肥大化しないようにログローテーションを設定：

```bash
sudo nano /etc/logrotate.d/nginx
```

```
/var/log/nginx/teams-bot-webhook.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

---

## まとめ

NGINXの `/api/devrev-webhook` エンドポイント設定により、DevRevからのWebhookリクエストを安全に受け取ることができます。

### 設定完了後の確認リスト

- ✅ NGINXに `/api/devrev-webhook` locationブロックを追加
- ✅ NGINX設定ファイルのシンタックスチェック（`nginx -t`）
- ✅ NGINXをリロード（`systemctl reload nginx`）
- ✅ DevRev DashboardでWebhook URLを設定
- ✅ テストWebhookを送信して動作確認
- ✅ Webhookログを監視

### 参考ドキュメント

- [DevRev Workflow Setup](DEVREV_WORKFLOW_SETUP.md) - DevRev側のWorkflow/Automation設定
- [Work Item Type Configuration](WORK_ITEM_TYPE_CONFIGURATION.md) - カスタムオブジェクト vs チケット
- [Dev with NGINX](DEV_WITH_NGINX.md) - 開発環境でのNGINX使用方法

---

**最終更新**: 2025-01-20
