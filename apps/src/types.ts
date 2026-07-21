import type { devices } from "./db/schema";

export type Bindings = {
  DB: D1Database;
};

export type Variables = {
  device: typeof devices.$inferSelect;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
