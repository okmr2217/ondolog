import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { devices, measurements } from "../db/schema";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import { measurementInputSchema } from "../lib/validation";
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
