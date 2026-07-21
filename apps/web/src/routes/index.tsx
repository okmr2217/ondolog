import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: DeviceListPage,
});

function DeviceListPage() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">デバイス一覧</h2>
    </div>
  );
}
