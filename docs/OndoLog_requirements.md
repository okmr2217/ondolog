# OndoLog 要件定義書

## 1. プロジェクト概要

### 1.1 目的

XIAO ESP32C3 + SHT40I使用温湿度センサーモジュールで計測したデータをAPIサーバー経由でDBに永続化し、Webアプリで時系列に閲覧できるようにする。欠損時にはメールでアラートを送る。複数拠点への設置拡張を見据えた設計とする。

### 1.2 全体構成

```
[XIAO ESP32C3 + SHT40I温湿度センサーモジュール] (複数台想定)
        │ WiFi / HTTPS POST (10分間隔, APIキー)
        ▼
┌─────────────────────────────────────────┐
│  Cloudflare Worker (ondolog.paritto.dev) │
│  ├─ Static Assets … Webアプリ (Vite+React) │
│  └─ Hono app … /api/* ルート               │
└─────────────────────────────────────────┘
        │ D1バインディング
        ▼
[Cloudflare D1]

[Cloudflare Workers Cron Trigger]
        │ 定期チェック（欠損の監視）
        ▼
[Resend] → 本人へメール通知
```

APIサーバー（Hono）とWebアプリ（Vite + React）は単一のCloudflare Workerにまとめてデプロイする（Workers Static Assetsで静的ファイル配信、`/api/*`をHonoが処理）。

---

## 2. 機能要件

### 2.1 デバイス側（概要）

デバイス側（センサー仕様、自己発熱対策、電源設計、ハードウェア試作・筐体計画など）の詳細は別ファイル **OndoLog_device_spec.md** に切り出した。本書には全体設計に関わる要点のみ記載する。

| 項目 | 内容 |
|---|---|
| 計測項目 | 温度（℃）、湿度（%RH）※CO2センサーは廃止 |
| センサー | SHT40I使用 高精度デジタル温湿度センサーモジュールキット（秋月電子 130207） |
| 計測間隔 | 10分 |
| 開発環境 | Arduino framework（PlatformIO + VSCode） |
| 通信方式 | WiFi経由でHTTPS POST |
| 電源 | Type-C給電（5V/1〜2A推奨）、常時給電。詳細検討は device_spec 参照 |

### 2.2 APIサーバー（Hono on Cloudflare Workers）

| エンドポイント | メソッド | 用途 | 認証 |
|---|---|---|---|
| `/api/devices/:deviceId/measurements` | POST | デバイスからの計測データ登録 | APIキー |
| `/api/measurements` | GET | 期間・デバイス指定での計測データ取得（`from`/`to`/`deviceId`クエリパラメータ） | Cloudflare Access（Web経由） |
| `/api/measurements/latest` | GET | デバイスごとの最新値取得 | 同上 |
| `/api/devices` | GET | 登録デバイス一覧取得（Web用、論理削除済みは除く） | 同上 |
| `/api/devices` | POST | デバイス新規登録・APIキー発行（管理画面用） | Cloudflare Access（Web経由） |
| `/api/devices/:id` | DELETE | デバイスの論理削除・無効化（管理画面用、物理削除は行わない） | Cloudflare Access（Web経由） |
| `/api/healthz` | GET | ヘルスチェック | 不要 |

- バリデーション: 温度・湿度の数値範囲チェックを行う（CO2は廃止のため対象外）。バリデーションエラーはフィールド単位のエラー情報（`fieldErrors`）を返す形式とする。
- タイムスタンプはサーバー側で付与（デバイスのRTC依存を避けるため）。
- `/api/measurements`のページネーションは、計測データ量が少量（1デバイス1日144件程度）であることから、offset/カーソル方式は採らず期間指定（`from`/`to`）とデバイス指定のみで絞り込む。

### 2.3 Webアプリ（Vite + React、Cloudflare Workerに同梱）

**画面構成（確定）**

| ページ | パス例 | 内容 |
|---|---|---|
| デバイス一覧 | `/` | 登録済みデバイスをカード表示（デバイス名・現在値のサマリ・最終受信時刻など） |
| デバイス詳細 | `/devices/:id` | カードクリックで遷移。時系列グラフ（24時間/7日間/30日間）、異常値ハイライト |
| デバイス管理（簡易管理画面） | `/admin/devices` | デバイスの新規登録、APIキー発行、削除（論理削除）・無効化 |

- 一覧ページのカードには温度・湿度の現在値と、最終データ受信時刻（欠損の目安）を表示。論理削除されたデバイスは一覧に表示しない。
- 管理画面はCloudflare Access配下（本人のみアクセス可）にあるため、追加の認証は不要。同一SPA内のルートで完結させる。
- APIキーは発行時に一度だけ画面に表示し、以降は再表示不可（DBには`api_key_hash`のみ保存する設計と整合）。

### 2.4 認証・アクセス制御

| 対象 | 方式 | 内容 |
|---|---|---|
| Webアプリ（閲覧） | **Cloudflare Access** | 登録対象は**本人のみ**。Emailアドレス指定のポリシーで許可（One-time PIN or 任意のIdP） |
| デバイス→API（送信） | **APIキー（確定）** | `devices.api_key_hash`と1対1で対応。ヘッダー`X-API-Key`で送信し、Honoミドルウェアでハッシュ照合 |

**APIキーの生成・ハッシュ化方針（確定）**: APIキーは32byteのランダム値（高エントロピー）として生成する。パスワードのような低エントロピーな秘密と異なり、低速ハッシュ（bcrypt/scrypt等）は不要と判断し、SHA-256でハッシュ化して`api_key_hash`に保存する。

**決定理由**: Web閲覧用に既にCloudflare Accessを導入するため、デバイス送信側にもAccess Applicationを追加すると管理系統が2つに増え複雑化する。APIキーなら既存スキーマだけで完結し、追加のCloudflare側設定が不要。個人利用・少数デバイスの前提ではシンプルさを優先。

→ 将来的にデバイス台数が増え鍵の配布・失効管理が煩雑になった場合は、Cloudflare Access Service Tokensへの移行を検討する（ヘッダーベースの認証チェックをミドルウェアで抽象化しておくと移行しやすい）。

### 2.5 欠損アラート（Resend経由メール通知）

温度・湿度の閾値による異常値アラートは行わず、**欠損（データが届かない）検知の通知のみ**実装する（廃止の経緯は7章参照）。

**確定値**

| 項目 | 内容 |
|---|---|
| 欠損判定 | 30分（10分間隔 × 3回分データが届かない） |
| クールダウン | 1時間 |
| 通知方法 | Resend経由でメール送信 |

**設計メモ**

- Cloudflare Workers Cron Triggerで10分おき（計測間隔と同じ）に定期実行し、各デバイスの最終データ受信時刻が30分以上前でないかチェックする。
- `alert_state`テーブルの`alert_type`は`missing_data`のみ使用し、最終通知時刻を記録してクールダウン（1時間）を判定する。
- クールダウン中に欠損状態が継続していても再通知しない仕様（cron側でシンプルに実装できる）。

---

## 3. データモデル

```sql
-- Drizzle ORM 想定（Cloudflare D1 / SQLite）

CREATE TABLE devices (
  id           TEXT PRIMARY KEY,              -- UUID文字列（crypto.randomUUID()）
  name         TEXT NOT NULL,                 -- 例: "自室", "リビング"
  api_key_hash TEXT NOT NULL,                 -- APIキーはSHA-256ハッシュ化して保存
  is_active    INTEGER NOT NULL DEFAULT 1,    -- 論理削除フラグ（0/1）
  last_seen_at INTEGER,                       -- 最終データ受信時刻（UNIX秒）
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE measurements (
  id           TEXT PRIMARY KEY,
  device_id    TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  temperature  REAL NOT NULL,                 -- ℃
  humidity     REAL NOT NULL,                 -- %RH
  recorded_at  INTEGER NOT NULL DEFAULT (unixepoch())  -- サーバー側で付与（UNIX秒）
);

CREATE INDEX idx_measurements_device_recorded ON measurements (device_id, recorded_at);

-- アラートのクールダウン管理用
CREATE TABLE alert_state (
  id              TEXT PRIMARY KEY,
  device_id       TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL,               -- 'missing_data' のみ使用
  last_alerted_at INTEGER,
  is_active       INTEGER NOT NULL DEFAULT 0,  -- 現在アラート中かどうか
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (device_id, alert_type)
);
```

- 温度・湿度は`real`型（単精度浮動小数点）で保存する。SHT40Iのセンサー精度（温度±0.2℃程度、湿度±1.8%RH程度）に対し、`numeric`のような正確な10進数型はオーバースペックと判断。

---

## 4. 非機能要件

| 項目 | 内容 |
|---|---|
| データ保持期間 | 無期限保存（1レコード/10分・2指標で、1デバイスあたり年間 約5万行。複数台でも十分小規模） |
| レイテンシ | Web表示で数百ms程度で問題なし |
| 可用性 | 個人利用のため高可用性は不要 |
| セキュリティ | デバイスAPIキー・Resend APIキーなどはCloudflare Workers Secretsで管理 |
| 監視 | 欠損アラートで代替（2.5） |

---

## 5. デプロイ構成（確定）

| コンポーネント | 構成 |
|---|---|
| API・Webアプリ（Hono + Vite/React） | 単一のCloudflare Worker（Workers Static Assets） |
| DB | Cloudflare D1（SQLite、Workerと同一プラットフォームにバインディング） |
| ORM | Drizzle ORM |
| Web認証 | Cloudflare Access（本人のみ） |
| デバイス→API認証 | APIキー（確定。32byteランダム値をSHA-256ハッシュ化。将来Service Token移行も視野） |
| 定期処理（アラート） | Cloudflare Workers Cron Trigger |
| メール通知 | Resend |
| デバイスファームウェア | Arduino framework（PlatformIO + VSCode） |

---

## 6. 残課題（未決定）

なし。要件は全項目確定済み。実装フェーズで詳細（UIの見た目、グラフのライブラリ選定等）を詰めていく。

---

## 7. スコープ外（明示的に対象外）

- CO2濃度測定（当初SCD40を予定していたが廃止。温度・湿度のみを計測対象とする）
- 温度・湿度の閾値による異常値アラート（当初は温度5℃未満/35℃以上、湿度20%未満/85%以上での通知を想定していたが、実装の複雑化を避けるため廃止。欠損検知のみ実装する）
- バッテリー駆動・省電力設計
- 本人以外への閲覧権限付与
- CO2以外のガスセンサー等の追加拡張
