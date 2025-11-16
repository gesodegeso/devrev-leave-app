# Azure Bot 詳細セットアップガイド（2025年版）

## ⚠️ 重要な変更点

Microsoftは2024年以降、Bot作成時の認証方法を変更しました。
**従来のマルチテナント設定は新規作成時に選択できなくなっています。**

## 現在の推奨方法

### オプション1: シングルテナント + 管理同意（推奨）

特定の組織内でのみ使用する場合、この方法が最もシンプルです。

#### メリット
- ✅ セットアップが簡単
- ✅ セキュリティが高い
- ✅ 組織のポリシーに準拠しやすい
- ✅ 追加の承認プロセスが不要

#### デメリット
- ❌ 他の組織では使用できない
- ❌ 開発用と本番用で異なるテナントを使う場合は複数のBotが必要

#### セットアップ手順

**1. Azure Botの作成**

```
Azure Portal → リソースの作成 → Azure Bot
├── Bot handle: teams-leave-bot
├── サブスクリプション: 使用するサブスクリプション
├── リソースグループ: 新規作成または既存
├── 場所: Japan East（または任意）
├── 価格レベル: F0（無料）
└── Microsoft App ID:
    ├── 「新規作成」を選択
    └── タイプ: 「シングルテナント」
```

**2. 完了**

シングルテナントの場合、追加の設定は不要です。
同じAzure ADテナント内のTeamsで使用できます。

---

### オプション2: マネージドID（推奨 - 新方式）

Azure Bot ServiceでMicrosoft Entra ID（旧Azure AD）のマネージドIDを使用する方法です。

#### メリット
- ✅ パスワード管理不要
- ✅ より安全
- ✅ Microsoftの推奨方法
- ✅ 自動的にトークンローテーション

#### セットアップ手順

**1. Azure Botの作成**

```
Azure Portal → リソースの作成 → Azure Bot
├── Bot handle: teams-leave-bot
├── 価格レベル: F0（無料）
└── Microsoft App ID:
    └── 「マネージドID を使用する」を選択 ← 新しいオプション
```

**2. コードの修正が必要**

マネージドIDを使用する場合、認証方法が異なります。

`src/index.js` を以下のように修正:

```javascript
const {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
} = require('botbuilder');

// マネージドID使用時
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MICROSOFT_APP_ID,
    MicrosoftAppType: 'UserAssignedMSI', // マネージドIDの場合
    // appPassword は不要
    // Azure内でホストする場合、マネージドIDが自動的に使用される
});
```

**3. 制限事項**

⚠️ マネージドIDは**Azureでホストする場合のみ**使用可能です。
- Azure App Service
- Azure Functions
- Azure Container Instances
- Azure VM

**ローカル開発や自前サーバー（Ubuntu）では使用できません。**

---

### オプション3: 既存のマルチテナントアプリを使用

既にマルチテナントのApp Registrationがある場合、それを再利用できます。

#### 手順

**1. App Registrationを手動作成**

```
Azure Portal → Microsoft Entra ID → App registrations
├── 新規登録をクリック
├── 名前: teams-leave-bot
└── サポートされているアカウントの種類:
    └── 「任意の組織ディレクトリ内のアカウント」を選択
```

**2. クライアントシークレットを作成**

```
作成したApp → 証明書とシークレット
├── 新しいクライアントシークレット
├── 説明: bot-secret
├── 有効期限: 24か月（推奨）
└── 値をコピー（一度しか表示されません）
```

**3. Azure Botで既存のApp IDを使用**

```
Azure Portal → リソースの作成 → Azure Bot
├── Bot handle: teams-leave-bot
├── 価格レベル: F0（無料）
└── Microsoft App ID:
    ├── 「既存のアプリ登録を使用する」を選択
    ├── App ID: 手順1で作成したアプリのID
    └── App tenantID: テナントID
```

**4. Bot Channelの登録をApp Registrationに追加**

重要：Botチャネルとして認識させる設定が必要です。

```
App Registration → APIの公開
├── アプリケーション ID URI を追加
└── api://botid-{APP_ID} を設定
```

---

## 推奨される構成パターン

### パターンA: 社内専用Bot（最もシンプル）

```
用途: 単一組織内でのみ使用
Azure構成: シングルテナント
開発環境: 同じテナント内でテスト
本番環境: 同じテナント内で展開
```

**メリット:**
- 最もセットアップが簡単
- 追加の承認不要
- セキュリティが高い

**デメリット:**
- 他の組織では使用不可
- 開発テナントと本番テナントが異なる場合、2つのBotが必要

### パターンB: 開発・本番分離（推奨）

```
開発環境Bot:
├── Azure Bot: dev-teams-leave-bot
├── テナント: 開発用テナント（またはシングルテナント）
├── Endpoint: https://dev-xxxx.ngrok-free.app/api/messages
└── Teams: 開発用チームでテスト

本番環境Bot:
├── Azure Bot: prod-teams-leave-bot
├── テナント: 本番テナント（シングルテナント）
├── Endpoint: https://your-domain.com/api/messages
└── Teams: 組織全体に展開
```

**メリット:**
- 環境が完全に分離
- 本番環境に影響を与えずに開発可能
- それぞれの環境で最適な設定

### パターンC: Azure外部ホスティング（このプロジェクト）

```
構成:
├── Azure: Bot登録のみ（シングルテナント）
├── ホスティング: Ubuntu Server + Nginx
├── 開発: ローカル + ngrok
└── 制約: マネージドIDは使用不可
```

**この場合の設定:**
1. シングルテナントでBot作成
2. App IDとPasswordを使用
3. 自前サーバーにデプロイ

---

## 異なるテナント間でテストする方法

### 問題
開発用Azureテナントと、テストしたいTeamsテナントが異なる場合

### 解決策1: 本番テナントでBot登録

```
Azure Bot登録: 本番Teamsと同じテナント
開発環境: ngrokで公開してテスト
本番環境: 自前サーバー
```

**手順:**
1. 本番Teamsと同じAzure ADテナントでBotを作成
2. 開発時はngrokのURLをMessaging endpointに設定
3. 本番時は本番サーバーのURLに変更

### 解決策2: 2つのBotを作成

```
開発Bot:
├── 登録: 開発用テナント
└── 使用: 開発環境でのテストのみ

本番Bot:
├── 登録: 本番テナント
└── 使用: 本番環境
```

**手順:**
1. 開発用と本番用で別々にBot登録
2. `.env`ファイルを環境ごとに切り替え
3. 各環境で独立してテスト

### 解決策3: Azure App Serviceを使用

マネージドIDを使いたい場合、Azureでホスティング:

```
開発環境: Azure App Service（開発スロット）
本番環境: Azure App Service（本番スロット）
認証: マネージドID使用
```

⚠️ ただし、これは「Azureに頼らない」という要件に反します。

---

## Ubuntu Serverでのデプロイ（シングルテナント）

### 推奨構成

```
Azure Bot:
├── Type: シングルテナント
├── App ID: xxxxx-xxxx-xxxx-xxxx
└── App Password: *********************

Ubuntu Server:
├── Bot実装: Node.js
├── プロセス管理: PM2
├── リバースプロキシ: Nginx
├── SSL: Let's Encrypt
└── 環境変数: .env ファイルに App ID と Password
```

### セットアップ手順（簡易版）

**1. Azure Botを作成（シングルテナント）**

```
Azure Portal → Azure Bot → 新規作成
└── シングルテナントを選択
```

**2. App IDとPasswordを取得**

```
Bot → 構成 → Microsoft App ID をコピー
Bot → 管理 → 証明書とシークレット → 新しいシークレット
```

**3. サーバーにデプロイ**

```bash
# Ubuntu Serverで
cd /opt/teams-leave-bot
nano .env

# 以下を設定
MICROSOFT_APP_ID=your-app-id
MICROSOFT_APP_PASSWORD=your-app-password
DEVREV_API_TOKEN=your-devrev-token
DEVREV_DEFAULT_PART_ID=your-part-id
```

**4. Bot起動**

```bash
sudo ./deploy.sh
```

**5. Messaging Endpoint設定**

```
Azure Portal → Bot → 構成
Messaging endpoint: https://your-domain.com/api/messages
```

---

## 開発ワークフロー（シングルテナント）

### ローカル開発

```bash
# 1. 環境変数設定
cp .env.example .env
nano .env  # 本番BotのApp IDとPasswordを設定

# 2. Bot起動
npm run dev

# 3. ngrokで公開
ngrok http 3978

# 4. Azure BotのMessaging endpointを一時的に変更
# https://xxxx.ngrok-free.app/api/messages

# 5. Teamsでテスト
```

### 本番デプロイ

```bash
# 1. サーバーにコードをデプロイ

# 2. 環境変数を本番用に設定

# 3. デプロイスクリプト実行
sudo ./deploy.sh

# 4. Azure BotのMessaging endpointを本番URLに変更
# https://your-domain.com/api/messages

# 5. Teamsで本番テスト
```

---

## よくある質問

### Q1: シングルテナントでも複数のTeamsチームで使えますか？
**A:** はい、同じAzure ADテナント内であれば、複数のチーム、チャネル、個人チャットで使用できます。

### Q2: 開発環境と本番環境で異なるテナントを使いたい場合は？
**A:** 2つのBotを作成し、それぞれのテナントで登録してください。コードは同じものを使用し、環境変数のみ切り替えます。

### Q3: マルチテナントアプリは完全に使えなくなりましたか？
**A:** いいえ、既存のマルチテナントApp Registrationは引き続き使用できます。ただし、Azure Bot作成時に直接マルチテナントを選択するオプションがなくなりました。

### Q4: 外部の組織にBotを提供したい場合は？
**A:**
1. **オプションA**: 各組織に自分でBotを登録してもらう
2. **オプションB**: Teams App Storeに公開（Microsoft認証が必要）
3. **オプションC**: 既存のマルチテナントApp Registrationを使用

### Q5: マネージドIDを使いつつ、Ubuntu Serverにデプロイできますか？
**A:** いいえ、マネージドIDはAzureのマネージドサービス内でのみ動作します。Ubuntu Serverなど外部でホストする場合は、App IDとPasswordの組み合わせを使用してください。

---

## まとめ

### 2025年現在の推奨構成

**社内専用Bot（このプロジェクトの場合）:**
```
✅ Azure Bot: シングルテナント
✅ 認証: App ID + Password
✅ ホスティング: Ubuntu Server + Nginx
✅ 開発: ngrokで一時的に公開
✅ 本番: 自前サーバーで運用
```

**複数組織向けBot:**
```
✅ App Registration: 手動でマルチテナント作成
✅ Azure Bot: 既存のApp IDを使用
✅ または: 各組織ごとにシングルテナントBotを作成
```

**Azureフルマネージド:**
```
✅ Azure Bot: マネージドID
✅ ホスティング: Azure App Service
✅ 認証: パスワード不要
✅ 制約: Azure内のみ
```

---

## 次のステップ

1. Azure Portalでシングルテナント Botを作成
2. App IDとPasswordを取得
3. `.env`ファイルに設定
4. ローカルでテスト（ngrok使用）
5. 本番サーバーにデプロイ

詳細な手順は [QUICKSTART.md](QUICKSTART.md) または [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) を参照してください。

---

**最終更新**: 2025-01-10
