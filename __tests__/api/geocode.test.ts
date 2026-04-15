import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/geocode/route";

// Nominatimへのfetchをモック（外部APIを実際には叩かない）
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Nominatimが正常に座標を返すモックレスポンスを作るヘルパー
const nominatimOkResponse = (lat: string, lon: string) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ lat, lon }]),
  });

// Nominatimが空配列を返すモックレスポンス（住所が見つからない）
const nominatimEmptyResponse = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });

// Nominatimがエラーを返すモックレスポンス
const nominatimErrorResponse = () =>
  Promise.resolve({ ok: false });

// テスト用のNextRequestを作るヘルパー
const makeRequest = (address?: string) => {
  const url = address
    ? `http://localhost/api/geocode?address=${encodeURIComponent(address)}`
    : "http://localhost/api/geocode";
  return new NextRequest(url);
};

describe("GET /api/geocode", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("住所を渡すと緯度経度を返す", async () => {
    mockFetch.mockImplementation(() =>
      nominatimOkResponse("35.6762", "139.6503")
    );

    const req = makeRequest("東京都千代田区千代田1-1");
    const res = await GET(req);
    const body = await res.json();

    expect(body.lat).toBe(35.6762);
    expect(body.lng).toBe(139.6503);
  });

  it("addressパラメータがない場合はnullを返す", async () => {
    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(body.lat).toBeNull();
    expect(body.lng).toBeNull();
    // fetchは呼ばれない
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("Nominatimが空配列を返した場合はnullを返す（住所が見つからない）", async () => {
    mockFetch.mockImplementation(nominatimEmptyResponse);

    const req = makeRequest("存在しない住所99999");
    const res = await GET(req);
    const body = await res.json();

    expect(body.lat).toBeNull();
    expect(body.lng).toBeNull();
  });

  it("NominatimがエラーレスポンスのときはnullLを返す", async () => {
    mockFetch.mockImplementation(nominatimErrorResponse);

    const req = makeRequest("東京都千代田区千代田1-1");
    const res = await GET(req);
    const body = await res.json();

    expect(body.lat).toBeNull();
    expect(body.lng).toBeNull();
  });

  it("fetchが例外を投げてもnullを返してクラッシュしない", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"));

    const req = makeRequest("東京都千代田区千代田1-1");
    const res = await GET(req);
    const body = await res.json();

    expect(body.lat).toBeNull();
    expect(body.lng).toBeNull();
  });

  it("郵便番号付き住所でも正常に処理する", async () => {
    mockFetch.mockImplementation(() =>
      nominatimOkResponse("35.6762", "139.6503")
    );

    const req = makeRequest("〒100-0001 東京都千代田区千代田1-1");
    const res = await GET(req);
    const body = await res.json();

    expect(body.lat).toBe(35.6762);
    expect(body.lng).toBe(139.6503);
    // fetchに渡したURLに郵便番号が含まれていないことを確認
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("100-0001");
  });
});
