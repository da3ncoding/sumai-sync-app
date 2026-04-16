"use client";

// パスワード再設定ページ（リセットメールのリンクから遷移）
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabaseがリセットリンクのトークンを処理し PASSWORD_RECOVERY イベントを発火する
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("パスワードの更新に失敗しました。もう一度お試しください。");
    } else {
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white mb-1">SumaiSync</div>
          <p className="text-zinc-500 text-sm">2人で進める住まい探し</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--accent-muted)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-[var(--accent)]" />
              </div>
              <h2 className="text-white font-medium mb-2">パスワードを更新しました</h2>
              <p className="text-zinc-500 text-sm">新しいパスワードでログインしてください。</p>
              <p className="text-zinc-600 text-xs mt-2">3秒後にログイン画面へ移動します...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <Loader2 size={24} className="animate-spin text-zinc-500 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">認証情報を確認中...</p>
              <p className="text-zinc-600 text-xs mt-4">
                リンクが無効な場合は
                <Link href="/forgot-password" className="text-[var(--accent)] hover:underline mx-1">
                  こちら
                </Link>
                から再送信してください。
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-white font-medium text-sm">新しいパスワードを設定</h2>
                <p className="text-zinc-500 text-xs mt-1">6文字以上で入力してください。</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">新しいパスワード</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="6文字以上"
                      className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">パスワード（確認）</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="もう一度入力"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-zinc-900 bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? "更新中..." : "パスワードを更新する"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
