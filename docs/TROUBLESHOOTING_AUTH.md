# 認証エラーのトラブルシューティング

## エラー: "invalid_client_credential"

### エラーメッセージの例

```
ClientAuthError: invalid_client_credential: Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential
```

---

## 原因と解決方法

### 1. Client Secret（パスワード）の形式問題

#### 原因
Client Secret に**不正な文字**や**改行**が含まれている可能性があります。

#### 確認方法
```bash
# .envファイルの内容を確認（改行や空白をチェック）
cat -A .env | grep MICROSOFT_APP_PASSWORD
```

出力例で確認すべきポイント:
```bash
MICROSOFT_APP_PASSWORD=Ks68Q~uA2p....$   # $ は改行を示す（正常）
MICROSOFT_APP_PASSWORD=Ks68Q~uA2p.... $  # 末尾に空白（問題）
MICROSOFT_APP_PASSWORD=Ks68Q~uA2p....^M$ # ^M は改行コード（問題）
```

#### 解決方法
`.env` ファイルを編集して、余計な空白や改行を削除:

```bash
# 正しい形式
MICROSOFT_APP_ID=2d16b493-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_APP_PASSWORD=Ks68Q~uA2pXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**重要**:
- 値の前後に**空白を入れない**
- 値を**引用符で囲まない**（`"` や `'` は不要）
- 行末に**改行コードを入れない**

---

### 2. Client Secretが期限切れ

#### 原因
Azure Portal で作成したClient Secretには有効期限があります。

#### 確認方法
1. [Azure Portal](https://portal.azure.com) にアクセス
2. **Microsoft Entra ID** → **アプリの登録** → あなたのアプリ
3. **証明書とシークレット** をクリック
4. Client Secretの**有効期限**を確認

#### 解決方法
**新しいClient Secretを作成:**

1. 「証明書とシークレット」ページで「新しいクライアント シークレット」
2. 説明: `bot-secret-2025`
3. 有効期限: **24か月**（推奨）
4. 「追加」をクリック
5. **値**をコピー（⚠️ 一度しか表示されません）
6. `.env` ファイルの `MICROSOFT_APP_PASSWORD` を更新
7. Botを再起動

```bash
# .env を更新後
. "$HOME/.nvm/nvm.sh" && nvm use 22
npm run dev
```

---

### 3. App IDとSecretの組み合わせが間違っている

#### 原因
- 別のアプリのSecretを使用している
- App IDとSecretが対応していない

#### 確認方法
Azure Portalで対応を確認:

```
App Registration名: teams-leave-bot
├── アプリケーション (クライアント) ID: 2d16b493-xxxx...
└── 証明書とシークレット
    └── bot-secret: Ks68Q~uA2p... ← これが対応するSecret
```

#### 解決方法
1. Azure Portalで正しいApp Registrationを開く
2. 「概要」ページで**アプリケーション (クライアント) ID**をコピー
3. 「証明書とシークレット」で対応するSecretを確認
4. `.env` を更新

---

### 4. MSALライブラリの問題（稀）

#### 原因
Bot Framework SDKとMicrosoft Authentication Library (MSAL) のバージョン不整合。

#### 解決方法
依存関係を再インストール:

```bash
# node_modulesを削除
rm -rf node_modules package-lock.json

# Node.js v22を使用
. "$HOME/.nvm/nvm.sh" && nvm use 22

# 再インストール
npm install

# Botを起動
npm run dev
```

---

### 5. 環境変数が読み込まれていない

#### 原因
`.env` ファイルが正しい場所にない、または読み込まれていない。

#### 確認方法
```bash
# 環境変数が読み込まれているか確認
node test/check-env.js
```

期待される出力:
```
MICROSOFT_APP_ID length: 36
MICROSOFT_APP_PASSWORD length: 40
APP_ID empty? false
PASSWORD empty? false
```

もし `length: 0` や `empty? true` の場合、`.env` ファイルに問題があります。

#### 解決方法
```bash
# .envファイルの場所を確認
ls -la .env

# 権限を確認
chmod 600 .env

# 内容を確認（セキュアに）
cat .env | grep MICROSOFT | sed 's/=.*/=<hidden>/'
```

---

### 6. 特殊文字のエスケープ問題

#### 原因
Client Secretに特殊文字（`~`, `!`, `@`, `#`, `$` など）が含まれており、シェルやNode.jsで誤解釈されている。

#### 確認方法
Client Secretに特殊文字が含まれているか確認:

```bash
# Secretの内容を確認
grep MICROSOFT_APP_PASSWORD .env
```

例: `Ks68Q~uA2p!@#$%...` のような場合

#### 解決方法（通常は不要）
`.env` ファイルでは**引用符なし**で問題ありません。dotenvライブラリが正しく処理します。

```env
# 正しい（引用符なし）
MICROSOFT_APP_PASSWORD=Ks68Q~uA2p!@#$%^&*()_+-=

# 間違い（引用符を含めない）
MICROSOFT_APP_PASSWORD="Ks68Q~uA2p!@#$%^&*()_+-="
MICROSOFT_APP_PASSWORD='Ks68Q~uA2p!@#$%^&*()_+-='
```

---

## デバッグ手順

### ステップ1: 環境変数を確認

```bash
node test/check-env.js
```

### ステップ2: JWT トークン取得をテスト

```bash
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
Status: 400
Error: "error": "invalid_client"
```

### ステップ3: Bot Framework Adapterの初期化を確認

Botが起動時にエラーを出す場合、`src/index.js` の `BotFrameworkAdapter` 初期化に問題があります。

一時的にログ出力を追加:

```javascript
// src/index.js
console.log('Initializing adapter with:');
console.log('  App ID length:', process.env.MICROSOFT_APP_ID?.length);
console.log('  Password length:', process.env.MICROSOFT_APP_PASSWORD?.length);

const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

console.log('Adapter initialized successfully');
```

---

## よくある間違い

### ❌ 間違い 1: 引用符を使用
```env
MICROSOFT_APP_PASSWORD="Ks68Q~uA2p..."  # ダメ
```

### ✅ 正しい:
```env
MICROSOFT_APP_PASSWORD=Ks68Q~uA2p...     # OK
```

---

### ❌ 間違い 2: 末尾に空白
```env
MICROSOFT_APP_PASSWORD=Ks68Q~uA2p...
                                    ↑ 余計な空白
```

### ✅ 正しい:
```env
MICROSOFT_APP_PASSWORD=Ks68Q~uA2p...
```

---

### ❌ 間違い 3: 改行コードの混在
Windowsで編集した`.env`ファイルをLinuxで使用する場合、CRLF改行コードが問題になることがあります。

### ✅ 正しい:
```bash
# 改行コードをLFに変換
dos2unix .env

# または
sed -i 's/\r$//' .env
```

---

## 最終的な確認リスト

- [ ] `.env` ファイルが正しい場所にある
- [ ] `MICROSOFT_APP_ID` が36文字（UUID形式）
- [ ] `MICROSOFT_APP_PASSWORD` が約40文字
- [ ] 値の前後に空白がない
- [ ] 引用符で囲んでいない
- [ ] Client Secretが期限切れでない
- [ ] App IDとSecretが対応している
- [ ] `npm run test:jwt` が成功する

---

## それでも解決しない場合

### デバッグモードで詳細を確認

```bash
# 詳細なエラーログを表示
NODE_ENV=development DEBUG=* npm run dev
```

### 一時的に認証を無効化してテスト

**⚠️ 開発環境でのみ使用**

```env
# .env
MICROSOFT_APP_ID=
MICROSOFT_APP_PASSWORD=
```

空にすると、Bot Frameworkは認証をスキップします。この状態でBotが起動すれば、問題は認証情報にあることが確定します。

---

## 参考リンク

- [Azure AD Authentication Errors](https://docs.microsoft.com/azure/active-directory/develop/reference-error-codes)
- [Bot Framework Authentication](https://docs.microsoft.com/azure/bot-service/bot-builder-authentication)
- [MSAL.js Error Handling](https://docs.microsoft.com/azure/active-directory/develop/msal-error-handling-js)

---

**最終更新**: 2025-01-11
