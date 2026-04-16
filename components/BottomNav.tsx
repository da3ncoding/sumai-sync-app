"use client";

// モバイル用ボトムナビゲーション
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, BarChart2, Settings } from "lucide-react";

const navItems = [
  { href: "/properties", label: "物件一覧", icon: Home },
  { href: "/map",        label: "地図",     icon: MapPin },
  { href: "/ranking",    label: "ランキング", icon: BarChart2 },
  { href: "/settings",   label: "設定",     icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-zinc-900 border-t border-zinc-800">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors ${
              isActive ? "text-[var(--accent)]" : "text-zinc-500"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
