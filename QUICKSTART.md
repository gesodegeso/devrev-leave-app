# クイックスタートガイド

このガイドでは、Teams休暇申請Botを最速でセットアップする手順を説明します。

## 前提条件

- Ubuntu 24.04 サーバー（root権限）
- ドメイン名（DNSがサーバーIPに向いている）
- Azureアカウント（無料で作成可能）
- DevRevアカウント

## セットアップ時間

- Azure Bot登録: 約15分
- サーバーセットアップ: 約15分
- Teams App登録: 約5分

**合計: 約35分**

---

## ステップ1: Azure Bot登録（15分）

✅ **推奨**: マルチテナント構成（最も柔軟で本番環境向き）
詳細は [AZURE_SETUP_MULTITENANT.md](AZURE_SETUP_MULTITENANT.md) を参照。

### 1.1 マルチテナントApp Registrationを作成

1. https://portal.azure.com にアクセス
2. 「**Microsoft Entra ID**」を検索→開く
3. 左メニュー「**アプリの登録**」→「**新規登録**」
4. 以下を入力:
   - 名前: `teams-leave-bot`
   - サポートされているアカウントの種類: **「任意の組織ディレクトリ内のアカウント (マルチテナント)」**
5. 「登録」をクリック
6. **Application (client) ID** をコピー（メモ帳に保存）
7. **Directory (tenant) ID** もコピー（メモ帳に保存）

### 1.2 クライアントシークレットを作成

1. 左メニュー「**証明書とシークレット**」をクリック
2. 「**新しいクライアントシークレット**」をクリック
3. 説明: `bot-secret`、有効期限: `24か月`
4. 「追加」をクリック
5. シークレットの**値**をコピー（メモ帳に保存）⚠️ 一度しか表示されません

### 1.3 Bot Channel登録を追加

1. 左メニュー「**APIの公開**」をクリック
2. 「**アプリケーション ID URI**」の「**追加**」をクリック
3. `api://YOUR_APP_ID` を `api://botid-YOUR_APP_ID` に変更
4. 「保存」をクリック

### 1.4 Azure Botリソースを作成

1. Azure Portal検索で「**Azure Bot**」を検索
2. 「作成」をクリック
3. 以下を入力:
   - Bot handle: `teams-leave-bot`（任意の名前）
   - 価格レベル: **F0 (無料)**
   - Microsoft App ID: **「既存のアプリ登録を使用する」**を選択
   - App ID: 手順1.1でコピーしたApplication IDを貼り付け
   - App tenant: **マルチテナント** を選択
4. 「確認および作成」→「作成」をクリック

### 1.5 Teamsチャネル有効化

1. 作成したBotの「チャネル」に移動
2. 「Microsoft Teams」をクリック
3. 規約に同意

**✅ Azure設定完了！メモ帳に以下が保存されているはず:**
- Application (client) ID
- Client Secret (シークレットの値)
- Directory (tenant) ID

---

## ステップ2: DevRev APIトークン取得（5分）

1. https://app.devrev.ai/ にログイン
2. Settings → API tokens
3. 「Create new token」
4. 権限: **Tickets (Create, Read, Update)** を選択
5. トークンをコピー（メモ帳に保存）
6. Settings → Parts から **Default Part ID** をコピー（メモ帳に保存）

**✅ DevRev設定完了！メモ帳に以下が保存されているはず:**
- DevRev API Token
- Default Part ID

---

## ステップ3: サーバーセットアップ（15分）

### 3.1 サーバーに接続

```bash
ssh user@your-server-ip
```

### 3.2 プロジェクトを配置

```bash
# プロジェクトディレクトリに移動
cd /opt
sudo git clone <your-repo-url> teams-leave-bot
# または、ファイルを直接アップロード

cd teams-leave-bot
```

### 3.3 自動デプロイ実行

```bash
sudo ./deploy.sh
```

これで以下が自動的にインストール/設定されます:
- Node.js 20
- Nginx
- PM2
- 依存パッケージ

### 3.4 環境変数を設定

```bash
nano .env
```

以下をメモ帳から**コピー&ペースト**:

```env
PORT=3978
NODE_ENV=production

# Azure Botから取得
MICROSOFT_APP_ID=ここにApp IDを貼り付け
MICROSOFT_APP_PASSWORD=ここにClient Secretを貼り付け

# DevRevから取得
DEVREV_API_TOKEN=ここにDevRev APIトークンを貼り付け
DEVREV_API_BASE_URL=https://api.devrev.ai
DEVREV_DEFAULT_PART_ID=ここにPart IDを貼り付け
```

**Ctrl+O → Enter → Ctrl+X** で保存

### 3.5 Nginx設定

```bash
# 設定ファイルを編集
sudo nano nginx.conf.example

# 以下を置き換え:
# - your-domain.com → 実際のドメイン（3箇所）

# 設定をコピー
sudo cp nginx.conf.example /etc/nginx/sites-available/teams-bot
sudo ln -s /etc/nginx/sites-available/teams-bot /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # デフォルト設定を削除
```

### 3.6 SSL証明書取得

```bash
sudo certbot --nginx -d your-domain.com
```

プロンプトに従って入力:
- メールアドレスを入力
- 規約に同意 (Y)
- HTTPSリダイレクト: **はい** (2)

### 3.7 起動確認

```bash
# Nginx設定テスト
sudo nginx -t

# Nginxリロード
sudo systemctl reload nginx

# Bot再起動
pm2 restart teams-leave-bot

# ステータス確認
pm2 status
```

**✅ サーバー設定完了！**

### 3.8 Azure BotにエンドポイントURL設定

1. Azure Portalに戻る
2. Botの「構成」に移動
3. **Messaging endpoint** に以下を設定:
   ```
   https://your-domain.com/api/messages
   ```
4. 「適用」をクリック

---

## ステップ4: Teams App登録（5分）

### 4.1 アイコン作成

```bash
cd teams-manifest

# ImageMagickをインストール（初回のみ）
sudo apt-get install imagemagick

# アイコン自動作成
./create-icons.sh
```

### 4.2 マニフェスト編集

```bash
nano manifest.json
```

以下を置き換え:
- `YOUR_MICROSOFT_APP_ID` → Azure BotのApp ID（2箇所）
- `your-domain.com` → 実際のドメイン（4箇所）
- `Your Company Name` → 会社名

### 4.3 Zipパッケージ作成

```bash
zip -r teams-app.zip manifest.json color.png outline.png
```

### 4.4 ローカルPCにダウンロード

```bash
# ローカルPCで実行
scp user@your-server-ip:/opt/teams-leave-bot/teams-manifest/teams-app.zip .
```

### 4.5 Teamsにアップロード

1. Microsoft Teamsを開く
2. 左メニュー「アプリ」をクリック
3. 「アプリの管理」→「アプリをアップロード」
4. `teams-app.zip` を選択
5. 「追加」をクリック

**✅ Teams App登録完了！**

---

## ステップ5: 動作確認（1分）

### 5.1 Botとチャット開始

1. Teamsで「チャット」→「新しいチャット」
2. 「休暇申請Bot」を検索
3. チャットを開始

### 5.2 コマンド送信

```
@休暇申請Bot 休暇申請
```

### 5.3 フォーム入力

1. Adaptive Cardが表示される
2. 各項目を入力:
   - 開始日、終了日を選択
   - 理由を入力
   - 有給利用を選択
   - 承認者名を入力
3. 「申請を送信」をクリック

### 5.4 結果確認

- Teamsで確認メッセージとDevRev Ticket IDが表示される
- DevRevにログインしてチケットが作成されているか確認

**🎉 完了！正常に動作しています！**

---

## トラブルシューティング

### Botが応答しない

```bash
# ログ確認
pm2 logs teams-leave-bot

# エラーがあれば表示される
```

**よくあるエラー:**

1. **"MICROSOFT_APP_ID is not set"**
   → `.env` ファイルを確認

2. **"DevRev API token is not configured"**
   → `.env` ファイルのDEVREV_API_TOKENを確認

3. **502 Bad Gateway**
   → Botが起動しているか確認: `pm2 status`

### 設定の再確認

```bash
# .envファイルの内容確認
cat .env

# Botのステータス確認
pm2 status

# Nginxのステータス確認
sudo systemctl status nginx
```

### 再起動

```bash
# Bot再起動
pm2 restart teams-leave-bot

# Nginx再起動
sudo systemctl restart nginx
```

---

## 次のステップ

### 本番環境への展開

1. 組織のIT管理者に連絡
2. Teams管理センターから組織全体に展開
3. ユーザーへの利用ガイド配布

### 機能の追加

[README.md](README.md) の「将来の拡張」セクションを参照:
- 経費申請
- 出張申請
- その他のワークフロー

### モニタリング

```bash
# リアルタイムログ監視
pm2 logs teams-leave-bot --lines 100
```

---

## サポート

問題が発生した場合:

1. ログを確認: `pm2 logs teams-leave-bot`
2. [README.md](README.md) の詳細なトラブルシューティングを参照
3. Azure Bot/DevRevのドキュメントを確認

## チェックリスト

セットアップ完了の確認:

- [ ] Azure BotでApp IDとPasswordを取得
- [ ] DevRev APIトークンとPart IDを取得
- [ ] サーバーにデプロイスクリプト実行
- [ ] .envファイルに全ての値を設定
- [ ] SSL証明書を取得
- [ ] Azure BotにMessaging Endpoint設定
- [ ] Teams Appマニフェスト作成とアップロード
- [ ] Teamsでコマンド送信テスト成功
- [ ] DevRevにチケット作成確認

すべてチェックできたら完了です！
