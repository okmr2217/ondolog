import type { Bindings } from "../types";

type MissingDataAlertParams = {
  deviceName: string;
  lastSeenAt: Date | null;
  thresholdMinutes: string;
};

export async function sendMissingDataAlert(
  env: Bindings,
  { deviceName, lastSeenAt, thresholdMinutes }: MissingDataAlertParams
): Promise<void> {
  const lastSeenText = lastSeenAt
    ? lastSeenAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
    : "受信履歴なし";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.ALERT_EMAIL_FROM,
      to: env.ALERT_EMAIL_TO,
      subject: `[OndoLog] ${deviceName}からのデータ受信が途絶えています`,
      text: `デバイス「${deviceName}」から${thresholdMinutes}分以上データが届いていません。\n最終受信時刻: ${lastSeenText}`,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Resend API error: ${response.status} ${await response.text()}`
    );
  }
}
