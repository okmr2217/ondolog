import { Hono } from "hono";
import { scheduled } from "./cron";
import { devicesRoute } from "./routes/devices";
import { healthRoute } from "./routes/health";
import { measurementsRoute } from "./routes/measurements";
import type { AppEnv, Bindings } from "./types";

const app = new Hono<AppEnv>();

app.route("/api", healthRoute);
app.route("/api", devicesRoute);
app.route("/api", measurementsRoute);

// 未マッチの/api配下はSPAへフォールバックさせず404を返す
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

// /api以外は静的アセット（SPA）に委譲。not_found_handling: "single-page-application"により
// 未マッチのパスもindex.htmlにフォールバックする
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Bindings>;
