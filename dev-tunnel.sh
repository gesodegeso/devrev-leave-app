#!/bin/bash

# 開発用SSHトンネルスクリプト
# Usage: ./dev-tunnel.sh

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定（環境変数または直接編集）
SERVER="${SSH_TUNNEL_SERVER:-user@your-server.com}"
LOCAL_PORT="${SSH_TUNNEL_LOCAL_PORT:-3978}"
REMOTE_PORT="${SSH_TUNNEL_REMOTE_PORT:-3978}"

echo -e "${BLUE}Teams Bot - 開発用SSHトンネル${NC}"
echo "=================================="
echo

# 設定ファイルの確認
if [ -f ".dev-tunnel.conf" ]; then
    echo -e "${GREEN}設定ファイルを読み込んでいます...${NC}"
    source .dev-tunnel.conf
fi

# 設定の表示
echo -e "${BLUE}設定:${NC}"
echo "  サーバー: ${SERVER}"
echo "  ローカルポート: ${LOCAL_PORT}"
echo "  リモートポート: ${REMOTE_PORT}"
echo

# SSH接続テスト
echo -e "${BLUE}サーバー接続を確認中...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${SERVER}" echo "OK" &>/dev/null; then
    echo -e "${RED}❌ サーバーに接続できません${NC}"
    echo
    echo "以下を確認してください:"
    echo "  1. サーバーアドレスが正しいか"
    echo "  2. SSHキーが設定されているか"
    echo "  3. ネットワーク接続が正常か"
    echo
    echo "設定を変更する場合:"
    echo "  export SSH_TUNNEL_SERVER='user@your-server.com'"
    echo "または .dev-tunnel.conf ファイルを作成"
    exit 1
fi
echo -e "${GREEN}✓ サーバー接続OK${NC}"
echo

# ローカルポートの確認
echo -e "${BLUE}ローカルポート ${LOCAL_PORT} を確認中...${NC}"
if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ ポート ${LOCAL_PORT} でBotが起動中${NC}"
else
    echo -e "${YELLOW}⚠️  ポート ${LOCAL_PORT} でBotが起動していません${NC}"
    echo
    echo "別のターミナルで以下を実行してください:"
    echo "  npm run dev"
    echo
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo

# SSHトンネル作成
echo -e "${GREEN}SSHトンネルを作成しています...${NC}"
echo
echo -e "${BLUE}リモートサーバー ${REMOTE_PORT} → ローカルPC ${LOCAL_PORT}${NC}"
echo
echo -e "${YELLOW}Ctrl+C で終了${NC}"
echo "=================================="
echo

# トンネルを作成（フォアグラウンド）
# -N: コマンドを実行しない
# -R: リバーストンネル（リモート→ローカル）
# -o ServerAliveInterval=60: 60秒ごとにキープアライブ
# -o ServerAliveCountMax=3: 3回失敗したら切断
ssh -N \
    -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    "${SERVER}"
