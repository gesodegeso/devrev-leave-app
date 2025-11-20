# プロアクティブメッセージング実装ガイド

このドキュメントでは、Teams Leave Request Botにおけるプロアクティブメッセージング（承認依頼の送信）の実装方法を説明します。

---

## 概要

プロアクティブメッセージングとは、ユーザーからのメッセージに応答するのではなく、Bot側から能動的にメッセージを送信する機能です。

### 実装の変更点

**以前の実装（失敗していた方法）:**
- `createConversationAsync` を使用して新しい会話を作成しようとしていた
- サービスURLを手動で指定していた
- 404エラーが発生していた

**新しい実装（正しい方法）:**
- ユーザーがBotと最初に対話した時に、会話参照（Conversation Reference）を保存
- 保存した会話参照を使用して `continueConversationAsync` でプロアクティブメッセージを送信
- サービスURLは保存された会話参照から自動的に取得される

---

## 会話参照ストレージの仕組み

### ストレージの種類

**Redis使用時（推奨）:**
- Bot再起動後も会話参照が保持される
- 複数のBotインスタンス間で共有可能
- 30日間の自動有効期限管理

**メモリのみ使用時（Redisなし）:**
- Bot再起動で会話参照が失われる
- 追加のインフラ不要（開発環境向け）

### 1. 会話参照の保存

ユーザーがBotにメッセージを送信するたびに、会話参照が自動的に保存されます：

```javascript
// bot.js - constructor内
this.conversationStorage = new ConversationStorage();
await this.conversationStorage.connect(); // Redisに接続

// onMessage handler内
await this.addConversationReference(context.activity);
```

### 2. 保存される情報

各ユーザーごとに以下の情報が保存されます：

```javascript
{
    activityId: activity.id,
    user: activity.from,           // ユーザー情報（ID、名前など）
    bot: activity.recipient,       // Bot情報
    conversation: activity.conversation, // 会話情報
    channelId: activity.channelId, // 'msteams'
    serviceUrl: activity.serviceUrl // Teamsサービスの正しいURL
}
```

**重要**: `serviceUrl` はMicrosoft Teamsが自動的に提供する正しいURLです。手動で指定する必要はありません。

### 3. プロアクティブメッセージの送信

保存された会話参照を使用してメッセージを送信：

```javascript
const conversationReference = this.conversationReferences.get(approverTeamsId);

await this.adapter.continueConversationAsync(
    process.env.MICROSOFT_APP_ID,
    conversationReference,
    async (turnContext) => {
        await turnContext.sendActivity({
            attachments: [CardFactory.adaptiveCard(approvalCard)]
        });
    }
);
```

---

## 使用方法

### 前提条件

**重要**: プロアクティブメッセージを受信するユーザーは、事前に少なくとも1回Botと対話している必要があります。

### ステップ1: 承認者がBotと対話

承認者は、休暇申請を承認する前に、Botに何かメッセージを送信する必要があります。

**推奨される方法:**

1. **Teams個人チャットでBotを追加**
   - TeamsでBotを検索
   - 個人チャットを開始
   - 任意のメッセージを送信（例: "Hello"）

2. **テストメッセージの送信**
   ```
   ユーザー: @BotName こんにちは
   Bot: コマンドを認識できませんでした。「休暇申請」とメンションしてください。
   ```
   - このやり取りで会話参照が保存される

### ステップ2: 休暇申請の作成

申請者が休暇申請を作成します：

1. Teamsで `@BotName 休暇申請` とメンション
2. フォームに必要事項を入力
3. 承認者を選択（ステップ1で対話した人を選択）
4. 送信

### ステップ3: DevRev Webhookの受信

1. DevRevにチケット/カスタムオブジェクトが作成される
2. DevRevからBotにWebhookが送信される
3. Botが承認者のTeams IDを取得

### ステップ4: 承認依頼の送信

1. Botが保存された会話参照を検索
2. 承認者に承認依頼カードを送信
3. 承認者がカードで承認/却下を選択

---

## トラブルシューティング

### 問題1: 承認者にメッセージが届かない

**症状:**
```
[handleLeaveRequestCreated] No conversation reference found for approver: 29:xxxxx
[handleLeaveRequestCreated] Available user IDs: []
```

**原因:**
- 承認者がまだBotと対話していない
- Botが再起動されて会話参照が失われた

**解決方法:**

**オプション1: 承認者にBotと対話してもらう**
```
1. 承認者にTeamsでBotを開いてもらう
2. 任意のメッセージを送信してもらう（例: "hello"）
3. 会話参照が保存される
4. 休暇申請を再送信
```

**オプション2: 永続化ストレージの実装（今後の改善）**
- 現在、会話参照はメモリ内のMapに保存されている
- Botを再起動すると失われる
- データベースやRedisに保存することで永続化可能

### 問題2: Bot再起動後に動作しない

**症状:**
Botを再起動すると、すべての会話参照が失われる。

**原因:**
Redisが設定されていないため、メモリ内にのみ会話参照が保存されている。

**解決方法（推奨）:**

**ステップ1: Redisをインストール**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# macOS (Homebrew)
brew install redis
brew services start redis

# Docker
docker run -d -p 6379:6379 --name teams-bot-redis redis:7-alpine
```

**ステップ2: .envファイルにRedis設定を追加**

```env
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-password  # パスワード認証が必要な場合
```

**ステップ3: Botを再起動**

```bash
npm start
# または
pm2 restart teams-bot
```

**ステップ4: 動作確認**

ログで以下のメッセージを確認：
```
[ConversationStorage] Redis client connected successfully
[Bot] Conversation storage initialized
```

これで、Bot再起動後も会話参照が保持されます。

詳細は [Redis Setup Guide](REDIS_SETUP.md) を参照してください。

**解決方法（一時的・Redisなしの場合）:**
1. Botを再起動した後
2. すべてのユーザー（承認者含む）にBotと再度対話してもらう
3. 会話参照が再び保存される

### 問題3: サービスURLエラー

**以前のエラー（修正済み）:**
```
RestError: Service Error
Status: 404
URL: https://smba.trafficmanager.net/teams/v3/conversations
```

**修正内容:**
- サービスURLを手動で指定しなくなった
- 保存された会話参照から自動的に取得
- Teamsが提供する正しいURLが使用される

**確認方法:**
```bash
# ログで正しいサービスURLが使用されているか確認
sudo journalctl -u teams-bot -f | grep "Service URL"

# 期待される出力:
[addConversationReference] Service URL: https://smba.trafficmanager.net/apac/
[handleLeaveRequestCreated] Service URL from stored reference: https://smba.trafficmanager.net/apac/
```

---

## ログの確認

### 会話参照の保存確認

```bash
# Botログを監視
sudo journalctl -u teams-bot -f

# ユーザーがメッセージを送信すると以下のログが出力される:
[addConversationReference] Stored reference for user: 29:xxxxx
[addConversationReference] Service URL: https://smba.trafficmanager.net/apac/
[addConversationReference] Total stored references: 1
```

### プロアクティブメッセージ送信の確認

```bash
# Webhookを受信してプロアクティブメッセージを送信
[handleLeaveRequestCreated] Processing: don:core:xxxxx
[handleLeaveRequestCreated] Approver Teams ID: 29:xxxxx
[handleLeaveRequestCreated] Found conversation reference for approver
[handleLeaveRequestCreated] Service URL from stored reference: https://smba.trafficmanager.net/apac/
[handleLeaveRequestCreated] Sending proactive message using stored conversation reference
[handleLeaveRequestCreated] Inside conversation callback - sending approval card
[handleLeaveRequestCreated] Approval request sent to: 29:xxxxx
[handleLeaveRequestCreated] Proactive message sent successfully
```

### エラーログの確認

```bash
# 会話参照が見つからない場合
[handleLeaveRequestCreated] No conversation reference found for approver: 29:xxxxx
[handleLeaveRequestCreated] Available user IDs: []
[handleLeaveRequestCreated] The approver must interact with the bot at least once before receiving proactive messages
```

---

## ベストプラクティス

### 1. 承認者の事前登録

組織内で承認者が決まっている場合、以下の方法で事前に会話参照を保存できます：

**方法1: Welcome Bot**
- 新しいユーザーがBotを追加すると自動的にウェルカムメッセージを送信
- この時点で会話参照が保存される

**方法2: 定期的なPing**
- 週1回など、定期的に承認者全員にメッセージを送信
- 例: 「今週の休暇申請状況」など

**方法3: 初回セットアップコマンド**
```
ユーザー: @BotName setup
Bot: セットアップが完了しました。これで承認依頼を受け取ることができます。
```

### 2. エラーハンドリング

会話参照が見つからない場合、申請者に通知：

```javascript
if (!conversationReference) {
    // 申請者に通知（実装推奨）
    await this.notifyRequester(
        requesterTeamsId,
        requesterName,
        workItem.display_id,
        'approver_not_available'
    );
    return;
}
```

### 3. ログの活用

定期的にログを確認して、どのユーザーの会話参照が保存されているか把握：

```bash
# 保存されているユーザー数を確認
sudo journalctl -u teams-bot | grep "Total stored references"
```

---

## テストシナリオ

### シナリオ1: 基本フロー

1. **承認者A**: Teamsで `@BotName hello` と送信
2. **申請者B**: `@BotName 休暇申請` でフォーム表示
3. **申請者B**: フォームに入力、承認者にAを選択
4. **システム**: DevRevにチケット作成
5. **システム**: DevRevからWebhook受信
6. **承認者A**: 承認依頼カードを受信 ✅
7. **承認者A**: カードで承認
8. **申請者B**: 承認通知を受信 ✅

### シナリオ2: 承認者が未対話

1. **申請者B**: `@BotName 休暇申請` でフォーム表示
2. **申請者B**: フォームに入力、承認者にC（未対話）を選択
3. **システム**: DevRevにチケット作成
4. **システム**: DevRevからWebhook受信
5. **ログ**: "No conversation reference found for approver: 29:xxxxx" ❌
6. **承認者C**: メッセージを受信しない

**修正手順:**
1. **承認者C**: `@BotName hello` と送信
2. **申請者B**: 休暇申請を再送信（または管理者が手動でWebhook再送）
3. **承認者C**: 承認依頼カードを受信 ✅

### シナリオ3: Bot再起動後

1. **承認者A**: Teamsで `@BotName hello` と送信（会話参照保存）
2. **システム**: Botを再起動 `sudo systemctl restart teams-bot`
3. **申請者B**: 休暇申請を送信
4. **ログ**: "No conversation reference found" ❌（会話参照が失われた）
5. **承認者A**: `@BotName hello` と再送信（会話参照再保存）
6. **申請者B**: 休暇申請を再送信
7. **承認者A**: 承認依頼カードを受信 ✅

---

## 今後の改善案

### 1. 会話参照の永続化 ✅ 実装済み

**実装内容:**
- Redisを使用して会話参照を永続化
- Bot再起動後も会話参照が保持される
- 30日間の自動有効期限管理
- メモリキャッシュによる高速アクセス
- Redisが使用できない場合は自動的にメモリストレージにフォールバック

詳細は [Redis Setup Guide](REDIS_SETUP.md) を参照してください。

### 2. 承認者の自動登録

**実装:**
- 組織のActive Directoryから承認者リストを取得
- 定期的に承認者全員にメッセージを送信して会話参照を保存

### 3. フォールバック通知

**実装:**
- 承認者に承認依頼を送信できない場合
- メールで通知、またはTeamsチャネルに投稿

### 4. 会話参照の有効期限管理

**実装:**
- 古い会話参照（30日以上更新されていない）を削除
- メモリ使用量を最適化

---

## まとめ

### 重要なポイント

1. ✅ **会話参照の保存**: ユーザーがBotと対話するたびに自動的に保存される
2. ✅ **事前対話の必要性**: 承認者は事前にBotと対話している必要がある
3. ✅ **正しいサービスURL**: 保存された会話参照から自動取得される
4. ✅ **Redisによる永続化**: Bot再起動後も会話参照が保持される（Redis設定時）
5. ✅ **自動フォールバック**: Redisが使用できない場合はメモリストレージを使用

### 関連ドキュメント

- [Redis Setup Guide](REDIS_SETUP.md) - Redis設定ガイド（推奨）
- [NGINX Webhook Setup](NGINX_WEBHOOK_SETUP.md) - Webhook受信の設定
- [DevRev Workflow Setup](DEVREV_WORKFLOW_SETUP.md) - DevRev側の設定
- [Local Development](LOCAL_DEVELOPMENT.md) - 開発環境での動作確認

---

**最終更新**: 2025-01-20
