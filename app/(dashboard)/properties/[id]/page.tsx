"use client";

// 物件詳細ページ（評価・コメント）
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Send, Trash2, RefreshCw, Pencil } from "lucide-react";
import Link from "next/link";

type Property = {
  id: string;
  title: string;
  address: string;
  url: string | null;
  status: "active" | "skipped";
  lat: number | null;
  lng: number | null;
};

type Rating = {
  id: string;
  property_id: string;
  user_id: string;
  location_score: number | null;
  environment_score: number | null;
  layout_score: number | null;
  facility_score: number | null;
  price_score: number | null;
  desire_score: number | null;
};

type Comment = {
  id: string;
  comment: string;
  user_id: string;
  created_at: string;
  users: { display_name: string } | null;
};

const RATING_ITEMS = [
  { key: "location_score", label: "立地" },
  { key: "environment_score", label: "周辺環境" },
  { key: "layout_score", label: "間取り・広さ" },
  { key: "facility_score", label: "建物・設備" },
  { key: "price_score", label: "価格納得感" },
  { key: "desire_score", label: "住みたい気持ち" },
] as const;

function ScoreButton({ value, selected, onClick }: { value: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
        selected
          ? "bg-emerald-400 text-zinc-900"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {value}
    </button>
  );
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [property, setProperty] = useState<Property | null>(null);
  const [myRating, setMyRating] = useState<Rating | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRating, setSavingRating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUserId(user.id);
      await Promise.all([fetchProperty(), fetchRating(user.id), fetchComments()]);
      setLoading(false);
    };
    init();
  }, [id]);

  const fetchProperty = async () => {
    const { data } = await supabase.from("properties").select("*").eq("id", id).single();
    if (data) setProperty(data);
  };

  const fetchRating = async (uid: string) => {
    const { data } = await supabase
      .from("property_ratings")
      .select("*")
      .eq("property_id", id)
      .eq("user_id", uid)
      .maybeSingle();
    setMyRating(data ?? null);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("property_comments")
      .select("*, users(display_name)")
      .eq("property_id", id)
      .order("created_at", { ascending: true });
    if (data) setComments(data as Comment[]);
  };

  const handleScoreChange = async (key: string, value: number) => {
    if (!userId) return;
    setSavingRating(true);

    const newRating = {
      property_id: id,
      user_id: userId,
      [key]: value,
    };

    if (myRating) {
      const { data } = await supabase
        .from("property_ratings")
        .update({ [key]: value })
        .eq("id", myRating.id)
        .select()
        .single();
      if (data) setMyRating(data);
    } else {
      const { data } = await supabase
        .from("property_ratings")
        .insert(newRating)
        .select()
        .single();
      if (data) setMyRating(data);
    }
    setSavingRating(false);
  };

  const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim() || !userId) return;
    await supabase.from("property_comments").insert({
      property_id: id,
      user_id: userId,
      comment: newComment.trim(),
    });
    setNewComment("");
    fetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("property_comments").delete().eq("id", commentId);
    fetchComments();
  };

  const handleRefreshGeocode = async () => {
    if (!property) return;
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(property.address)}`);
      const geo = await res.json();
      if (geo.lat && geo.lng) {
        await supabase.from("properties").update({ lat: geo.lat, lng: geo.lng }).eq("id", id);
        setProperty({ ...property, lat: geo.lat, lng: geo.lng });
      } else {
        alert("住所から座標を取得できませんでした。住所を確認してください（例：東京都千代田区千代田1-1）");
      }
    } catch {
      alert("座標の取得に失敗しました");
    }
    setGeocoding(false);
  };

  const handleSkip = async () => {
    if (!confirm("この物件を見送りにしますか？")) return;
    await supabase.from("properties").update({ status: "skipped" }).eq("id", id);
    router.push("/properties");
  };

  const calcAverage = (rating: Rating | null) => {
    if (!rating) return null;
    const scores = [
      rating.location_score,
      rating.environment_score,
      rating.layout_score,
      rating.facility_score,
      rating.price_score,
      rating.desire_score,
    ].filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  if (loading) {
    return <div className="p-8 text-zinc-500 text-sm">読み込み中...</div>;
  }

  if (!property) {
    return <div className="p-8 text-zinc-500 text-sm">物件が見つかりません</div>;
  }

  const avg = calcAverage(myRating);

  return (
    <div className="p-8 max-w-2xl">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          href="/properties"
          className="flex items-center gap-1.5 text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          物件一覧に戻る
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{property.title}</h1>
            <div className="flex items-center gap-1 text-zinc-500 text-sm mt-1">
              <MapPin size={13} />
              {property.address}
              {property.lat ? (
                <span className="text-xs text-emerald-500 ml-1">📍 地図あり</span>
              ) : (
                <button
                  onClick={handleRefreshGeocode}
                  disabled={geocoding}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 ml-1 border border-zinc-700 rounded px-1.5 py-0.5 transition-colors"
                >
                  <RefreshCw size={10} className={geocoding ? "animate-spin" : ""} />
                  {geocoding ? "取得中..." : "地図ピンを取得"}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {property.url && (
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-lg hover:border-zinc-500 transition-colors"
              >
                <ExternalLink size={12} />
                物件ページ
              </a>
            )}
            <Link
              href={`/properties/${id}/edit`}
              className="flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-lg hover:border-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Pencil size={12} />
              編集
            </Link>
            <button
              onClick={handleSkip}
              className="text-xs text-zinc-500 border border-zinc-700 px-3 py-1.5 rounded-lg hover:border-zinc-500 hover:text-zinc-300 transition-colors"
            >
              見送り
            </button>
          </div>
        </div>
      </div>

      {/* 評価セクション */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-medium text-white">評価</h2>
          <div className="flex items-center gap-2">
            {savingRating && <span className="text-xs text-zinc-500">保存中...</span>}
            {avg && (
              <span className="text-emerald-400 text-sm font-bold">平均 {avg}</span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {RATING_ITEMS.map(({ key, label }) => {
            const currentScore = myRating?.[key] ?? null;
            return (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-400 w-28 shrink-0">{label}</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <ScoreButton
                      key={v}
                      value={v}
                      selected={currentScore === v}
                      onClick={() => handleScoreChange(key, v)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* コメントセクション */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-medium text-white mb-4">コメント</h2>

        {comments.length === 0 ? (
          <p className="text-zinc-600 text-xs mb-4">まだコメントはありません</p>
        ) : (
          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-emerald-400 font-medium">
                      {c.users?.display_name ?? "不明"}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(c.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">{c.comment}</p>
                </div>
                {c.user_id === userId && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors mt-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            type="submit"
            data-testid="comment-submit"
            className="flex items-center gap-1.5 bg-emerald-400 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-emerald-300 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
