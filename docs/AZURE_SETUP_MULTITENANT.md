# Azure Bot セットアップ - マルチテナント構成（推奨）

このガイドでは、マルチテナントApp Registrationを使用してAzure Botをセットアップする方法を説明します。

## なぜマルチテナントが推奨か

✅ **最も柔軟な方法**
- 開発環境と本番環境で異なるテナントを使用可能
- 複数の組織で同じBotを使用可能
- 将来的な拡張性が高い

✅ **本番環境に最適**
- エンタープライズアプリケーションの標準
- 一度セットアップすれば、どのTeamsテナントでも使用可能

✅ **このプロジェクトに最適**
- Ubuntu Serverでのホスティングと相性が良い
- Azure依存度が最小

---

## セットアップ手順（15分）

### ステップ1: マルチテナントApp Registrationを作成（5分）

#### 1.1 Azure Portalでアプリ登録

1. [Azure Portal](https://portal.azure.com) にアクセス
2. 検索バーで「**Microsoft Entra ID**」（旧Azure Active Directory）を検索
3. 左メニューから「**アプリの登録**」をクリック
4. 「**新規登録**」をクリック

#### 1.2 アプリケーションの登録

以下の情報を入力:

```
名前: teams-leave-bot
  └─ 任意の名前（例: Teams Leave Request Bot）

サポートされているアカウントの種類:
  └─ 「任意の組織ディレクトリ内のアカウント (任意の Microsoft Entra ID テナント - マルチテナント)」を選択
     ⚠️ これが重要！

リダイレクト URI:
  └─ 空欄でOK（後で設定可能）
```

5. 「**登録**」をクリック

#### 1.3 Application IDをコピー

作成されたアプリの概要ページで:

```
アプリケーション (クライアント) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

この値をコピーして、メモ帳に保存してください。
**これが `MICROSOFT_APP_ID` になります。**

#### 1.4 Tenant IDもコピー（オプション）

```
ディレクトリ (テナント) ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

この値もメモしておくと良いでしょう（Azure Bot作成時に必要）。

---

### ステップ2: クライアントシークレットを作成（3分）

#### 2.1 証明書とシークレットに移動

1. 作成したアプリの左メニューから「**証明書とシークレット**」をクリック
2. 「**クライアント シークレット**」タブを選択
3. 「**新しいクライアント シークレット**」をクリック

#### 2.2 シークレットを作成

```
説明: bot-secret
  └─ 任意の説明（例: Production Bot Secret）

有効期限: 24か月
  └─ セキュリティポリシーに応じて選択（24か月推奨）
```

4. 「**追加**」をクリック

#### 2.3 シークレット値をコピー

⚠️ **重要**: シークレットの「**値**」列に表示される文字列をコピーしてください。

```
値: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**この値は一度しか表示されません！**
メモ帳に保存してください。
**これが `MICROSOFT_APP_PASSWORD` になります。**

---

### ステップ3: Bot Channelの登録を追加（2分）

Teams Botとして認識させるために、API設定を追加します。

📖 **詳細解説**: この設定が必要な理由と詳しい手順は以下を参照
- [APP_ID_URI_EXPLAINED.md](docs/APP_ID_URI_EXPLAINED.md) - 技術的な背景と詳細説明
- [APP_ID_URI_SCREENSHOTS.md](docs/APP_ID_URI_SCREENSHOTS.md) - 画面付き詳細手順

#### 3.1 APIの公開に移動

⚠️ **「APIの公開」が見つからない場合:**
[FINDING_API_EXPOSE.md](docs/FINDING_API_EXPOSE.md) を参照してください。

**正しい場所:**
```
Azure Portal
→ Microsoft Entra ID（検索で探す）
→ アプリの登録
→ teams-leave-bot（作成したアプリ）
→ 左メニュー「APIの公開」 ← ここです！
```

**手順:**
1. **App Registration（アプリの登録）の詳細ページ**で、左メニューから「**APIの公開**」をクリック
   - ⚠️ Azure Botリソースではなく、App Registrationの中にあります
2. 「**アプリケーション ID URI**」の横にある「**追加**」をクリック

#### 3.2 アプリケーションID URIを設定

デフォルトで以下の形式が表示されます:

```
api://YOUR_APP_ID
```

⚠️ **重要**: これを以下に変更してください:

```
api://botid-YOUR_APP_ID
        ↑
    botid- を追加（ハイフン忘れずに！）
```

**実際の例:**
```
変更前: api://12345678-1234-1234-1234-123456789abc
変更後: api://botid-12345678-1234-1234-1234-123456789abc
```

**チェックポイント:**
- ✅ `api://` で始まっている
- ✅ `botid-` プレフィックスがある（ハイフン付き）
- ✅ Application (client) IDと完全一致

3. 「**保存**」をクリック

💡 **よくある間違い:**
- ❌ `api://botid12345678...` （ハイフンがない）
- ❌ `api://bot-id-12345678...` （余計なハイフン）
- ❌ `https://botid-12345678...` （httpsになっている）

---

### ステップ4: Azure Botリソースを作成（5分）

#### 4.1 Azure Botの作成

1. Azure Portalの検索バーで「**Azure Bot**」を検索
2. 「**作成**」をクリック

#### 4.2 基本設定

```
Bot handle: teams-leave-bot
  └─ 任意の名前（グローバルで一意である必要あり）

サブスクリプション:
  └─ 使用するサブスクリプション

リソースグループ:
  └─ 新規作成または既存を選択

場所:
  └─ Japan East（または任意のリージョン）

価格レベル:
  └─ F0 (無料)
```

#### 4.3 Microsoft App IDの設定

⚠️ **ここが重要**

```
Microsoft App ID:
  └─ 「既存のアプリ登録を使用する (Use existing app registration)」を選択

App ID:
  └─ ステップ1.3でコピーしたApplication IDを貼り付け

App tenant:
  └─ 「マルチテナント」を選択
     または ステップ1.4でコピーしたTenant IDを入力
```

4. 「**確認および作成**」→「**作成**」をクリック

---

### ステップ5: Messaging Endpointの設定（1分）

#### 5.1 Bot構成に移動

1. 作成したAzure Botリソースに移動
2. 左メニューから「**構成**」をクリック

#### 5.2 Messaging Endpointを設定

```
Messaging endpoint:
  └─ https://your-domain.com/api/messages
     （your-domain.comは実際のドメインに置き換え）
```

**開発時は:**
```
https://xxxx-xxx-xxx-xxx.ngrok-free.app/api/messages
```

3. 「**適用**」をクリック

---

### ステップ6: Microsoft Teamsチャネルを有効化（1分）

#### 6.1 チャネルに移動

1. Azure Botリソースの左メニューから「**チャネル**」をクリック
2. 「**Microsoft Teams**」アイコンをクリック

#### 6.2 Teamsチャネルを有効化

1. 「**Microsoft Teams**」をクリック
2. 規約に同意
3. 「**適用**」または「**同意する**」をクリック

⚠️ **エラーが出る場合:**

「このアプリを使用するためのアクセス許可がありません」というエラーが表示される場合:

**原因:** Teamsのアプリポリシーがまだ反映されていない（マルチテナント設定の問題ではありません）

**解決方法:**
1. **最速（推奨）**: PowerShellで即座適用
   ```powershell
   Connect-MicrosoftTeams
   Grant-CsTeamsAppSetupPolicy -Identity "your-email@domain.com" -PolicyName "AllowUserPinning"
   ```

2. **回避策**: このステップをスキップして、Teams Appマニフェストを直接アップロード（後述）

3. **待つ**: 24時間待つ（ポリシー反映に時間がかかる場合）

📖 **詳細**: [TEAMS_APP_PERMISSION_ERROR.md](docs/TEAMS_APP_PERMISSION_ERROR.md) を参照

**注意**: このエラーが出ても、Teams Appマニフェストを直接アップロードすればBotは動作します。

---

## ✅ セットアップ完了

以下の情報が手元にあることを確認してください:

```
✓ Microsoft App ID (Application ID)
✓ Microsoft App Password (Client Secret)
✓ Azure Bot Name
✓ Messaging Endpoint
```

---

## 環境変数の設定

### ローカル開発環境

`.env` ファイルを作成:

```bash
cp .env.example .env
nano .env
```

以下を設定:

```env
# Server
PORT=3978
NODE_ENV=development

# Azure Bot - マルチテナント
MICROSOFT_APP_ID=your-application-id-here
MICROSOFT_APP_PASSWORD=your-client-secret-here

# DevRev
DEVREV_API_TOKEN=your-devrev-api-token
DEVREV_API_BASE_URL=https://api.devrev.ai
DEVREV_DEFAULT_PART_ID=your-part-id
```

### 本番環境

同様に `.env` ファイルを作成し、`NODE_ENV=production` に設定。

---

## Teams Appマニフェストの作成

### manifest.jsonの編集

`teams-manifest/manifest.json` を編集:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "YOUR_MICROSOFT_APP_ID",  // ← ここを置き換え
  ...
  "bots": [
    {
      "botId": "YOUR_MICROSOFT_APP_ID",  // ← ここを置き換え
      ...
    }
  ],
  "validDomains": [
    "your-domain.com"  // ← 実際のドメインに置き換え
  ]
}
```

### アイコンの作成

```bash
cd teams-manifest
./create-icons.sh
```

### Zipパッケージの作成

```bash
zip -r teams-app.zip manifest.json color.png outline.png
```

---

## Teamsへのインストール

### 個人/開発用

1. Microsoft Teamsを開く
2. 左メニュー「アプリ」→「アプリの管理」
3. 「アプリをアップロード」→「カスタムアプリをアップロード」
4. `teams-app.zip` を選択
5. 「追加」をクリック

### 組織全体への展開

1. [Teams管理センター](https://admin.teams.microsoft.com/) にアクセス
2. 「Teamsアプリ」→「アプリを管理」
3. 「+アップロード」をクリック
4. `teams-app.zip` を選択
5. アプリポリシーで適切なユーザーに割り当て

---

## 動作確認

### 1. Botの起動

**ローカル開発:**
```bash
npm run dev
```

**ngrokトンネル:**
```bash
ngrok http 3978
```

**Azure BotのMessaging endpointを更新:**
```
https://xxxx.ngrok-free.app/api/messages
```

### 2. Teamsでテスト

1. Teamsで「チャット」→「新しいチャット」
2. 「休暇申請Bot」を検索
3. チャットを開始
4. 以下を送信:
   ```
   @休暇申請Bot 休暇申請
   ```

5. Adaptive Cardが表示されればOK！

---

## トラブルシューティング

### エラー: "アプリをインストールできません"

**原因**: Teamsでカスタムアプリのアップロードが無効

**解決方法:**
1. Teams管理センター → セットアップポリシー
2. 「カスタム アプリをアップロードする」を**オン**

### エラー: "401 Unauthorized"

**原因**: App IDまたはPasswordが間違っている

**解決方法:**
1. `.env`ファイルの値を確認
2. App Registrationで新しいシークレットを作成
3. Botを再起動

### Botが応答しない

**確認事項:**
1. Botが起動しているか: `npm run dev` で "Bot is ready" が表示されているか
2. ngrokが起動しているか
3. Azure BotのMessaging endpointが正しいか
4. App IDとPasswordが正しいか

---

## マルチテナントの利点

### 1. 複数環境での使用

```
開発環境: 開発用Teamsテナント
ステージング: テスト用Teamsテナント
本番環境: 本番Teamsテナント

すべて同じBot（同じApp ID）を使用可能
```

### 2. 複数組織への展開

```
顧客A社: 顧客AのTeamsテナント
顧客B社: 顧客BのTeamsテナント
自社: 自社のTeamsテナント

すべて同じBotで対応可能
```

### 3. 開発の柔軟性

```
開発者の個人テナント: ローカルテスト
会社のテナント: 本番環境

同じApp IDでテスト可能
```

---

## セキュリティのベストプラクティス

### 1. シークレットの管理

- ✅ シークレットを `.env` ファイルに保存
- ✅ `.env` をGitにコミットしない（`.gitignore`に含まれている）
- ✅ 本番環境では定期的にシークレットをローテーション
- ✅ 有効期限を適切に設定（24か月推奨）

### 2. 権限の最小化

App Registrationで必要最小限の権限のみ付与:

```
Microsoft Graph API:
- User.Read (基本的なユーザー情報の読み取り)
```

### 3. HTTPSの使用

- ✅ 本番環境では必ずHTTPS使用
- ✅ Let's Encryptで無料SSL証明書取得
- ✅ Nginxでセキュリティヘッダーを設定

---

## 次のステップ

1. ✅ マルチテナントApp Registration作成
2. ✅ Azure Bot作成
3. ✅ 環境変数設定
4. ✅ DevRev API設定
5. 🚀 ローカルでテスト（[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)）
6. 🚀 本番環境にデプロイ（[README.md](README.md)）

---

## 参考リンク

- [Azure Bot Service Documentation](https://docs.microsoft.com/azure/bot-service/)
- [Microsoft Entra ID App Registration](https://docs.microsoft.com/azure/active-directory/develop/quickstart-register-app)
- [Teams App Manifest](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema)
- [Bot Framework Documentation](https://docs.microsoft.com/azure/bot-service/bot-builder-basics)

---

**最終更新**: 2025-01-10
