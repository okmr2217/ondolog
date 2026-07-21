import axios, { type AxiosResponse } from "axios";

const client = axios.create({ baseURL: "/api" });

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

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError<ErrorBody>(err)) {
    return new ApiError(err.response?.status ?? 0, err.response?.data?.error ?? err.message, err.response?.data?.fieldErrors);
  }
  return new ApiError(0, err instanceof Error ? err.message : "不明なエラーが発生しました");
}

async function unwrap<T>(response: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    return (await response).data;
  } catch (err) {
    throw toApiError(err);
  }
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
  return unwrap(client.get<Device[]>("/devices"));
}

export function getLatestMeasurements(): Promise<LatestMeasurement[]> {
  return unwrap(client.get<LatestMeasurement[]>("/measurements/latest"));
}

export interface MeasurementsQuery {
  deviceId: string;
  from: string;
  to: string;
}

export function getMeasurements(params: MeasurementsQuery): Promise<Measurement[]> {
  return unwrap(client.get<Measurement[]>("/measurements", { params }));
}

export function createDevice(name: string): Promise<CreatedDevice> {
  return unwrap(client.post<CreatedDevice>("/devices", { name }));
}

export function deleteDevice(id: string): Promise<Device> {
  return unwrap(client.delete<Device>(`/devices/${id}`));
}
