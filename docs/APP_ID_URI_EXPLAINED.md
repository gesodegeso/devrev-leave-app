# アプリケーション ID URI の詳細説明

## なぜ `api://botid-{APP_ID}` が必要か

Microsoft Teams BotとしてApp Registrationを認識させるために、特定の形式のアプリケーションID URIを設定する必要があります。

---

## 基本概念

### アプリケーション ID URI とは

**アプリケーション ID URI（Application ID URI）** は、Azureアプリケーションを一意に識別するためのグローバルユニークな識別子です。

```
通常のアプリケーション:
api://your-app-name

Teams Bot:
api://botid-{APPLICATION_ID}  ← 特別な形式が必要
```

### Bot Framework の要件

Bot Frameworkは、Botアプリケーションであることを認識するために、以下の形式を要求します:

```
api://botid-{APPLICATION_ID}
```

**`botid-` プレフィックスが重要**
- これによりBot Framework Serviceが「このアプリはBotである」と認識
- Teams チャネルとの統合が可能になる

---

## 設定手順（画像付き詳細解説）

### ステップ1: App Registrationを開く

1. [Azure Portal](https://portal.azure.com) にアクセス
2. 検索バーで「**Microsoft Entra ID**」を検索
3. 左メニュー「**アプリの登録**」をクリック
4. 作成したアプリ（例: `teams-leave-bot`）をクリック

### ステップ2: APIの公開に移動

左側のメニューから「**APIの公開**」（または "Expose an API"）をクリック

```
アプリの概要
├── 概要
├── クイック スタート
├── 認証
├── 証明書とシークレット
├── APIの公開 ← ここをクリック
├── APIのアクセス許可
└── ...
```

### ステップ3: アプリケーション ID URI を追加

画面上部に「**アプリケーション ID URI**」セクションがあります。

**初期状態:**
```
アプリケーション ID URI
未定義
[追加] ボタン
```

**「追加」ボタンをクリック**

### ステップ4: デフォルト値の確認

Azureが自動的に以下の形式を提案します:

```
api://12345678-1234-1234-1234-123456789abc
```

または

```
api://default.azure.com/12345678-1234-1234-1234-123456789abc
```

**⚠️ このデフォルト値は使用しません！**

### ステップ5: Bot用の形式に変更

提案された値を以下に変更:

```
変更前: api://12345678-1234-1234-1234-123456789abc
変更後: api://botid-12345678-1234-1234-1234-123456789abc
```

**重要なポイント:**
- `api://` の直後に `botid-` を追加
- その後にApplication (client) IDを続ける
- ハイフンを忘れずに: `botid-` （`botid` だけではない）

### ステップ6: 保存

「**保存**」ボタンをクリック

設定後の表示:
```
アプリケーション ID URI
api://botid-12345678-1234-1234-1234-123456789abc
[編集] ボタン
```

---

## 実際の例

### 例1: 完全な設定例

```
Application (client) ID:
a1b2c3d4-e5f6-7890-abcd-ef1234567890

設定するアプリケーション ID URI:
api://botid-a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 例2: 間違った設定

❌ **間違い 1: botid- プレフィックスがない**
```
api://a1b2c3d4-e5f6-7890-abcd-ef1234567890
```
→ Bot Frameworkが認識できません

❌ **間違い 2: ハイフンがない**
```
api://botida1b2c3d4-e5f6-7890-abcd-ef1234567890
```
→ 形式が正しくありません

❌ **間違い 3: IDが間違っている**
```
api://botid-wrong-id-here
```
→ Application IDと一致しません

✅ **正しい設定**
```
api://botid-a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## なぜこの設定が必要か（技術的背景）

### 1. OAuth 2.0 の仕組み

Teams Botは、OAuth 2.0プロトコルを使用して認証します。

```
ユーザー → Teams → Bot Framework Service → あなたのBot
                    ↑
                    認証・認可が必要
```

アプリケーション ID URIは、この認証プロセスで**リソース識別子**として機能します。

### 2. Bot Framework Service の要件

Microsoft Bot Framework Serviceは、以下を確認します:

```
1. アプリケーションがApp Registrationに登録されているか
2. アプリケーション ID URIが api://botid-{ID} 形式か
3. Application IDと一致しているか
```

これらすべてが揃って初めて、Teams Botとしてメッセージをルーティングできます。

### 3. セキュリティの観点

`botid-` プレフィックスにより:
- Botアプリケーションであることを明示
- 通常のWebアプリケーションと区別
- 適切な権限スコープの適用

---

## トラブルシューティング

### エラー: "The bot is not registered"

**症状:**
Teamsでメッセージを送っても、Botが応答しない

**原因:**
アプリケーション ID URIが設定されていないか、形式が間違っている

**解決方法:**
1. App Registration → APIの公開を開く
2. アプリケーション ID URIが `api://botid-{APP_ID}` 形式か確認
3. Application IDと一致しているか確認

### エラー: "401 Unauthorized"

**症状:**
Botがメッセージを受信すると401エラーが発生

**原因:**
Application IDまたはアプリケーションID URIの不一致

**解決方法:**
```bash
# .envファイルを確認
cat .env

# MICROSOFT_APP_IDが、App RegistrationのApplication IDと一致しているか確認
```

Application ID URI:
```
api://botid-{.envのMICROSOFT_APP_IDと同じ値}
```

### エラー: "The application ID URI is invalid"

**症状:**
保存時にエラーが表示される

**原因:**
形式が間違っている

**正しい形式:**
```
api://botid-{GUID形式のID}

例: api://botid-12345678-1234-1234-1234-123456789abc
```

**間違った形式:**
```
❌ https://botid-...
❌ api://bot-...
❌ api://botid...（ハイフンなし）
❌ botid-...（api://なし）
```

---

## 確認手順

設定が正しいか確認する方法:

### 1. Azure Portalで確認

```
App Registration → APIの公開

アプリケーション ID URI:
api://botid-{YOUR_APP_ID}

✓ api:// で始まっている
✓ botid- プレフィックスがある
✓ Application IDと一致している
```

### 2. Application IDを確認

```
App Registration → 概要

アプリケーション (クライアント) ID:
12345678-1234-1234-1234-123456789abc

↓ これを使って

api://botid-12345678-1234-1234-1234-123456789abc
```

### 3. .envファイルと一致しているか確認

```bash
# .envファイルを開く
nano .env
```

```env
MICROSOFT_APP_ID=12345678-1234-1234-1234-123456789abc
                 ↑
                 これと一致
```

```
アプリケーション ID URI:
api://botid-12345678-1234-1234-1234-123456789abc
            ↑
            botid-の後がMICROSOFT_APP_IDと同じ
```

---

## よくある質問

### Q1: なぜ `api://` が必要ですか？

**A:** OAuth 2.0のリソース識別子はURI形式である必要があります。`api://` は、これがAPIリソースであることを示すスキームです。

### Q2: `botid-` の代わりに他の名前は使えますか？

**A:** いいえ、使えません。Bot Framework Serviceは `botid-` プレフィックスを明示的に要求します。これは固定の仕様です。

### Q3: 複数のBot用に異なるIDを使えますか？

**A:** はい、各Botには異なるApplication IDが割り当てられるため、それぞれに異なるアプリケーションID URIを設定します。

```
Bot A: api://botid-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
Bot B: api://botid-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
```

### Q4: 後から変更できますか？

**A:** はい、いつでも変更できます。ただし、変更後はBot Frameworkサービスが新しいURIを認識するまで数分かかる場合があります。

### Q5: カスタムドメインは使えますか？

**A:** 高度なシナリオでは可能ですが、基本的には `api://botid-{APP_ID}` の形式を推奨します。

```
高度な例（非推奨）:
api://your-domain.com/botid-{APP_ID}

基本（推奨）:
api://botid-{APP_ID}
```

---

## 設定チェックリスト

Botをデプロイする前に、以下を確認してください:

- [ ] App Registrationが作成済み
- [ ] Application (client) IDをコピー済み
- [ ] クライアントシークレット作成済み
- [ ] 「APIの公開」→ アプリケーションID URI を設定
- [ ] URI が `api://botid-{APP_ID}` 形式
- [ ] `botid-` のハイフンがある
- [ ] Application IDと一致している
- [ ] 保存済み
- [ ] .envファイルのMICROSOFT_APP_IDと一致

すべてチェックできたら、Botのセットアップに進めます！

---

## まとめ

```
必要な設定:
api://botid-{YOUR_APPLICATION_ID}

例:
Application ID: 12345678-1234-1234-1234-123456789abc
        ↓
設定値: api://botid-12345678-1234-1234-1234-123456789abc

重要ポイント:
✓ api:// で始まる
✓ botid- プレフィックス（ハイフン忘れずに）
✓ Application IDと完全一致
✓ .envのMICROSOFT_APP_IDと同じ値
```

この設定により、あなたのApp RegistrationがTeams Botとして正しく認識されます。

---

## 参考リンク

- [Microsoft Docs: Application ID URI](https://docs.microsoft.com/azure/active-directory/develop/security-best-practices-for-app-registration#application-id-uri)
- [Bot Framework: Authentication](https://docs.microsoft.com/azure/bot-service/bot-builder-authentication)
- [Teams Bot Registration](https://docs.microsoft.com/microsoftteams/platform/bots/how-to/authentication/auth-aad-sso-bots)

---

**最終更新**: 2025-01-10
