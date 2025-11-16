# JWT トークンの取得方法

Teams BotのJWTトークンは、Microsoft Bot Frameworkの認証システムによって自動生成されます。

## 概要

```
Teams → Bot Framework Service → あなたのBot
         (JWTトークン生成)
```

実際のTeamsからのリクエストには、`Authorization: Bearer <JWT>` ヘッダーが自動的に付与されます。

---

## 方法1: Bot Framework Emulator（推奨）

### インストール

```bash
# Bot Framework Emulatorをダウンロード
# https://github.com/Microsoft/BotFramework-Emulator/releases

# Linuxの場合
wget https://github.com/Microsoft/BotFramework-Emulator/releases/download/v4.14.1/botframework-emulator_4.14.1_amd64.deb
sudo dpkg -i botframework-emulator_4.14.1_amd64.deb
```

### 使い方

1. **Bot Framework Emulatorを起動**

2. **新しいBot設定を作成:**
   ```
   Endpoint URL: http://localhost:3978/api/messages
   Microsoft App ID: (あなたの MICROSOFT_APP_ID)
   Microsoft App Password: (あなたの MICROSOFT_APP_PASSWORD)
   ```

3. **「Connect」をクリック**
   - Emulatorが自動的にJWTトークンを生成・付与します

4. **メッセージを送信:**
   ```
   休暇申請
   ```

5. **トークンを確認:**
   - Emulatorの「Inspector」パネルでリクエスト詳細を確認
   - `Authorization` ヘッダーにJWTトークンが表示されます

---

## 方法2: Azure AD OAuth 2.0でトークンを手動取得

テスト目的でJWTトークンを手動取得する方法。

### ステップ1: アクセストークンを取得

```bash
# Microsoft Identity Platform からトークンを取得
curl -X POST https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_MICROSOFT_APP_ID" \
  -d "client_secret=YOUR_MICROSOFT_APP_PASSWORD" \
  -d "scope=https://api.botframework.com/.default"
```

**レスポンス例:**
```json
{
  "token_type": "Bearer",
  "expires_in": 3599,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6..."
}
```

### ステップ2: トークンを使ってリクエスト

```bash
# 取得したトークンを使用
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6..."

curl -X POST http://localhost:3978/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "message",
    "id": "test-001",
    "timestamp": "2025-01-11T00:00:00.000Z",
    "serviceUrl": "https://smba.trafficmanager.net/apis/",
    "channelId": "msteams",
    "from": {
      "id": "29:test-user-id",
      "name": "テストユーザー"
    },
    "conversation": {
      "id": "a:test-conversation-id"
    },
    "recipient": {
      "id": "28:test-bot-id",
      "name": "休暇申請Bot"
    },
    "text": "休暇申請"
  }'
```

---

## 方法3: Node.jsスクリプトでトークンを取得

自動化されたテスト用スクリプト:

```javascript
// test/get-jwt-token.js
const axios = require('axios');
require('dotenv').config();

async function getBotToken() {
    const tokenEndpoint = 'https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token';

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.MICROSOFT_APP_ID);
    params.append('client_secret', process.env.MICROSOFT_APP_PASSWORD);
    params.append('scope', 'https://api.botframework.com/.default');

    try {
        const response = await axios.post(tokenEndpoint, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ トークン取得成功');
        console.log('Token Type:', response.data.token_type);
        console.log('Expires In:', response.data.expires_in, 'seconds');
        console.log('\nAccess Token:');
        console.log(response.data.access_token);
        console.log('\n使用例:');
        console.log(`Authorization: Bearer ${response.data.access_token.substring(0, 50)}...`);

        return response.data.access_token;
    } catch (error) {
        console.error('❌ トークン取得エラー:', error.response?.data || error.message);
        throw error;
    }
}

// 実行
getBotToken();
```

**実行方法:**
```bash
node test/get-jwt-token.js
```

---

## 方法4: 実際のTeamsからトークンを取得（高度）

実際のTeamsメッセージから送られてくるトークンをログ出力:

### src/index.js を一時的に修正:

```javascript
// リクエストログ用ミドルウェアを追加
server.use((req, res, next) => {
    if (req.url === '/api/messages') {
        console.log('\n=== Incoming Request ===');
        console.log('Authorization:', req.headers.authorization);
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('========================\n');
    }
    next();
});
```

これでTeamsからメッセージを送ると、実際のJWTトークンがコンソールに出力されます。

---

## JWTトークンの構造

Bot FrameworkのJWTトークンには以下の情報が含まれます:

```json
{
  "header": {
    "typ": "JWT",
    "alg": "RS256",
    "x5t": "..."
  },
  "payload": {
    "aud": "YOUR_APP_ID",
    "iss": "https://api.botframework.com",
    "serviceurl": "https://smba.trafficmanager.net/apis/",
    "nbf": 1641910800,
    "exp": 1641914400
  }
}
```

デコード: https://jwt.io/

---

## セキュリティ注意事項

⚠️ **重要:**

1. **トークンは秘密情報**: Gitにコミットしない
2. **有効期限**: 通常1時間で期限切れ
3. **本番環境**: Bot Frameworkの自動検証に任せる
4. **テスト目的のみ**: 手動取得はローカルテスト用

---

## トークン検証の無効化（開発用のみ）

**⚠️ 本番環境では絶対に使用しないでください**

ローカルテスト用にトークン検証を一時的に無効化:

```javascript
// src/index.js
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// 開発環境でのみ認証をスキップ
if (process.env.NODE_ENV === 'development-no-auth') {
    adapter.onTurnError = async (context, error) => {
        console.error('Error:', error);
    };
    // 認証エラーを無視
    adapter.use(async (context, next) => {
        await next();
    });
}
```

`.env` で設定:
```env
NODE_ENV=development-no-auth
MICROSOFT_APP_ID=
MICROSOFT_APP_PASSWORD=
```

App IDとPasswordを空にすると、認証なしでテスト可能。

---

## 推奨テスト方法まとめ

### 開発初期（認証なし）
```bash
# App ID/Passwordを空に設定
MICROSOFT_APP_ID=
MICROSOFT_APP_PASSWORD=

# curlで直接テスト
curl -X POST http://localhost:3978/api/messages -H "Content-Type: application/json" -d '...'
```

### 認証テスト
```bash
# Bot Framework Emulator使用（推奨）
# または get-jwt-token.js でトークン取得
```

### 統合テスト
```bash
# 実際のTeamsアプリとして登録
# ngrok または SSH tunnel で公開
```

---

## 参考リンク

- [Bot Framework Authentication](https://docs.microsoft.com/azure/bot-service/bot-builder-authentication)
- [Microsoft Identity Platform](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
- [JWT.io - Token Decoder](https://jwt.io/)
- [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator)

---

**最終更新**: 2025-01-11
