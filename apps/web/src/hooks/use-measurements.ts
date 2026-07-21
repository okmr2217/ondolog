import { useEffect, useState } from "react";
import { getMeasurements, type Measurement } from "@/lib/api";

export const PERIODS = [
  { value: "24h", label: "24時間" },
  { value: "7d", label: "7日間" },
  { value: "30d", label: "30日間" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

const PERIOD_MS: Record<Period, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

interface UseMeasurementsResult {
  measurements: Measurement[];
  isLoading: boolean;
  error: string | null;
}

export function useMeasurements(deviceId: string, period: Period): UseMeasurementsResult {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const to = new Date();
    const from = new Date(to.getTime() - PERIOD_MS[period]);

    getMeasurements({ deviceId, from: from.toISOString(), to: to.toISOString() })
      .then((data) => {
        if (!cancelled) setMeasurements(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, period]);

  return { measurements, isLoading, error };
}
