#!/bin/bash

# 本番環境のBot認証情報チェックスクリプト

echo "=== 本番環境 Bot 認証情報チェック ==="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. .envファイルの存在確認
echo -e "${BLUE}1. .env ファイル確認${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env ファイルが存在します${NC}"
else
    echo -e "${RED}✗ .env ファイルが見つかりません${NC}"
    exit 1
fi
echo ""

# 2. 環境変数の長さ確認
echo -e "${BLUE}2. 環境変数の設定確認${NC}"
source .env

if [ -z "$MICROSOFT_APP_ID" ]; then
    echo -e "${RED}✗ MICROSOFT_APP_ID が設定されていません${NC}"
    APP_ID_OK=false
else
    APP_ID_LENGTH=${#MICROSOFT_APP_ID}
    if [ $APP_ID_LENGTH -eq 36 ]; then
        echo -e "${GREEN}✓ MICROSOFT_APP_ID: ${APP_ID_LENGTH}文字 (正常)${NC}"
        echo "  値: ${MICROSOFT_APP_ID:0:10}..."
        APP_ID_OK=true
    else
        echo -e "${YELLOW}⚠ MICROSOFT_APP_ID: ${APP_ID_LENGTH}文字 (通常36文字)${NC}"
        APP_ID_OK=false
    fi
fi

if [ -z "$MICROSOFT_APP_PASSWORD" ]; then
    echo -e "${RED}✗ MICROSOFT_APP_PASSWORD が設定されていません${NC}"
    PASSWORD_OK=false
else
    PASSWORD_LENGTH=${#MICROSOFT_APP_PASSWORD}
    if [ $PASSWORD_LENGTH -ge 30 ]; then
        echo -e "${GREEN}✓ MICROSOFT_APP_PASSWORD: ${PASSWORD_LENGTH}文字 (正常)${NC}"
        echo "  値: ${MICROSOFT_APP_PASSWORD:0:10}..."
        PASSWORD_OK=true
    else
        echo -e "${YELLOW}⚠ MICROSOFT_APP_PASSWORD: ${PASSWORD_LENGTH}文字 (短すぎる可能性)${NC}"
        PASSWORD_OK=false
    fi
fi
echo ""

# 3. 空白や改行のチェック
echo -e "${BLUE}3. 不正な文字のチェック${NC}"
APP_ID_WHITESPACE=$(echo "$MICROSOFT_APP_ID" | grep -E '^\s|\s$')
PASSWORD_WHITESPACE=$(echo "$MICROSOFT_APP_PASSWORD" | grep -E '^\s|\s$')

if [ -z "$APP_ID_WHITESPACE" ]; then
    echo -e "${GREEN}✓ MICROSOFT_APP_ID: 前後に空白なし${NC}"
else
    echo -e "${RED}✗ MICROSOFT_APP_ID: 前後に空白があります${NC}"
fi

if [ -z "$PASSWORD_WHITESPACE" ]; then
    echo -e "${GREEN}✓ MICROSOFT_APP_PASSWORD: 前後に空白なし${NC}"
else
    echo -e "${RED}✗ MICROSOFT_APP_PASSWORD: 前後に空白があります${NC}"
fi
echo ""

# 4. Teams マニフェストとの一致確認
echo -e "${BLUE}4. Teams マニフェストとの一致確認${NC}"
if [ -f teams-manifest/manifest.json ]; then
    MANIFEST_BOT_ID=$(grep -oP '"botId":\s*"\K[^"]+' teams-manifest/manifest.json | head -1)
    if [ "$MANIFEST_BOT_ID" = "$MICROSOFT_APP_ID" ]; then
        echo -e "${GREEN}✓ manifest.json の botId と一致しています${NC}"
    else
        echo -e "${RED}✗ manifest.json の botId と一致しません${NC}"
        echo "  .env の MICROSOFT_APP_ID: ${MICROSOFT_APP_ID:0:20}..."
        echo "  manifest.json の botId:  ${MANIFEST_BOT_ID:0:20}..."
    fi
else
    echo -e "${YELLOW}⚠ teams-manifest/manifest.json が見つかりません${NC}"
fi
echo ""

# 5. PM2の状態確認
echo -e "${BLUE}5. PM2 プロセス確認${NC}"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep "teams-leave-bot" | awk '{print $10}')
    if [ "$PM2_STATUS" = "online" ]; then
        echo -e "${GREEN}✓ PM2 プロセスが実行中です (status: online)${NC}"
        pm2 list | grep "teams-leave-bot" || pm2 list | head -3
    else
        echo -e "${YELLOW}⚠ PM2 プロセスの状態: $PM2_STATUS${NC}"
        pm2 list | grep "teams-leave-bot" || pm2 list | head -3
    fi
else
    echo -e "${YELLOW}⚠ PM2 がインストールされていません${NC}"
fi
echo ""

# 6. Node.jsバージョン確認
echo -e "${BLUE}6. Node.js バージョン確認${NC}"
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Node.js バージョン: ${NODE_VERSION}${NC}"
    # バージョンチェック（v18-v22推奨）
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -ge 18 ] && [ "$NODE_MAJOR" -le 22 ]; then
        echo -e "${GREEN}  推奨バージョン範囲内 (v18-v22)${NC}"
    else
        echo -e "${YELLOW}  ⚠ 推奨バージョンはv18-v22です${NC}"
    fi
else
    echo -e "${RED}✗ Node.js がインストールされていません${NC}"
fi
echo ""

# 7. JWTトークン取得テスト
echo -e "${BLUE}7. JWT トークン取得テスト${NC}"
echo "テストを実行中..."

if [ "$APP_ID_OK" = true ] && [ "$PASSWORD_OK" = true ]; then
    JWT_TEST_OUTPUT=$(npm run test:jwt 2>&1)
    if echo "$JWT_TEST_OUTPUT" | grep -q "✅ トークン取得成功"; then
        echo -e "${GREEN}✓ JWT トークン取得成功${NC}"
        echo -e "${GREEN}  → 認証情報は正しく設定されています${NC}"
    else
        echo -e "${RED}✗ JWT トークン取得失敗${NC}"
        echo -e "${RED}  → App ID または Password が間違っている可能性があります${NC}"
        echo ""
        echo "詳細なエラーメッセージ:"
        echo "$JWT_TEST_OUTPUT" | tail -10
    fi
else
    echo -e "${YELLOW}⚠ 環境変数に問題があるため、スキップします${NC}"
fi
echo ""

# 8. ヘルスチェック
echo -e "${BLUE}8. Bot ヘルスチェック${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3978/health 2>/dev/null)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓ Bot が正常に稼働しています (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Bot が応答しません (HTTP ${HEALTH_CHECK})${NC}"
    echo -e "${YELLOW}  PM2でBotが起動しているか確認してください: pm2 status${NC}"
fi
echo ""

# 9. 最近のエラーログ確認
echo -e "${BLUE}9. 最近のエラーログ確認${NC}"
if command -v pm2 &> /dev/null; then
    RECENT_ERRORS=$(pm2 logs teams-leave-bot --err --nostream --lines 5 2>/dev/null | grep -i "error\|401\|authorization" | tail -5)
    if [ -z "$RECENT_ERRORS" ]; then
        echo -e "${GREEN}✓ 最近のエラーログなし${NC}"
    else
        echo -e "${YELLOW}⚠ 最近のエラー:${NC}"
        echo "$RECENT_ERRORS"
    fi
else
    echo -e "${YELLOW}⚠ PM2が利用できません${NC}"
fi
echo ""

# まとめ
echo "=========================================="
echo -e "${BLUE}診断結果まとめ${NC}"
echo "=========================================="

if [ "$APP_ID_OK" = true ] && [ "$PASSWORD_OK" = true ]; then
    if echo "$JWT_TEST_OUTPUT" | grep -q "✅ トークン取得成功"; then
        echo -e "${GREEN}✓ 認証設定は正常です${NC}"
        echo ""
        echo "401エラーが発生している場合、以下を確認してください:"
        echo "  1. Azure Portal の App Registration と .env が一致しているか"
        echo "  2. Client Secret が期限切れでないか"
        echo "  3. Teams マニフェストの botId が正しいか"
        echo ""
        echo "詳細は docs/PRODUCTION_401_ERROR.md を参照してください。"
    else
        echo -e "${RED}✗ 認証情報に問題があります${NC}"
        echo ""
        echo "対処方法:"
        echo "  1. Azure Portal で正しい App ID と Password を確認"
        echo "  2. .env ファイルを更新"
        echo "  3. PM2 を再起動: pm2 restart teams-leave-bot"
    fi
else
    echo -e "${RED}✗ 環境変数に問題があります${NC}"
    echo ""
    echo "対処方法:"
    echo "  1. .env ファイルを確認"
    echo "  2. MICROSOFT_APP_ID と MICROSOFT_APP_PASSWORD を設定"
    echo "  3. 前後に空白がないか確認"
fi

echo ""
