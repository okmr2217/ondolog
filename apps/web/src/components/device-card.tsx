import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeviceWithLatest } from "@/hooks/use-devices";

const ONLINE_THRESHOLD_MINUTES = 30;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const diffMinutes = (Date.now() - new Date(lastSeenAt).getTime()) / 60_000;
  return diffMinutes <= ONLINE_THRESHOLD_MINUTES;
}

interface DeviceCardProps {
  device: DeviceWithLatest;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const online = isOnline(device.lastSeenAt);

  return (
    <Link to="/devices/$id" params={{ id: device.id }} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <span className="font-semibold">{device.name}</span>
          <span className={cn("flex items-center gap-1.5 text-xs font-medium", online ? "text-emerald-600" : "text-muted-foreground")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-emerald-500" : "bg-muted-foreground")} />
            {online ? "オンライン" : "オフライン"}
          </span>
        </CardHeader>
        <CardContent className="space-y-1">
          {device.latest ? (
            <>
              <div className="flex items-baseline gap-3 text-2xl font-semibold">
                <span>{device.latest.temperature.toFixed(1)}℃</span>
                <span className="text-lg text-muted-foreground">{device.latest.humidity.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(new Date(device.latest.recordedAt))}に受信</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">データがありません</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
