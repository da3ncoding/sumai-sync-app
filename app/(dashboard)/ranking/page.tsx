"use client";

// ランキングページ
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, TrendingUp, AlertCircle } from "lucide-react";

type Property = {
  id: string;
  title: string;
  address: string;
};

type Rating = {
  property_id: string;
  user_id: string;
  location_score: number | null;
  environment_score: number | null;
  layout_score: number | null;
  facility_score: number | null;
  price_score: number | null;
  desire_score: number | null;
};

type RankedProperty = Property & {
  myScore: number | null;
  scoreCount: number;
};

function calcAvg(rating: Rating): number | null {
  const scores = [
    rating.location_score,
    rating.environment_score,
    rating.layout_score,
    rating.facility_score,
    rating.price_score,
    rating.desire_score,
  ].filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600 text-xs">未評価</span>;
  const color =
    score >= 4 ? "text-emerald-400" : score >= 3 ? "text-yellow-400" : "text-zinc-400";
  return <span className={`text-lg font-bold ${color}`}>{score.toFixed(1)}</span>;
}

export default function RankingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [ranked, setRanked] = useState<RankedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUserId(user.id);
      await fetchData(user.id);
      setLoading(false);
    };
    init();
  }, []);

  const fetchData = async (uid: string) => {
    const [{ data: properties }, { data: ratings }] = await Promise.all([
      supabase.from("properties").select("id, title, address").eq("status", "active"),
      supabase.from("property_ratings").select("*"),
    ]);

    if (!properties) return;

    const result: RankedProperty[] = properties.map((p) => {
      const myRating = ratings?.find(
        (r) => r.property_id === p.id && r.user_id === uid
      );
      const myScore = myRating ? calcAvg(myRating) : null;
      const scoreCount = myRating
        ? [
            myRating.location_score,
            myRating.environment_score,
            myRating.layout_score,
            myRating.facility_score,
            myRating.price_score,
            myRating.desire_score,
          ].filter((s) => s !== null).length
        : 0;

      return { ...p, myScore, scoreCount };
    });

    // スコア降順（未評価は末尾）
    result.sort((a, b) => {
      if (a.myScore === null && b.myScore === null) return 0;
      if (a.myScore === null) return 1;
      if (b.myScore === null) return -1;
      return b.myScore - a.myScore;
    });

    setRanked(result);
  };

  if (loading) {
    return <div className="p-8 text-zinc-500 text-sm">読み込み中...</div>;
  }

  const evaluated = ranked.filter((p) => p.myScore !== null);
  const notEvaluated = ranked.filter((p) => p.myScore === null);

  return (
    <div className="p-8 max-w-2xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">ランキング</h1>
        <p className="text-zinc-500 text-sm mt-1">評価スコア順に並んだ候補物件</p>
      </div>

      {ranked.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-zinc-400 text-sm">物件を追加して評価するとランキングが表示されます</p>
        </div>
      ) : (
        <>
          {/* 評価済みランキング */}
          {evaluated.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                <Trophy size={13} />
                評価済み
              </div>
              <div className="space-y-2">
                {evaluated.map((p, index) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 hover:border-zinc-600 transition-colors"
                  >
                    {/* 順位 */}
                    <div className={`text-lg font-bold w-7 text-center ${
                      index === 0 ? "text-yellow-400" :
                      index === 1 ? "text-zinc-400" :
                      index === 2 ? "text-amber-600" :
                      "text-zinc-600"
                    }`}>
                      {index + 1}
                    </div>

                    {/* 物件情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{p.title}</div>
                      <div className="text-zinc-500 text-xs truncate mt-0.5">{p.address}</div>
                      <div className="text-zinc-600 text-xs mt-0.5">{p.scoreCount}/6項目評価済み</div>
                    </div>

                    {/* スコア */}
                    <ScoreBadge score={p.myScore} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 未評価 */}
          {notEvaluated.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                <AlertCircle size={13} />
                未評価
              </div>
              <div className="space-y-2">
                {notEvaluated.map((p) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 hover:border-zinc-600 transition-colors"
                  >
                    <div className="text-zinc-700 font-bold w-7 text-center">—</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-400 text-sm font-medium truncate">{p.title}</div>
                      <div className="text-zinc-600 text-xs truncate mt-0.5">{p.address}</div>
                    </div>
                    <span className="text-zinc-600 text-xs">未評価</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ヒント */}
          {evaluated.length === 0 && (
            <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
              <TrendingUp size={13} />
              物件詳細ページで評価するとここにランキングが表示されます
            </div>
          )}
        </>
      )}
    </div>
  );
}
