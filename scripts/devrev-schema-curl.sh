#!/bin/bash

# DevRev カスタムオブジェクト スキーマ定義用 cURLコマンド
#
# 使用方法:
#   1. DEVREV_API_TOKEN を設定
#      export DEVREV_API_TOKEN="your-token-here"
#   2. このスクリプトを実行
#      bash scripts/devrev-schema-curl.sh

# APIトークンを環境変数から取得（または直接設定）
API_TOKEN="${DEVREV_API_TOKEN}"
API_BASE_URL="${DEVREV_API_BASE_URL:-https://api.devrev.ai}"

if [ -z "$API_TOKEN" ]; then
    echo "エラー: DEVREV_API_TOKEN が設定されていません"
    echo "使用方法: export DEVREV_API_TOKEN='your-token-here'"
    exit 1
fi

echo "=== DevRev カスタムオブジェクト スキーマ定義 ==="
echo ""

# カスタムオブジェクトのスキーマを定義
curl -X POST "${API_BASE_URL}/schemas.custom.set" \
  -H "Authorization: Bearer ${API_TOKEN}" \
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
        "name": "requester_email",
        "field_type": "text",
        "description": "申請者のメールアドレス"
      },
      {
        "name": "requester_teams_id",
        "field_type": "text",
        "description": "Microsoft Teams のユーザーID"
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
        "name": "days_count",
        "field_type": "int",
        "description": "休暇の日数"
      },
      {
        "name": "reason",
        "field_type": "text",
        "description": "休暇申請の理由",
        "is_required": true
      },
      {
        "name": "approver_name",
        "field_type": "text",
        "description": "休暇を承認する管理者の名前"
      },
      {
        "name": "approver_teams_id",
        "field_type": "text",
        "description": "承認者のMicrosoft Teams ユーザーID"
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

echo ""
echo ""
echo "=== 完了 ==="
