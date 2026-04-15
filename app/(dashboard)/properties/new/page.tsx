"use client";

// 物件登録ページ
import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { normalizeAddress } from "@/lib/normalizeAddress";

export default function NewPropertyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [url, setUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !address.trim()) return;
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // ジオコーディング（住所→緯度経度）
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const geo = await res.json();
      if (geo.lat && geo.lng) {
        lat = geo.lat;
        lng = geo.lng;
      }
    } catch {
      // ジオコーディング失敗は無視（lat/lngはnullのまま）
    }

    const { error: insertError } = await supabase.from("properties").insert({
      title: title.trim(),
      address: address.trim(),
      url: url.trim() || null,
      lat,
      lng,
      status: "active",
      created_by: user.id,
      pair_id: null, // ペア機能は後で実装
    });

    if (insertError) {
      console.error("insert error:", insertError);
      setError(`登録に失敗しました: ${insertError.message}`);
      setLoading(false);
      return;
    }

    router.push("/properties");
  };

  return (
    <div className="p-8 max-w-xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <Link
          href="/properties"
          className="flex items-center gap-1.5 text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          物件一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold text-white">物件を追加</h1>
        <p className="text-zinc-500 text-sm mt-1">候補物件の情報を入力してください</p>
      </div>

      {/* フォーム */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              物件名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="例：○○マンション 301号室"
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              住所 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(normalizeAddress(e.target.value))}
              required
              placeholder="例：東京都渋谷区渋谷1-1-1"
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-600 mt-1">住所から地図ピンを自動設定します。数字は半角で入力してください（例：東京都千代田区千代田1-1）</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              物件URL <span className="text-zinc-600">（任意）</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-zinc-900 bg-emerald-400 hover:bg-emerald-300 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "登録中..." : "物件を登録する"}
          </button>
        </form>
      </div>
    </div>
  );
}
