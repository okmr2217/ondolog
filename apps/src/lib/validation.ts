import { z } from "zod";

// SHT40Iのセンサー仕様上の測定範囲（-40〜125℃, 0〜100%RH）で数値範囲チェックを行う
export const measurementInputSchema = z.object({
  temperature: z.number().min(-40).max(125),
  humidity: z.number().min(0).max(100),
});

export type MeasurementInput = z.infer<typeof measurementInputSchema>;
