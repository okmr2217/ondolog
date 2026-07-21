const API_BASE = "/api";

export type FieldErrors = Record<string, string[]>;

interface ErrorBody {
  error?: string;
  fieldErrors?: FieldErrors;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: FieldErrors;

  constructor(status: number, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body: ErrorBody | null = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `${res.status} ${res.statusText}`, body?.fieldErrors);
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

export interface CreatedDevice extends Device {
  apiKey: string;
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

export function createDevice(name: string): Promise<CreatedDevice> {
  return request<CreatedDevice>("/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function deleteDevice(id: string): Promise<Device> {
  return request<Device>(`/devices/${id}`, { method: "DELETE" });
}
