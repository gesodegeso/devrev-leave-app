# DevRev チケット用カスタムフィールド定義

このドキュメントでは、休暇申請をDevRevのチケット（Work Item）として管理する場合に必要なカスタムフィールドの定義を説明します。

## 概要

`DEVREV_WORK_ITEM_TYPE=ticket` を使用する場合、以下のすべてのカスタムフィールドをDevRevで事前に定義する必要があります。

## 必須カスタムフィールド一覧

### 1. requester_name
- **フィールド名**: `requester_name`
- **タイプ**: Text (Short Text)
- **説明**: 休暇申請者の名前
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `山田太郎`

### 2. requester_email
- **フィールド名**: `requester_email`
- **タイプ**: Text (Short Text)
- **説明**: 休暇申請者のメールアドレス
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `yamada@example.com`

### 3. requester_teams_id
- **フィールド名**: `requester_teams_id`
- **タイプ**: Text (Short Text)
- **説明**: 休暇申請者のMicrosoft Teams ID（プロアクティブメッセージ用）
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `29:1AbCdEfGhIjKlMnOpQrStUvWxYz...`

### 4. start_date
- **フィールド名**: `start_date`
- **タイプ**: Date
- **説明**: 休暇開始日
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `2025-01-20`

### 5. end_date
- **フィールド名**: `end_date`
- **タイプ**: Date
- **説明**: 休暇終了日
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `2025-01-22`

### 6. days_count
- **フィールド名**: `days_count`
- **タイプ**: Number (Integer)
- **説明**: 休暇日数
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `3`

### 7. reason
- **フィールド名**: `reason`
- **タイプ**: Text (Long Text)
- **説明**: 休暇理由
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `家族旅行のため`

### 8. approver_name
- **フィールド名**: `approver_name`
- **タイプ**: Text (Short Text)
- **説明**: 承認者の名前
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `佐藤花子`

### 9. approver_teams_id
- **フィールド名**: `approver_teams_id`
- **タイプ**: Text (Short Text)
- **説明**: 承認者のMicrosoft Teams ID（プロアクティブメッセージ用）
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `29:2XyZwVuTsRqPoNmLkJiHgFeDcBa...`
- **重要**: このフィールドは承認依頼を送信するために**必須**です

### 10. status
- **フィールド名**: `status`
- **タイプ**: Text (Short Text) または Enum
- **説明**: 申請ステータス
- **適用先**: Work (Ticket)
- **必須**: No
- **取りうる値**:
  - `pending` - 承認待ち
  - `approved` - 承認済み
  - `rejected` - 却下
- **デフォルト値**: `pending`

### 11. leave_type
- **フィールド名**: `leave_type`
- **タイプ**: Text (Short Text) または Enum
- **説明**: 休暇種別
- **適用先**: Work (Ticket)
- **必須**: No
- **取りうる値**:
  - `paid` - 有給休暇
  - `unpaid` - 無給休暇
- **例**: `paid`

### 12. additional_system
- **フィールド名**: `additional_system`
- **タイプ**: Text (Short Text)
- **説明**: 追加休暇制度（AIによる自動判別結果）
- **適用先**: Work (Ticket)
- **必須**: No
- **例**: `介護休暇`, `リフレッシュ休暇`, 空白

### 13. request_type
- **フィールド名**: `request_type`
- **タイプ**: Text (Short Text)
- **説明**: リクエスト種別（休暇申請を他のチケットと区別するため）
- **適用先**: Work (Ticket)
- **必須**: No
- **固定値**: `leave_request`
- **用途**: Webhook Filterで使用

## DevRev UIでの設定手順

### カスタムフィールドの作成

1. **DevRev Dashboard** にログイン
2. **Settings** (⚙️) をクリック
3. **Customization** → **Custom Fields** を選択
4. **+ Add Custom Field** をクリック

### 各フィールドの設定例

#### Date型フィールドの例（start_date, end_date）

```
Name: start_date
Type: Date
Description: 休暇開始日
Applies to: Work
Object types: Ticket
Required: No
```

#### Text型フィールドの例（requester_name, approver_name）

```
Name: requester_name
Type: Text
Format: Short text
Description: 休暇申請者の名前
Applies to: Work
Object types: Ticket
Required: No
Max length: 100
```

#### Number型フィールドの例（days_count）

```
Name: days_count
Type: Number
Format: Integer
Description: 休暇日数
Applies to: Work
Object types: Ticket
Required: No
Min value: 1
Max value: 365
```

#### Enum型フィールドの例（status）

```
Name: status
Type: Enum (または Text)
Description: 申請ステータス
Applies to: Work
Object types: Ticket
Required: No

Options (Enumの場合):
- pending (承認待ち)
- approved (承認済み)
- rejected (却下)

Default value: pending
```

### Long Text型フィールドの例（reason）

```
Name: reason
Type: Text
Format: Long text (Multiline)
Description: 休暇理由
Applies to: Work
Object types: Ticket
Required: No
Max length: 500
```

## トラブルシューティング

### エラー: "field 'XXX' not in referenced custom schema"

**原因**: カスタムフィールド `XXX` が定義されていない

**解決方法**:
1. DevRevでカスタムフィールドを作成
2. フィールド名が完全一致しているか確認（大文字小文字、スペース、アンダースコアなど）
3. "Applies to" が `Work` または `Ticket` に設定されているか確認

### エラー: "customization_validation_error"

**原因**:
- カスタムフィールドのタイプが間違っている
- 値が制約に違反している（例: 文字数制限、数値範囲）

**解決方法**:
1. フィールドタイプを確認（Date, Text, Number など）
2. 値の形式を確認（例: 日付は `YYYY-MM-DD` 形式）
3. 制約条件を確認（最大文字数、数値範囲など）

### カスタムフィールドが表示されない

**原因**: "Applies to" の設定が間違っている

**解決方法**:
- "Applies to" を `Work` に設定
- "Object types" で `Ticket` を選択
- 設定を保存して再度確認

## Webhook設定

カスタムフィールドを作成したら、Webhook設定も更新してください。

### Webhook Filter例

```javascript
// request_type フィールドで休暇申請を判別
custom_fields.request_type = 'leave_request'
```

または

```javascript
// 複数条件
custom_fields.request_type = 'leave_request' AND custom_fields.status = 'pending'
```

## 検証方法

カスタムフィールドが正しく設定されているか確認する方法：

### 1. DevRev UIでの確認

1. DevRevで新しいTicketを手動作成
2. カスタムフィールドセクションを確認
3. すべてのフィールド（上記13個）が表示されるか確認

### 2. API経由での確認

```bash
# カスタムフィールドのスキーマを取得
curl -X GET "https://api.devrev.ai/custom-schemas.get?id=YOUR_SCHEMA_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### 3. Botからのテスト

1. `.env` を設定:
   ```env
   DEVREV_WORK_ITEM_TYPE=ticket
   ```

2. Botを再起動

3. Teamsで休暇申請を実行

4. DevRev APIからのレスポンスを確認:
   ```
   [DevRev] Creating ticket: {...}
   [DevRev] API response: {...}
   ```

エラーが発生しなければ、すべてのカスタムフィールドが正しく設定されています。

## 参考情報

- [DevRev Custom Fields Documentation](https://docs.devrev.ai/product/custom-fields)
- [DevRev Works API](https://docs.devrev.ai/api-reference/works)
- [Work Item Type Configuration](WORK_ITEM_TYPE_CONFIGURATION.md)

## まとめ

チケット方式を使用する場合は、**13個のカスタムフィールド**をすべてDevRevで作成する必要があります。カスタムオブジェクト方式を使用する場合は、Tenant Fragmentスキーマで定義するため、この作業は不要です。

どちらの方式を選ぶかは、[WORK_ITEM_TYPE_CONFIGURATION.md](WORK_ITEM_TYPE_CONFIGURATION.md) を参照してください。
