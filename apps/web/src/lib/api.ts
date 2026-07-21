const API_BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface Device {
  id: string;
  name: string;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Measurement {
  id: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  recordedAt: string;
}

export interface LatestMeasurement {
  deviceId: string;
  measurement: Measurement | null;
}

export function getDevices(): Promise<Device[]> {
  return request<Device[]>("/devices");
}

export function getLatestMeasurements(): Promise<LatestMeasurement[]> {
  return request<LatestMeasurement[]>("/measurements/latest");
}
