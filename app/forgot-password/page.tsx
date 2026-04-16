"use client";

// パスワードリセット申請ページ
import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError("メールの送信に失敗しました。メールアドレスを確認してください。");
    } else {
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--accent-muted)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-[var(--accent)]" />
              </div>
              <h2 className="text-white font-medium mb-2">メールを送信しました</h2>
              <p className="text-zinc-500 text-sm mb-6">
                <span className="text-zinc-300">{email}</span> にパスワードリセット用のリンクを送りました。メールをご確認ください。
              </p>
              <Link href="/login" className="text-sm text-[var(--accent)] hover:underline">
                ログイン画面に戻る
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-white font-medium text-sm">パスワードをお忘れの方</h2>
                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                  登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-900 bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {loading ? "送信中..." : "リセットメールを送信"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ArrowLeft size={12} />
                  ログイン画面に戻る
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
