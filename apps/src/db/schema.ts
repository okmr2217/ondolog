import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// --- devices ---------------------------------------------------------

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // 発行時に一度だけ平文表示し、以降はハッシュ（SHA-256）のみ保持する
  apiKeyHash: text("api_key_hash").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), // 論理削除フラグ
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }), // 最終データ受信時刻（オンライン/オフライン判定に使用）
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- measurements ------------------------------------------------------

export const measurements = sqliteTable(
  "measurements",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    // センサー精度(±0.2℃/±1.8%RH)に対しnumericは過剰。real(単精度浮動小数点)で十分
    temperature: real("temperature").notNull(),
    humidity: real("humidity").notNull(),
    // タイムスタンプはサーバー側付与（UNIX秒で保存）
    recordedAt: integer("recorded_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    deviceRecordedIdx: index("measurements_device_recorded_idx").on(
      table.deviceId,
      table.recordedAt
    ),
  })
);

// --- alert_state ---------------------------------------------------

export const alertState = sqliteTable(
  "alert_state",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    // 現状は "missing_data" のみ使用（"abnormal_value" は不要と決定済み）
    alertType: text("alert_type").notNull(),
    lastAlertedAt: integer("last_alerted_at", { mode: "timestamp" }), // クールダウン判定に使用
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(false), // 現在アラート中かどうか
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    deviceAlertTypeUnique: unique("alert_state_device_alert_type_unique").on(
      table.deviceId,
      table.alertType
    ),
  })
);

// --- relations ---------------------------------------------------------

export const devicesRelations = relations(devices, ({ many }) => ({
  measurements: many(measurements),
  alertStates: many(alertState),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  device: one(devices, {
    fields: [measurements.deviceId],
    references: [devices.id],
  }),
}));

export const alertStateRelations = relations(alertState, ({ one }) => ({
  device: one(devices, {
    fields: [alertState.deviceId],
    references: [devices.id],
  }),
}));
