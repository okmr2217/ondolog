import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { devices } from "../db/schema";
import { hashApiKey } from "../lib/apiKey";
import type { AppEnv } from "../types";

// POST /api/devices/:deviceId/measurements にマウントする想定。
// X-API-Key ヘッダーをSHA-256ハッシュ化し、対象デバイスの api_key_hash と照合する。
export const apiKeyAuth = createMiddleware<AppEnv>(async (c, next) => {
  const apiKey = c.req.header("X-API-Key");
  const deviceId = c.req.param("deviceId");

  if (!apiKey || !deviceId) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const apiKeyHash = await hashApiKey(apiKey);
  const db = createDb(c.env.DB);
  const device = await db.query.devices.findFirst({
    where: eq(devices.id, deviceId),
  });

  if (!device || !device.isActive || device.apiKeyHash !== apiKeyHash) {
    return c.json({ error: "unauthorized" }, 401);
  }

  c.set("device", device);
  await next();
});
