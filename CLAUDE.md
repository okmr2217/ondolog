# CLAUDE.md

## アーキテクチャ
- API(Hono)とWeb(Vite+React)は単一Cloudflare Workerにまとめる。分離しない。

## 確定した設計判断（変更しない）
- devicesの削除は論理削除（isActiveフラグ）。物理削除しない。
- alert_typeは"missing_data"のみ実装。"abnormal_value"は実装しない。
- 温湿度カラムは`real`型。`numeric`は使わない。
- 欠損判定30分・クールダウン1時間は`wrangler.jsonc`のvarsに直書き。ダッシュボードから変更しない前提。
- Webのコンポーネントファイル名はkebab-caseで統一する（例: `bottom-nav.tsx`）。PascalCaseは使わない。

## プロジェクト構成
モノレポ構成。
```
ondolog/
├── apps/           # Hono API + Vite/React Web（単一Workerとしてデプロイ）
├── firmware/        # PlatformIO（XIAO ESP32C3 + SHT40I、10分間隔で計測・POST）
├── docs/            # 仕様書・要件定義書
├── hardware/         # 3Dモデル（Fusion 360ソース + FabLab出力用STL）
└── README.md
```

## 詳細設計
docs/OndoLog_software_design.md を参照
docs/OndoLog_firmware_design.md を参照
docs/OndoLog_requirements.md を参照
