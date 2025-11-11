#!/bin/bash

# ローカル開発環境クイックスタートスクリプト

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Teams Leave Bot - ローカル開発環境${NC}"
echo "=================================="
echo

# 1. .envファイルの確認
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .envファイルが見つかりません${NC}"
    echo
    if [ -f .env.example ]; then
        echo -e "${GREEN}✓ .env.exampleから.envを作成します...${NC}"
        cp .env.example .env
        echo -e "${RED}重要: .envファイルを編集して、実際の認証情報を設定してください${NC}"
        echo
        echo "必要な情報:"
        echo "  - MICROSOFT_APP_ID"
        echo "  - MICROSOFT_APP_PASSWORD"
        echo "  - DEVREV_API_TOKEN"
        echo "  - DEVREV_DEFAULT_PART_ID"
        echo
        read -p ".envファイルを編集しましたか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}先に.envファイルを編集してから、再度このスクリプトを実行してください${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ .env.exampleが見つかりません${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .envファイルが見つかりました${NC}"
fi

# 2. Node.jsのバージョン確認
echo
echo "Node.jsバージョンを確認中..."
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [[ $NODE_VERSION == "not installed" ]]; then
    echo -e "${RED}❌ Node.jsがインストールされていません${NC}"
    echo "Node.js 18以上をインストールしてください"
    echo "https://nodejs.org/"
    exit 1
else
    echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
fi

# 3. 依存関係の確認
echo
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}依存関係をインストール中...${NC}"
    npm install
    echo -e "${GREEN}✓ 依存関係のインストール完了${NC}"
else
    echo -e "${GREEN}✓ 依存関係は既にインストールされています${NC}"
fi

# 4. ngrokの確認
echo
echo "ngrokを確認中..."
if command -v ngrok &> /dev/null; then
    NGROK_VERSION=$(ngrok version 2>&1 | head -n 1)
    echo -e "${GREEN}✓ ngrokがインストールされています: $NGROK_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  ngrokがインストールされていません${NC}"
    echo
    echo "ngrokをインストールするには:"
    echo "  npm install -g ngrok"
    echo "または"
    echo "  https://ngrok.com/download からダウンロード"
    echo
    read -p "ngrokなしで続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 5. logsディレクトリの作成
echo
if [ ! -d "logs" ]; then
    echo "logsディレクトリを作成中..."
    mkdir logs
    echo -e "${GREEN}✓ logsディレクトリを作成しました${NC}"
fi

# 6. DevRev接続テスト（オプション）
echo
read -p "DevRev API接続テストを実行しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo
    echo -e "${BLUE}DevRev API接続テストを実行中...${NC}"
    node test/test-devrev.js
    echo
fi

# 7. 起動方法の案内
echo
echo -e "${GREEN}セットアップ完了！${NC}"
echo "=================================="
echo
echo "開発を開始するには:"
echo
echo -e "${BLUE}ターミナル1:${NC} Botを起動"
echo "  npm run dev"
echo
echo -e "${BLUE}ターミナル2:${NC} ngrokトンネルを開始"
echo "  ngrok http 3978"
echo
echo -e "${BLUE}次に:${NC}"
echo "  1. ngrokのHTTPS URL (https://xxxx.ngrok-free.app) をコピー"
echo "  2. Azure Portal → Bot → 構成 → Messaging endpoint に設定:"
echo "     https://xxxx.ngrok-free.app/api/messages"
echo "  3. Teamsで @BotName 休暇申請 を送信してテスト"
echo
echo "詳細は LOCAL_DEVELOPMENT.md を参照してください"
echo

# オプション: 自動的に起動
read -p "今すぐBotを起動しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo
    echo -e "${GREEN}Botを起動します...${NC}"
    echo -e "${YELLOW}別のターミナルで 'ngrok http 3978' を実行することを忘れないでください${NC}"
    echo
    sleep 2
    npm run dev
fi
