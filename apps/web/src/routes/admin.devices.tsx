import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { MobileHeader } from "@/components/layout/mobile-header";
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <>
      <MobileHeader title="デバイス管理" />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <h1 className="hidden text-2xl font-semibold md:block">デバイス管理</h1>
          <ResponsiveDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button size="sm" className="ml-auto">
                <Plus />
                新規登録
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>デバイスを新規登録</ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <ResponsiveDialogBody className="space-y-2 pb-4">
                <Label htmlFor="device-name">デバイス名</Label>
                <Input id="device-name" placeholder="例: リビング" />
              </ResponsiveDialogBody>
              <ResponsiveDialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button>登録する</Button>
              </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>

        <Card>
          <CardContent className="divide-y p-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-4">
                <Skeleton className="h-5 w-32" />
                <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTargetId(`device-${i}`)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <DeleteConfirmDialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => !open && setDeleteTargetId(null)}
          title="デバイスを削除しますか？"
          description="このデバイスは一覧に表示されなくなります。この操作は取り消せません。"
          onConfirm={() => setDeleteTargetId(null)}
        />
      </div>
    </>
  );
}
