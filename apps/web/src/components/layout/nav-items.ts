import { Gauge, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "デバイス一覧", icon: Gauge },
  { href: "/admin/devices", label: "デバイス管理", icon: Settings },
];
