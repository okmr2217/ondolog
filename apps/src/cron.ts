import { createDb } from "./db/client";
import { checkMissingDataAlerts } from "./lib/alert";
import type { Bindings } from "./types";

// wrangler.jsoncのtriggers.crons（10分おき）で起動する
export async function scheduled(
  _controller: ScheduledController,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  const db = createDb(env.DB);
  await checkMissingDataAlerts(db, env);
}
