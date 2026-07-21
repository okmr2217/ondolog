import type { devices } from "./db/schema";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  MISSING_DATA_THRESHOLD_MINUTES: string;
  ALERT_COOLDOWN_MINUTES: string;
  ALERT_EMAIL_TO: string;
  ALERT_EMAIL_FROM: string;
  RESEND_API_KEY: string;
};

export type Variables = {
  device: typeof devices.$inferSelect;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
