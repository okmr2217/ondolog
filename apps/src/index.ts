import { Hono } from "hono";
import { scheduled } from "./cron";
import { devicesRoute } from "./routes/devices";
import { healthzRoute } from "./routes/healthz";
import { measurementsRoute } from "./routes/measurements";
import type { AppEnv, Bindings } from "./types";

const app = new Hono<AppEnv>();

app.route("/api", healthzRoute);
app.route("/api", devicesRoute);
app.route("/api", measurementsRoute);

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Bindings>;
