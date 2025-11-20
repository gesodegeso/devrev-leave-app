# Redis セットアップガイド

このドキュメントでは、会話参照の永続化のためのRedis設定方法を説明します。

---

## 概要

Teams Leave Request Botは、プロアクティブメッセージング（承認依頼の送信）のために会話参照を保存する必要があります。

### Redis使用のメリット

**Redis使用時:**
- ✅ Bot再起動後も会話参照が保持される
- ✅ 複数のBotインスタンス間で会話参照を共有可能
- ✅ 30日間の自動有効期限管理
- ✅ 高速なデータアクセス

**メモリのみ使用時（Redisなし）:**
- ⚠️ Bot再起動で会話参照が失われる
- ⚠️ ユーザーは再度Botと対話する必要がある
- ✅ 追加のインフラ不要（開発環境向け）

---

## Redisのインストール

### Ubuntu/Debian

```bash
# Redisサーバーをインストール
sudo apt update
sudo apt install redis-server

# Redisを起動
sudo systemctl start redis-server

# 自動起動を有効化
sudo systemctl enable redis-server

# 動作確認
redis-cli ping
# 期待される出力: PONG
```

### macOS (Homebrew)

```bash
# Redisをインストール
brew install redis

# Redisを起動
brew services start redis

# 動作確認
redis-cli ping
# 期待される出力: PONG
```

### Docker

```bash
# Redisコンテナを起動
docker run -d \
  --name teams-bot-redis \
  -p 6379:6379 \
  redis:7-alpine

# 動作確認
docker exec -it teams-bot-redis redis-cli ping
# 期待される出力: PONG
```

### Windows

1. [Redis for Windows](https://github.com/microsoftarchive/redis/releases) をダウンロード
2. インストーラーを実行
3. サービスとして起動

または、WSL2でLinux版を使用することを推奨します。

---

## Bot設定

### ステップ1: .envファイルの設定

`.env` ファイルにRedis接続情報を追加します：

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-redis-password-here  # パスワード認証が必要な場合
# REDIS_DB=0  # デフォルトは0
```

### ステップ2: Botの再起動

```bash
# ローカル開発環境
npm start

# PM2で管理している場合
pm2 restart teams-bot

# systemdで管理している場合
sudo systemctl restart teams-bot
```

### ステップ3: 接続確認

Botの起動ログで以下のメッセージを確認：

```
[ConversationStorage] Redis client connected successfully
[ConversationStorage] Redis host: localhost
[ConversationStorage] Redis port: 6379
[Bot] Conversation storage initialized
[Bot] Storage stats: {"isConnected":true,"memoryCount":0,"redisCount":0}
```

---

## Redis設定のカスタマイズ

### パスワード認証の有効化

**Redis側の設定:**

```bash
# Redisの設定ファイルを編集
sudo nano /etc/redis/redis.conf

# 以下の行を追加または編集
requirepass your-strong-password-here

# Redisを再起動
sudo systemctl restart redis-server
```

**Bot側の設定:**

```env
REDIS_PASSWORD=your-strong-password-here
```

### データベース番号の変更

Redisは0-15の複数のデータベースをサポートしています。他のアプリケーションと分離する場合：

```env
REDIS_DB=1
```

### リモートRedisサーバーの使用

```env
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

### Redis Cloudの使用

[Redis Cloud](https://redis.com/try-free/)などのマネージドサービスを使用する場合：

1. Redis Cloudでデータベースを作成
2. 接続情報を取得
3. .envファイルに設定:

```env
REDIS_HOST=redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-cloud-password
```

---

## データの確認と管理

### Redis CLIでデータを確認

```bash
# Redis CLIに接続
redis-cli

# すべての会話参照キーを表示
KEYS conversation:*

# 特定のユーザーの会話参照を表示
GET conversation:29:1AbCdEfGhIjKlMnOpQrStUvWxYz

# キーの有効期限を確認（秒単位）
TTL conversation:29:1AbCdEfGhIjKlMnOpQrStUvWxYz

# すべての会話参照を削除（テスト用）
DEL conversation:*

# 終了
exit
```

### 保存されているデータの形式

```json
{
  "activityId": "1234567890",
  "user": {
    "id": "29:1AbCdEfGhIjKlMnOpQrStUvWxYz",
    "name": "山田太郎",
    "aadObjectId": "abc123..."
  },
  "bot": {
    "id": "28:bot-id-here",
    "name": "Leave Request Bot"
  },
  "conversation": {
    "id": "19:conversation-id-here"
  },
  "channelId": "msteams",
  "serviceUrl": "https://smba.trafficmanager.net/apac/"
}
```

### データの有効期限

会話参照は30日間保存され、その後自動的に削除されます。

30日以上対話がないユーザーは、再度Botと対話する必要があります。

---

## トラブルシューティング

### 問題1: Redis接続エラー

**症状:**
```
[ConversationStorage] Redis error: Error: connect ECONNREFUSED 127.0.0.1:6379
[ConversationStorage] Failed to connect to Redis
[ConversationStorage] Falling back to in-memory storage
```

**原因:**
- Redisサーバーが起動していない
- ホスト/ポート設定が間違っている

**解決方法:**

```bash
# Redisのステータスを確認
sudo systemctl status redis-server

# 起動していない場合、起動
sudo systemctl start redis-server

# ポートを確認
sudo netstat -tlnp | grep 6379

# Redisに接続できるか確認
redis-cli ping
```

### 問題2: パスワード認証エラー

**症状:**
```
[ConversationStorage] Redis error: NOAUTH Authentication required
```

**原因:**
Redis側でパスワード認証が有効だが、Bot側で設定されていない

**解決方法:**

`.env` ファイルにパスワードを追加:

```env
REDIS_PASSWORD=your-redis-password
```

### 問題3: メモリフォールバック動作

**症状:**
```
[ConversationStorage] Falling back to in-memory storage
[ConversationStorage] Stored conversation reference in memory for user: 29:xxxxx
```

**原因:**
Redisに接続できないため、メモリストレージを使用している

**影響:**
- Bot再起動で会話参照が失われる
- 機能自体は正常に動作する

**解決方法:**
Redisサーバーを起動して、Botを再起動

### 問題4: Bot再起動後も会話参照が保存されない

**症状:**
Redisは接続できているが、Bot再起動後に会話参照が見つからない

**確認方法:**

```bash
# Redis CLIで確認
redis-cli
KEYS conversation:*
# キーが表示されるか確認
```

**原因:**
- データが別のRedisデータベース（DB番号）に保存されている
- 有効期限が過ぎて削除された

**解決方法:**

```env
# 正しいデータベース番号を指定
REDIS_DB=0
```

---

## 本番環境での推奨設定

### セキュリティ設定

**1. パスワード認証を有効化**

```bash
# /etc/redis/redis.conf
requirepass strong-password-here
```

**2. 外部からのアクセスを制限**

```bash
# /etc/redis/redis.conf
bind 127.0.0.1
# または特定のIPのみ許可
bind 127.0.0.1 10.0.1.5
```

**3. 保護モードを有効化**

```bash
# /etc/redis/redis.conf
protected-mode yes
```

### パフォーマンス設定

**1. メモリ上限の設定**

```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

**2. 永続化の設定（オプション）**

Redisのデータを定期的にディスクに保存する場合：

```bash
# /etc/redis/redis.conf
save 900 1
save 300 10
save 60 10000
```

ただし、会話参照は30日の有効期限があるため、永続化は必須ではありません。

### 監視設定

**1. Redis統計の確認**

```bash
redis-cli INFO stats
```

**2. メモリ使用量の監視**

```bash
redis-cli INFO memory
```

**3. 接続数の確認**

```bash
redis-cli INFO clients
```

---

## Docker Composeでの設定例

本番環境でBotとRedisをDocker Composeで管理する場合：

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: teams-bot-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - teams-bot-network

  teams-bot:
    build: .
    container_name: teams-bot
    restart: unless-stopped
    ports:
      - "3978:3978"
    env_file:
      - .env
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    networks:
      - teams-bot-network

volumes:
  redis-data:

networks:
  teams-bot-network:
    driver: bridge
```

**起動方法:**

```bash
docker-compose up -d
```

---

## 開発環境とRedis

### Redisなしで開発する場合

開発環境でRedisをインストールしたくない場合、Botは自動的にメモリストレージにフォールバックします。

**制限:**
- Bot再起動で会話参照が失われる
- テストのたびにユーザーがBotと対話する必要がある

### Dockerを使用した簡単なRedis起動

```bash
# 開発用にRedisを起動（データは永続化しない）
docker run -d -p 6379:6379 --name dev-redis redis:7-alpine

# 使い終わったら削除
docker stop dev-redis
docker rm dev-redis
```

---

## パフォーマンスと容量計画

### メモリ使用量の見積もり

1つの会話参照は約300-500バイトです。

**例:**
- 100ユーザー: 約50KB
- 1,000ユーザー: 約500KB
- 10,000ユーザー: 約5MB

Redisのメモリは非常に少なくて済みます。

### 推奨メモリ設定

- **小規模（100ユーザー以下）**: 64MB
- **中規模（1,000ユーザー以下）**: 128MB
- **大規模（10,000ユーザー以下）**: 256MB

---

## まとめ

### セットアップ完了チェックリスト

- ✅ Redisサーバーがインストールされている
- ✅ Redisが起動している（`redis-cli ping` → `PONG`）
- ✅ `.env` にRedis接続情報を設定
- ✅ Botを再起動
- ✅ ログで "Redis client connected successfully" を確認
- ✅ ユーザーがBotと対話
- ✅ `redis-cli KEYS conversation:*` でデータを確認

### 関連ドキュメント

- [Proactive Messaging Guide](PROACTIVE_MESSAGING_GUIDE.md) - プロアクティブメッセージングの仕組み
- [Local Development](LOCAL_DEVELOPMENT.md) - ローカル開発環境での設定

---

**最終更新**: 2025-01-20
