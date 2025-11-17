/**
 * DevRev カスタムオブジェクト テストスクリプト
 *
 * 使用方法:
 *   node test/test-devrev-custom-object.js
 */

require('dotenv').config({ path: '.env' });
const axios = require('axios');

// カラー出力用
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

async function testCustomObject() {
    log(colors.blue, '\n=== DevRev カスタムオブジェクト テスト ===\n');

    // 環境変数チェック
    const apiToken = process.env.DEVREV_API_TOKEN;
    const apiBaseUrl = process.env.DEVREV_API_BASE_URL || 'https://api.devrev.ai';

    if (!apiToken) {
        log(colors.red, '❌ エラー: DEVREV_API_TOKEN が設定されていません');
        log(colors.yellow, '   .env ファイルを確認してください');
        process.exit(1);
    }

    log(colors.blue, '設定情報:');
    console.log('  API Base URL:', apiBaseUrl);
    console.log('  API Token:', apiToken ? `${apiToken.substring(0, 10)}...` : 'なし');
    console.log();

    // Step 1: カスタムオブジェクトの作成テスト
    log(colors.blue, '1. 休暇申請カスタムオブジェクトの作成...');

    try {
        const now = new Date();
        const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後
        const endDate = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000); // 9日後

        const customObjectData = {
            leaf_type: 'leave_request',
            custom_schema_spec: {
                tenant_fragment: true
            },
            custom_fields: {
                tnt__requester_name: 'テストユーザー',
                tnt__requester_email: 'test@example.com',
                tnt__requester_teams_id: '29:test-teams-id-12345',
                tnt__start_date: startDate.toISOString().split('T')[0],
                tnt__end_date: endDate.toISOString().split('T')[0],
                tnt__days_count: 3,
                tnt__reason: 'これはテスト目的の休暇申請です。削除しても構いません。',
                tnt__approver_name: '承認者テスト',
                tnt__approver_teams_id: '29:approver-teams-id-67890',
                tnt__status: 'pending',
                tnt__leave_type: 'paid', // 有給休暇
                tnt__additional_system: '' // AIが自動判別して追記（初期値は空）
            }
        };

        log(colors.blue, '   カスタムオブジェクトデータ:');
        console.log(JSON.stringify(customObjectData, null, 2));
        console.log();

        const response = await axios.post(
            `${apiBaseUrl}/custom-objects.create`,
            customObjectData,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        log(colors.green, '✅ カスタムオブジェクト作成成功！');
        const customObject = response.data.custom_object;
        console.log('   Object ID:', customObject?.id || 'N/A');
        console.log('   Display ID:', customObject?.display_id || 'N/A');
        console.log('   タイプ:', customObject?.type || 'N/A');
        console.log();

        if (customObject?.display_id) {
            log(colors.blue, '   DevRevで確認:');
            console.log(`   https://app.devrev.ai/custom/${customObject.display_id}`);
            console.log();
        }

        // Step 2: カスタムオブジェクトの取得テスト
        if (customObject?.id) {
            log(colors.blue, '2. カスタムオブジェクトの取得テスト...');

            const getResponse = await axios.get(
                `${apiBaseUrl}/custom-objects.get`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        id: customObject.id
                    }
                }
            );

            log(colors.green, '✅ カスタムオブジェクト取得成功！');
            console.log('   取得データ:');
            console.log(JSON.stringify(getResponse.data.custom_object, null, 2));
            console.log();
        }

    } catch (error) {
        log(colors.red, '❌ テスト失敗');
        if (error.response) {
            console.log('   ステータス:', error.response.status);
            console.log('   エラー:', JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 404) {
                log(colors.yellow, '\n対処方法:');
                console.log('  1. カスタムオブジェクトのスキーマが定義されていない可能性があります');
                console.log('  2. 以下のコマンドでスキーマを作成してください:');
                console.log('     bash scripts/setup-devrev-schema.sh');
                console.log('  3. または:');
                console.log('     bash scripts/devrev-schema-curl.sh');
            } else if (error.response.status === 400) {
                log(colors.yellow, '\n対処方法:');
                console.log('  1. リクエストデータの形式を確認');
                console.log('  2. 必須フィールドが揃っているか確認');
                console.log('  3. スキーマ定義と一致しているか確認');
            }
        } else {
            console.log('   エラー:', error.message);
        }
        console.log();
        process.exit(1);
    }

    // 完了
    log(colors.green, '\n=== すべてのテストが成功しました！ ===\n');
    log(colors.blue, '次のステップ:');
    console.log('  1. npm run dev でBotを起動');
    console.log('  2. Teamsで「休暇申請」コマンドを送信');
    console.log('  3. フォームを入力して送信');
    console.log('  4. DevRevでカスタムオブジェクトが作成されたことを確認');
    console.log();
}

// 実行
testCustomObject().catch(error => {
    log(colors.red, '\n予期しないエラーが発生しました:');
    console.error(error);
    process.exit(1);
});
