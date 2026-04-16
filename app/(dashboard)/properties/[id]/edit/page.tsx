"use client";

// 物件編集ページ
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { normalizeAddress } from "@/lib/normalizeAddress";

export default function EditPropertyPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data } = await supabase.from("properties").select("*").eq("id", id).single();
      if (!data) return router.push("/properties");

      setTitle(data.title);
      setAddress(data.address);
      setUrl(data.url ?? "");
      setLoading(false);
    };
    init();
  }, [id]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !address.trim()) return;
    setSaving(true);
    setError("");

    const normalized = normalizeAddress(address);

    // 住所が変わった場合は座標を再取得
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(normalized)}`);
      const geo = await res.json();
      if (geo.lat && geo.lng) {
        lat = geo.lat;
        lng = geo.lng;
      }
    } catch {
      // 失敗しても続行
    }

    const updateData: Record<string, unknown> = {
      title: title.trim(),
      address: normalized,
      url: url.trim() || null,
    };
    if (lat && lng) {
      updateData.lat = lat;
      updateData.lng = lng;
    }

    const { error: updateError } = await supabase
      .from("properties")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      setError("更新に失敗しました。もう一度試してください。");
      setSaving(false);
      return;
    }

    router.push(`/properties/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm("この物件を完全に削除しますか？この操作は元に戻せません。")) return;
    await supabase.from("properties").delete().eq("id", id);
    router.push("/properties");
  };

  if (loading) {
    return <div className="p-8 text-zinc-500 text-sm">読み込み中...</div>;
  }

  return (
    <div className="p-8 max-w-xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <Link
          href={`/properties/${id}`}
          className="flex items-center gap-1.5 text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          物件詳細に戻る
        </Link>
        <h1 className="text-2xl font-bold text-white">物件を編集</h1>
      </div>

      {/* フォーム */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-4">
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
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
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
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
            <p className="text-xs text-zinc-600 mt-1">住所を変更すると地図ピンを自動で再取得します</p>
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
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-zinc-900 bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "保存中..." : "変更を保存"}
          </button>
        </form>
      </div>

      {/* 削除 */}
      <div className="bg-zinc-900 border border-red-900/40 rounded-xl p-5">
        <h2 className="text-sm font-medium text-red-400 mb-1">物件を削除</h2>
        <p className="text-xs text-zinc-500 mb-4">削除すると評価・コメントもすべて消えます。この操作は元に戻せません。</p>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm text-red-400 border border-red-900/60 px-4 py-2 rounded-lg hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={14} />
          この物件を削除する
        </button>
      </div>
    </div>
  );
}
