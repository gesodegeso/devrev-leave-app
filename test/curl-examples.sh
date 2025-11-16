#!/bin/bash

# Teams Leave Request Bot - cURLテストコマンド集

echo "=== Teams Bot テストリクエスト ==="
echo ""

# 1. ヘルスチェック
echo "1. ヘルスチェック:"
echo "curl -X GET http://localhost:3978/health"
echo ""

# 2. 簡易的なメッセージリクエスト（Bot Framework形式）
echo "2. 簡易メッセージテスト（休暇申請）:"
cat << 'EOF'
curl -X POST http://localhost:3978/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "id": "test-message-001",
    "timestamp": "2025-01-11T00:00:00.000Z",
    "serviceUrl": "https://smba.trafficmanager.net/apis/",
    "channelId": "msteams",
    "from": {
      "id": "29:test-user-id",
      "name": "テストユーザー",
      "aadObjectId": "test-aad-id"
    },
    "conversation": {
      "conversationType": "personal",
      "id": "a:test-conversation-id"
    },
    "recipient": {
      "id": "28:test-bot-id",
      "name": "休暇申請Bot"
    },
    "text": "休暇申請",
    "channelData": {
      "tenant": {
        "id": "test-tenant-id"
      }
    }
  }'
EOF
echo ""
echo ""

# 3. Adaptive Card送信後のアクションリクエスト
echo "3. Adaptive Card送信リクエスト（フォーム送信）:"
cat << 'EOF'
curl -X POST http://localhost:3978/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "id": "test-submit-001",
    "timestamp": "2025-01-11T00:05:00.000Z",
    "serviceUrl": "https://smba.trafficmanager.net/apis/",
    "channelId": "msteams",
    "from": {
      "id": "29:test-user-id",
      "name": "テストユーザー",
      "aadObjectId": "test-aad-id"
    },
    "conversation": {
      "conversationType": "personal",
      "id": "a:test-conversation-id"
    },
    "recipient": {
      "id": "28:test-bot-id",
      "name": "休暇申請Bot"
    },
    "value": {
      "startDate": "2025-02-01",
      "endDate": "2025-02-05",
      "reason": "家族旅行のため",
      "usePaidLeave": "true",
      "approverName": "山田太郎",
      "approverUserId": "29:approver-user-id"
    },
    "channelData": {
      "tenant": {
        "id": "test-tenant-id"
      }
    }
  }'
EOF
echo ""
echo ""

# 4. グループチャットでのメンション付きメッセージ
echo "4. グループチャットでのメンション（@休暇申請Bot 休暇申請）:"
cat << 'EOF'
curl -X POST http://localhost:3978/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "id": "test-group-001",
    "timestamp": "2025-01-11T00:00:00.000Z",
    "serviceUrl": "https://smba.trafficmanager.net/apis/",
    "channelId": "msteams",
    "from": {
      "id": "29:test-user-id",
      "name": "テストユーザー",
      "aadObjectId": "test-aad-id"
    },
    "conversation": {
      "conversationType": "groupChat",
      "id": "19:test-group-id"
    },
    "recipient": {
      "id": "28:test-bot-id",
      "name": "休暇申請Bot"
    },
    "text": "<at>休暇申請Bot</at> 休暇申請",
    "entities": [
      {
        "mentioned": {
          "id": "28:test-bot-id",
          "name": "休暇申請Bot"
        },
        "text": "<at>休暇申請Bot</at>",
        "type": "mention"
      }
    ],
    "channelData": {
      "tenant": {
        "id": "test-tenant-id"
      }
    }
  }'
EOF
echo ""
echo ""

echo "=== 注意事項 ==="
echo "上記のcurlコマンドは認証なしのテスト用です。"
echo "実際のTeamsからのリクエストには以下が含まれます："
echo "  - Authorization ヘッダー（JWTトークン）"
echo "  - 正しいserviceUrl"
echo "  - 有効なユーザーID、会話ID"
echo ""
echo "Botが正しく動作しているかテストするには："
echo "  1. Bot Frameworkエミュレーターを使用"
echo "  2. 実際のTeamsアプリとして登録してテスト"
echo ""
