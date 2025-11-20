# Redis実装サマリー

## 実装概要

会話参照の永続化のため、Redisストレージを実装しました。これにより、Bot再起動後も承認依頼などのプロアクティブメッセージを送信できるようになります。

---

## 実装した変更

### 1. 新規ファイル

#### [src/services/conversationStorage.js](src/services/conversationStorage.js)
Redisを使用した会話参照ストレージサービス

**主な機能:**
- Redis接続管理（自動再接続対応）
- 会話参照の保存・取得・削除
- メモリキャッシュによる高速アクセス
- Redisが使用できない場合の自動フォールバック
- 30日間の自動有効期限管理

**主要メソッド:**
- `connect()` - Redis接続
- `setConversationReference(userId, conversationReference)` - 会話参照を保存
- `getConversationReference(userId)` - 会話参照を取得
- `deleteConversationReference(userId)` - 会話参照を削除
- `getAllUserIds()` - 保存されているすべてのユーザーIDを取得
- `getStats()` - ストレージ統計情報を取得

### 2. 更新ファイル

#### [src/bot.js](src/bot.js)
Redisストレージを使用するように更新

**変更点:**
- `ConversationStorage` のインポート
- `conversationReferences` Map から `conversationStorage` サービスへ移行
- `initializeStorage()` メソッドを追加（Redis接続初期化）
- `addConversationReference()` を非同期メソッドに変更
- `handleLeaveRequestCreated()` を非同期取得に対応
- `notifyRequester()` を非同期取得に対応

#### [package.json](package.json)
Redis npmパッケージを追加

```json
{
  "dependencies": {
    "redis": "^4.x"
  }
}
```

#### [.env.example](.env.example)
Redis接続設定を追加

```env
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-redis-password-here
# REDIS_DB=0
```

### 3. ドキュメント

#### [docs/REDIS_SETUP.md](docs/REDIS_SETUP.md)
Redis設定の詳細ガイド（新規作成）

**内容:**
- Redisのインストール方法（Ubuntu/macOS/Docker/Windows）
- Bot設定手順
- Redis設定のカスタマイズ
- データの確認と管理
- トラブルシューティング
- 本番環境での推奨設定
- Docker Composeでの設定例

#### [docs/PROACTIVE_MESSAGING_GUIDE.md](docs/PROACTIVE_MESSAGING_GUIDE.md)
プロアクティブメッセージングの実装ガイド（既存ファイルを更新）

**更新内容:**
- Redisストレージの説明を追加
- Bot再起動後の問題の解決方法を更新
- 会話参照の永続化セクションを「実装済み」に変更

#### [README.md](README.md)
メインREADMEを更新

**追加内容:**
- システム要件にRedisを追加
- 技術ドキュメントリンクにRedisセットアップガイドを追加
- プロアクティブメッセージングガイドへのリンクを追加

---

## アーキテクチャ

### データフロー

```
ユーザー → Bot
    ↓
addConversationReference()
    ↓
conversationStorage.setConversationReference()
    ↓
├─ Redis (永続化) ← メイン
└─ メモリ (キャッシュ) ← フォールバック
```

```
DevRev Webhook → Bot
    ↓
handleLeaveRequestCreated()
    ↓
conversationStorage.getConversationReference()
    ↓
├─ メモリ (高速アクセス)
└─ Redis (メモリになければ取得)
    ↓
continueConversationAsync()
    ↓
承認者にプロアクティブメッセージ送信
```

### フォールバックメカニズム

```
Redis接続試行
    ↓
  成功？
  ├─ YES → Redis使用（永続化）
  │        + メモリキャッシュ（高速アクセス）
  │
  └─ NO  → メモリのみ使用（フォールバック）
           ⚠️ Bot再起動で失われる
```

---

## セットアップ手順

### 最小構成（開発環境）

```bash
# 1. Redisをインストール
sudo apt install redis-server

# 2. Redisを起動
sudo systemctl start redis-server

# 3. .envファイルを更新（デフォルト値でOK）
# REDIS_HOST=localhost
# REDIS_PORT=6379

# 4. Botを起動
npm start
```

### 本番環境

```bash
# 1. Redisをインストールして設定
sudo apt install redis-server

# 2. パスワード認証を設定
sudo nano /etc/redis/redis.conf
# requirepass your-strong-password を追加

# 3. Redisを再起動
sudo systemctl restart redis-server

# 4. .envファイルを設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-strong-password

# 5. Botを再起動
pm2 restart teams-bot
```

詳細は [docs/REDIS_SETUP.md](docs/REDIS_SETUP.md) を参照してください。

---

## 動作確認

### 1. Redis接続確認

Botの起動ログを確認：

```
[ConversationStorage] Redis client connected successfully
[ConversationStorage] Redis host: localhost
[ConversationStorage] Redis port: 6379
[Bot] Conversation storage initialized
[Bot] Storage stats: {"isConnected":true,"memoryCount":0,"redisCount":0}
```

### 2. 会話参照の保存確認

ユーザーがBotにメッセージを送信すると：

```
[addConversationReference] Stored reference for user: 29:1AbCdEfGhIjKlMnOpQrStUvWxYz
[addConversationReference] Service URL: https://smba.trafficmanager.net/apac/
[ConversationStorage] Stored conversation reference in Redis for user: 29:xxxxx
[addConversationReference] Storage stats - Memory: 1 Redis: 1
```

### 3. Redisデータの確認

```bash
# Redis CLIで確認
redis-cli
KEYS conversation:*
GET conversation:29:1AbCdEfGhIjKlMnOpQrStUvWxYz
TTL conversation:29:1AbCdEfGhIjKlMnOpQrStUvWxYz
```

### 4. Bot再起動後のテスト

```bash
# 1. Botを再起動
pm2 restart teams-bot

# 2. 休暇申請を作成（承認者を選択）

# 3. 承認者に承認依頼カードが送信されることを確認 ✅
```

---

## メリット

### 実装前（メモリのみ）

- ❌ Bot再起動で会話参照が失われる
- ❌ ユーザーは再度Botと対話する必要がある
- ❌ 複数のBotインスタンスで会話参照を共有できない

### 実装後（Redis使用）

- ✅ Bot再起動後も会話参照が保持される
- ✅ ユーザーは一度対話すれば30日間有効
- ✅ 複数のBotインスタンス間で会話参照を共有可能
- ✅ 自動的に30日の有効期限管理
- ✅ Redisが使用できない場合は自動的にメモリストレージにフォールバック
- ✅ メモリキャッシュによる高速アクセス

---

## パフォーマンス

### メモリ使用量

- **Redis側**: 1ユーザーあたり約300-500バイト
- **Bot側（メモリキャッシュ）**: 1ユーザーあたり約300-500バイト

**例:**
- 100ユーザー: 約50KB
- 1,000ユーザー: 約500KB
- 10,000ユーザー: 約5MB

非常に軽量で、通常のBotアプリケーションには影響ありません。

### アクセス速度

- **メモリキャッシュヒット**: 0.01ms（即座）
- **Redisから取得**: 1-5ms（高速）

メモリキャッシュにより、ほとんどのアクセスは即座に完了します。

---

## セキュリティ

### 推奨設定

1. **パスワード認証**: 本番環境では必須
2. **外部アクセス制限**: `bind 127.0.0.1` でローカルのみアクセス可能に
3. **保護モード**: `protected-mode yes` で有効化

詳細は [docs/REDIS_SETUP.md](docs/REDIS_SETUP.md) の「本番環境での推奨設定」セクションを参照してください。

---

## トラブルシューティング

### Redis接続エラー

**症状:**
```
[ConversationStorage] Redis error: Error: connect ECONNREFUSED 127.0.0.1:6379
[ConversationStorage] Falling back to in-memory storage
```

**解決方法:**
```bash
# Redisを起動
sudo systemctl start redis-server

# Botを再起動
pm2 restart teams-bot
```

### パスワード認証エラー

**症状:**
```
[ConversationStorage] Redis error: NOAUTH Authentication required
```

**解決方法:**
`.env` にパスワードを追加:
```env
REDIS_PASSWORD=your-redis-password
```

詳細は [docs/REDIS_SETUP.md](docs/REDIS_SETUP.md) のトラブルシューティングセクションを参照してください。

---

## まとめ

### 実装完了事項

- ✅ Redisストレージサービスの実装
- ✅ Bot.jsの更新（非同期対応）
- ✅ 自動フォールバック機能
- ✅ メモリキャッシュによる高速化
- ✅ 30日間の自動有効期限管理
- ✅ 詳細なドキュメント作成

### 次のステップ

1. **Redisのインストール**（まだの場合）
   ```bash
   sudo apt install redis-server
   sudo systemctl start redis-server
   ```

2. **.envファイルの設定**
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Botの再起動**
   ```bash
   npm start
   # または
   pm2 restart teams-bot
   ```

4. **動作確認**
   - ログでRedis接続を確認
   - ユーザーがBotと対話
   - Bot再起動後もプロアクティブメッセージが送信できることを確認

---

**実装日**: 2025-01-20
