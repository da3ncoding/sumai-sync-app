"use client";

// ログイン・サインアップページ
import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }
      // プロフィールテーブルに表示名を登録
      if (data.user) {
        await supabase.from("users").insert({
          id: data.user.id,
          display_name: displayName || email.split("@")[0],
        });
      }
      setSignupDone(true);
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) {
        setError("メールアドレスまたはパスワードが正しくありません");
        setLoading(false);
        return;
      }
      router.push("/properties");
      router.refresh();
    }

    setLoading(false);
  };

  if (signupDone) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-white mb-2">確認メールを送りました</h2>
          <p className="text-zinc-400 text-sm">
            {email} に確認メールを送りました。<br />
            メール内のリンクをクリックしてログインしてください。
          </p>
          <button
            onClick={() => { setMode("login"); setSignupDone(false); }}
            className="mt-6 text-sm text-[var(--accent)] hover:underline"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white mb-1">SumaiSync</div>
          <p className="text-zinc-500 text-sm">2人で進める住まい探し</p>
        </div>

        {/* カード */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {/* タブ */}
          <div className="flex mb-6 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === "login"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === "signup"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">表示名</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例：たろう"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="6文字以上"
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              data-testid="submit-button"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-900 bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? "処理中..." : mode === "login" ? "ログイン" : "アカウント作成"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
