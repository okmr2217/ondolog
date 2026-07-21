import { useCallback, useEffect, useState } from "react";
import { getDevices, type Device } from "@/lib/api";

interface UseDeviceListResult {
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeviceList(): UseDeviceListResult {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getDevices()
      .then((list) => {
        if (!cancelled) setDevices(list);
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
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { devices, isLoading, error, refetch };
}
