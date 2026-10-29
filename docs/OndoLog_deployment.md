# OndoLog デプロイ・インフラ設計書

## 1. インフラ概要

| 項目 | 内容 |
|---|---|
| ホスティング | Cloudflare Workers（単一Worker、`apps/`配下） |
| ドメイン | `ondolog.paritto.dev`（Cloudflare管理ゾーン`paritto.dev`のカスタムドメイン） |
| DB | Cloudflare D1（データベース名`ondolog`） |
| 静的アセット配信 | Workers Static Assets（`apps/web/dist`をバインディング`ASSETS`として配信） |
| 定期実行 | Cloudflare Workers Cron Trigger（`*/10 * * * *`、欠損監視） |
| メール送信 | Resend（`RESEND_API_KEY`をシークレットとして保持） |
| Web認証 | Cloudflare Access（ダッシュボード側で設定。コード側では未設定） |

Worker名は`ondolog`（`apps/wrangler.jsonc`の`name`）。ルーティング設定は`apps/wrangler.jsonc`を参照。

## 2. 前提条件

- `wrangler login`で対象のCloudflareアカウントに認証済みであること（`wrangler whoami`で確認）
- ゾーン`paritto.dev`がそのアカウントに追加済み・有効化済みであること
- D1データベース`ondolog`が作成済みであること（`wrangler d1 create ondolog`は実施済み。`apps/wrangler.jsonc`の`database_id`を参照）

## 3. 初回デプロイ手順

すべて`apps/`ディレクトリで実行する。

```bash
# 1. Webアプリをビルド（apps/web/distに出力）
cd apps/web && npm run build && cd ..

# 2. リモートD1にマイグレーションを適用
npm run db:migrate:remote

# 3. Resend APIキーをシークレットとして設定（ローカルの.dev.varsの値を流用する場合）
grep "^RESEND_API_KEY=" .dev.vars | cut -d= -f2- | npx wrangler secret put RESEND_API_KEY

# 4. デプロイ（Worker作成＋ondolog.paritto.devへのカスタムドメイン紐付け）
npx wrangler deploy
```

初回のみ、カスタムドメインのDNSレコード・証明書発行が完了するまで数十秒〜数分かかることがある（`https://ondolog.paritto.dev/`が名前解決できるまで待つ）。

## 4. 通常運用時の再デプロイ手順

スキーマ変更・Webビルド成果物の更新を反映する場合：

```bash
cd apps/web && npm run build && cd ..
npm run db:migrate:remote   # スキーマ変更があれば
npx wrangler deploy
```

シークレット（`RESEND_API_KEY`）は変更がない限り再設定不要。

## 5. シークレット・環境変数一覧

| 名前 | 種別 | 設定方法 | 用途 |
|---|---|---|---|
| `MISSING_DATA_THRESHOLD_MINUTES` | vars（平文） | `wrangler.jsonc`に直書き | 欠損判定の閾値（分） |
| `ALERT_COOLDOWN_MINUTES` | vars（平文） | `wrangler.jsonc`に直書き | アラート再送のクールダウン（分） |
| `ALERT_EMAIL_TO` | vars（平文） | `wrangler.jsonc`に直書き | アラート送信先 |
| `ALERT_EMAIL_FROM` | vars（平文） | `wrangler.jsonc`に直書き | アラート送信元 |
| `RESEND_API_KEY` | secret（機密） | `wrangler secret put RESEND_API_KEY` | Resend API認証 |

`vars`はダッシュボードから変更しない前提（`wrangler deploy`のたびに`wrangler.jsonc`の値で上書きされる）。

## 6. Cloudflare Access設定手順

Web閲覧ルート（`/`, `/devices/:id`, `/admin/devices`など）は本人のみアクセス可能にする。一方、以下の2つはAccessの保護対象から除外し、それぞれ別の方式で守る。

- デバイスからの計測データ送信エンドポイント（`POST /api/devices/:deviceId/measurements`）— APIキー認証のみで完結させる必要がある
- ヘルスチェック（`GET /api/health`）— 設計上「認証不要」（`OndoLog_software_design.md` §5）。UptimeRobotなど外部監視サービスから叩けるようにするため、対話的ログインを要求してはいけない

Cloudflare Accessはパスパターンごとにアプリケーションを分けて設定できるため、以下の順で3つのアプリケーションを作成する。

### 6.1 デバイス送信エンドポイントの除外（先に作成）

1. Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**
2. Application name: 例 `OndoLog Device Ingest`
3. Application domain: `ondolog.paritto.dev`、Path: `/api/devices/*/measurements`
4. Policies: Action **Bypass** のポリシーを1つ作成（誰でも通過、Access認証をかけない）
5. 保存

### 6.2 ヘルスチェックの除外（先に作成）

1. 同様に **Add an application** → **Self-hosted**
2. Application name: 例 `OndoLog Health`
3. Application domain: `ondolog.paritto.dev`、Path: `/api/health`
4. Policies: Action **Bypass** のポリシーを1つ作成
5. 保存

### 6.3 Web全体の保護

1. 同様に **Add an application** → **Self-hosted**
2. Application name: 例 `OndoLog Web`
3. Application domain: `ondolog.paritto.dev`、Path: 空欄（`/*`相当、全パス対象）
4. Session duration: 任意（例: 24時間）
5. Policies: Action **Allow** のポリシーを作成
   - Include: **Emails** → 自分のメールアドレス（`okumuradaichi2007@gmail.com`）を指定
   - 追加のIdP連携は不要。デフォルトのOne-time PIN（メールにワンタイムコードが届く方式）で認証できる
6. 保存

より限定的なパスパターン（6.1・6.2）が優先されるため、先にBypassアプリケーションを2つ作ってから全体保護アプリケーションを作る順序が重要。設定後は`/api/devices/*/measurements`と`/api/health`以外の全パスがCloudflareのログイン画面（One-time PIN）を経由するようになる。

### 6.4 動作確認

- ブラウザで`https://ondolog.paritto.dev/`を開き、Cloudflareのログイン画面（メールアドレス入力→ワンタイムコード）が出ることを確認
- 登録したメールアドレス以外では拒否されることを確認
- デバイス側（ファームウェア）からの`POST /api/devices/:deviceId/measurements`がAccessのログイン画面を経由せず、APIキーのみで通ることを確認
- `curl https://ondolog.paritto.dev/api/health` がAccessのログイン画面を経由せず、`{"status":"ok","checks":{"db":"ok"}}`を直接返すことを確認（UptimeRobot等の外部監視で使う想定）。D1に接続できない場合は503と`{"status":"error","checks":{"db":"error"}}`を返す

## 7. デプロイ後の動作確認チェックリスト

- [x] `GET /api/health` が200を返す
- [x] `/`, `/devices/:id`, `/admin/devices` がSPAとして正しく表示される（直接アクセスでも404にならない）
- [x] `GET /api/devices` が空配列または登録済みデバイスを返す
- [x] Cron Trigger（`*/10 * * * *`）がCloudflareダッシュボードの「Triggers」に表示されている
- [x] Cloudflare Access設定後、Web閲覧ルートが認証なしでは開けないことを確認
