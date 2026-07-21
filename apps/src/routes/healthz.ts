import { Hono } from "hono";
import type { AppEnv } from "../types";

export const healthzRoute = new Hono<AppEnv>();

// GET /api/healthz（認証不要）
healthzRoute.get("/healthz", (c) => c.json({ status: "ok" }));
