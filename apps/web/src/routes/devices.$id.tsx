import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/mobile-header";
import { DeviceChart } from "@/components/device-chart";
import { useDevices } from "@/hooks/use-devices";
import { PERIODS, useMeasurements, type Period } from "@/hooks/use-measurements";
import { getComfortAdvice, type ComfortLevel } from "@/lib/comfort";
import { cn } from "@/lib/utils";

const COMFORT_LEVEL_LABEL: Record<ComfortLevel, string> = {
  cold: "寒い",
  cool: "涼しい",
  comfortable: "快適",
  slightly_hot: "やや暑い",
  hot: "暑い",
  very_hot: "非常に暑い",
};

const COMFORT_LEVEL_CLASS: Record<ComfortLevel, string> = {
  cold: "text-blue-600",
  cool: "text-sky-600",
  comfortable: "text-emerald-600",
  slightly_hot: "text-amber-600",
  hot: "text-orange-600",
  very_hot: "text-red-600",
};

export const Route = createFileRoute("/devices/$id")({
  component: DeviceDetailPage,
});

function DeviceDetailPage() {
  const { id } = Route.useParams();
  const [period, setPeriod] = useState<Period>("24h");

  const { devices, isLoading: isDeviceLoading } = useDevices();
  const device = devices.find((d) => d.id === id);

  const { measurements, isLoading: isChartLoading, error: chartError } = useMeasurements(id, period);

  const advice = device?.latest ? getComfortAdvice(device.latest.temperature, device.latest.humidity) : null;

  return (
    <>
      <MobileHeader title={isDeviceLoading ? <Skeleton className="h-5 w-32" /> : (device?.name ?? "デバイス詳細")} back="/" />
      <div className="space-y-4 p-4 md:p-6">
        <Link to="/" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:inline-flex">
          <ArrowLeft className="h-4 w-4" />
          デバイス一覧に戻る
        </Link>

        {isDeviceLoading ? (
          <Skeleton className="hidden h-7 w-40 md:block" />
        ) : (
          <h1 className="hidden text-xl font-semibold md:block">{device?.name ?? "デバイスが見つかりません"}</h1>
        )}

        <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">温度</CardTitle>
            </CardHeader>
            <CardContent>
              {isDeviceLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-semibold">{device?.latest ? `${device.latest.temperature.toFixed(1)}℃` : "―"}</span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">湿度</CardTitle>
            </CardHeader>
            <CardContent>
              {isDeviceLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-semibold">{device?.latest ? `${device.latest.humidity.toFixed(0)}%` : "―"}</span>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="sm:max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">快適度</CardTitle>
          </CardHeader>
          <CardContent>
            {isDeviceLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : advice ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{advice.di.toFixed(1)}</span>
                  <span className={cn("text-sm font-medium", COMFORT_LEVEL_CLASS[advice.level])}>{COMFORT_LEVEL_LABEL[advice.level]}</span>
                </div>
                <p className="text-sm text-muted-foreground">{advice.message}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">データがありません</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">推移</CardTitle>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <Button key={p.value} size="sm" variant={period === p.value ? "secondary" : "ghost"} onClick={() => setPeriod(p.value)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartError && <p className="text-sm text-destructive">データの取得に失敗しました: {chartError}</p>}
            {!chartError && isChartLoading && <Skeleton className="aspect-video w-full" />}
            {!chartError && !isChartLoading && measurements.length === 0 && (
              <div className="flex aspect-video items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                この期間のデータがありません
              </div>
            )}
            {!chartError && !isChartLoading && measurements.length > 0 && <DeviceChart measurements={measurements} period={period} />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
