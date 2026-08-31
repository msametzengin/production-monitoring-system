"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Factory,
  Gauge,
  Package,
  Target,
  TriangleAlert,
  ClipboardList,
  ChartNoAxesCombined,
} from "lucide-react";

const navigationItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: Gauge,
  },
  {
    href: "/analytics",
    label: "Analiz",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/facilities",
    label: "Tesisler",
    icon: Factory,
  },
  {
    href: "/products",
    label: "Ürünler",
    icon: Package,
  },
  {
    href: "/production",
    label: "Üretim",
    icon: ClipboardList,
  },
  {
    href: "/targets",
    label: "Hedefler",
    icon: Target,
  },
  {
    href: "/downtimes",
    label: "Duruşlar",
    icon: TriangleAlert,
  },
] as const;

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {navigationItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400"
                : "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}