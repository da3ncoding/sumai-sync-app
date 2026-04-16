"use client";

// 設定ページ（名前編集・テーマカラー）
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User, Palette, Check, Loader2 } from "lucide-react";
import { useTheme, ACCENT_OPTIONS, type AccentColor } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { accent, setAccent } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUserId(user.id);

      // 自分の名前を取得
      const { data: me } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (me) setDisplayName(me.display_name ?? "");

      // パートナーを取得
      const { data: pair } = await supabase
        .from("pairs")
        .select("user_a_id, user_b_id")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .eq("status", "active")
        .maybeSingle();

      if (pair) {
        const partnerId = pair.user_a_id === user.id ? pair.user_b_id : pair.user_a_id;
        const { data: partner } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", partnerId)
          .single();
        if (partner) setPartnerName(partner.display_name);
      }

      setLoading(false);
    };
    init();
  }, []);

  const handleSaveName = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!displayName.trim() || !userId) return;
    setSaving(true);
    await supabase.from("users").update({ display_name: displayName.trim() }).eq("id", userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return <div className="p-4 md:p-8 text-zinc-500 text-sm">読み込み中...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">設定</h1>
        <p className="text-zinc-500 text-sm mt-1">プロフィールとテーマを管理する</p>
      </div>

      {/* プロフィール */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={15} className="text-zinc-400" />
          <h2 className="text-sm font-medium text-white">プロフィール</h2>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">自分の名前</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              placeholder="表示名を入力..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
          </div>

          {partnerName !== null && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">パートナーの名前</label>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-400">
                {partnerName}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-zinc-900 hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saved ? (
              <>
                <Check size={13} />
                保存しました
              </>
            ) : (
              "名前を保存"
            )}
          </button>
        </form>
      </div>

      {/* テーマカラー */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={15} className="text-zinc-400" />
          <h2 className="text-sm font-medium text-white">テーマカラー</h2>
        </div>

        <div className="flex gap-4 flex-wrap">
          {ACCENT_OPTIONS.map(({ value, label, hex }) => (
            <button
              key={value}
              onClick={() => setAccent(value as AccentColor)}
              className="flex flex-col items-center gap-1.5"
              aria-label={`テーマカラーを${label}に変更`}
            >
              <div
                className={`w-10 h-10 rounded-full transition-all ${
                  accent === value
                    ? "ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110"
                    : "hover:scale-105 opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: hex }}
              />
              <span className={`text-xs ${accent === value ? "text-white" : "text-zinc-500"}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
