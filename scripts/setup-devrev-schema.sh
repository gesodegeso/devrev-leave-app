#!/bin/bash

# DevRev カスタムオブジェクトのスキーマ設定スクリプト
# 休暇申請（Leave Request）のカスタムオブジェクトを定義します

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== DevRev カスタムオブジェクト スキーマ設定 ===${NC}\n"

# 環境変数の読み込み
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# APIトークンの確認
if [ -z "$DEVREV_API_TOKEN" ]; then
    echo -e "${RED}❌ エラー: DEVREV_API_TOKEN が設定されていません${NC}"
    echo -e "${YELLOW}   .env ファイルを確認してください${NC}"
    exit 1
fi

API_BASE_URL="${DEVREV_API_BASE_URL:-https://api.devrev.ai}"
API_TOKEN="$DEVREV_API_TOKEN"

echo -e "${BLUE}API Base URL:${NC} $API_BASE_URL"
echo -e "${BLUE}API Token:${NC} ${API_TOKEN:0:10}..."
echo ""

# ステップ1: カスタムオブジェクトのスキーマ定義
echo -e "${BLUE}ステップ1: カスタムオブジェクトのスキーマを定義${NC}"
echo "リーフタイプ: leave_request"
echo "サブタイプ: paid, unpaid"
echo ""

SCHEMA_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_BASE_URL}/schemas.custom.set" \
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
  }')

# HTTPステータスコードを取得
HTTP_CODE=$(echo "$SCHEMA_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SCHEMA_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✅ スキーマ定義成功${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo -e "${RED}❌ スキーマ定義失敗 (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    exit 1
fi

echo ""
echo -e "${GREEN}=== セットアップ完了 ===${NC}"
echo ""
echo -e "${BLUE}次のステップ:${NC}"
echo "  1. DevRevダッシュボードでカスタムオブジェクトを確認"
echo "  2. Botから休暇申請を送信してテスト"
echo "  3. DevRevで作成された Leave Request オブジェクトを確認"
echo ""
