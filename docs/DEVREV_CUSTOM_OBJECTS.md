# DevRev カスタムオブジェクト実装ガイド

## 概要

このプロジェクトでは、休暇申請をDevRevの**カスタムオブジェクト**として保存します。カスタムオブジェクトを使用することで、標準のチケット/イシューとは別に、休暇申請専用のデータ構造を定義できます。

---

## カスタムオブジェクトのメリット

### ✅ 構造化されたデータ管理
- 休暇申請専用のフィールド定義
- 型安全なデータ保存（date型、int型、enum型など）
- 必須フィールドの強制

### ✅ 検索・フィルタリングの容易さ
- カスタムフィールドでの検索
- ステータスごとのフィルタリング
- 日付範囲での絞り込み

### ✅ 拡張性
- 将来的なフィールド追加が容易
- サブタイプによる分類（有給/無給）
- カスタムワークフローの実装

---

## アーキテクチャ

```
Teams Bot
    ↓
DevRev API
    ↓
カスタムオブジェクト: leave_request
    └── フィールド: leave_type (paid/unpaid)
        ├── paid: 有給休暇
        └── unpaid: 無給休暇
```

---

## スキーマ定義

### リーフタイプ
```
type: leave_request
display_name: 休暇申請
id_prefix: LR
is_custom_leaf_type: true
```

### フィールド定義

| フィールド名 | 型 | 必須 | 説明 |
|------------|---|------|------|
| `requester_name` | text | ✅ | 申請者名 |
| `requester_email` | text | - | 申請者メールアドレス |
| `requester_teams_id` | text | - | Teams ユーザーID |
| `start_date` | date | ✅ | 開始日 |
| `end_date` | date | ✅ | 終了日 |
| `days_count` | int | - | 日数 |
| `reason` | text | ✅ | 理由 |
| `approver_name` | text | - | 承認者名 |
| `approver_teams_id` | text | - | 承認者 Teams ID |
| `status` | enum | ✅ | ステータス |
| `leave_type` | enum | ✅ | 休暇タイプ（有給/無給） |
| `additional_system` | text | - | 追加利用制度（AIが自動判別して追記） |

### ステータスの値
- `pending` - 承認待ち
- `approved` - 承認済み
- `rejected` - 却下
- `cancelled` - キャンセル

### 休暇タイプの値
- `paid` - 有給休暇
- `unpaid` - 無給休暇

---

## セットアップ手順

### ステップ1: スキーマの作成

#### 方法A: npmスクリプトを使用（推奨）

```bash
npm run devrev:setup-schema
```

#### 方法B: シェルスクリプトを直接実行

```bash
bash scripts/setup-devrev-schema.sh
```

#### 方法C: curlコマンドを直接実行

```bash
# 環境変数を設定
export DEVREV_API_TOKEN="your-token-here"

# スクリプトを実行
bash scripts/devrev-schema-curl.sh
```

### ステップ2: スキーマの確認

DevRevダッシュボードで確認：

1. DevRevにログイン
2. Settings → Custom Objects
3. "leave_request" が表示されることを確認
4. フィールド定義を確認

---

## cURLコマンド

### スキーマ作成

```bash
curl -X POST "https://api.devrev.ai/schemas.custom.set" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tenant_fragment",
    "leaf_type": "leave_request",
    "description": "従業員の休暇申請を管理するカスタムオブジェクト",
    "is_custom_leaf_type": true,
    "id_prefix": "LR",
    "fields": [
      {
        "name": "requester_name",
        "field_type": "text",
        "description": "休暇を申請する従業員の名前",
        "is_required": true
      },
      {
        "name": "start_date",
        "field_type": "date",
        "description": "休暇の開始日",
        "is_required": true
      },
      {
        "name": "end_date",
        "field_type": "date",
        "description": "休暇の終了日",
        "is_required": true
      },
      {
        "name": "reason",
        "field_type": "text",
        "description": "休暇申請の理由",
        "is_required": true
      },
      {
        "name": "status",
        "field_type": "enum",
        "description": "申請のステータス",
        "allowed_values": ["pending", "approved", "rejected", "cancelled"],
        "is_required": true
      },
      {
        "name": "leave_type",
        "field_type": "enum",
        "description": "休暇タイプ（有給/無給）",
        "allowed_values": ["paid", "unpaid"],
        "is_required": true
      },
      {
        "name": "additional_system",
        "field_type": "text",
        "description": "追加で利用する休暇制度名（AIが自動判別して追記）"
      }
    ]
  }'
```

### カスタムオブジェクト作成

```bash
curl -X POST "https://api.devrev.ai/custom-objects.create" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "leave_request",
    "fields": {
      "requester_name": "山田太郎",
      "requester_email": "yamada@example.com",
      "requester_teams_id": "29:1234567890",
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "days_count": 5,
      "reason": "家族旅行",
      "approver_name": "佐藤花子",
      "approver_teams_id": "29:0987654321",
      "status": "pending",
      "leave_type": "paid",
      "additional_system": ""
    }
  }'
```

### カスタムオブジェクト取得

```bash
curl -X GET "https://api.devrev.ai/custom-objects.get?id=OBJECT_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 実装詳細

### [src/services/devrev.js](../src/services/devrev.js)

```javascript
async createLeaveRequestTicket(leaveData, requester) {
    const leaveType = usePaidLeave === 'true' ? 'paid' : 'unpaid';

    const customObjectData = {
        type: 'leave_request',
        fields: {
            requester_name: requester.name,
            requester_email: requester.email || requester.aadObjectId || '',
            requester_teams_id: requester.id,
            start_date: startDate,
            end_date: endDate,
            days_count: days,
            reason: reason,
            approver_name: approver || '',
            approver_teams_id: approverUserId || '',
            status: 'pending',
            leave_type: leaveType,
            additional_system: ''
        }
    };

    const response = await axios.post(
        `${this.apiBaseUrl}/custom-objects.create`,
        customObjectData,
        { headers: { 'Authorization': `Bearer ${this.apiToken}` } }
    );

    return {
        success: true,
        objectId: response.data.custom_object.id,
        displayId: response.data.custom_object.display_id,
        objectUrl: `https://app.devrev.ai/custom/${response.data.custom_object.display_id}`
    };
}
```

---

## テスト

### カスタムオブジェクト作成テスト

```bash
npm run test:devrev:custom
```

**期待される出力:**
```
=== DevRev カスタムオブジェクト テスト ===

1. 休暇申請カスタムオブジェクトの作成...
   カスタムオブジェクトデータ:
   {
     "type": "leave_request",
     "fields": {
       "leave_type": "paid",
       ...
     }
   }

✅ カスタムオブジェクト作成成功！
   Object ID: don:core:...
   Display ID: LR-123
   タイプ: leave_request

   DevRevで確認:
   https://app.devrev.ai/custom/LR-123

2. カスタムオブジェクトの取得テスト...
✅ カスタムオブジェクト取得成功！

=== すべてのテストが成功しました！ ===
```

---

## エラーハンドリング

### 404 Not Found

**原因:** スキーマが定義されていない

**解決:**
```bash
npm run devrev:setup-schema
```

### 400 Bad Request

**原因:**
- 必須フィールドが不足
- フィールド型が間違っている
- enumの値が許可リストにない

**解決:** リクエストデータを確認

### 401 Unauthorized

**原因:** APIトークンが無効

**解決:** `.env`のトークンを確認・更新

---

## DevRevでの確認方法

### カスタムオブジェクトの表示

1. DevRevダッシュボード → Custom Objects
2. "leave_request" タイプでフィルタ
3. 作成されたオブジェクトを確認

### フィールドの確認

各カスタムオブジェクトの詳細画面で、定義したフィールドが表示されます：

- 申請者名
- 開始日・終了日
- 日数
- 理由
- 承認者
- ステータス

---

## 今後の拡張

### ワークフローの追加

カスタムオブジェクトにワークフローを設定：

1. DevRev Settings → Workflows
2. leave_requestタイプのワークフローを作成
3. ステータス遷移ルールを定義
   - pending → approved (承認)
   - pending → rejected (却下)
   - approved → cancelled (キャンセル)

### 自動化の追加

1. **承認通知:** ステータスが approved になったらTeamsに通知
2. **期限アラート:** 開始日の前日にリマインダー
3. **集計レポート:** 月次の休暇取得状況レポート

---

## 参考リンク

- [DevRev Custom Objects Guide](https://developer.devrev.ai/guides/custom-objects)
- [DevRev API Reference](https://developer.devrev.ai/api-reference)
- [カスタムオブジェクト スキーマ設計のベストプラクティス](https://developer.devrev.ai/best-practices)

---

**最終更新**: 2025-01-11
