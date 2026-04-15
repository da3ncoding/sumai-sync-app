// ジオコーディングAPI（住所→緯度経度）
// Nominatim (OpenStreetMap) を使用 - 無料・課金なし
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ lat: null, lng: null });
  }

  // 〒や全角スペース・記号を除去してシンプルな住所にする
  const cleaned = address
    .replace(/〒\d{3}-\d{4}\s*/g, "")  // 郵便番号除去
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角英数→半角
    .replace(/　/g, " ") // 全角スペース→半角
    .trim();

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleaned)}&format=json&limit=1&countrycodes=jp`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SumaiSync/1.0 (sumai-sync-app)",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ lat: null, lng: null });
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      return NextResponse.json({ lat: null, lng: null });
    }

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
