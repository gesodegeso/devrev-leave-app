# Teams アプリ権限エラーのトラブルシューティング

## エラーメッセージ

```
ここでは、このアプリを使用するためのアクセス許可がありません。
このアプリを自分用にインストールする方法について説明します
```

このエラーが発生する原因と解決方法を説明します。

---

## 原因の特定

このエラーは**マルチテナント設定の問題ではなく**、以下のいずれかが原因です:

### 原因1: Teamsアプリポリシーの反映遅延（最も一般的）

**症状:**
- Teams管理センターで設定を変更済み
- 数時間経過しても反映されない

**理由:**
- Teamsのポリシー反映には**最大24時間**かかることがある
- キャッシュの影響で即座に反映されない

### 原因2: ポリシーの設定範囲が間違っている

**症状:**
- グローバルポリシーは変更したが、ユーザー固有のポリシーが適用されている

### 原因3: 管理者権限の不足

**症状:**
- Teams管理者権限がない
- 特定のアプリに対する権限がない

---

## 解決方法

### 方法1: ポリシーの即座適用（推奨）

Teams管理センターで強制的に反映させます。

#### ステップ1: ユーザーに直接ポリシー割り当て

1. [Teams管理センター](https://admin.teams.microsoft.com/) にアクセス
2. **ユーザー** → **ユーザーの管理**
3. 自分のユーザー名を検索してクリック
4. **ポリシー**タブを選択
5. **アプリ セットアップ ポリシー**を確認

**現在の設定を確認:**
```
アプリ セットアップ ポリシー: グローバル (組織全体の既定値)
```

または特定のポリシー名が表示されている

#### ステップ2: 新しいカスタムポリシーを作成

1. **Teams アプリ** → **セットアップ ポリシー**
2. **+ 追加**をクリック
3. 以下を入力:

```
名前: 開発者向けBot許可
説明: カスタムアプリとBotの使用を許可

設定:
☑ ユーザーがカスタム アプリをアップロードできるようにする
☑ ユーザーがカスタム アプリと対話できるようにする
```

4. **保存**をクリック

#### ステップ3: 自分のユーザーにポリシーを割り当て

1. **ユーザー** → **ユーザーの管理**
2. 自分のユーザー名を検索
3. **ポリシー**タブ
4. **編集**をクリック
5. **アプリ セットアップ ポリシー**: 「開発者向けBot許可」を選択
6. **適用**をクリック

#### ステップ4: PowerShellで即座反映（最速）

Teams PowerShellを使用すると即座に反映できます。

**PowerShellモジュールのインストール（初回のみ）:**

```powershell
# 管理者権限でPowerShellを起動
Install-Module -Name MicrosoftTeams -Force -AllowClobber

# または既にインストール済みの場合は更新
Update-Module -Name MicrosoftTeams
```

**ポリシーを適用:**

```powershell
# Teamsに接続
Connect-MicrosoftTeams

# ユーザーを確認（自分のメールアドレス）
Get-CsOnlineUser -Identity "your-email@domain.com" | Select DisplayName, TeamsAppSetupPolicy

# カスタムポリシーを適用
Grant-CsTeamsAppSetupPolicy -Identity "your-email@domain.com" -PolicyName "開発者向けBot許可"

# または、カスタムアプリアップロードを直接許可
Grant-CsTeamsAppSetupPolicy -Identity "your-email@domain.com" -PolicyName "AllowUserPinning"
```

**確認:**

```powershell
# ポリシーが適用されたか確認
Get-CsOnlineUser -Identity "your-email@domain.com" | Select TeamsAppSetupPolicy
```

---

### 方法2: グローバルポリシーの確認と修正

#### Teams管理センターでグローバルポリシーを確認

1. [Teams管理センター](https://admin.teams.microsoft.com/)
2. **Teams アプリ** → **セットアップ ポリシー**
3. **グローバル (組織全体の既定値)** をクリック

**必須設定:**

```
☑ ユーザーがカスタム アプリをアップロードできるようにする
☑ ユーザーがカスタム アプリと対話できるようにする
```

4. **保存**をクリック

#### 組織のアプリ設定を確認

1. **Teams アプリ** → **アプリを管理**
2. **組織全体のアプリ設定**をクリック（右上）

**確認事項:**

```
☑ カスタム アプリとの対話を許可する
☑ 独自のカスタム アプリをアップロードまたはサイドロードすることをユーザーに許可する
```

3. **保存**をクリック

---

### 方法3: キャッシュクリアと再ログイン

ポリシーは適用されているが、キャッシュで古い設定が残っている場合。

#### ブラウザキャッシュのクリア

**Microsoft Edge:**
```
1. Ctrl+Shift+Delete
2. 「キャッシュされた画像とファイル」を選択
3. 「クリア」をクリック
4. Teamsを再読み込み
```

**Google Chrome:**
```
1. Ctrl+Shift+Delete
2. 「キャッシュされた画像とファイル」を選択
3. 「データを削除」をクリック
4. Teamsを再読み込み
```

#### Teamsデスクトップアプリのキャッシュクリア

**Windows:**

```powershell
# Teamsを完全終了
Stop-Process -Name Teams -Force

# キャッシュを削除
Remove-Item -Path "$env:APPDATA\Microsoft\Teams\Cache" -Recurse -Force
Remove-Item -Path "$env:APPDATA\Microsoft\Teams\blob_storage" -Recurse -Force
Remove-Item -Path "$env:APPDATA\Microsoft\Teams\databases" -Recurse -Force
Remove-Item -Path "$env:APPDATA\Microsoft\Teams\GPUcache" -Recurse -Force
Remove-Item -Path "$env:APPDATA\Microsoft\Teams\IndexedDB" -Recurse -Force
Remove-Item -Path "$env:APPDATA\Microsoft\Teams\Local Storage" -Recurse -Force
Remove-Item -Path "$env:APPDATA\Microsoft\Teams\tmp" -Recurse -Force

# Teamsを再起動
Start-Process "$env:LOCALAPPDATA\Microsoft\Teams\current\Teams.exe"
```

**macOS:**

```bash
# Teamsを終了
killall Teams

# キャッシュを削除
rm -rf ~/Library/Application\ Support/Microsoft/Teams/Cache
rm -rf ~/Library/Application\ Support/Microsoft/Teams/blob_storage
rm -rf ~/Library/Application\ Support/Microsoft/Teams/databases
rm -rf ~/Library/Application\ Support/Microsoft/Teams/IndexedDB
rm -rf ~/Library/Application\ Support/Microsoft/Teams/Local\ Storage
rm -rf ~/Library/Application\ Support/Microsoft/Teams/tmp

# Teamsを再起動
open -a "Microsoft Teams"
```

#### 完全な再ログイン

1. Teamsから完全にサインアウト
2. ブラウザのキャッシュをクリア
3. ブラウザを再起動
4. Teamsに再ログイン

---

### 方法4: 回避策 - アプリマニフェストを直接アップロード

Azure Bot ChannelでTeamsチャネルを有効化できなくても、Teams Appマニフェストを直接アップロードすればBotは動作します。

#### ステップ1: Azure Botで基本設定のみ

Azure Botリソースでは、Teamsチャネルの有効化をスキップします。

**最低限必要な設定:**
- ✅ App ID登録済み
- ✅ Messaging endpoint設定済み

#### ステップ2: Teams Appマニフェストを作成

```bash
cd teams-manifest

# manifest.jsonを編集
nano manifest.json

# botIdにApp IDを設定
"botId": "YOUR_MICROSOFT_APP_ID"

# アイコン作成
./create-icons.sh

# Zipパッケージ作成
zip -r teams-app.zip manifest.json color.png outline.png
```

#### ステップ3: 直接Teamsにアップロード

**個人用（開発・テスト）:**

1. Microsoft Teams（Web版推奨）を開く
   ```
   https://teams.microsoft.com
   ```

2. 左メニュー「アプリ」をクリック

3. 下部の「アプリの管理」をクリック

4. 「アプリをアップロード」→「カスタム アプリをアップロード」

5. `teams-app.zip`を選択

6. 「追加」または「自分用に追加」をクリック

**これでBotが使用可能になります。**

---

## 診断手順

問題を特定するための診断手順:

### 1. 現在のポリシーを確認

```powershell
Connect-MicrosoftTeams
Get-CsOnlineUser -Identity "your-email@domain.com" | Select TeamsAppSetupPolicy, TeamsAppPermissionPolicy
```

### 2. 組織設定を確認

Teams管理センター:
```
Teams アプリ → アプリを管理 → 組織全体のアプリ設定

確認:
☑ カスタム アプリとの対話を許可する
☑ カスタム アプリのアップロードを許可する
```

### 3. ユーザーのロールを確認

```powershell
Get-MsolUser -UserPrincipalName "your-email@domain.com" | Select Roles
```

必要なロール:
- Teams管理者
- または グローバル管理者

---

## よくある質問

### Q1: 7時間経過しても反映されないのは異常ですか？

**A:** いいえ、Teamsポリシーは最大24時間かかることがあります。ただし、PowerShellで直接適用すれば即座に反映されます。

### Q2: マルチテナント設定は正しいですか？

**A:** はい、このエラーはマルチテナント設定とは無関係です。App Registrationでマルチテナントを選択していれば問題ありません。

確認方法:
```
Azure Portal
→ Microsoft Entra ID
→ アプリの登録
→ teams-leave-bot
→ 概要

サポートされているアカウントの種類:
「任意の組織ディレクトリ内のアカウント (マルチテナント)」
```

### Q3: Azure BotでTeamsチャネルを有効化しなくてもBotは動きますか？

**A:** はい、動きます。Teams Appマニフェストを直接アップロードすれば、Azure BotのTeamsチャネル設定は不要です。

### Q4: 「開発者モード」は関係ありますか？

**A:** いいえ、Teamsの「開発者プレビュー」とは別の設定です。カスタムアプリのアップロード許可が重要です。

---

## 推奨される解決順序

最速で解決する順序:

### 1. PowerShellで即座適用（5分）

```powershell
Install-Module -Name MicrosoftTeams
Connect-MicrosoftTeams
Grant-CsTeamsAppSetupPolicy -Identity "your-email@domain.com" -PolicyName "AllowUserPinning"
```

### 2. キャッシュクリア + 再ログイン（10分）

- Teamsキャッシュ削除
- 完全再ログイン

### 3. マニフェスト直接アップロード（回避策）（5分）

```bash
cd teams-manifest
zip -r teams-app.zip manifest.json color.png outline.png
```

Teams Web版で直接アップロード

### 4. 24時間待つ

グローバルポリシーを設定して24時間待つ（最も確実だが遅い）

---

## 確認コマンド集

### PowerShellで現在の設定を確認

```powershell
# 接続
Connect-MicrosoftTeams

# ユーザーのポリシーを確認
Get-CsOnlineUser -Identity "your-email@domain.com" | Format-List DisplayName, TeamsAppSetupPolicy, TeamsAppPermissionPolicy

# グローバルポリシーを確認
Get-CsTeamsAppSetupPolicy -Identity Global

# 利用可能なポリシーを一覧表示
Get-CsTeamsAppSetupPolicy

# ポリシーの詳細を確認
Get-CsTeamsAppSetupPolicy -Identity "開発者向けBot許可" | Format-List
```

---

## まとめ

### 原因

❌ マルチテナント設定の問題**ではない**
✅ Teamsアプリポリシーの反映遅延または設定漏れ

### 最速の解決方法

**Option 1: PowerShell（推奨）**
```powershell
Grant-CsTeamsAppSetupPolicy -Identity "your-email@domain.com" -PolicyName "AllowUserPinning"
```

**Option 2: 直接アップロード（回避策）**
Azure BotのTeamsチャネル設定をスキップして、Teams Appマニフェストを直接アップロード

### 待つ場合

グローバルポリシー設定後、最大24時間待つ

---

## 次のステップ

1. ✅ 上記のいずれかの方法を実施
2. ✅ Teamsでマニフェストをアップロード
3. ✅ Botとチャットしてテスト

問題が解決しない場合は、組織のTeams管理者に連絡してください。

---

**参考リンク:**
- [Microsoft Docs: Teams アプリのセットアップ ポリシー](https://learn.microsoft.com/ja-jp/microsoftteams/teams-app-setup-policies)
- [Microsoft Docs: カスタム アプリのポリシー](https://learn.microsoft.com/ja-jp/microsoftteams/teams-custom-app-policies-and-settings)

**最終更新**: 2025-01-10
