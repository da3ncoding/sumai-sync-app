"use client";

// 物件一覧ページ
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";

type Property = {
  id: string;
  title: string;
  address: string;
  url: string | null;
  status: "active" | "skipped";
  created_at: string;
};

export default function PropertiesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      fetchProperties();
    };
    init();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (data) setProperties(data);
    setLoading(false);
  };

  const active = properties.filter((p) => p.status === "active");

  return (
    <div className="p-8 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">物件一覧</h1>
          <p className="text-zinc-500 text-sm mt-1">候補物件を管理する</p>
        </div>
        <Link
          href="/properties/new"
          className="flex items-center gap-1.5 bg-emerald-400 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-emerald-300 transition-colors"
        >
          <Plus size={16} />
          物件を追加
        </Link>
      </div>

      {/* 物件リスト */}
      {loading ? (
        <div className="text-zinc-500 text-sm">読み込み中...</div>
      ) : active.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-zinc-400 text-sm">まだ候補物件がありません</p>
          <p className="text-zinc-600 text-xs mt-1">「物件を追加」から登録してみましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-medium text-sm mb-1 truncate">
                    {property.title}
                  </h2>
                  <div className="flex items-center gap-1 text-zinc-500 text-xs">
                    <MapPin size={11} />
                    <span className="truncate">{property.address}</span>
                  </div>
                </div>
                {property.url && (
                  <a
                    href={property.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
