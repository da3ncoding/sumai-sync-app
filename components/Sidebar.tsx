"use client";

// サイドバーナビゲーション
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, BarChart2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/properties", label: "物件一覧", icon: Home },
  { href: "/map", label: "地図", icon: MapPin },
  { href: "/ranking", label: "ランキング", icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-56 min-h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* タイトル */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="text-base font-bold text-white">SumaiSync</div>
        <div className="text-xs text-zinc-500 mt-0.5">住まい探しを2人で</div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ログアウト */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={16} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
