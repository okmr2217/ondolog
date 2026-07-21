import { createRootRoute, Outlet } from "@tanstack/react-router";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-dvh">
      <MobileHeader title="OndoLog" />
      <main className="pb-[60px] md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
