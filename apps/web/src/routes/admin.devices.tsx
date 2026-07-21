import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/devices")({
  component: AdminDevicesPage,
});

function AdminDevicesPage() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">デバイス管理</h2>
    </div>
  );
}
