import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ApiKeyDisplay } from "@/components/api-key-display";
import { MobileHeader } from "@/components/layout/mobile-header";
import { useDeviceList } from "@/hooks/use-device-list";
import { ApiError, createDevice, deleteDevice, type CreatedDevice } from "@/lib/api";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";

export const Route = createFileRoute("/admin/devices")({
  component: AdminDevicesPage,
});

function AdminDevicesPage() {
  const { devices, isLoading, error, refetch } = useDeviceList();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<CreatedDevice | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setName("");
      setNameError(null);
      setCreatedDevice(null);
    }
  };

  const handleCreate = async () => {
    setNameError(null);
    setIsCreating(true);
    try {
      const device = await createDevice(name);
      setCreatedDevice(device);
      refetch();
    } catch (err) {
      setNameError(err instanceof ApiError ? (err.fieldErrors?.name?.[0] ?? err.message) : "登録に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteDevice(deleteTargetId);
      setDeleteTargetId(null);
      refetch();
    } catch {
      setDeleteError("削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <MobileHeader title="デバイス管理" />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <h1 className="hidden text-2xl font-semibold md:block">デバイス管理</h1>
          <ResponsiveDialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
            <ResponsiveDialogTrigger asChild>
              <Button size="sm" className="ml-auto">
                <Plus />
                新規登録
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              {createdDevice ? (
                <>
                  <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>{createdDevice.name} を登録しました</ResponsiveDialogTitle>
                  </ResponsiveDialogHeader>
                  <ResponsiveDialogBody className="pb-4">
                    <ApiKeyDisplay apiKey={createdDevice.apiKey} />
                  </ResponsiveDialogBody>
                  <ResponsiveDialogFooter>
                    <Button onClick={() => handleCreateOpenChange(false)}>閉じる</Button>
                  </ResponsiveDialogFooter>
                </>
              ) : (
                <>
                  <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>デバイスを新規登録</ResponsiveDialogTitle>
                  </ResponsiveDialogHeader>
                  <ResponsiveDialogBody className="space-y-2 pb-4">
                    <Label htmlFor="device-name">デバイス名</Label>
                    <Input id="device-name" placeholder="例: リビング" value={name} onChange={(e) => setName(e.target.value)} />
                    {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                  </ResponsiveDialogBody>
                  <ResponsiveDialogFooter>
                    <Button variant="outline" onClick={() => handleCreateOpenChange(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating || name.trim().length === 0}>
                      {isCreating ? "登録中..." : "登録する"}
                    </Button>
                  </ResponsiveDialogFooter>
                </>
              )}
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>

        {error && <p className="text-sm text-destructive">データの取得に失敗しました: {error}</p>}

        {!error && (
          <Card>
            <CardContent className="divide-y p-0">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}

              {!isLoading && devices.length === 0 && <p className="p-4 text-sm text-muted-foreground">登録済みのデバイスがありません。</p>}

              {!isLoading &&
                devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between gap-4 p-4">
                    <span className="text-sm font-medium">{device.name}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTargetId(device.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null);
            setDeleteError(null);
          }
        }}
        title="デバイスを削除しますか？"
        description="このデバイスは一覧に表示されなくなります。この操作は取り消せません。"
        onConfirm={handleDelete}
        isLoading={isDeleting}
        errorMessage={deleteError ?? undefined}
      />
    </>
  );
}
