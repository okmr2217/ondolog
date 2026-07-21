import { Link, useLocation } from "@tanstack/react-router";
import { Gauge, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "デバイス一覧", icon: Gauge },
  { href: "/admin/devices", label: "デバイス管理", icon: Settings },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-[60px]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
