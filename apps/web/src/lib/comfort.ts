export type ComfortLevel = "cold" | "cool" | "comfortable" | "slightly_hot" | "hot" | "very_hot";

export type ComfortDirection = "raise_temp" | "lower_temp" | "lower_humidity" | "ok";

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
  if (di < 55) return "cold";
  if (di < 65) return "cool";
  if (di < 75) return "comfortable";
  if (di < 80) return "slightly_hot";
  if (di < 85) return "hot";
  return "very_hot";
}

export function getComfortAdvice(tempC: number, humidity: number): ComfortAdvice {
  const di = calcDiscomfortIndex(tempC, humidity);
  const level = getComfortLevel(di);

  if (di > TARGET_HIGH) {
    const tempSensitivity = 0.81 + 0.0099 * humidity;
    const humSensitivity = Math.abs(0.01 * (0.99 * tempC - 14.3));
    const direction: ComfortDirection = tempSensitivity >= humSensitivity ? "lower_temp" : "lower_humidity";
    return {
      di,
      level,
      direction,
      message: direction === "lower_temp" ? "温度を下げると効果的です" : "除湿すると効果的です",
    };
  }

  if (di < TARGET_LOW) {
    return {
      di,
      level,
      direction: "raise_temp",
      message: "温度を上げると快適になります",
    };
  }

  return { di, level, direction: "ok", message: "現在快適な範囲です" };
}
