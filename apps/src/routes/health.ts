import { Hono } from "hono";
import type { AppEnv } from "../types";

export const healthRoute = new Hono<AppEnv>();

// GET /api/health（認証不要）
// D1へ軽量クエリを投げて疎通を確認する。未認証で公開されるため、失敗時も詳細はレスポンスに含めずログにのみ出す
healthRoute.get("/health", async (c) => {
  try {
    await c.env.DB.prepare("SELECT 1").first();
  } catch (e) {
    console.error("health check: db failed", e);
    return c.json({ status: "error", checks: { db: "error" } }, 503);
  }
  return c.json({ status: "ok", checks: { db: "ok" } });
});
