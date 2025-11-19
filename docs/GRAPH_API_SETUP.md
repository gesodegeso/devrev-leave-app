# Microsoft Graph API セットアップガイド

このドキュメントでは、個人チャット（1対1チャット）で承認者リストを表示するために必要なMicrosoft Graph APIの設定方法を説明します。

## 概要

Teams Botは以下の2つの方法で承認者リストを取得します：

1. **チーム/グループチャット**: `TeamsInfo.getMembers()` を使用して会話のメンバーリストを取得
2. **個人チャット（1対1）**: Microsoft Graph APIを使用して組織全体のユーザーリストを取得

個人チャットでは会話のメンバーリストが取得できないため、Graph APIが必須です。

## 前提条件

- Azure Portal へのアクセス権限
- Azure AD App Registration の管理者権限
- Bot の App ID と Tenant ID

## セットアップ手順

### 1. Azure Portal にアクセス

1. [Azure Portal](https://portal.azure.com) にログイン
2. **Microsoft Entra ID**（旧 Azure Active Directory）を開く
3. **App registrations** を選択
4. あなたの Bot の App Registration を見つけて開く

### 2. API Permissions の追加

#### 2.1 Permission の追加

1. 左メニューから **API permissions** を選択
2. **+ Add a permission** をクリック
3. **Microsoft Graph** を選択
4. **Application permissions** を選択（Delegated permissions ではない）

#### 2.2 必要な権限を追加

以下のいずれかの権限を追加してください：

**推奨: User.Read.All**
- 組織内のすべてのユーザーの基本プロフィール情報を読み取り可能
- displayName, id, mail, userPrincipalName などを取得

または

**User.ReadBasic.All**
- より制限された権限（基本情報のみ）
- セキュリティ要件が厳しい場合に使用

#### 2.3 管理者の同意

⚠️ **重要**: Application permissions には管理者の同意が必須です

1. 権限を追加したら、**Grant admin consent for [your organization]** ボタンをクリック
2. 確認ダイアログで **Yes** をクリック
3. Status 列に緑のチェックマークが表示されることを確認

### 3. 環境変数の設定

`.env` ファイルに以下の設定が必要です：

```env
# Microsoft Bot Framework
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_PASSWORD=your-bot-app-password
MICROSOFT_APP_TYPE=MultiTenant

# Tenant ID - REQUIRED for Graph API
MICROSOFT_APP_TENANT_ID=your-tenant-id-here
```

**Tenant ID の取得方法:**

1. Azure Portal で **Microsoft Entra ID** を開く
2. **Overview** を選択
3. **Tenant ID** をコピー

### 4. 権限の確認

設定が完了したら、以下のコマンドで Bot を起動してテストします：

```bash
npm start
```

#### 動作確認

1. Teams で Bot と 1対1 チャットを開始
2. `@BotName 休暇申請` とメンション
3. 承認者フィールドに組織のユーザーリストが表示されることを確認

#### トラブルシューティング

**ユーザーリストが表示されない場合:**

1. ログを確認:
   ```
   Personal chat detected - using Graph API to retrieve organization users
   [GraphService] Fetching organization users...
   [GraphService] Retrieved X users
   ```

2. エラーログを確認:
   ```
   [GraphService] Error getting access token: 401 Unauthorized
   ```
   → Tenant ID が正しいか確認

   ```
   [GraphService] Error getting organization users: 403 Forbidden
   ```
   → API Permissions が正しく設定されているか確認
   → 管理者の同意が完了しているか確認

3. Graph API 権限の確認:
   - Azure Portal → App Registration → API Permissions
   - User.Read.All または User.ReadBasic.All が追加されている
   - Status が "Granted for [organization]" になっている

## API 権限の詳細

### User.Read.All

**取得できる情報:**
- id
- displayName
- mail
- userPrincipalName
- jobTitle
- department
- officeLocation
- など

**用途:**
- 承認者選択リストの作成
- ユーザー情報の表示

**権限レベル:** High

### User.ReadBasic.All

**取得できる情報:**
- id
- displayName
- userPrincipalName

**用途:**
- 基本的な承認者選択リスト

**権限レベル:** Medium

## セキュリティに関する考慮事項

### Application Permissions vs Delegated Permissions

**Application Permissions（推奨）:**
- Bot が独自に API を呼び出す
- ユーザーのサインインが不要
- より高い権限レベルが必要
- 管理者の同意が必須

**Delegated Permissions:**
- ユーザーの代わりに API を呼び出す
- ユーザーのサインインが必要
- Bot の場合は使用が困難

### データの取り扱い

Graph API で取得したユーザー情報は：

1. **メモリ上にのみ保持**
   - データベースには保存しない
   - キャッシュしない

2. **必要最小限の情報のみ取得**
   - id, displayName, email のみ
   - 機密情報は取得しない

3. **フィルタリング**
   - `accountEnabled eq true` でアクティブユーザーのみ
   - 最大100ユーザーに制限

## カスタマイズ

### 取得するユーザー数の変更

`src/bot.js` の `getTeamMembersForSelection` メソッド:

```javascript
const users = await this.graphService.getOrganizationUsers(
    100,  // 最大ユーザー数を変更
    'accountEnabled eq true'
);
```

### フィルタリング条件の変更

特定の部署のユーザーのみを取得する例:

```javascript
const users = await this.graphService.getOrganizationUsers(
    100,
    "accountEnabled eq true and department eq 'Engineering'"
);
```

### ユーザー検索機能の追加

`src/services/graphService.js` には検索機能も実装済み:

```javascript
// 名前で検索
const users = await this.graphService.searchUsers('佐藤', 20);
```

## よくある質問（FAQ）

### Q1: Tenant ID は必須ですか？

**A:** 個人チャットで承認者リストを表示する場合は必須です。Tenant ID がないとGraph APIの認証ができません。

### Q2: MultiTenant アプリでも Tenant ID が必要ですか？

**A:** はい。Graph API を使用する場合は、どのテナントのユーザーを取得するか指定する必要があるため、Tenant ID が必須です。

### Q3: 権限の同意エラーが出ます

**A:** Application permissions は必ず管理者の同意が必要です。組織の Global Administrator または Application Administrator に依頼してください。

### Q4: 個人情報保護の観点で問題はありますか？

**A:** User.Read.All は組織内のすべてのユーザー情報にアクセスできるため、組織のポリシーに従って使用してください。より制限された User.ReadBasic.All の使用も検討してください。

### Q5: Graph API が使えない場合はどうなりますか？

**A:** Graph API でユーザーリストが取得できない場合、自動的にテキスト入力フィールドにフォールバックします。ユーザーは承認者の名前を手動で入力できます。

## 参考リンク

- [Microsoft Graph API Documentation](https://docs.microsoft.com/graph/)
- [User Resource Type](https://docs.microsoft.com/graph/api/resources/user)
- [Application Permissions](https://docs.microsoft.com/graph/permissions-reference)
- [Grant Admin Consent](https://docs.microsoft.com/azure/active-directory/manage-apps/grant-admin-consent)

## トラブルシューティング

### 問題: "Failed to get access token: 401 Unauthorized"

**原因:**
- Tenant ID が間違っている
- App ID または Password が間違っている

**解決方法:**
1. `.env` ファイルの設定を確認
2. Azure Portal で App ID と Tenant ID を再確認
3. Client Secret が期限切れでないか確認

### 問題: "Error getting organization users: 403 Forbidden"

**原因:**
- API Permissions が設定されていない
- 管理者の同意が完了していない

**解決方法:**
1. Azure Portal → App Registration → API Permissions
2. User.Read.All が追加されているか確認
3. "Grant admin consent" を実行
4. Status が "Granted" になっているか確認

### 問題: "Graph API returned no users"

**原因:**
- フィルター条件が厳しすぎる
- 組織にアクティブユーザーがいない

**解決方法:**
1. フィルター条件を緩和: `accountEnabled eq true` を削除
2. 取得数を増やす: `top` パラメータを増やす
3. ログを確認してエラーメッセージを確認

### 問題: ユーザーリストは表示されるが、承認依頼が届かない

**原因:**
- Graph API で取得した User ID と Teams ID が異なる可能性

**解決方法:**
1. DevRev に保存される `tnt__approver_teams_id` を確認
2. Graph API の User ID は Azure AD Object ID であることを確認
3. Proactive messaging の conversation reference が正しいか確認

## サポート

問題が解決しない場合は、以下の情報を含めて問い合わせてください：

1. エラーメッセージの全文
2. Bot のログ（個人情報を除く）
3. Azure Portal の API Permissions のスクリーンショット
4. `.env` ファイルの設定内容（パスワードを除く）
