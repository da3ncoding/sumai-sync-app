"use client";

// ペア設定ページ（初回ログイン後に表示）
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Users, Copy, Check } from "lucide-react";

type View = "select" | "issue" | "join";

export default function PairPage() {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<View>("select");
  const [userId, setUserId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUserId(user.id);

      // 既にアクティブなペアがあればスキップ
      const { data: activePair } = await supabase
        .from("pairs")
        .select("id")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .eq("status", "active")
        .maybeSingle();
      if (activePair) return router.push("/properties");

      // 既に発行済みの pending コードがあれば表示
      const { data: pendingPair } = await supabase
        .from("pairs")
        .select("invite_code")
        .eq("user_a_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (pendingPair) {
        setInviteCode(pendingPair.invite_code);
        setView("issue");
      }
    };
    init();
  }, []);

  const handleIssue = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");

    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { error: insertError } = await supabase.from("pairs").insert({
      user_a_id: userId,
      invite_code: code,
      status: "pending",
    });

    if (insertError) {
      setError("招待コードの発行に失敗しました");
    } else {
      setInviteCode(code);
      setView("issue");
    }
    setLoading(false);
  };

  const handleJoin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId || !inputCode.trim()) return;
    setLoading(true);
    setError("");

    const { data: pair } = await supabase
      .from("pairs")
      .select("id, user_a_id")
      .eq("invite_code", inputCode.trim().toUpperCase())
      .eq("status", "pending")
      .maybeSingle();

    if (!pair) {
      setError("招待コードが見つからないか、すでに使用済みです");
      setLoading(false);
      return;
    }

    if (pair.user_a_id === userId) {
      setError("自分の招待コードは使えません");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("pairs")
      .update({ user_b_id: userId, status: "active" })
      .eq("id", pair.id);

    if (updateError) {
      setError("ペアへの参加に失敗しました");
      setLoading(false);
      return;
    }

    router.push("/properties");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users size={22} className="text-[var(--accent)]" />
            <span className="text-xl font-bold text-white">ペア設定</span>
          </div>
          <p className="text-zinc-500 text-sm">一緒に住まい探しをする相手と繋がりましょう</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {/* 選択画面 */}
          {view === "select" && (
            <div className="space-y-3">
              <button
                onClick={handleIssue}
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-medium bg-[var(--accent)] text-zinc-900 hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {loading ? "発行中..." : "招待コードを発行する"}
              </button>
              <button
                onClick={() => setView("join")}
                className="w-full py-3 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                招待コードを入力する
              </button>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </div>
          )}

          {/* コード発行済み画面 */}
          {view === "issue" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 text-center">このコードを相手に送ってください</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-800 rounded-lg px-4 py-3 text-white text-2xl font-mono tracking-widest text-center">
                  {inviteCode}
                </div>
                <button
                  onClick={handleCopy}
                  className="p-3 bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                >
                  {copied ? <Check size={16} className="text-[var(--accent)]" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-xs text-zinc-600 text-center">相手がコードを入力するとペアが成立します</p>
            </div>
          )}

          {/* コード入力画面 */}
          {view === "join" && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">招待コード</label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="例：ABC12345"
                  maxLength={8}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-zinc-900 hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {loading ? "確認中..." : "ペアになる"}
              </button>
              <button
                type="button"
                onClick={() => { setView("select"); setError(""); setInputCode(""); }}
                className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                戻る
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
