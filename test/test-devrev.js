/**
 * DevRev API テストスクリプト
 *
 * 使用方法:
 *   node test/test-devrev.js
 *
 * または VSCode デバッガーで実行:
 *   F5 → "Test DevRev API" を選択
 */

require('dotenv').config();
const axios = require('axios');

// カラー出力用
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

async function testDevRevConnection() {
    log(colors.blue, '\n=== DevRev API 接続テスト ===\n');

    // 環境変数チェック
    const apiToken = process.env.DEVREV_API_TOKEN;
    const apiBaseUrl = process.env.DEVREV_API_BASE_URL || 'https://api.devrev.ai';
    const partId = process.env.DEVREV_DEFAULT_PART_ID;

    if (!apiToken) {
        log(colors.red, '❌ エラー: DEVREV_API_TOKEN が設定されていません');
        log(colors.yellow, '   .env ファイルを確認してください');
        process.exit(1);
    }

    if (!partId) {
        log(colors.yellow, '⚠️  警告: DEVREV_DEFAULT_PART_ID が設定されていません');
    }

    log(colors.blue, '設定情報:');
    console.log('  API Base URL:', apiBaseUrl);
    console.log('  API Token:', apiToken ? `${apiToken.substring(0, 10)}...` : 'なし');
    console.log('  Part ID:', partId || '未設定');
    console.log();

    // Step 1: 自分のユーザー情報を取得
    log(colors.blue, '1. ユーザー情報取得テスト...');
    try {
        const userResponse = await axios.get(
            `${apiBaseUrl}/internal/dev-users.self`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        log(colors.green, '✅ 接続成功！');
        console.log('   ユーザー名:', userResponse.data.dev_user?.display_name || 'N/A');
        console.log('   ユーザーID:', userResponse.data.dev_user?.id || 'N/A');
        console.log();
    } catch (error) {
        log(colors.red, '❌ 接続失敗');
        if (error.response) {
            console.log('   ステータス:', error.response.status);
            console.log('   エラー:', error.response.data);
        } else {
            console.log('   エラー:', error.message);
        }
        console.log();
        log(colors.yellow, '対処方法:');
        console.log('  1. DevRev APIトークンが正しいか確認');
        console.log('  2. トークンの有効期限を確認');
        console.log('  3. DevRevダッシュボードで新しいトークンを生成');
        process.exit(1);
    }

    // Step 2: テストチケットの作成
    log(colors.blue, '2. テストチケット作成...');

    if (!partId) {
        log(colors.yellow, '⚠️  Part IDが未設定のためスキップします');
        log(colors.yellow, '   Part IDを設定するには:');
        console.log('   1. DevRevダッシュボードにログイン');
        console.log('   2. Settings → Parts でPart IDを確認');
        console.log('   3. .env ファイルの DEVREV_DEFAULT_PART_ID に設定');
        console.log();
        return;
    }

    try {
        const now = new Date();
        const ticketData = {
            type: 'ticket',
            title: `[TEST] ローカルテスト - ${now.toISOString()}`,
            body: `# テストチケット\n\nこれはローカル開発環境からのテストです。\n\n- 作成日時: ${now.toLocaleString('ja-JP')}\n- テスト種別: DevRev API接続確認\n\n**このチケットは削除しても構いません。**`,
            applies_to_part: partId,
            tags: [
                { name: 'test' },
                { name: 'local-development' }
            ]
        };

        log(colors.blue, '   チケットデータ:');
        console.log(JSON.stringify(ticketData, null, 2));
        console.log();

        const response = await axios.post(
            `${apiBaseUrl}/internal/tickets.create`,
            ticketData,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        log(colors.green, '✅ チケット作成成功！');
        console.log('   チケットID:', response.data.ticket?.id || 'N/A');
        console.log('   タイトル:', response.data.ticket?.title || 'N/A');
        console.log();

        if (response.data.ticket?.id) {
            log(colors.blue, '   DevRevで確認:');
            console.log(`   https://app.devrev.ai/tickets/${response.data.ticket.id}`);
            console.log();
        }

    } catch (error) {
        log(colors.red, '❌ チケット作成失敗');
        if (error.response) {
            console.log('   ステータス:', error.response.status);
            console.log('   エラー:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('   エラー:', error.message);
        }
        console.log();

        log(colors.yellow, '対処方法:');
        console.log('  1. Part IDが正しいか確認');
        console.log('  2. APIトークンに Tickets:Create 権限があるか確認');
        console.log('  3. DevRevダッシュボードでトークンの権限を確認');
        process.exit(1);
    }

    // 完了
    log(colors.green, '\n=== すべてのテストが成功しました！ ===\n');
    log(colors.blue, '次のステップ:');
    console.log('  1. npm run dev でBotを起動');
    console.log('  2. 別ターミナルで ngrok http 3978 を実行');
    console.log('  3. Teamsでコマンド送信してテスト');
    console.log();
}

// 実行
testDevRevConnection().catch(error => {
    log(colors.red, '\n予期しないエラーが発生しました:');
    console.error(error);
    process.exit(1);
});
