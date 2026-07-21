import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileHeader } from "@/components/layout/mobile-header";

export const Route = createFileRoute("/")({
  component: DeviceListPage,
});

function DeviceListPage() {
  return (
    <>
      <MobileHeader title="デバイス一覧" />
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="hidden text-2xl font-semibold md:block">デバイス一覧</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <DeviceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </>
  );
}

function DeviceCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-32" />
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </CardContent>
    </Card>
  );
}
