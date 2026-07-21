import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/devices/$id")({
  component: DeviceDetailPage,
});

function DeviceDetailPage() {
  const { id } = Route.useParams();
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">デバイス詳細: {id}</h2>
    </div>
  );
}
