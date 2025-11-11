# Teams App マニフェスト

このディレクトリには、Microsoft TeamsにBotをインストールするために必要なアプリマニフェストファイルが含まれています。

## 必要なファイル

1. **manifest.json** - アプリの設定ファイル（既に作成済み）
2. **color.png** - 192x192ピクセルのカラーアイコン
3. **outline.png** - 32x32ピクセルの白黒アウトラインアイコン

## アイコンの準備

### オプション1: 簡易アイコンの作成

ImageMagickを使用して簡単なアイコンを作成できます:

```bash
# ImageMagickのインストール（Ubuntu）
sudo apt-get install imagemagick

# カラーアイコンの作成（青い背景に白いテキスト）
convert -size 192x192 xc:#0078D4 \
  -font DejaVu-Sans-Bold -pointsize 80 -fill white \
  -gravity center -annotate +0+0 "休" \
  color.png

# アウトラインアイコンの作成（透明背景に白いテキスト）
convert -size 32x32 xc:transparent \
  -font DejaVu-Sans-Bold -pointsize 20 -fill white \
  -gravity center -annotate +0+0 "休" \
  outline.png
```

### オプション2: デザインツールを使用

- Canva、Figma、Adobe Illustratorなどのツールを使用
- カラーアイコン: 192x192ピクセル、PNG形式
- アウトラインアイコン: 32x32ピクセル、PNG形式、白色または透明背景推奨

### オプション3: サンプルアイコンのダウンロード

無料アイコンサイトから適切なアイコンをダウンロード:
- [Flaticon](https://www.flaticon.com/)
- [Icons8](https://icons8.com/)
- [Material Icons](https://fonts.google.com/icons)

## manifest.jsonの編集

1. `manifest.json` を開く
2. 以下の値を実際の値に置き換える:

```json
{
  "id": "YOUR_MICROSOFT_APP_ID",  // ← Azure BotのApp IDに置き換え
  "packageName": "com.yourcompany.leaverequest",  // ← 会社のドメインに置き換え
  "developer": {
    "name": "Your Company Name",  // ← 会社名に置き換え
    "websiteUrl": "https://your-domain.com",  // ← 実際のドメインに置き換え
    ...
  },
  "validDomains": [
    "your-domain.com"  // ← 実際のドメインに置き換え
  ]
}
```

## アプリパッケージの作成

すべてのファイルが揃ったら、ZIPファイルを作成します:

```bash
cd teams-manifest
zip -r teams-app.zip manifest.json color.png outline.png
```

## Teamsへのインストール

### 個人/開発環境用

1. Microsoft Teamsを開く
2. 左側のメニューから「アプリ」をクリック
3. 下部の「アプリの管理」をクリック
4. 「アプリをアップロード」→「カスタムアプリをアップロード」を選択
5. `teams-app.zip` を選択してアップロード
6. 「追加」をクリック

### 組織全体への展開

1. [Microsoft Teams管理センター](https://admin.teams.microsoft.com/)にアクセス
2. 「Teamsアプリ」→「アプリを管理」に移動
3. 「+アップロード」をクリック
4. `teams-app.zip` を選択
5. アプリの詳細を確認し、「送信」をクリック
6. アプリポリシーで適切なユーザーグループに割り当て

## トラブルシューティング

### アップロードエラー

- **エラー: "Invalid app package"**
  - manifest.jsonの構文エラーを確認
  - JSONバリデーターで検証: https://jsonlint.com/

- **エラー: "Icons are required"**
  - color.pngとoutline.pngが存在することを確認
  - ファイル名が正確に一致することを確認

- **エラー: "Icon dimensions are incorrect"**
  - color.png: 192x192ピクセル
  - outline.png: 32x32ピクセル

### 検証ツール

Microsoft Teams App Validatorを使用してマニフェストを検証:

```bash
npm install -g @microsoft/teams-manifest-validator

teams-manifest-validator manifest.json
```

## 参考リンク

- [Teams App Manifest Schema](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema)
- [Teams App Design Guidelines](https://docs.microsoft.com/microsoftteams/platform/concepts/design/design-teams-app-overview)
- [App Icons Guidelines](https://docs.microsoft.com/microsoftteams/platform/concepts/build-and-test/apps-package#app-icons)
