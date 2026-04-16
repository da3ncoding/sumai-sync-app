import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyDetailPage from "@/app/(dashboard)/properties/[id]/page";

// next/navigationのモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "property-123" }),
}));

// next/linkのモック
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// fetchのモック（ジオコーディング再取得用）
vi.stubGlobal("fetch", vi.fn());

// Supabaseのモック（テーブルごとに返す値を切り替えられる構成）
const mockGetUser = vi.fn();
const mockInsertRating = vi.fn();
const mockUpdateRating = vi.fn();

// テスト用の物件データ
const testProperty = {
  id: "property-123",
  title: "ぺんぎんハイツ",
  address: "東京都千代田区千代田1-1",
  url: null,
  status: "active",
  lat: 35.6762,
  lng: 139.6503,
};

// Supabaseチェーンをテーブル名で分岐するモック
vi.mock("@/lib/supabaseClient", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "properties") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: testProperty }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === "property_ratings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null }), // 初期は未評価
              }),
            }),
          }),
          insert: (data: unknown) => ({
            select: () => ({
              single: () =>
                mockInsertRating(data).then(() =>
                  Promise.resolve({
                    data: {
                      id: "rating-1",
                      property_id: "property-123",
                      user_id: "user-123",
                      location_score: (data as Record<string, unknown>).location_score ?? null,
                      environment_score: null,
                      layout_score: null,
                      facility_score: null,
                      price_score: null,
                      desire_score: null,
                    },
                  })
                ),
            }),
          }),
          update: (data: unknown) => ({
            eq: () => ({
              select: () => ({
                single: () =>
                  mockUpdateRating(data).then(() =>
                    Promise.resolve({ data: { ...(data as object), id: "rating-1" } })
                  ),
              }),
            }),
          }),
        };
      }
      if (table === "property_comments") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [] }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "pairs") {
        return {
          select: () => ({
            or: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { user_a_id: "user-123", user_b_id: "user-456" } }),
              }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { display_name: "はなこ" } }),
            }),
          }),
        };
      }
    },
  }),
}));

describe("PropertyDetailPage - 評価ボタン", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockInsertRating.mockReset();
    mockUpdateRating.mockReset();
    mockInsertRating.mockResolvedValue(undefined);
    mockUpdateRating.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
  });

  it("6項目の評価カテゴリが表示される", async () => {
    render(<PropertyDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("立地")).toBeInTheDocument();
      expect(screen.getByText("周辺環境")).toBeInTheDocument();
      expect(screen.getByText("間取り・広さ")).toBeInTheDocument();
      expect(screen.getByText("建物・設備")).toBeInTheDocument();
      expect(screen.getByText("価格納得感")).toBeInTheDocument();
      expect(screen.getByText("住みたい気持ち")).toBeInTheDocument();
    });
  });

  it("各カテゴリに1〜5のスコアボタンが表示される", async () => {
    render(<PropertyDetailPage />);

    await waitFor(() => screen.getByText("立地"));

    // 6カテゴリ × 5ボタン = 30ボタン
    const allButtons = screen.getAllByRole("button");
    const scoreButtons = allButtons.filter((btn) =>
      ["1", "2", "3", "4", "5"].includes(btn.textContent ?? "")
    );
    expect(scoreButtons.length).toBe(30);
  });

  it("スコアボタンをクリックするとSupabaseのinsertが呼ばれる（初回評価）", async () => {
    const user = userEvent.setup();
    render(<PropertyDetailPage />);

    await waitFor(() => screen.getByText("立地"));

    // 「立地」行の「3」ボタンをクリック
    const locationRow = screen.getByText("立地").closest("div")!;
    const threeButton = within(locationRow).getByText("3");
    await user.click(threeButton);

    await waitFor(() => {
      expect(mockInsertRating).toHaveBeenCalledWith(
        expect.objectContaining({
          location_score: 3,
          property_id: "property-123",
          user_id: "user-123",
        })
      );
    });
  });

  it("物件タイトルと住所が表示される", async () => {
    render(<PropertyDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("ぺんぎんハイツ")).toBeInTheDocument();
      expect(screen.getByText("東京都千代田区千代田1-1")).toBeInTheDocument();
    });
  });

  it("lat/lngがある場合「地図あり」と表示される", async () => {
    render(<PropertyDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("📍 地図あり")).toBeInTheDocument();
    });
  });
});
