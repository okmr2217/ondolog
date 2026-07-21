import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/mobile-header";

const PERIODS = [
  { value: "24h", label: "24時間" },
  { value: "7d", label: "7日間" },
  { value: "30d", label: "30日間" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

export const Route = createFileRoute("/devices/$id")({
  component: DeviceDetailPage,
});

function DeviceDetailPage() {
  const [period, setPeriod] = useState<Period>("24h");

  return (
    <>
      <MobileHeader title={<Skeleton className="h-5 w-32" />} back="/" />
      <div className="space-y-4 p-4 md:p-6">
        <Link
          to="/"
          className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
          デバイス一覧に戻る
        </Link>

        <Skeleton className="hidden h-7 w-40 md:block" />

        <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">温度</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">湿度</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        </div>

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
            <div className="flex aspect-video items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">グラフ表示エリア</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
