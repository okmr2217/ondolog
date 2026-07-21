# OndoLog

XIAO ESP32C3 + SHT40Iの温湿度センサーモジュールで計測したデータをAPIサーバー経由でDBに永続化し、Webアプリで時系列に閲覧できるようにするための個人用ロガーです。データ欠損時にはメールでアラートを送ります。複数拠点への設置拡張を見据えた設計になっています。

## 全体構成

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

APIサーバー（Hono）とWebアプリ（Vite + React）は単一のCloudflare Workerにまとめてデプロイします（Workers Static Assetsで静的ファイル配信、`/api/*`をHonoが処理）。

## 技術スタック

| 領域 | 技術 |
|---|---|
| APIサーバー | Hono（Cloudflare Workers） |
| Webアプリ | Vite + React |
| DB | Cloudflare D1（SQLite） |
| ORM | Drizzle ORM |
| Web認証 | Cloudflare Access（本人のみ） |
| デバイス→API認証 | APIキー（SHA-256ハッシュ化して保存） |
| 定期処理（アラート） | Cloudflare Workers Cron Trigger |
| メール通知 | Resend |
| デバイスファームウェア | Arduino framework（PlatformIO + VSCode） |

## リポジトリ構成

```
ondolog/
├── apps/           # Hono API + Vite/React Web（単一Workerとしてデプロイ）
├── firmware/        # PlatformIO（XIAO ESP32C3 + SHT40I、10分間隔で計測・POST）
├── docs/            # 仕様書・要件定義書
├── hardware/         # 3Dモデル（Fusion 360ソース + FabLab出力用STL）
└── README.md
```

## ドキュメント

- [要件定義書](docs/OndoLog_requirements.md)
- [デバイス仕様書](docs/OndoLog_device_spec.md)
- [ソフトウェア設計書](docs/OndoLog_software_design.md)

## 開発状況

`apps/`・`firmware/`の実装は完了し、現在はテストフェーズです。詳細設計はドキュメントを参照してください。
