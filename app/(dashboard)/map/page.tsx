"use client";

// 地図ページ
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

type Property = {
  id: string;
  title: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

// LeafletはSSR不可のためdynamic importで読み込む
const PropertyMap = dynamic(() => import("@/components/PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
      <span className="text-zinc-500 text-sm">地図を読み込み中...</span>
    </div>
  ),
});

export default function MapPage() {
  const router = useRouter();
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data } = await supabase
        .from("properties")
        .select("id, title, address, lat, lng")
        .eq("status", "active");
      if (data) setProperties(data);
      setLoading(false);
    };
    init();
  }, []);

  const withCoords = properties.filter((p) => p.lat && p.lng);
  const withoutCoords = properties.filter((p) => !p.lat || !p.lng);

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <div className="px-8 py-5 border-b border-zinc-800 shrink-0">
        <h1 className="text-xl font-bold text-white">地図</h1>
        <p className="text-zinc-500 text-xs mt-0.5">
          {loading ? "読み込み中..." : `${withCoords.length}件の物件をピン表示`}
          {withoutCoords.length > 0 && `（${withoutCoords.length}件は住所が取得できていません）`}
        </p>
      </div>

      {/* 地図エリア */}
      <div className="flex-1 relative">
        {!loading && (
          <PropertyMap
            properties={properties}
            onSelectProperty={(id) => router.push(`/properties/${id}`)}
          />
        )}
      </div>
    </div>
  );
}
