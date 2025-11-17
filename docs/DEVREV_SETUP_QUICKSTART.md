# DevRev カスタムオブジェクト クイックスタート

## 5分でセットアップ

### 前提条件
- DevRev アカウント
- DevRev API トークン
- `.env` ファイルに `DEVREV_API_TOKEN` を設定済み

---

## ステップ1: スキーマを作成（1分）

```bash
npm run devrev:setup-schema
```

**期待される出力:**
```
=== DevRev カスタムオブジェクト スキーマ設定 ===

ステップ1: カスタムオブジェクトのスキーマを定義
リーフタイプ: leave_request
サブタイプ: paid, unpaid

✅ スキーマ定義成功
{
  "schema": {
    "leaf_type": "leave_request",
    ...
  }
}

=== セットアップ完了 ===
```

---

## ステップ2: テスト実行（1分）

```bash
npm run test:devrev:custom
```

**期待される出力:**
```
=== DevRev カスタムオブジェクト テスト ===

1. 休暇申請カスタムオブジェクトの作成...
✅ カスタムオブジェクト作成成功！
   Object ID: don:core:...
   Display ID: LR-1

   DevRevで確認:
   https://app.devrev.ai/custom/LR-1

=== すべてのテストが成功しました！ ===
```

---

## ステップ3: DevRevで確認（1分）

1. ブラウザで DevRev を開く
2. Custom Objects セクションに移動
3. "leave_request" タイプのオブジェクトを確認
4. テストで作成されたオブジェクト（LR-1）をクリック

---

## ステップ4: Botをテスト（2分）

```bash
# Botを起動
npm run dev
```

別ターミナルで：
```bash
# トンネルを開始（開発環境の場合）
ngrok http 3978
# または
./dev-tunnel.sh
```

Teamsで：
1. Botに「休暇申請」を送信
2. フォームを入力
3. 送信
4. DevRevで新しいカスタムオブジェクトが作成されたことを確認

---

## トラブルシューティング

### エラー: "404 Not Found"

**原因:** スキーマが作成されていない

**解決:**
```bash
npm run devrev:setup-schema
```

### エラー: "401 Unauthorized"

**原因:** APIトークンが無効

**解決:**
```bash
# .envを確認
cat .env | grep DEVREV_API_TOKEN

# 新しいトークンをDevRevダッシュボードで生成
# .envを更新
nano .env
```

### エラー: "400 Bad Request - field_type not supported"

**原因:** スキーマ定義のフィールド型が正しくない

**解決:**
最新のスキーマスクリプトを使用していることを確認：
```bash
git pull origin main
npm run devrev:setup-schema
```

---

## 完了！

これで DevRev カスタムオブジェクトのセットアップが完了しました。

**次のステップ:**
- [DEVREV_CUSTOM_OBJECTS.md](DEVREV_CUSTOM_OBJECTS.md) - 詳細な実装ガイド
- カスタムオブジェクトにワークフローを追加
- ステータス変更時の通知を設定

---

**作成日**: 2025-01-11
