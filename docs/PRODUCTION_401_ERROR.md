# 本番環境での 401 Authorization エラー

## エラーの症状

```
[onTurnError] unhandled error: RestError: Authorization has been denied for this request.
RestError: Authorization has been denied for this request.
{
  "statusCode": 401,
  "request": {
    "url": "https://smba.trafficmanager.net/apac/.../activities/...",
    "method": "POST"
  }
}
```

---

## 問題の解析

### エラーが起きているタイミング

```
Teams → Bot Framework → あなたのBot (✅ 受信成功)
                                    ↓
                                処理実行 (✅ 成功)
                                    ↓
                                返信を送信 (❌ 401エラー)
                                    ↓
                        Bot Framework Service (認証失敗)
```

**重要**: Botはメッセージを受信できているが、**返信時の認証が失敗**している。

---

## 原因

### 1. App IDとApp Passwordの不一致（最も一般的）

本番環境の`.env`ファイルに設定されている`MICROSOFT_APP_ID`と`MICROSOFT_APP_PASSWORD`が、実際にTeams Appマニフェストで使用しているApp IDと一致していない。

#### 確認すべき3箇所

```
1. Azure Portal - App Registration
   └── アプリケーション (クライアント) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

2. 本番サーバーの .env ファイル
   └── MICROSOFT_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   └── MICROSOFT_APP_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

3. Teams App マニフェスト (manifest.json)
   └── "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   └── "bots": [{ "botId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }]
```

**これら3箇所すべてが同じApp IDである必要があります。**

---

### 2. Client Secretが期限切れ

Azure PortalでClient Secret（App Password）を作成した際、有効期限が設定されています。

#### 確認方法

1. [Azure Portal](https://portal.azure.com) にアクセス
2. **Microsoft Entra ID** → **アプリの登録** → あなたのアプリ
3. **証明書とシークレット** をクリック
4. Client Secretの「**有効期限**」列を確認

**期限切れの場合:**
- 「有効期限」列に「期限切れ」と表示される
- または有効期限が過去の日付

---

### 3. 間違ったApp Registrationを使用

開発用と本番用で異なるApp Registrationを作成した場合、間違った方の認証情報を使用している可能性があります。

---

## 解決手順

### ステップ1: Azure Portalで正しいApp IDを確認

1. [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **アプリの登録**
2. Teamsで使用しているBot用のApp Registrationを開く
3. **概要**ページで「**アプリケーション (クライアント) ID**」をコピー

例:
```
アプリケーション (クライアント) ID: 2d16b493-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### ステップ2: 本番サーバーの.envファイルを確認

本番サーバーにSSHでログイン:

```bash
ssh your-server

# プロジェクトディレクトリに移動
cd /path/to/devrev-leav-app

# .envファイルのApp IDを確認
grep MICROSOFT_APP_ID .env
```

**出力例:**
```
MICROSOFT_APP_ID=2d16b493-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**確認**: Azure PortalのApp IDと完全一致しているか？

### ステップ3: Teams Appマニフェストを確認

```bash
# マニフェストのBot IDを確認
cat teams-manifest/manifest.json | grep -A 5 '"bots"'
```

**出力例:**
```json
"bots": [
  {
    "botId": "2d16b493-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "scopes": ["personal", "team", "groupchat"]
  }
]
```

**確認**: `botId`がAzure PortalのApp IDと一致しているか？

### ステップ4: Client Secretを確認・更新

#### 4.1 現在のSecretの有効期限を確認

Azure Portal → App Registration → **証明書とシークレット**

#### 4.2 期限切れの場合、新しいSecretを作成

1. 「**新しいクライアント シークレット**」をクリック
2. 説明: `production-secret-2025`
3. 有効期限: **24か月**
4. 「**追加**」をクリック
5. **値**列に表示されるSecretを**すぐにコピー**（⚠️ 一度しか表示されません）

例:
```
値: Ks68Q~uA2pXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### 4.3 本番サーバーの.envを更新

```bash
# 本番サーバーで
cd /path/to/devrev-leav-app
nano .env
```

以下を更新:
```env
MICROSOFT_APP_PASSWORD=Ks68Q~uA2pXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**重要:**
- 引用符なし
- 前後に空白なし
- 正確にコピー

保存して終了 (`Ctrl+O`, `Enter`, `Ctrl+X`)

### ステップ5: PM2でBotを再起動

```bash
# PM2でアプリケーションを再起動
pm2 restart teams-leave-bot

# ログを確認
pm2 logs teams-leave-bot --lines 50
```

**期待される出力:**
```
restify listening to http://[::]:3978
Bot is ready to receive messages
```

エラーログが出ない場合は成功です。

---

## 詳細なトラブルシューティング

### 本番環境で認証情報をテスト

本番サーバーで直接JWTトークン取得をテスト:

```bash
# 本番サーバーにSSH
ssh your-server
cd /path/to/devrev-leav-app

# Node.jsバージョンを確認
node --version  # v20以上推奨

# JWTトークン取得テスト
npm run test:jwt
```

**成功する場合:**
```
✅ トークン取得成功
Token Type: Bearer
Expires In: 3599 seconds
```

**失敗する場合:**
```
❌ トークン取得エラー
Status: 400 or 401
```

失敗する場合は、App IDまたはPasswordが間違っています。

---

## よくある間違い

### ❌ 間違い1: 開発用と本番用のApp IDを混同

```
開発環境: App Registration A (2d16b493-xxxx...)
本番環境: App Registration B (5f8a9c12-xxxx...)
          ↓
       .envはApp A の認証情報を使用（間違い）
```

**解決**: 本番用App RegistrationのIDとPasswordを使用する。

---

### ❌ 間違い2: Azure BotとApp Registrationの不一致

Azure Botリソースで設定したApp IDと、実際のApp Registrationが異なる。

**確認方法:**

1. Azure Portal → **Azure Bot** リソース → **構成**
2. 「Microsoft App ID」欄を確認
3. この値が実際に使用しているApp Registrationと一致しているか確認

---

### ❌ 間違い3: 古いSecretを使い続けている

以前作成したSecretは期限切れだが、新しいSecretを`.env`に反映していない。

**解決**: 上記「ステップ4」で新しいSecretを作成し、`.env`を更新。

---

## 認証の仕組み（参考）

```
1. Teamsからメッセージ受信
   ├── Bot Framework が JWT トークンを検証
   └── あなたのBot に転送（✅ ここは成功している）

2. Botでメッセージ処理
   └── 返信メッセージを作成（✅ 成功）

3. Bot Framework Service に返信を送信
   ├── Bot が自分のApp ID/Password で認証トークンを取得
   ├── トークンを Authorization ヘッダーに付与
   └── Bot Framework Service に POST
       ↓
   ❌ ここで 401 エラー（認証情報が間違っている）
```

**重要**: 返信時には**あなたのBotが能動的に認証**する必要があります。この時に使用されるのが`.env`の`MICROSOFT_APP_ID`と`MICROSOFT_APP_PASSWORD`です。

---

## セキュリティチェックリスト

認証情報を更新した後、以下を確認:

- [ ] `.env`ファイルの権限が適切（`chmod 600 .env`）
- [ ] `.env`がGitリポジトリにコミットされていない
- [ ] Client Secretの有効期限をカレンダーに記録（24ヶ月後）
- [ ] 古いSecretは削除（Azure Portal で）
- [ ] PM2が正常に起動している（`pm2 status`）
- [ ] Nginxのログにエラーがない（`tail -f /var/log/nginx/error.log`）

---

## 予防策

### 1. Client Secret の有効期限を監視

カレンダーアプリに期限の1ヶ月前にリマインダーを設定:

```
2027-01-01: Client Secret 更新が必要（1ヶ月後に期限切れ）
```

### 2. ヘルスチェックの自動化

Cron jobで定期的にBot の健全性をチェック:

```bash
# /etc/cron.d/bot-health-check
*/15 * * * * curl -f http://localhost:3978/health || systemctl restart pm2-your-user
```

### 3. アラート設定

PM2と連携してエラーログを監視:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
```

---

## 確認コマンド集

```bash
# 本番サーバーで実行

# 1. .envの認証情報を確認（セキュア）
grep MICROSOFT_APP .env | sed 's/=.*/=<hidden>/'

# 2. PM2のステータス確認
pm2 status

# 3. 最新のエラーログを確認
pm2 logs teams-leave-bot --err --lines 100

# 4. Botのヘルスチェック
curl http://localhost:3978/health

# 5. JWTトークン取得テスト
npm run test:jwt

# 6. Node.jsバージョン確認
node --version
```

---

## 次のステップ

1. ✅ Azure PortalでApp IDを確認
2. ✅ 本番サーバーの`.env`を確認・修正
3. ✅ Client Secretを更新（期限切れの場合）
4. ✅ PM2でBotを再起動
5. ✅ Teamsから「休暇申請」を送信してテスト
6. ✅ PM2ログでエラーがないことを確認

---

## 参考リンク

- [Bot Framework Authentication](https://docs.microsoft.com/azure/bot-service/bot-builder-authentication)
- [Troubleshoot HTTP 401 Unauthorized errors](https://docs.microsoft.com/azure/bot-service/bot-service-troubleshoot-authentication-problems)
- [Azure AD Service to Service Calls](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)

---

**最終更新**: 2025-01-11
