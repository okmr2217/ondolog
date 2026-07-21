import { Hono } from "hono";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { createDb } from "../db/client";
import { devices, measurements } from "../db/schema";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import {
  measurementInputSchema,
  measurementsQuerySchema,
} from "../lib/validation";
import type { AppEnv } from "../types";

export const measurementsRoute = new Hono<AppEnv>();

// POST /api/devices/:deviceId/measurements
// タイムスタンプはデバイスのRTCに依存せずサーバー側で付与する
measurementsRoute.post(
  "/devices/:deviceId/measurements",
  apiKeyAuth,
  async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }

    const result = measurementInputSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        {
          error: "validation_failed",
          fieldErrors: result.error.flatten().fieldErrors,
        },
        400
      );
    }

    const device = c.get("device");
    const db = createDb(c.env.DB);
    const recordedAt = new Date();

    const [measurement] = await db
      .insert(measurements)
      .values({
        deviceId: device.id,
        temperature: result.data.temperature,
        humidity: result.data.humidity,
        recordedAt,
      })
      .returning();

    await db
      .update(devices)
      .set({ lastSeenAt: recordedAt })
      .where(eq(devices.id, device.id));

    return c.json(measurement, 201);
  }
);

// GET /api/measurements（from/to/deviceIdクエリで絞り込み。件数が少量のためページネーションなし）
measurementsRoute.get("/measurements", async (c) => {
  const result = measurementsQuerySchema.safeParse(c.req.query());
  if (!result.success) {
    return c.json(
      {
        error: "validation_failed",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      400
    );
  }

  const { from, to, deviceId } = result.data;
  const conditions = [
    from ? gte(measurements.recordedAt, from) : undefined,
    to ? lte(measurements.recordedAt, to) : undefined,
    deviceId ? eq(measurements.deviceId, deviceId) : undefined,
  ].filter((condition) => condition !== undefined);

  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(measurements)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(measurements.recordedAt));

  return c.json(rows);
});

// GET /api/measurements/latest（有効なデバイスごとの最新値）
measurementsRoute.get("/measurements/latest", async (c) => {
  const db = createDb(c.env.DB);
  const activeDevices = await db.query.devices.findMany({
    where: eq(devices.isActive, true),
  });

  const latest = await Promise.all(
    activeDevices.map(async (device) => {
      const [measurement] = await db
        .select()
        .from(measurements)
        .where(eq(measurements.deviceId, device.id))
        .orderBy(desc(measurements.recordedAt))
        .limit(1);

      return { deviceId: device.id, measurement: measurement ?? null };
    })
  );

  return c.json(latest);
});
