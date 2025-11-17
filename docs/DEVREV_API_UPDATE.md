# DevRev API 最新版への更新

## 概要

DevRev APIが最新仕様に更新されたため、プロジェクトのコードを新しいエンドポイントに対応させました。

---

## 主な変更点

### 1. エンドポイントの変更

| 旧エンドポイント | 新エンドポイント | 用途 |
|-----------------|-----------------|------|
| `/internal/tickets.create` | `/works.create` | チケット/ワークアイテムの作成 |
| `/internal/tickets.get` | `/works.get` | ワークアイテムの取得 |
| `/internal/tickets.update` | `/works.update` | ワークアイテムの更新 |
| `/internal/dev-users.self` | `/dev-users.self` | ユーザー情報取得 |

### 2. レスポンス構造の変更

**旧API:**
```json
{
  "ticket": {
    "id": "don:core:...",
    "title": "...",
    ...
  }
}
```

**新API:**
```json
{
  "work": {
    "id": "don:core:...",
    "display_id": "ISS-123",
    "title": "...",
    ...
  }
}
```

### 3. URLの変更

**旧URL形式:**
```
https://app.devrev.ai/tickets/{ticket_id}
```

**新URL形式:**
```
https://app.devrev.ai/work/{display_id}
```

`display_id` は `ISS-123` のような人間が読みやすい形式です。

---

## コードの更新箇所

### [src/services/devrev.js](../src/services/devrev.js)

#### works.create の使用

**変更前:**
```javascript
const response = await axios.post(
    `${this.apiBaseUrl}/internal/tickets.create`,
    ticketData,
    {
        headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        }
    }
);

if (response.data && response.data.ticket) {
    return {
        success: true,
        ticketId: response.data.ticket.id,
        ticketUrl: `${this.apiBaseUrl}/tickets/${response.data.ticket.id}`
    };
}
```

**変更後:**
```javascript
const response = await axios.post(
    `${this.apiBaseUrl}/works.create`,
    ticketData,
    {
        headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        }
    }
);

if (response.data && response.data.work) {
    const work = response.data.work;
    return {
        success: true,
        ticketId: work.id,
        displayId: work.display_id,
        ticketUrl: work.display_id ? `https://app.devrev.ai/work/${work.display_id}` : null
    };
}
```

#### メソッド名の変更

| 旧メソッド | 新メソッド | 説明 |
|-----------|-----------|------|
| `getTicket(ticketId)` | `getWork(workId)` | ワークアイテム取得 |
| `updateTicketStatus(ticketId, status)` | `updateWork(workId, updates)` | ワークアイテム更新 |

---

## リクエストデータの要件

### 必須フィールド

```javascript
{
  type: 'ticket',           // 必須: 'ticket' または 'issue'
  title: '...',             // 必須: タイトル
  applies_to_part: '...',   // 必須: Part ID
  owned_by: []              // 必須: 所有者（空配列可）
}
```

### オプションフィールド

```javascript
{
  body: '...',              // 詳細説明（Markdown対応）
  priority: 'P0',           // P0, P1, P2, P3
  severity: 'high',         // blocker, high, medium, low (ticketのみ)
  target_start_date: '...', // 開始予定日
  target_close_date: '...',  // 完了予定日
}
```

---

## テストの実行

### 1. DevRev API接続テスト

```bash
npm run test:devrev
```

**期待される出力:**
```
=== DevRev API 接続テスト ===

1. ユーザー情報取得テスト...
✅ 接続成功！
   ユーザー名: Your Name
   ユーザーID: don:identity:...

2. テストチケット作成...
   ワークアイテムデータ:
   {
     "type": "ticket",
     "title": "[TEST] ローカルテスト - 2025-01-11...",
     "body": "# テストチケット...",
     "applies_to_part": "don:core:...",
     "owned_by": []
   }

✅ ワークアイテム作成成功！
   Work ID: don:core:...
   Display ID: ISS-123
   タイトル: [TEST] ローカルテスト - 2025-01-11...

   DevRevで確認:
   https://app.devrev.ai/work/ISS-123

=== すべてのテストが成功しました！ ===
```

---

## エラーハンドリング

### よくあるエラー

#### 400 Bad Request

**原因:**
- 必須フィールドが不足
- `applies_to_part` が無効
- `owned_by` が未設定（空配列でも可）

**対処:**
```javascript
const ticketData = {
    type: 'ticket',
    title: '...',
    applies_to_part: process.env.DEVREV_DEFAULT_PART_ID,
    owned_by: [] // 必須（空でもOK）
};
```

#### 401 Unauthorized

**原因:**
- APIトークンが無効または期限切れ

**対処:**
1. DevRevダッシュボード → Settings → API Tokens
2. 新しいトークンを生成
3. `.env` の `DEVREV_API_TOKEN` を更新

#### 403 Forbidden

**原因:**
- トークンに必要な権限がない
- Part IDへのアクセス権限がない

**対処:**
1. トークンの権限を確認（Works:Create が必要）
2. Part IDへのアクセス権限を確認

---

## 互換性

### バージョン情報

- **更新日**: 2025-01-11
- **DevRev API仕様**: 最新版（works.create）
- **後方互換性**: なし（旧エンドポイントは非推奨）

### 移行チェックリスト

- [x] `works.create` エンドポイントに変更
- [x] レスポンスから `work` オブジェクトを取得
- [x] `display_id` を使用したURL生成
- [x] `getWork()` / `updateWork()` メソッドに更新
- [x] テストスクリプトの更新
- [x] ドキュメントの更新

---

## 今後の拡張

### 優先度の設定

```javascript
const ticketData = {
    type: 'ticket',
    title: '緊急: システムダウン',
    body: '...',
    applies_to_part: partId,
    owned_by: [],
    priority: 'P0', // 最高優先度
    severity: 'blocker' // チケットの深刻度
};
```

### カスタムフィールドの追加

DevRev APIは現在カスタムフィールドをサポートしていないため、重要な情報は `body` に含めることを推奨します：

```javascript
body: `# 休暇申請

## 申請者情報
- 名前: ${name}
- Teams ID: ${teamsUserId}

## 承認者
- 名前: ${approver}
- Teams ID: ${approverTeamsId}

...
`
```

---

## 参考リンク

- [DevRev API Reference - works.create](https://developer.devrev.ai/api-reference/works/create)
- [DevRev API Reference - works.get](https://developer.devrev.ai/api-reference/works/get)
- [DevRev API Reference - works.update](https://developer.devrev.ai/api-reference/works/update)
- [DevRev API Authentication](https://developer.devrev.ai/api-reference/authentication)

---

## トラブルシューティング

### Part IDが不明な場合

DevRevダッシュボードでPart IDを確認：

1. DevRevにログイン
2. Settings → Products/Parts
3. 使用するPartのIDをコピー
4. `.env` に設定:
   ```env
   DEVREV_DEFAULT_PART_ID=don:core:dvrv-us-1:product/123:part/456
   ```

### APIトークンの権限確認

必要な権限:
- ✅ `Works:Create` - ワークアイテム作成
- ✅ `Works:Read` - ワークアイテム取得
- ✅ `Works:Update` - ワークアイテム更新

---

**最終更新**: 2025-01-11
