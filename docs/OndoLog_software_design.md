# OndoLog ソフトウェア設計書

## 1. 概要

| 項目 | 内容 |
|---|---|
| プロジェクト名 | OndoLog |
| ドメイン | ondolog.paritto.dev |
| 目的 | XIAO ESP32C3 + SHT40Iで計測した温湿度データをAPIサーバー経由でDBに永続化し、Webアプリで時系列に閲覧する。異常値・欠損時にはメールでアラート送信 |

要件（機能要件・データモデル・非機能要件）の詳細は `OndoLog_requirements.md`、デバイス側のハードウェア仕様は `OndoLog_device_spec.md` を参照。本書はソフトウェア（API・Webアプリ）側の設計に絞って記載する。

## 2. デプロイアーキテクチャ

### 2.1 構成方針（確定）

APIサーバー（Hono）とWebアプリ（Vite + React）を **単一のCloudflare Workerにまとめてデプロイする**。Cloudflare Workers Static Assetsを使い、Workerが以下の両方を担う。

- ビルド済みReact SPA（静的ファイル）の配信
- `/api/*` 配下の動的リクエスト処理（Hono）

```
[XIAO ESP32C3 + SHT40I] (複数台)
        │ WiFi / HTTPS POST (10分間隔, APIキー)
        ▼
┌─────────────────────────────────────┐
│  Cloudflare Worker (ondolog.paritto.dev) │
│  ├─ Static Assets (dist/) … React SPA   │
│  └─ Hono app … /api/* ルート            │
└─────────────────────────────────────┘
        │ D1バインディング
        ▼
[Cloudflare D1]

[Cloudflare Workers Cron Trigger] → 欠損監視 → [Resend] → メール通知
```

### 2.2 従来案（Workers + Pages分離）からの変更理由

- デプロイが1回のオペレーションで完結し、API更新とWeb更新のズレが発生しない
- 同一オリジンになるためCORS設定が不要
- Cloudflare Accessはパス単位で制御できるため、単一Worker化してもWeb閲覧ルートの保護／デバイス送信用エンドポイントのAPIキー認証の使い分けは維持できる

### 2.3 プロジェクト構成（確定）

```
ondolog/
├── src/
│   ├── index.ts               # Honoアプリのエントリーポイント（fetch, scheduledをexport）
│   ├── routes/
│   │   ├── measurements.ts    # POST /api/devices/:deviceId/measurements
│   │   │                      # GET  /api/measurements
│   │   │                      # GET  /api/measurements/latest
│   │   ├── devices.ts         # GET/POST /api/devices, DELETE /api/devices/:id
│   │   └── healthz.ts         # GET /api/healthz
│   ├── middleware/
│   │   └── apiKeyAuth.ts      # X-API-Keyヘッダー検証 → api_key_hashと照合するミドルウェア
│   ├── db/
│   │   ├── schema.ts          # Drizzle ORM スキーマ定義
│   │   └── client.ts          # D1バインディング経由の接続
│   ├── lib/
│   │   ├── alert.ts           # 欠損判定・クールダウン判定ロジック
│   │   ├── resend.ts          # Resend送信ラッパー
│   │   ├── validation.ts      # zodによるリクエストバリデーション定義
│   │   └── apiKey.ts          # APIキー生成（crypto.randomBytes）・SHA-256ハッシュ化
│   └── cron.ts                # Cron Triggerハンドラ本体（10分毎に欠損チェック→alert.ts呼び出し）
├── web/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.tsx          # "/" デバイス一覧
│   │   │   ├── devices.$id.tsx    # "/devices/:id" デバイス詳細
│   │   │   └── admin.devices.tsx  # "/admin/devices" デバイス管理
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── bottom-nav.tsx      # モバイル用ナビ（モバイル表示のみ）
│   │   │   │   ├── sidebar.tsx         # PC用ナビ（PC表示のみ）
│   │   │   │   └── mobile-header.tsx   # モバイル用ヘッダー（モバイル表示のみ）
│   │   │   ├── ui/                     # shadcn/uiコンポーネント
│   │   │   ├── device-card.tsx         # 一覧のカード（温湿度・状態・最終受信時刻）
│   │   │   ├── device-chart.tsx        # shadcnのchart（24h/7d/30d切り替え、異常値ハイライト）
│   │   │   └── api-key-display.tsx     # 発行時一度だけ表示するAPIキー表示
│   │   ├── lib/
│   │   │   └── api.ts              # /api/* へのfetchラッパー（同一オリジンなのでbaseURL不要）
│   │   └── main.tsx
│   └── vite.config.ts
├── drizzle/                    # drizzle-kit generateで出力されるマイグレーションSQL
├── drizzle.config.ts           # drizzle-kit設定（schema.ts参照、dialect: "sqlite"）
├── docs/                       # 設計・要件ドキュメント一式（本書、requirements、device_spec）
├── CLAUDE.md                   # 実装時の確定事項サマリ（Claude Code引き継ぎ用）
└── wrangler.jsonc
```

- コンポーネントのファイル名はkebab-caseで統一する（例: `bottom-nav.tsx`）。PascalCaseは使わない。

```jsonc
// wrangler.jsonc（イメージ）
{
  "name": "ondolog",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-20",
  "routes": [{ "pattern": "ondolog.paritto.dev", "custom_domain": true }],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ondolog",
      "database_id": "<wrangler d1 create実行後に発行されるID>"
    }
  ],
  "triggers": { "crons": ["*/10 * * * *"] }
}
```

## 3. 技術スタック

| 領域 | 技術 |
|---|---|
| APIフレームワーク | Hono |
| 実行環境 | Cloudflare Workers |
| フロントエンド | Vite + React |
| UIライブラリ | shadcn/ui |
| チャート | shadcnのchartコンポーネント（Recharts） |
| ORM | Drizzle ORM |
| DB | Cloudflare D1（SQLite、Workerと同一プラットフォームにバインディング） |
| バリデーション | zod |
| Web認証 | Cloudflare Access（本人のみ） |
| デバイス→API認証 | APIキー（`X-API-Key`ヘッダー、SHA-256ハッシュを`api_key_hash`と照合） |
| メール通知 | Resend |
| 定期処理 | Cloudflare Workers Cron Trigger |

## 4. 画面設計

### 4.1 ルーティング

| ページ | パス | 内容 |
|---|---|---|
| デバイス一覧 | `/` | 登録済みデバイスをカード表示 |
| デバイス詳細 | `/devices/:id` | 時系列グラフ、現在値、設定 |
| デバイス管理（簡易管理画面） | `/admin/devices` | デバイス新規登録・APIキー発行・削除（論理削除） |

### 4.2 ナビゲーション（確定）

- **モバイル表示**：画面下部のbottom bar（`bottom-nav.tsx`）でナビゲーション。画面上部のヘッダー（`mobile-header.tsx`）もモバイル表示時のみ表示する
- **PC表示**：sidebar（`sidebar.tsx`）でナビゲーション
- shadcn/uiのコンポーネントをベースに、レスポンシブで両方を出し分ける

### 4.3 デバイス一覧画面（確定）

表示項目は必要最小限に絞る：

- デバイス名
- 現在の温度・湿度
- オンライン/オフライン状態
- 最終データ受信時刻

- 手動での並び替え機能は今回のスコープには含めず、将来的な検討事項とする
- カードクリックでデバイス詳細（`/devices/:id`）に遷移
- 論理削除（`is_active = false`）されたデバイスは一覧に表示しない

### 4.4 デバイス詳細画面（確定）

- デバイス名は編集不可（一覧・詳細ともに表示のみ）
- 現在値（温度・湿度）の表示
- 時系列グラフ（shadcn chart / Recharts、24時間・7日間・30日間の期間切り替え、異常値ハイライト）
- 技術者向け・開発者向けの詳細情報セクション（ハードウェア情報、送信間隔、生データログなど）は今回は設けない。将来検討事項とする

### 4.5 デバイス管理（簡易管理画面）

- デバイスの新規登録、APIキー発行、削除・無効化（論理削除、`devices.is_active`をfalseに更新）
- Cloudflare Access配下のため追加認証は不要（同一SPA内のルートで完結）
- APIキーは発行時に一度だけ画面表示し、以降は再表示不可（`api_key_hash`のみ保存する設計と整合）

## 5. API設計

| エンドポイント | メソッド | 用途 | 認証 |
|---|---|---|---|
| `/api/devices/:deviceId/measurements` | POST | デバイスからの計測データ登録 | APIキー |
| `/api/measurements` | GET | 期間・デバイス指定での計測データ取得（`from`/`to`/`deviceId`クエリパラメータ） | Cloudflare Access |
| `/api/measurements/latest` | GET | デバイスごとの最新値取得 | Cloudflare Access |
| `/api/devices` | GET | 登録デバイス一覧取得（`is_active = true`のみ） | Cloudflare Access |
| `/api/devices` | POST | デバイス新規登録・APIキー発行 | Cloudflare Access |
| `/api/devices/:id` | DELETE | デバイス論理削除（`is_active = false`に更新） | Cloudflare Access |
| `/api/healthz` | GET | ヘルスチェック | 不要 |

- Cloudflare Accessはホスト＋パスパターン単位で適用されるため、`/api/devices/:deviceId/measurements`（デバイス送信用）のみAccessをバイパスしてAPIキー認証にする構成
- バリデーション（温度・湿度の数値範囲チェック）、タイムスタンプのサーバー側付与は継続

### 5.1 ページネーション方針（確定）

10分間隔の計測データは1デバイスあたり1日144件・30日で約4,320件程度と少量のため、汎用的なoffset/カーソルページネーションは実装しない。`GET /api/measurements`は`from`/`to`（期間）と`deviceId`のクエリパラメータのみで絞り込む方式とする。将来データ量が大きく増える場合に再検討。

### 5.2 バリデーションエラーのレスポンス形式（確定）

管理画面のフォーム入力エラーをフィールド単位で表示できるよう、フィールドごとのエラー情報を返す形式とする（zodの`.flatten()`相当の構造）。

```json
{
  "error": "validation_failed",
  "fieldErrors": {
    "name": ["デバイス名は必須です"]
  }
}
```

## 6. データモデル

### 6.1 Drizzle ORM スキーマ（`src/db/schema.ts`）

```typescript
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// --- devices ---------------------------------------------------------

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // 発行時に一度だけ平文表示し、以降はハッシュ（SHA-256）のみ保持する
  apiKeyHash: text("api_key_hash").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), // 論理削除フラグ
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }), // 最終データ受信時刻（オンライン/オフライン判定に使用）
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- measurements ------------------------------------------------------

export const measurements = sqliteTable(
  "measurements",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    // センサー精度(±0.2℃/±1.8%RH)に対しnumericは過剰。real(単精度浮動小数点)で十分
    temperature: real("temperature").notNull(),
    humidity: real("humidity").notNull(),
    // タイムスタンプはサーバー側付与（UNIX秒で保存）
    recordedAt: integer("recorded_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    deviceRecordedIdx: index("measurements_device_recorded_idx").on(
      table.deviceId,
      table.recordedAt
    ),
  })
);

// --- alert_state ---------------------------------------------------

export const alertState = sqliteTable(
  "alert_state",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    // 現状は "missing_data" のみ使用（"abnormal_value" は不要と決定済み）
    alertType: text("alert_type").notNull(),
    lastAlertedAt: integer("last_alerted_at", { mode: "timestamp" }), // クールダウン判定に使用
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(false), // 現在アラート中かどうか
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    deviceAlertTypeUnique: unique("alert_state_device_alert_type_unique").on(
      table.deviceId,
      table.alertType
    ),
  })
);

// --- relations ---------------------------------------------------------

export const devicesRelations = relations(devices, ({ many }) => ({
  measurements: many(measurements),
  alertStates: many(alertState),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  device: one(devices, {
    fields: [measurements.deviceId],
    references: [devices.id],
  }),
}));

export const alertStateRelations = relations(alertState, ({ one }) => ({
  device: one(devices, {
    fields: [alertState.deviceId],
    references: [devices.id],
  }),
}));
```

### 6.2 DB接続（`src/db/client.ts`）

Hyperdriveや接続文字列の管理が不要になり、D1バインディングをそのまま渡すだけになる。

```typescript
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

呼び出し側では `createDb(env.DB)` のように、Workerの`env`から直接バインディングを渡す。

### 6.3 APIキーの生成・ハッシュ化方針（確定）

APIキーは高エントロピーな秘密（32byteのランダム値）であり、パスワードのような低エントロピーな秘密とは異なるため、bcrypt/scryptのような低速ハッシュは不要。SHA-256で十分（GitHub PAT、Stripe APIキー等と同様の方式）。

```typescript
// src/lib/apiKey.ts
export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashApiKey(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(apiKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

### 6.4 マイグレーション（確定）

`drizzle.config.ts`は`dialect: "sqlite"`を指定し、`drizzle-kit generate`でSQLマイグレーションファイルを生成する。適用は`wrangler d1 migrations apply`（ローカル・リモートとも）を使う。

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
```

## 7. アラート設計

### 7.1 通知対象（確定）

温度・湿度の異常値によるアラートは行わず、**欠損（データが届かない）検知の通知のみ**とする。

| 項目 | 内容 |
|---|---|
| 欠損判定 | 30分（10分間隔 × 3回分データが届かない） |
| クールダウン | 1時間 |
| 通知方法 | Resend経由でメール送信 |

- `alert_state` テーブルの `alert_type` は `missing_data` のみ使用する（`abnormal_value` は不要）
- Cloudflare Workers Cron Triggerで定期実行し、各デバイスの最終データ受信時刻をチェック
- 実行頻度は10分おき（計測間隔と同じ）とする（確定）

### 7.2 設定値の管理（確定）

欠損判定時間・クールダウン時間は `wrangler.jsonc` に `vars` として直書きし、コードからは `env` 経由で参照する。Cloudflareダッシュボードからの変更は行わない（`wrangler deploy`で上書きされる挙動を前提とする）。

```jsonc
// wrangler.jsonc
{
  "vars": {
    "MISSING_DATA_THRESHOLD_MINUTES": "30",
    "ALERT_COOLDOWN_MINUTES": "60"
  }
}
```

Resend APIキーなど機密情報は引き続き `wrangler secret put` でsecretsとして管理する。

## 8. Claude Codeへの引き継ぎ方針

- 本書・`OndoLog_requirements.md`・`OndoLog_device_spec.md`・`schema.ts`を`docs/`配下に事前配置し、実装前にコミットしておく
- プロジェクトルートに`CLAUDE.md`を置き、確定済み設計判断（単一Worker構成、DBはCloudflare D1、論理削除、`real`型、APIキーのSHA-256ハッシュ化など）を短くまとめる
- 実装は一括発注せず、以下の順でレイヤーごとに区切って依頼し、都度レビューする
  1. `db/schema.ts` + `drizzle.config.ts` → マイグレーション生成確認
  2. `middleware/apiKeyAuth.ts`
  3. `routes/measurements.ts`のPOST
  4. `routes/devices.ts` / `measurements.ts`のGET系
  5. `cron.ts` + `lib/alert.ts`
  6. Webアプリ側

## 9. 今後の検討事項

- デバイス一覧での手動並び替え機能
- デバイス詳細画面での技術者向け・開発者向け詳細セクション（ハードウェア情報、ファームウェアバージョン、受信ログなど）
- デバイス台数増加時のCloudflare Access Service Tokensへの移行（要件定義書2.4参照）
- 計測データ量が大きく増えた場合のページネーション方式の再検討
