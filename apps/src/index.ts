import { Hono } from "hono";
import { devicesRoute } from "./routes/devices";
import { healthzRoute } from "./routes/healthz";
import { measurementsRoute } from "./routes/measurements";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.route("/api", healthzRoute);
app.route("/api", devicesRoute);
app.route("/api", measurementsRoute);

export default app;
