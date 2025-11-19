# DevRev Workflow設定ガイド

このドキュメントでは、休暇申請が作成されたときにTeams Botに通知するDevRev Workflowの設定方法を説明します。

---

## 概要

DevRevで休暇申請カスタムオブジェクトが作成されると、以下の流れで承認依頼がTeamsに送信されます：

```
1. Teams申請者 → Bot → DevRev (カスタムオブジェクト作成)
2. DevRev Workflow トリガー（カスタムオブジェクト作成イベント）
3. DevRev AI処理（additional_system自動判別）
4. DevRev Webhook → Teams Bot (/api/devrev-webhook)
5. Teams Bot → 承認者に承認依頼Adaptive Cardを送信
6. 承認者が承認/却下ボタンをクリック
7. Teams Bot → DevRev (ステータス更新)
8. Teams Bot → 申請者に結果通知
```

---

## 前提条件

1. DevRevアカウントとAPIトークン
2. カスタムオブジェクト `leave_request` が作成済み
3. Teams Botがデプロイ済みで、Webhookエンドポイントが公開アクセス可能

---

## 設定手順

### ステップ1: Webhookエンドポイントの確認

Teams BotのWebhookエンドポイントURLを確認します：

```
https://your-domain.com/api/devrev-webhook
```

例：
```
https://bot.example.com/api/devrev-webhook
```

### ステップ2: DevRevでAutomationを作成

1. **DevRevダッシュボードにログイン**
   - https://app.devrev.ai にアクセス

2. **Settings → Automationsに移動**
   - 左サイドバーから「Settings」をクリック
   - 「Automations」セクションを選択

3. **新しいAutomationを作成**
   - 「Create Automation」ボタンをクリック
   - Automation名: `Leave Request Approval Workflow`

### ステップ3: トリガー設定

1. **トリガータイプを選択**
   - Trigger: `Custom Object Created`
   - Object Type: `leave_request`

2. **フィルター条件（オプション）**
   ```json
   {
     "custom_fields.tnt__status": "pending"
   }
   ```
   これにより、ステータスが`pending`の新規申請のみがトリガーされます。

### ステップ4: AI処理アクション（オプション）

AIによる`additional_system`の自動判別を行う場合：

1. **Actionを追加**
   - Action Type: `Run Snap-in` または `AI Agent`

2. **AI Agentの設定例**
   ```
   Prompt:
   以下の休暇申請内容を分析し、適用可能な追加休暇制度を判定してください。

   申請者: {{custom_object.custom_fields.tnt__requester_name}}
   期間: {{custom_object.custom_fields.tnt__start_date}} ~ {{custom_object.custom_fields.tnt__end_date}}
   理由: {{custom_object.custom_fields.tnt__reason}}

   利用可能な制度:
   - 育児休暇
   - 介護休暇
   - リフレッシュ休暇
   - 特別休暇

   該当する制度があれば制度名を返してください。該当しない場合は空文字を返してください。
   ```

3. **フィールド更新アクション**
   - Action Type: `Update Custom Object`
   - Field: `tnt__additional_system`
   - Value: `{{ai_agent.result}}`

### ステップ5: Webhook送信アクション

1. **Webhookアクションを追加**
   - Action Type: `Send Webhook`
   - Webhook URL: `https://your-domain.com/api/devrev-webhook`
   - Method: `POST`
   - Headers:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```

2. **リクエストボディ**
   ```json
   {
     "type": "custom_object.created",
     "custom_object": {
       "id": "{{custom_object.id}}",
       "display_id": "{{custom_object.display_id}}",
       "leaf_type": "{{custom_object.leaf_type}}",
       "custom_fields": {
         "tnt__requester_name": "{{custom_object.custom_fields.tnt__requester_name}}",
         "tnt__requester_email": "{{custom_object.custom_fields.tnt__requester_email}}",
         "tnt__requester_teams_id": "{{custom_object.custom_fields.tnt__requester_teams_id}}",
         "tnt__start_date": "{{custom_object.custom_fields.tnt__start_date}}",
         "tnt__end_date": "{{custom_object.custom_fields.tnt__end_date}}",
         "tnt__days_count": {{custom_object.custom_fields.tnt__days_count}},
         "tnt__reason": "{{custom_object.custom_fields.tnt__reason}}",
         "tnt__approver_name": "{{custom_object.custom_fields.tnt__approver_name}}",
         "tnt__approver_teams_id": "{{custom_object.custom_fields.tnt__approver_teams_id}}",
         "tnt__status": "{{custom_object.custom_fields.tnt__status}}",
         "tnt__leave_type": "{{custom_object.custom_fields.tnt__leave_type}}",
         "tnt__additional_system": "{{custom_object.custom_fields.tnt__additional_system}}"
       }
     }
   }
   ```

### ステップ6: Automationを有効化

1. **Automationを保存**
   - 「Save」ボタンをクリック

2. **Automationを有効化**
   - トグルスイッチを「Enabled」に設定

---

## Snap-inを使用したAI処理（推奨）

DevRev Snap-inを使用すると、より高度なAI処理が可能です。

### Snap-in作成

1. **新しいSnap-inプロジェクトを作成**
   ```bash
   npm install -g @devrev/cli
   devrev login
   devrev snap-in create leave-request-processor
   cd leave-request-processor
   ```

2. **Snap-inコード例（`src/function.ts`）**
   ```typescript
   import { client } from '@devrev/typescript-sdk';

   export async function run(events: any[]) {
     for (const event of events) {
       if (event.type === 'custom_object.created' &&
           event.custom_object.leaf_type === 'leave_request') {

         const fields = event.custom_object.custom_fields;
         const reason = fields.tnt__reason;

         // AIで追加制度を判別
         const additionalSystem = await detectAdditionalSystem(reason);

         // カスタムオブジェクトを更新
         if (additionalSystem) {
           await client.customObjects.update({
             id: event.custom_object.id,
             custom_fields: {
               tnt__additional_system: additionalSystem
             }
           });
         }

         // Webhookを送信
         await sendWebhookToTeamsBot(event.custom_object);
       }
     }
   }

   async function detectAdditionalSystem(reason: string): Promise<string> {
     // DevRev AIまたは外部AI APIを使用
     // 例: OpenAI, Claude, etc.

     const keywords = {
       '育児': '育児休暇',
       '介護': '介護休暇',
       'リフレッシュ': 'リフレッシュ休暇',
       '結婚': '特別休暇（慶事）',
       '忌引': '特別休暇（弔事）'
     };

     for (const [keyword, system] of Object.entries(keywords)) {
       if (reason.includes(keyword)) {
         return system;
       }
     }

     return '';
   }

   async function sendWebhookToTeamsBot(customObject: any) {
     const webhookUrl = process.env.TEAMS_BOT_WEBHOOK_URL;

     await fetch(webhookUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         type: 'custom_object.created',
         custom_object: customObject
       })
     });
   }
   ```

3. **Snap-inをデプロイ**
   ```bash
   devrev snap-in deploy
   ```

4. **AutomationでSnap-inを実行**
   - Trigger: `Custom Object Created` (leave_request)
   - Action: `Run Snap-in` → 作成したSnap-inを選択

---

## Webhook署名検証（セキュリティ強化）

本番環境では、Webhook署名を検証することを推奨します。

### DevRev側の設定

1. **Webhook Secret を生成**
   ```bash
   openssl rand -hex 32
   ```

2. **Automation設定でSecretを追加**
   - Webhook設定 → Headers
   ```json
   {
     "Content-Type": "application/json",
     "X-DevRev-Signature": "{{webhook.signature}}"
   }
   ```

3. **環境変数に保存**
   ```bash
   # .env
   DEVREV_WEBHOOK_SECRET=your-generated-secret-here
   ```

### Teams Bot側の実装

`src/index.js`の署名検証部分を実装：

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Webhook endpoint
server.post("/api/devrev-webhook", async (req, res, next) => {
  const webhookSecret = process.env.DEVREV_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = req.headers['x-devrev-signature'];

    if (!signature || !verifyWebhookSignature(req.body, signature, webhookSecret)) {
      console.error('[DevRev Webhook] Invalid signature');
      res.send(401, { error: 'Invalid signature' });
      return next();
    }
  }

  // ... 既存の処理
});
```

---

## テスト

### 1. Webhookエンドポイントのテスト

```bash
curl -X POST https://your-domain.com/api/devrev-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom_object.created",
    "custom_object": {
      "id": "don:core:dvrv-us-1:devo/xxx:custom/yyy",
      "display_id": "LR-1",
      "leaf_type": "leave_request",
      "custom_fields": {
        "tnt__requester_name": "テストユーザー",
        "tnt__requester_teams_id": "29:your-teams-id",
        "tnt__approver_teams_id": "29:approver-teams-id",
        "tnt__start_date": "2025-12-01",
        "tnt__end_date": "2025-12-05",
        "tnt__days_count": 5,
        "tnt__reason": "テスト",
        "tnt__status": "pending",
        "tnt__leave_type": "paid",
        "tnt__additional_system": ""
      }
    }
  }'
```

### 2. 実際の申請でテスト

1. Teamsで休暇申請を送信
2. DevRevでカスタムオブジェクトが作成されることを確認
3. Automation/Snap-inが実行されることを確認
4. Teamsで承認者に承認依頼が届くことを確認
5. 承認/却下ボタンをクリック
6. DevRevでステータスが更新されることを確認
7. 申請者に通知が届くことを確認

---

## トラブルシューティング

### Webhookが届かない

1. **エンドポイントURLを確認**
   ```bash
   curl https://your-domain.com/health
   ```

2. **DevRev Automationログを確認**
   - Settings → Automations → 該当Automation → Logs

3. **Botのログを確認**
   ```bash
   # PM2の場合
   pm2 logs teams-leave-bot

   # systemdの場合
   journalctl -u teams-leave-bot -f
   ```

### 承認依頼が送信されない

1. **approver_teams_idが正しいか確認**
   - DevRevのカスタムオブジェクトを確認
   - `tnt__approver_teams_id` フィールドの値を確認

2. **proactive messagingの権限を確認**
   - Azure Bot Service → Configuration
   - Messaging endpoint が正しく設定されているか確認

3. **BOT_SERVICE_URLを確認**
   - `.env`ファイルで正しいサービスURLが設定されているか
   - デフォルト: `https://smba.trafficmanager.net/apac/`

### ステータスが更新されない

1. **APIトークンの権限を確認**
   - `custom-objects.update` 権限があるか

2. **DevRev APIログを確認**
   ```bash
   # Botログで DevRev API のレスポンスを確認
   pm2 logs teams-leave-bot | grep "DevRev"
   ```

---

## 参考リンク

- [DevRev Automations Documentation](https://developer.devrev.ai/automations)
- [DevRev Snap-ins Guide](https://developer.devrev.ai/snapins)
- [DevRev Webhooks](https://developer.devrev.ai/webhooks)
- [Bot Framework Proactive Messaging](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-proactive-message)
