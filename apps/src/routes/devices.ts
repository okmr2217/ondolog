import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { devices } from "../db/schema";
import { generateApiKey, hashApiKey } from "../lib/apiKey";
import { deviceInputSchema } from "../lib/validation";
import type { AppEnv } from "../types";

export const devicesRoute = new Hono<AppEnv>();

// api_key_hashは発行時にのみ扱い、以降のレスポンスには含めない
const publicDeviceColumns = {
  id: devices.id,
  name: devices.name,
  isActive: devices.isActive,
  lastSeenAt: devices.lastSeenAt,
  createdAt: devices.createdAt,
} as const;

// GET /api/devices（is_active = trueのみ）
devicesRoute.get("/devices", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select(publicDeviceColumns)
    .from(devices)
    .where(eq(devices.isActive, true));

  return c.json(rows);
});

// POST /api/devices（新規登録・APIキー発行）
devicesRoute.post("/devices", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const result = deviceInputSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      {
        error: "validation_failed",
        fieldErrors: result.error.flatten().fieldErrors,
      },
      400
    );
  }

  const apiKey = generateApiKey();
  const apiKeyHash = await hashApiKey(apiKey);

  const db = createDb(c.env.DB);
  const [device] = await db
    .insert(devices)
    .values({ name: result.data.name, apiKeyHash })
    .returning(publicDeviceColumns);

  // apiKeyは発行時のこのレスポンスでのみ平文を返す。以降は再表示不可
  return c.json({ ...device, apiKey }, 201);
});

// DELETE /api/devices/:id（論理削除。物理削除は行わない）
devicesRoute.delete("/devices/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [device] = await db
    .update(devices)
    .set({ isActive: false })
    .where(eq(devices.id, id))
    .returning(publicDeviceColumns);

  if (!device) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json(device);
});
