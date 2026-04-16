"use client";

// ランキングページ
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, AlertCircle, Users, User, ArrowLeftRight } from "lucide-react";

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
  partnerScore: number | null;
};

type Tab = "mine" | "partner" | "combined" | "diff";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "mine", label: "自分", icon: User },
  { key: "partner", label: "相手", icon: Users },
  { key: "combined", label: "総合", icon: Trophy },
  { key: "diff", label: "点差", icon: ArrowLeftRight },
];

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

function ScoreBadge({ score, color = "emerald" }: { score: number | null; color?: "emerald" | "sky" | "violet" | "orange" }) {
  if (score === null) return <span className="text-zinc-600 text-xs">未評価</span>;
  const colorMap = {
    emerald: score >= 4 ? "text-emerald-400" : score >= 3 ? "text-yellow-400" : "text-zinc-400",
    sky: score >= 4 ? "text-sky-400" : score >= 3 ? "text-yellow-400" : "text-zinc-400",
    violet: score >= 4 ? "text-violet-400" : score >= 3 ? "text-yellow-400" : "text-zinc-400",
    orange: score >= 2 ? "text-orange-400" : "text-zinc-400",
  };
  return <span className={`text-lg font-bold ${colorMap[color]}`}>{score.toFixed(1)}</span>;
}

export default function RankingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [ranked, setRanked] = useState<RankedProperty[]>([]);
  const [partnerName, setPartnerName] = useState<string>("相手");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      // パートナーID取得
      const { data: pair } = await supabase
        .from("pairs")
        .select("user_a_id, user_b_id")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .eq("status", "active")
        .maybeSingle();

      const partnerId = pair
        ? pair.user_a_id === user.id ? pair.user_b_id : pair.user_a_id
        : null;

      // パートナー名取得
      if (partnerId) {
        const { data: partnerUser } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", partnerId)
          .single();
        if (partnerUser) setPartnerName(partnerUser.display_name);
      }

      await fetchData(user.id, partnerId);
      setLoading(false);
    };
    init();
  }, []);

  const fetchData = async (uid: string, partnerId: string | null) => {
    const [{ data: properties }, { data: ratings }] = await Promise.all([
      supabase.from("properties").select("id, title, address").eq("status", "active"),
      supabase.from("property_ratings").select("*"),
    ]);

    if (!properties) return;

    const result: RankedProperty[] = properties.map((p) => {
      const myRating = ratings?.find((r) => r.property_id === p.id && r.user_id === uid);
      const partnerRating = partnerId
        ? ratings?.find((r) => r.property_id === p.id && r.user_id === partnerId)
        : null;

      return {
        ...p,
        myScore: myRating ? calcAvg(myRating) : null,
        partnerScore: partnerRating ? calcAvg(partnerRating) : null,
      };
    });

    setRanked(result);
  };

  const getSortedList = (): RankedProperty[] => {
    const sorted = [...ranked];

    if (activeTab === "mine") {
      return sorted.sort((a, b) => {
        if (a.myScore === null && b.myScore === null) return 0;
        if (a.myScore === null) return 1;
        if (b.myScore === null) return -1;
        return b.myScore - a.myScore;
      });
    }

    if (activeTab === "partner") {
      return sorted.sort((a, b) => {
        if (a.partnerScore === null && b.partnerScore === null) return 0;
        if (a.partnerScore === null) return 1;
        if (b.partnerScore === null) return -1;
        return b.partnerScore - a.partnerScore;
      });
    }

    if (activeTab === "combined") {
      return sorted.sort((a, b) => {
        const aScore = a.myScore !== null && a.partnerScore !== null
          ? (a.myScore + a.partnerScore) / 2
          : a.myScore ?? a.partnerScore ?? null;
        const bScore = b.myScore !== null && b.partnerScore !== null
          ? (b.myScore + b.partnerScore) / 2
          : b.myScore ?? b.partnerScore ?? null;
        if (aScore === null && bScore === null) return 0;
        if (aScore === null) return 1;
        if (bScore === null) return -1;
        return bScore - aScore;
      });
    }

    // diff: 点差が大きい順（意見が割れている）
    return sorted.sort((a, b) => {
      const aDiff = a.myScore !== null && a.partnerScore !== null
        ? Math.abs(a.myScore - a.partnerScore)
        : null;
      const bDiff = b.myScore !== null && b.partnerScore !== null
        ? Math.abs(b.myScore - b.partnerScore)
        : null;
      if (aDiff === null && bDiff === null) return 0;
      if (aDiff === null) return 1;
      if (bDiff === null) return -1;
      return bDiff - aDiff;
    });
  };

  if (loading) {
    return <div className="p-4 md:p-8 text-zinc-500 text-sm">読み込み中...</div>;
  }

  const list = getSortedList();

  const renderScore = (p: RankedProperty, index: number) => {
    if (activeTab === "mine") {
      return <ScoreBadge score={p.myScore} color="emerald" />;
    }
    if (activeTab === "partner") {
      return <ScoreBadge score={p.partnerScore} color="sky" />;
    }
    if (activeTab === "combined") {
      const combined = p.myScore !== null && p.partnerScore !== null
        ? (p.myScore + p.partnerScore) / 2
        : p.myScore ?? p.partnerScore ?? null;
      return (
        <div className="flex flex-col items-end gap-0.5">
          <ScoreBadge score={combined} color="violet" />
          {p.myScore !== null && p.partnerScore !== null && (
            <span className="text-xs text-zinc-600">
              {p.myScore.toFixed(1)} / {p.partnerScore.toFixed(1)}
            </span>
          )}
        </div>
      );
    }
    // diff
    const diff = p.myScore !== null && p.partnerScore !== null
      ? Math.abs(p.myScore - p.partnerScore)
      : null;
    return (
      <div className="flex flex-col items-end gap-0.5">
        <ScoreBadge score={diff} color="orange" />
        {p.myScore !== null && p.partnerScore !== null && (
          <span className="text-xs text-zinc-600">
            {p.myScore.toFixed(1)} vs {p.partnerScore.toFixed(1)}
          </span>
        )}
      </div>
    );
    void index;
  };

  const isEvaluated = (p: RankedProperty) => {
    if (activeTab === "mine") return p.myScore !== null;
    if (activeTab === "partner") return p.partnerScore !== null;
    if (activeTab === "combined") return p.myScore !== null || p.partnerScore !== null;
    return p.myScore !== null && p.partnerScore !== null;
  };

  const evaluated = list.filter(isEvaluated);
  const notEvaluated = list.filter((p) => !isEvaluated(p));

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">ランキング</h1>
        <p className="text-zinc-500 text-sm mt-1">評価スコア順に並んだ候補物件</p>
      </div>

      {/* タブ */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={13} />
            {key === "partner" ? partnerName : label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-zinc-400 text-sm">物件を追加して評価するとランキングが表示されます</p>
        </div>
      ) : (
        <>
          {/* 評価済みリスト */}
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
                    className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 md:px-5 md:py-4 hover:border-zinc-600 transition-colors"
                  >
                    <div className={`text-lg font-bold w-7 text-center shrink-0 ${
                      index === 0 ? "text-yellow-400" :
                      index === 1 ? "text-zinc-400" :
                      index === 2 ? "text-amber-600" :
                      "text-zinc-600"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{p.title}</div>
                      <div className="text-zinc-500 text-xs truncate mt-0.5">{p.address}</div>
                    </div>
                    {renderScore(p, index)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 未評価リスト */}
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
                    className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 md:px-5 md:py-4 hover:border-zinc-600 transition-colors"
                  >
                    <div className="text-zinc-700 font-bold w-7 text-center shrink-0">—</div>
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
        </>
      )}
    </div>
  );
}
