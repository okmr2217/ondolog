import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { alertState, devices } from "../db/schema";
import type { Bindings } from "../types";
import { sendMissingDataAlert } from "./resend";

const ALERT_TYPE_MISSING_DATA = "missing_data";

// Cloudflare Workers Cron Trigger（10分おき）から呼び出す欠損監視本体。
// デバイスごとに missing_data の発生/復旧を判定し、alert_state を更新する。
export async function checkMissingDataAlerts(
  db: Db,
  env: Bindings
): Promise<void> {
  const thresholdMs =
    Number(env.MISSING_DATA_THRESHOLD_MINUTES) * 60 * 1000;
  const cooldownMs = Number(env.ALERT_COOLDOWN_MINUTES) * 60 * 1000;
  const now = new Date();

  const activeDevices = await db.query.devices.findMany({
    where: eq(devices.isActive, true),
  });

  for (const device of activeDevices) {
    try {
      await checkDevice(db, env, device, now, thresholdMs, cooldownMs);
    } catch (error) {
      // 1台の失敗（Resend障害など）で他デバイスのチェックを止めない
      console.error(`missing_data check failed for device ${device.id}`, error);
    }
  }
}

async function checkDevice(
  db: Db,
  env: Bindings,
  device: typeof devices.$inferSelect,
  now: Date,
  thresholdMs: number,
  cooldownMs: number
): Promise<void> {
  const isMissing =
    !device.lastSeenAt || now.getTime() - device.lastSeenAt.getTime() >= thresholdMs;

  const existingAlert = await db.query.alertState.findFirst({
    where: and(
      eq(alertState.deviceId, device.id),
      eq(alertState.alertType, ALERT_TYPE_MISSING_DATA)
    ),
  });

  if (!isMissing) {
    // 復旧時はisActiveのみ戻す。lastAlertedAtはクールダウン判定のため保持する
    if (existingAlert?.isActive) {
      await db
        .update(alertState)
        .set({ isActive: false, updatedAt: now })
        .where(eq(alertState.id, existingAlert.id));
    }
    return;
  }

  // 欠損が継続中（既にアラート中）なら再通知しない
  if (existingAlert?.isActive) {
    return;
  }

  // クールダウン中（直近の通知からALERT_COOLDOWN_MINUTES未満）なら再通知しない
  if (
    existingAlert?.lastAlertedAt &&
    now.getTime() - existingAlert.lastAlertedAt.getTime() < cooldownMs
  ) {
    return;
  }

  await sendMissingDataAlert(env, {
    deviceName: device.name,
    lastSeenAt: device.lastSeenAt,
    thresholdMinutes: env.MISSING_DATA_THRESHOLD_MINUTES,
  });

  if (existingAlert) {
    await db
      .update(alertState)
      .set({ isActive: true, lastAlertedAt: now, updatedAt: now })
      .where(eq(alertState.id, existingAlert.id));
  } else {
    await db.insert(alertState).values({
      deviceId: device.id,
      alertType: ALERT_TYPE_MISSING_DATA,
      isActive: true,
      lastAlertedAt: now,
      updatedAt: now,
    });
  }
}
