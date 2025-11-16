/**
 * JWT トークン取得スクリプト
 *
 * Microsoft Identity Platform から Bot Framework用のJWTトークンを取得します。
 * 取得したトークンはcurlコマンドのテストに使用できます。
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 色付きコンソール出力
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function getBotToken() {
    console.log(`${colors.cyan}=== Bot Framework JWT トークン取得 ===${colors.reset}\n`);

    // 環境変数チェック
    const appId = process.env.MICROSOFT_APP_ID;
    const appPassword = process.env.MICROSOFT_APP_PASSWORD;

    if (!appId || !appPassword) {
        console.log(`${colors.yellow}⚠️  App IDまたはPasswordが設定されていません${colors.reset}`);
        console.log('開発モード（認証なし）でテストする場合は、これらを空のままにできます。\n');
        console.log('認証ありでテストする場合は、.env ファイルに以下を設定してください:');
        console.log('  MICROSOFT_APP_ID=your-app-id');
        console.log('  MICROSOFT_APP_PASSWORD=your-app-password\n');
        return null;
    }

    console.log(`${colors.blue}App ID:${colors.reset} ${appId}`);
    console.log(`${colors.blue}Password:${colors.reset} ${appPassword.substring(0, 10)}...\n`);

    // Microsoft Identity Platform のトークンエンドポイント
    const tokenEndpoint = 'https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token';

    // リクエストパラメータ
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', appId);
    params.append('client_secret', appPassword);
    params.append('scope', 'https://api.botframework.com/.default');

    try {
        console.log(`${colors.cyan}トークンを取得中...${colors.reset}`);

        const response = await axios.post(tokenEndpoint, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { token_type, expires_in, access_token } = response.data;

        console.log(`${colors.green}✅ トークン取得成功${colors.reset}\n`);

        console.log(`${colors.blue}Token Type:${colors.reset} ${token_type}`);
        console.log(`${colors.blue}Expires In:${colors.reset} ${expires_in} 秒 (${Math.floor(expires_in / 60)} 分)\n`);

        console.log(`${colors.blue}Access Token:${colors.reset}`);
        console.log(`${colors.cyan}${access_token}${colors.reset}\n`);

        // トークンの一部を表示
        console.log(`${colors.yellow}トークンプレビュー:${colors.reset}`);
        console.log(`${access_token.substring(0, 100)}...${colors.reset}\n`);

        // curlコマンド例を生成
        console.log(`${colors.green}=== 使用例 ===${colors.reset}\n`);

        console.log(`${colors.yellow}1. 休暇申請メッセージを送信:${colors.reset}`);
        console.log(`curl -X POST http://localhost:3978/api/messages \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${access_token.substring(0, 50)}..." \\
  -d '{
    "type": "message",
    "text": "休暇申請",
    "from": { "id": "29:test-user", "name": "テストユーザー" },
    "conversation": { "id": "a:test-conv" },
    "recipient": { "id": "28:bot-id" },
    "channelId": "msteams",
    "serviceUrl": "https://smba.trafficmanager.net/apis/"
  }'
\n`);

        console.log(`${colors.yellow}2. 環境変数として保存:${colors.reset}`);
        console.log(`export BOT_TOKEN="${access_token.substring(0, 50)}..."`);
        console.log(`curl -H "Authorization: Bearer $BOT_TOKEN" ...\n`);

        // トークンをファイルに保存
        const fs = require('fs');
        const tokenFile = path.join(__dirname, '.jwt-token');
        fs.writeFileSync(tokenFile, access_token, 'utf8');
        console.log(`${colors.green}✅ トークンを保存しました: ${tokenFile}${colors.reset}`);
        console.log(`${colors.yellow}   使用例: TOKEN=$(cat test/.jwt-token)${colors.reset}\n`);

        // JWT デコード情報
        console.log(`${colors.cyan}=== JWT トークン情報 ===${colors.reset}`);
        console.log(`トークンをデコードするには: https://jwt.io/`);
        console.log(`または: echo "${access_token}" | cut -d'.' -f2 | base64 -d\n`);

        return access_token;

    } catch (error) {
        console.error(`${colors.red}❌ トークン取得エラー${colors.reset}\n`);

        if (error.response) {
            console.error(`${colors.red}Status:${colors.reset} ${error.response.status}`);
            console.error(`${colors.red}Error:${colors.reset}`, JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 400) {
                console.log(`\n${colors.yellow}考えられる原因:${colors.reset}`);
                console.log('  - App ID または Password が間違っている');
                console.log('  - App Registration が正しく設定されていない');
                console.log('  - Client Secret が期限切れ\n');
            } else if (error.response.status === 401) {
                console.log(`\n${colors.yellow}考えられる原因:${colors.reset}`);
                console.log('  - Client Secret が無効');
                console.log('  - App ID が存在しない\n');
            }
        } else {
            console.error(`${colors.red}Error:${colors.reset}`, error.message);
        }

        throw error;
    }
}

// メイン実行
if (require.main === module) {
    getBotToken()
        .then(token => {
            if (token) {
                console.log(`${colors.green}トークン取得完了${colors.reset}\n`);
                process.exit(0);
            } else {
                console.log(`${colors.yellow}認証なしモードで実行してください${colors.reset}\n`);
                process.exit(0);
            }
        })
        .catch(error => {
            console.error(`${colors.red}エラーが発生しました${colors.reset}`);
            process.exit(1);
        });
}

module.exports = { getBotToken };
