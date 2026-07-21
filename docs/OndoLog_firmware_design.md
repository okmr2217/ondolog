# OndoLog ファームウェア設計書

## 1. 概要

本書はESP32系ボード + SHT40Iで構成するセンサーデバイス側の**ソフトウェア（ファームウェア）設計**に絞って記載する。

- ハードウェア仕様（センサー、自己発熱対策、電源設計、筐体計画）は `OndoLog_device_spec.md` を参照
- APIの仕様（エンドポイント、認証方式、バリデーション）は `OndoLog_software_design.md` の5章を参照。本書はそのAPIクライアントとしての実装設計にあたる

| 項目 | 内容 |
|---|---|
| 対象ボード（プロトタイピング段階・確定） | ESP32-S3-DevKitC-1-N8R8（ESP32-S3-WROOM-1-N8R8モジュール搭載） |
| 対象ボード（量産時） | Seeed Studio XIAO ESP32C3（`OndoLog_device_spec.md`記載の小型筐体前提。移行時の差分は8章参照） |
| センサー | SHT40I使用モジュール（秋月電子 AE-SHT40I-AD1F-R2-SIP4、I2C接続） |
| 開発環境 | PlatformIO + VSCode（Arduino framework） |
| 計測間隔 | 10分（常時給電、deep sleepは使用しない。バッテリー駆動・省電力設計はスコープ外） |
| 通信 | WiFi経由でHTTPS POST |

**プロトタイピング段階でのボード変更について（確定）**: 配線・動作検証のしやすさを優先し、まずはブレッドボード向けの開発ボードであるESP32-S3-DevKitC-1-N8R8で実装・検証する。量産・最終筐体化のタイミングでXIAO ESP32C3へ移行する（`OndoLog_device_spec.md` 5章の試作・量産計画と対応）。センサー・API通信仕様（4〜7章）はボードに依存しないため、移行時もそのまま流用できる。ボード依存部分（I2Cピン、`platformio.ini`の`board`指定）のみ移行時に見直しが必要（8章参照）。

## 2. プロジェクト構成（確定）

`firmware/` はPlatformIOプロジェクトとして、モノレポ内に独立配置する。

```
firmware/
├── platformio.ini
├── include/
│   ├── secrets.h            # WiFi/デバイスID/APIキー（gitignore対象、実機ごとに作成）
│   ├── secrets.h.example    # secrets.hのテンプレート（コミット対象）
│   └── root_ca.h            # TLS検証用のRoot CA証明書（PROGMEM文字列）
├── src/
│   └── main.cpp             # setup/loop一式（デバイス台数・機能規模的に単一ファイルで十分）
└── .gitignore                # secrets.h、.pio/ を除外
```

- 個人利用・少数台数という前提（`CLAUDE.md`）に合わせ、モジュール分割やクラス設計による抽象化は行わず、`main.cpp`内に関数を並べる素朴な構成とする
- デバイスを増やす場合は台数分の `secrets.h` を用意し、都度書き込む運用とする（要件定義書2.4のとおり、台数が増えた場合はCloudflare Access Service Tokensへの移行を将来検討）

### 2.1 `platformio.ini`（イメージ）

```ini
[env:esp32-s3-devkitc-1]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200

lib_deps =
    adafruit/Adafruit SHT4x Library@^1.0.4
    bblanchon/ArduinoJson@^7.0.4

build_flags =
    -D CORE_DEBUG_LEVEL=3
```

### 2.2 I2C接続（確定）

ESP32-S3-DevKitC-1のデフォルトI2Cピン（`Wire.begin()`のデフォルト、GPIO8=SDA / GPIO9=SCL）にSHT40Iモジュールを接続する。ピン変更の必要がないため、`Wire.begin(SDA, SCL)`への明示的なピン指定は行わない（N8R8の内蔵Octal PSRAM/フラッシュが使用するGPIO26-37とは競合しない）。

量産時にXIAO ESP32C3へ移行する場合、XIAO側のデフォルトI2Cピンは異なる番号になるため、配線・`Wire.begin()`呼び出しの見直しが必要（8章参照）。

## 3. 認証情報の管理方針（確定）

WiFi SSID/パスワード、デバイスID、APIキーは `include/secrets.h` にビルド時定数として持たせ、gitignoreでリポジトリから除外する。

**理由**: 個人利用・少数台数という前提のもとでは、実行時設定（WiFiManager等によるキャプティブポータル設定）は実装コストに見合わない。デバイスを増やす際は都度 `secrets.h` を差し替えてビルド・書き込みする運用で十分（`OndoLog_device_spec.md`の「個人利用・少数台数はシンプルさ優先」の方針と整合）。

```cpp
// include/secrets.h.example（コミット対象、実値は各自secrets.hに複製して埋める）
#pragma once

#define WIFI_SSID     "your-ssid"
#define WIFI_PASSWORD "your-password"

#define API_HOST      "ondolog.paritto.dev"
#define DEVICE_ID     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" // devices.id（管理画面で発行）
#define API_KEY       "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"     // 発行時に一度だけ表示される平文キー
```

```
# firmware/.gitignore
include/secrets.h
.pio/
```

## 4. 動作シーケンス

### 4.1 起動処理（`setup()`）

1. `Serial.begin(115200)`（デバッグログ出力用）
2. `Wire.begin()` → `sht4.begin()` でセンサー初期化。失敗時はシリアルにエラーを出力し、5秒後に `ESP.restart()`（センサー未検出のまま動作を続けても無意味なため）
3. `WiFi.begin(WIFI_SSID, WIFI_PASSWORD)` で接続開始し、タイムアウト（30秒）まで接続を待つ
4. `WiFiClientSecure` に `root_ca.h` のRoot CA証明書を `setCACert()` で設定

起動時にWiFi接続に失敗した場合も再起動せず、そのままloopに入る（loop内の接続チェックで継続的にリトライされるため）。

### 4.2 メインループ（`loop()`）

`millis()`による非ブロッキングの経過時間チェックで10分間隔（`600000ms`）ごとに以下を実行する。`delay()`で10分間ブロックしない（将来的な拡張の余地を残すための最小限の配慮であり、複雑な状態機械は導入しない）。

```
[経過時間 >= 10分] ?
   │ No → 何もせずloopの先頭に戻る
   ▼ Yes
1. センサー計測（sht4.getEvent()で温度・湿度取得）
   └ 失敗 → ログ出力してこのサイクルを中断（次の10分後に再試行）
2. WiFi接続状態を確認
   └ 未接続 → WiFi.reconnect()を試行（タイムアウトあり）
       └ 再接続失敗 → ログ出力してこのサイクルを中断
3. JSON生成 {"temperature": <値>, "humidity": <値>}
4. HTTPS POST /api/devices/{DEVICE_ID}/measurements
   ヘッダー: X-API-Key: {API_KEY}
5. レスポンス確認
   └ 201 → 送信成功ログ
   └ それ以外（401/400/タイムアウト/接続エラー） → エラーログ出力のみ、リトライしない
6. 次回実行時刻を更新
```

- 自己発熱対策（`OndoLog_device_spec.md` 3章）の「計測→送信」の順序を上記4.2の1→4で踏襲する
- WiFi接続はサイクルごとに切断・再接続せず、起動時に確立した接続を維持し続ける（未接続時のみ再接続を試みる）。接続を維持したままでも実際に電力・発熱が増えるのはPOST送信時の短時間のみであり、毎サイクルの接続・切断を繰り返すよりも自己発熱・処理の単純さの両面で有利なため

### 4.3 送信失敗時の扱い（確定）

その回の計測データは破棄し、次回（10分後）のサイクルで再度計測・送信を試みる。ローカルへのバッファリングや即時リトライは行わない。

**理由**: API側の欠損アラートは「30分（10分間隔×3回分）データが届かない」ことを条件に発火する設計（`OndoLog_software_design.md` 7章）であり、1回分の欠損はアラート対象外として許容される前提と整合する。ファームウェア側で複雑なリトライ・バッファ機構を持つ必要がない。

## 5. HTTPS通信仕様

### 5.1 リクエスト

| 項目 | 内容 |
|---|---|
| URL | `https://ondolog.paritto.dev/api/devices/{DEVICE_ID}/measurements` |
| メソッド | POST |
| ヘッダー | `Content-Type: application/json`, `X-API-Key: {API_KEY}` |
| ボディ | `{"temperature": <real>, "humidity": <real>}` |

タイムスタンプはデバイス側で付与しない（サーバー側が付与するAPI設計のため、ファームウェアはNTP時刻同期を行う必要がない）。

### 5.2 TLS証明書検証（確定）

`WiFiClientSecure::setCACert()` でRoot CA証明書を固定し、正規の証明書検証を行う（`setInsecure()`による検証省略は行わない）。

**理由**: APIキーというある程度重要度の高い秘密情報をWiFi経由で送信するため、中間者攻撃（同一WiFi内の悪意ある端末や偽アクセスポイントによるなりすまし）への対策として証明書検証を行う。実装コストは証明書1件をヘッダーファイルに埋め込む程度で、大きな負担にはならない。

**運用上の注意（実装時タスク）**:
- 対象のRoot CA証明書は、`ondolog.paritto.dev`が実際にCloudflareへデプロイされた後に取得する（`openssl s_client -connect ondolog.paritto.dev:443 -showcerts` 等でチェーンを確認し、ルート証明書のPEMを `include/root_ca.h` にPROGMEM文字列として埋め込む）
- Cloudflareがルート証明書の発行元を切り替えた場合、TLSハンドシェイクが失敗するようになる。発生頻度は低いが、その際は `root_ca.h` を更新して再書き込みが必要になる（既知の制約として明記しておく）

### 5.3 レスポンスハンドリング

| ステータス | 意味 | ファームウェアの挙動 |
|---|---|---|
| 201 | 登録成功 | 成功ログのみ、特に処理なし |
| 400 | バリデーションエラー | エラーログ出力（センサー値異常の可能性、要調査） |
| 401 | 認証エラー | エラーログ出力（APIキー・デバイスID誤りの可能性） |
| タイムアウト/接続エラー | ネットワーク不調 | エラーログ出力、次回サイクルへ |

いずれの場合もリトライは行わず、4.3の方針どおり次サイクルまで待つ。

## 6. ロギング方針

`Serial`（115200bps）にシリアルログを出力し、`platformio device monitor`で常時給電中の動作状況を確認できるようにする。ログレベルは以下の3種のみとし、複雑なログライブラリは導入しない。

- 起動処理（センサー初期化・WiFi接続結果）
- 各サイクルの計測値・送信結果（成功/失敗）
- エラー発生時の詳細（HTTPステータスコード、WiFi切断理由など）

## 7. ライブラリ選定

| 用途 | ライブラリ | 備考 |
|---|---|---|
| SHT40Iセンサー | Adafruit SHT4x Library | SHT4x系センサーに対応、`getEvent()`で温湿度取得できるシンプルなAPI |
| JSON生成 | ArduinoJson | POSTボディ生成用。ペイロードが小さいため`StaticJsonDocument`で十分 |
| WiFi/HTTPS | `WiFi.h` / `WiFiClientSecure.h` / `HTTPClient.h` | arduino-esp32コア標準ライブラリ、追加依存なし |

## 8. 今後の検討事項

- **XIAO ESP32C3への移行**（量産・最終筐体化のタイミング）: `platformio.ini`の`board`指定変更（`seeed_xiao_esp32c3`）、I2Cピン配線・`Wire.begin()`呼び出しの見直しが必要。センサー・API通信・認証情報管理などその他の設計はボードに依存しないためそのまま流用可能
- センサー初期化失敗時の自動再起動以外に、WiFi接続が長時間（例: 1時間相当＝6サイクル連続）失敗し続けた場合の`ESP.restart()`によるセルフリカバリ導入（WiFiスタックの想定外のフリーズ対策。現状は未実装、運用状況を見て要否判断）
- OTA（Over-The-Air）ファームウェア更新の要否（現状はUSB経由の書き込みのみ想定）
- 複数デバイス展開時のビルド・書き込み運用の効率化（`secrets.h`の一括生成スクリプト等）
