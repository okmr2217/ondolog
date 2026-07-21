import { useEffect, useState } from "react";
import { getDevices, getLatestMeasurements, type Device, type Measurement } from "@/lib/api";

export interface DeviceWithLatest extends Device {
  latest: Measurement | null;
}

interface UseDevicesResult {
  devices: DeviceWithLatest[];
  isLoading: boolean;
  error: string | null;
}

export function useDevices(): UseDevicesResult {
  const [devices, setDevices] = useState<DeviceWithLatest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [deviceList, latestList] = await Promise.all([getDevices(), getLatestMeasurements()]);
        if (cancelled) return;
        const latestByDeviceId = new Map(latestList.map((entry) => [entry.deviceId, entry.measurement]));
        setDevices(deviceList.map((device) => ({ ...device, latest: latestByDeviceId.get(device.id) ?? null })));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { devices, isLoading, error };
}
