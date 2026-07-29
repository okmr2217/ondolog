# OndoLog アップデート指示書：快適度指数（不快指数）表示機能

## 1. 概要

| 項目 | 内容 |
|---|---|
| 機能名 | 快適度指数（不快指数 / THI）表示 |
| 目的 | 現在の温湿度から不快指数を算出し、デバイス詳細画面に「現在の快適度」と「何を変えると快適になるか」のアドバイスを表示する |
| スコープ | 表示のみ。アラート判定・DB保存・API仕様への影響なし（既存の`measurements`から都度クライアント側で計算） |

既存の設計書（`OndoLog_software_design.md`）に対する追加機能であり、DBスキーマ・APIエンドポイントの変更は発生しない。

## 2. 計算ロジック

不快指数（THI）は以下の式で算出する。

```
DI = 0.81 × T + 0.01 × H × (0.99 × T − 14.3) + 46.3
```
- T: 気温（℃）
- H: 湿度（%）

### 快適度レベルの区分

| DI | レベル |
|---|---|
| 〜55 | cold（寒い） |
| 55〜65 | cool（涼しい） |
| 65〜75 | comfortable（快適） |
| 75〜80 | slightly_hot（やや暑い） |
| 80〜85 | hot（暑い） |
| 85〜 | very_hot（非常に暑い） |

快適ゾーンは DI 65〜75 とする。

### 改善方向のアドバイスロジック

DIが快適ゾーンの外にある場合、温度と湿度どちらを調整すべきかを偏微分の感度で判定する。

- DIが75超（暑い）：`∂DI/∂T = 0.81 + 0.0099H` と `∂DI/∂H = |0.01 × (0.99T − 14.3)|` を比較し、感度が高い方を提案（温度低下 or 除湿）
- DIが65未満（寒い）：湿度調整はほぼ効果がないため、常に「温度を上げる」を提案
- DIが65〜75の範囲内：「現在快適な範囲です」と表示

## 3. 実装場所

DBやAPIを経由しないクライアント側の計算処理のため、以下のファイル追加のみで完結する。

```
apps/web/src/lib/comfort.ts   # 新規追加：DI計算・レベル判定・アドバイス生成
```

`apps/web/src/routes/devices.$id.tsx`（デバイス詳細画面）から`comfort.ts`の関数を呼び出し、現在値表示エリアの近くに快適度カードを追加する。

## 4. `apps/web/src/lib/comfort.ts` 実装内容

```typescript
export type ComfortLevel =
  | 'cold' | 'cool' | 'comfortable' | 'slightly_hot' | 'hot' | 'very_hot';

export type ComfortDirection =
  | 'raise_temp' | 'lower_temp' | 'lower_humidity' | 'ok';

export interface ComfortAdvice {
  di: number;
  level: ComfortLevel;
  direction: ComfortDirection;
  message: string;
}

const TARGET_LOW = 65;
const TARGET_HIGH = 75;

export function calcDiscomfortIndex(tempC: number, humidity: number): number {
  return 0.81 * tempC + 0.01 * humidity * (0.99 * tempC - 14.3) + 46.3;
}

export function getComfortLevel(di: number): ComfortLevel {
  if (di < 55) return 'cold';
  if (di < 65) return 'cool';
  if (di < 75) return 'comfortable';
  if (di < 80) return 'slightly_hot';
  if (di < 85) return 'hot';
  return 'very_hot';
}

export function getComfortAdvice(tempC: number, humidity: number): ComfortAdvice {
  const di = calcDiscomfortIndex(tempC, humidity);
  const level = getComfortLevel(di);

  if (di > TARGET_HIGH) {
    const tempSensitivity = 0.81 + 0.0099 * humidity;
    const humSensitivity = Math.abs(0.01 * (0.99 * tempC - 14.3));
    const direction: ComfortDirection =
      tempSensitivity >= humSensitivity ? 'lower_temp' : 'lower_humidity';
    return {
      di, level, direction,
      message: direction === 'lower_temp'
        ? '温度を下げると効果的です'
        : '除湿すると効果的です',
    };
  }

  if (di < TARGET_LOW) {
    return {
      di, level, direction: 'raise_temp',
      message: '温度を上げると快適になります',
    };
  }

  return { di, level, direction: 'ok', message: '現在快適な範囲です' };
}
```

## 5. UI表示イメージ（デバイス詳細画面）

現在値（温度・湿度）表示エリアの直下に、快適度カードを追加する。

```tsx
import { getComfortAdvice } from "@/lib/comfort";

// device.temperature, device.humidity は既存の最新値取得ロジックから取得済みの値を想定
const advice = getComfortAdvice(device.temperature, device.humidity);

<Card>
  <CardHeader>
    <CardTitle>快適度</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold">{advice.di.toFixed(1)}</p>
    <p className="text-sm text-muted-foreground">{advice.message}</p>
  </CardContent>
</Card>
```

- レベルに応じた配色（例: comfortableは緑系、hot/very_hotは赤系、cold/coolは青系）はshadcn/uiのBadgeやCardのvariantで表現する
- 数値の丸めは小数点第1位までとする

## 6. 非対象・今後の検討事項

- WBGT（暑さ指数）ベースの熱中症リスク表示は今回のスコープ外（日射・輻射熱の項目が必要になるため精度が落ちる）
- アラート機能（欠損検知）への快適度指数の組み込みは行わない
- サーバー側での計算・保存は不要（毎回クライアント側で温湿度から計算する）
