# SingleTenant 構成ガイド

## 概要

SingleTenant構成は、**特定の1つの組織（テナント）内でのみ**Botを使用する場合に適しています。

---

## SingleTenant vs MultiTenant

| 項目 | SingleTenant | MultiTenant |
|------|--------------|-------------|
| 使用可能な組織 | 1つのみ | 複数可能 |
| セキュリティ | 高い（組織内限定） | 中（組織間共有） |
| セットアップ | 簡単 | やや複雑 |
| テナントID | **必須** | オプション |
| 用途 | 社内専用Bot | 複数組織で使用するBot |

---

## SingleTenant構成の手順

### ステップ1: Tenant IDを取得

1. [Azure Portal](https://portal.azure.com) にアクセス
2. **Microsoft Entra ID** をクリック
3. **概要** ページで **テナントID**（またはディレクトリID）をコピー

**例:**
```
テナントID: d6d49420-f39b-4df7-a1dc-d59a935871db
```

---

### ステップ2: App Registration を SingleTenant として作成

1. Azure Portal → **Microsoft Entra ID** → **アプリの登録** → **新規登録**

2. 以下を入力:
   ```
   名前: teams-leave-bot
   サポートされているアカウントの種類:
     ☑ この組織ディレクトリのみに含まれるアカウント (シングルテナント)
   リダイレクトURI: (空白)
   ```

3. **登録** をクリック

4. **概要** ページで以下をコピー:
   - **アプリケーション (クライアント) ID**
   - **ディレクトリ (テナント) ID**

---

### ステップ3: Client Secret を作成

1. **証明書とシークレット** → **新しいクライアント シークレット**
2. 説明: `bot-secret-singletenant`
3. 有効期限: **24か月**
4. **追加** → **値** をコピー（⚠️ 一度しか表示されません）

---

### ステップ4: .env ファイルを設定

```env
# Microsoft Bot Framework
MICROSOFT_APP_ID=2d16b493-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_APP_PASSWORD=Ks68Q~uA2pXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# SingleTenant Configuration
MICROSOFT_APP_TYPE=SingleTenant
MICROSOFT_APP_TENANT_ID=d6d49420-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**重要:**
- `MICROSOFT_APP_TYPE` を `SingleTenant` に設定
- `MICROSOFT_APP_TENANT_ID` を必ず設定（これがないとSingleTenantとして動作しません）

---

### ステップ5: Azure Bot を作成

1. Azure Portal → **リソースの作成** → **Azure Bot**

2. 以下を入力:
   ```
   Bot handle: teams-leave-bot
   サブスクリプション: (使用するサブスクリプション)
   リソースグループ: (新規作成または既存)
   場所: Japan East
   価格レベル: F0 (無料)
   Microsoft App ID:
     ☑ 既存のアプリ登録を使用する
     App ID: (ステップ2でコピーしたアプリケーションID)
     App Tenant ID: (ステップ1でコピーしたテナントID)
   ```

3. **確認および作成** → **作成**

---

### ステップ6: Messaging Endpoint を設定

1. Azure Bot リソース → **構成**
2. **Messaging endpoint** に以下を入力:
   ```
   https://your-domain.com/api/messages
   ```
3. **適用** をクリック

---

### ステップ7: Teams Channel を有効化

1. Azure Bot リソース → **チャネル**
2. **Microsoft Teams** アイコンをクリック
3. 利用規約に同意 → **適用**

---

### ステップ8: Bot を起動

#### ローカル開発環境:

```bash
# .envを確認
cat .env

# 環境変数をチェック
node test/check-env.js

# Botを起動
npm run dev
```

**期待される出力:**
```
✓ SingleTenant configuration is valid (TenantId set)
```

#### 本番環境:

```bash
# 本番サーバーで
cd /path/to/devrev-leav-app

# .envを設定
nano .env

# PM2で起動
pm2 restart teams-leave-bot
pm2 logs teams-leave-bot
```

---

## 設定の確認

### 環境変数チェック

```bash
node test/check-env.js
```

**正常な出力:**
```
=== Environment Variables Check ===

MICROSOFT_APP_ID length: 36
MICROSOFT_APP_PASSWORD length: 40
MICROSOFT_APP_TYPE: SingleTenant
MICROSOFT_APP_TENANT_ID: d6d49420-xxxx-xxxx-xxxx-xxxxxxxxxxxx

=== Configuration Validation ===

✓ SingleTenant configuration is valid (TenantId set)
```

---

## よくある質問

### Q1: SingleTenantとMultiTenantの違いは何ですか？

**A:**
- **SingleTenant**: 1つの組織（Azure ADテナント）内でのみ使用可能
- **MultiTenant**: 複数の組織で使用可能（他の組織がBotをインストールできる）

企業内部でのみ使用する場合は**SingleTenant**、外部にも公開する場合は**MultiTenant**を選択します。

---

### Q2: MICROSOFT_APP_TENANT_IDを設定しないとどうなりますか？

**A:** SingleTenantとして設定(`MICROSOFT_APP_TYPE=SingleTenant`)しているのに`MICROSOFT_APP_TENANT_ID`が未設定の場合、認証エラーが発生する可能性があります。

`node test/check-env.js`を実行すると警告が表示されます:
```
⚠️  WARNING: MICROSOFT_APP_TYPE is SingleTenant but MICROSOFT_APP_TENANT_ID is not set
```

---

### Q3: MultiTenantからSingleTenantに変更できますか？

**A:** はい、可能です。ただし、以下の手順が必要です:

1. 新しいApp Registrationを**SingleTenant**として作成
2. `.env`を更新:
   ```env
   MICROSOFT_APP_TYPE=SingleTenant
   MICROSOFT_APP_TENANT_ID=your-tenant-id
   ```
3. Azure Botの設定を更新
4. Teams Appマニフェストの`botId`を更新
5. Botを再起動

---

### Q4: Tenant IDはどこで確認できますか？

**A:** 以下の方法で確認できます:

**方法1: Azure Portal**
```
Azure Portal → Microsoft Entra ID → 概要 → テナントID
```

**方法2: PowerShell**
```powershell
Connect-AzureAD
(Get-AzureADTenantDetail).ObjectId
```

**方法3: Azure CLI**
```bash
az account show --query tenantId -o tsv
```

---

### Q5: 同じBotを複数のテナントで使いたい場合は？

**A:** その場合は**MultiTenant**構成を使用してください。SingleTenantは1つのテナント専用です。

---

## トラブルシューティング

### エラー: "Unauthorized tenant"

**原因**: 設定されたTenant IDが正しくない、またはApp RegistrationがSingleTenantとして作成されていない

**解決**:
1. Azure Portal でApp Registrationの種類を確認
2. Tenant IDが正しいか確認
3. `.env`の`MICROSOFT_APP_TENANT_ID`が正しいか確認

---

### エラー: "AADSTS50020: User account from identity provider does not exist in tenant"

**原因**: MultiTenantのApp RegistrationをSingleTenantとして使用しようとしている

**解決**:
1. App Registrationを**SingleTenant**として新規作成
2. または`MICROSOFT_APP_TYPE=MultiTenant`に変更

---

### 警告: "MICROSOFT_APP_TENANT_ID is not set"

**原因**: `MICROSOFT_APP_TYPE=SingleTenant`だがTenant IDが設定されていない

**解決**:
```bash
# .envに追加
echo "MICROSOFT_APP_TENANT_ID=your-tenant-id" >> .env

# Botを再起動
pm2 restart teams-leave-bot
```

---

## セキュリティ上の考慮事項

### SingleTenantの利点

✅ **アクセス制限**: 組織外からのアクセスを完全にブロック
✅ **データ保護**: テナント内のデータに限定
✅ **コンプライアンス**: 組織のセキュリティポリシーに準拠しやすい

### 注意点

⚠️ **Tenant ID の管理**: Tenant IDは機密情報ではありませんが、`.env`ファイルに保存されるため適切に管理してください
⚠️ **移行の制約**: SingleTenant → MultiTenant への移行には新しいApp Registrationが必要

---

## 設定例

### 開発環境（SingleTenant）

```env
# .env.development
PORT=3978
NODE_ENV=development

MICROSOFT_APP_ID=2d16b493-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_APP_PASSWORD=Ks68Q~uA2pXXXXXXXXXXXXXXXXXXXXXXXXXXXX
MICROSOFT_APP_TYPE=SingleTenant
MICROSOFT_APP_TENANT_ID=d6d49420-xxxx-xxxx-xxxx-xxxxxxxxxxxx

DEVREV_API_TOKEN=your-devrev-token
DEVREV_API_BASE_URL=https://api.devrev.ai
DEVREV_DEFAULT_PART_ID=your-part-id
```

### 本番環境（SingleTenant）

```env
# .env.production
PORT=3978
NODE_ENV=production

MICROSOFT_APP_ID=2d16b493-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_APP_PASSWORD=Ks68Q~uA2pXXXXXXXXXXXXXXXXXXXXXXXXXXXX
MICROSOFT_APP_TYPE=SingleTenant
MICROSOFT_APP_TENANT_ID=d6d49420-xxxx-xxxx-xxxx-xxxxxxxxxxxx

DEVREV_API_TOKEN=your-devrev-token
DEVREV_API_BASE_URL=https://api.devrev.ai
DEVREV_DEFAULT_PART_ID=your-part-id
```

---

## 参考リンク

- [Azure AD App Registration Types](https://learn.microsoft.com/azure/active-directory/develop/single-and-multi-tenant-apps)
- [Bot Framework Authentication](https://learn.microsoft.com/azure/bot-service/bot-builder-authentication)
- [CloudAdapter Configuration](https://learn.microsoft.com/javascript/api/botbuilder/cloudadapter)

---

**最終更新**: 2025-01-11
