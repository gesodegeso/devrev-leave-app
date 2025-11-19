# DevRev Work Item Type 設定ガイド

このドキュメントでは、休暇申請をDevRevの**カスタムオブジェクト**または**チケット（Work Item）**のどちらで管理するかを選択する方法を説明します。

## 概要

Teams Leave Request Botは、DevRevに休暇申請を2つの形式で保存できます：

1. **カスタムオブジェクト（Custom Object）** - デフォルト
   - Tenant Fragmentを使用した専用のデータ構造
   - より柔軟なカスタムフィールド設計
   - `tenant_fragment: leave_request` として管理

2. **チケット（Work Item / Ticket）**
   - DevRevの標準Work Item機能を使用
   - 既存のチケット管理フローに統合可能
   - Subtypeで分類可能

## 設定方法

### 環境変数の設定

`.env` ファイルで以下の変数を設定します：

```env
# カスタムオブジェクトを使用する場合（デフォルト）
DEVREV_WORK_ITEM_TYPE=custom_object

# チケット（Work Item）を使用する場合
DEVREV_WORK_ITEM_TYPE=ticket
DEVREV_TICKET_TYPE=ticket
DEVREV_TICKET_SUBTYPE=leave_request
```

### パラメータの詳細

#### DEVREV_WORK_ITEM_TYPE
- **値**: `custom_object` または `ticket`
- **デフォルト**: `custom_object`
- **説明**: どちらの形式で休暇申請を作成するかを指定

#### DEVREV_TICKET_TYPE
- **値**: `ticket` （固定）
- **デフォルト**: `ticket`
- **説明**: Work Itemのタイプ（チケット使用時のみ必要）

#### DEVREV_TICKET_SUBTYPE
- **値**: 任意の文字列（例: `leave_request`）
- **デフォルト**: `leave_request`
- **説明**: チケットのサブタイプ（チケット使用時のみ必要）

## 方式の比較

### カスタムオブジェクト（Custom Object）

#### メリット
- **専用のデータ構造**: 休暇申請専用のスキーマを定義可能
- **Tenant Fragment**: テナント固有のカスタムフィールドを使用
- **独立した管理**: 他のチケットと混在しない
- **柔軟なフィールド設計**: 休暇申請特有のフィールドを自由に追加

#### デメリット
- **初期設定が必要**: Tenant Fragmentスキーマを事前に定義
- **ワークフロー設定**: 専用のAutomation/Workflowが必要

#### カスタムフィールド命名規則
Tenant Fragmentを使用するため、すべてのフィールド名に `tnt__` プレフィックスが必要：

```
tnt__requester_name
tnt__requester_teams_id
tnt__start_date
tnt__end_date
tnt__days_count
tnt__reason
tnt__approver_name
tnt__approver_teams_id
tnt__status
tnt__leave_type
tnt__additional_system
```

#### API エンドポイント
- 作成: `custom-objects.create`
- 更新: `custom-objects.update`

#### セットアップ手順
1. DevRevで Tenant Fragment スキーマを定義
2. `leaf_type: leave_request` を設定
3. カスタムフィールドを定義（すべて `tnt__` プレフィックス付き）
4. Automation/Workflowでwebhook設定

詳細は [DEVREV_CUSTOM_OBJECTS.md](DEVREV_CUSTOM_OBJECTS.md) を参照

---

### チケット（Work Item / Ticket）

#### メリット
- **既存ワークフローとの統合**: 既存のチケット管理フローに統合可能
- **標準機能の活用**: DevRevのチケット機能をそのまま使用
- **設定が簡単**: 追加のスキーマ定義不要
- **レポーティング**: 標準のチケットレポートで分析可能

#### デメリット
- **他のチケットと混在**: Subtypeで区別が必要
- **カスタムフィールドの制約**: 標準のカスタムフィールド機能を使用

#### カスタムフィールド命名規則
プレフィックス不要（標準のカスタムフィールド）：

```
requester_name
requester_teams_id
start_date
end_date
days_count
reason
approver_name
approver_teams_id
status
leave_type
additional_system
```

#### API エンドポイント
- 作成: `works.create`
- 更新: `works.update`

#### セットアップ手順
1. DevRevでカスタムフィールドを定義
2. Subtypeを作成（例: `leave_request`）
3. Automation/Workflowでwebhook設定
4. 環境変数を設定

---

## Webhook設定

両方の方式で同じWebhookエンドポイントを使用できます：

```
POST https://your-bot-domain.com/api/devrev-webhook
```

### Webhook イベント

#### カスタムオブジェクトの場合
```json
{
  "type": "custom_object.created",
  "custom_object": {
    "id": "don:core:...",
    "display_id": "CO-123",
    "leaf_type": "leave_request",
    "custom_fields": {
      "tnt__requester_name": "山田太郎",
      "tnt__approver_teams_id": "29:xxx...",
      ...
    }
  }
}
```

#### チケットの場合
```json
{
  "type": "work.created",
  "work": {
    "id": "don:core:...",
    "display_id": "TKT-456",
    "type": "ticket",
    "subtype": "leave_request",
    "custom_fields": {
      "requester_name": "山田太郎",
      "approver_teams_id": "29:xxx...",
      ...
    }
  }
}
```

### Botの対応

Botは両方のフォーマットに自動対応します：

```javascript
// src/index.js - Webhook handler
if (event.type === 'custom_object.created' || event.type === 'work.created') {
    const workItem = event.custom_object || event.work;

    // Both types supported
    if (workItem &&
        (workItem.leaf_type === 'leave_request' ||
         workItem.subtype === 'leave_request')) {
        await bot.handleLeaveRequestCreated(workItem);
    }
}
```

## フィールドマッピング

Botは両方の命名規則に対応しています：

| 用途 | カスタムオブジェクト | チケット |
|------|---------------------|----------|
| 申請者名 | `tnt__requester_name` | `requester_name` |
| 申請者Teams ID | `tnt__requester_teams_id` | `requester_teams_id` |
| 開始日 | `tnt__start_date` | `start_date` |
| 終了日 | `tnt__end_date` | `end_date` |
| 日数 | `tnt__days_count` | `days_count` |
| 理由 | `tnt__reason` | `reason` |
| 承認者名 | `tnt__approver_name` | `approver_name` |
| 承認者Teams ID | `tnt__approver_teams_id` | `approver_teams_id` |
| ステータス | `tnt__status` | `status` |
| 休暇種別 | `tnt__leave_type` | `leave_type` |
| 追加制度 | `tnt__additional_system` | `additional_system` |

## 切り替え手順

### カスタムオブジェクト → チケットへの切り替え

1. **DevRevでチケット用カスタムフィールドを定義**
   ```
   requester_name (Text)
   requester_teams_id (Text)
   start_date (Date)
   end_date (Date)
   days_count (Number)
   reason (Text)
   approver_name (Text)
   approver_teams_id (Text)
   status (Text)
   leave_type (Text)
   additional_system (Text)
   ```

2. **Subtypeを作成**
   - Name: `leave_request`
   - Type: `ticket`

3. **.envファイルを更新**
   ```env
   DEVREV_WORK_ITEM_TYPE=ticket
   DEVREV_TICKET_TYPE=ticket
   DEVREV_TICKET_SUBTYPE=leave_request
   ```

4. **Webhook設定を更新**
   - Event type: `work.created`
   - Filter: `type = 'ticket' AND subtype = 'leave_request'`

5. **Botを再起動**
   ```bash
   npm start
   ```

### チケット → カスタムオブジェクトへの切り替え

1. **DevRevでTenant Fragmentスキーマを定義**
   - 詳細は [DEVREV_CUSTOM_OBJECTS.md](DEVREV_CUSTOM_OBJECTS.md) 参照

2. **.envファイルを更新**
   ```env
   DEVREV_WORK_ITEM_TYPE=custom_object
   ```

3. **Webhook設定を更新**
   - Event type: `custom_object.created`
   - Filter: `leaf_type = 'leave_request'`

4. **Botを再起動**
   ```bash
   npm start
   ```

## トラブルシューティング

### 問題: 休暇申請が作成されない

**確認事項:**
1. `.env` の `DEVREV_WORK_ITEM_TYPE` が正しく設定されているか
2. DevRevのカスタムフィールドが定義されているか
3. ログでエラーメッセージを確認

**ログの確認:**
```
[DevRev] Using work item type: custom_object  # または ticket
[DevRev] Creating custom object: ...  # または Creating ticket: ...
```

### 問題: Webhookが届かない

**確認事項:**
1. Webhook URLが正しいか
2. Event typeが正しいか（`custom_object.created` vs `work.created`）
3. Filterが正しいか

**デバッグ:**
```bash
# Webhookログを確認
tail -f /var/log/your-bot.log | grep "DevRev Webhook"
```

### 問題: 承認依頼が届かない

**確認事項:**
1. `approver_teams_id` または `tnt__approver_teams_id` が正しく保存されているか
2. Webhookペイロードにフィールドが含まれているか

**ログの確認:**
```
[handleLeaveRequestCreated] No approver Teams ID found
```

この警告が出る場合、カスタムフィールド名が間違っている可能性があります。

### 問題: フィールド名のミスマッチ

**症状:**
承認カードに「不明」と表示される

**原因:**
カスタムオブジェクトとチケットでフィールド名が異なる

**解決方法:**
Botは両方の命名規則に自動対応しているため、DevRev側のフィールド名を確認してください。

## ベストプラクティス

### 本番環境での推奨

1. **カスタムオブジェクトを推奨**
   - 専用のデータ構造で管理
   - 他のチケットと混在しない
   - 将来の拡張に柔軟

2. **事前にテスト**
   - 開発環境で両方の方式をテスト
   - Webhook動作を確認
   - カスタムフィールドの検証

3. **ドキュメント化**
   - 選択した方式を記録
   - カスタムフィールド定義を文書化
   - Webhook設定を記録

### 移行時の注意

- **データの移行は不要**: Botは新規作成のみ対応
- **既存データ**: 過去の休暇申請は影響を受けない
- **段階的移行**: 並行運用は推奨しない（混乱を避けるため）

## 参考資料

- [DevRev Custom Objects Documentation](DEVREV_CUSTOM_OBJECTS.md)
- [DevRev Workflow Setup](DEVREV_WORKFLOW_SETUP.md)
- [DevRev API Documentation](https://docs.devrev.ai/)
- [Works API Reference](https://docs.devrev.ai/api-reference/works)
- [Custom Objects API Reference](https://docs.devrev.ai/api-reference/custom-objects)

## サポート

問題が解決しない場合は、以下の情報を含めて問い合わせてください：

1. `.env` の設定内容（トークンを除く）
2. エラーログ
3. DevRevのカスタムフィールド定義
4. Webhook設定
5. 使用している方式（カスタムオブジェクト or チケット）
