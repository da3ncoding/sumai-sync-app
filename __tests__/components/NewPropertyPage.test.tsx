import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewPropertyPage from "@/app/(dashboard)/properties/new/page";

// next/navigationのモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({}),
}));

// next/linkのモック
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// fetchのモック（ジオコーディングAPI）
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Supabaseクライアントのモック
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockPairMaybeSingle = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "pairs") {
        return {
          select: () => ({
            or: () => ({
              eq: () => ({
                maybeSingle: mockPairMaybeSingle,
              }),
            }),
          }),
        };
      }
      return { insert: mockInsert };
    },
  }),
}));

describe("NewPropertyPage", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockInsert.mockReset();
    mockFetch.mockReset();
    mockPairMaybeSingle.mockReset();
    // デフォルト：ログイン済みユーザー
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    // デフォルト：アクティブなペアあり
    mockPairMaybeSingle.mockResolvedValue({ data: { id: "pair-123" } });
    // デフォルト：ジオコーディング成功
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: 35.6762, lng: 139.6503 }),
    });
  });

  // ---- 表示 ----

  it("フォームの初期表示が正しい", () => {
    render(<NewPropertyPage />);
    expect(screen.getByText("物件を追加")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例：○○マンション 301号室")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例：東京都渋谷区渋谷1-1-1")).toBeInTheDocument();
    expect(screen.getByText("物件を登録する")).toBeInTheDocument();
  });

  // ---- 登録成功 ----

  it("正常に入力して送信すると /properties へ遷移する", async () => {
    const user = userEvent.setup();
    mockInsert.mockResolvedValue({ error: null });
    render(<NewPropertyPage />);

    await user.type(screen.getByPlaceholderText("例：○○マンション 301号室"), "ぺんぎんハイツ");
    await user.type(screen.getByPlaceholderText("例：東京都渋谷区渋谷1-1-1"), "東京都千代田区千代田1-1");
    await user.click(screen.getByText("物件を登録する"));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "ぺんぎんハイツ",
          address: "東京都千代田区千代田1-1",
          status: "active",
          created_by: "user-123",
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/properties");
    });
  });

  // ---- 住所の自動変換 ----

  it("住所に全角数字を入力すると半角に自動変換される", async () => {
    const user = userEvent.setup();
    mockInsert.mockResolvedValue({ error: null });
    render(<NewPropertyPage />);

    await user.type(screen.getByPlaceholderText("例：○○マンション 301号室"), "テスト物件");
    await user.type(screen.getByPlaceholderText("例：東京都渋谷区渋谷1-1-1"), "東京都千代田区千代田１－１");
    await user.click(screen.getByText("物件を登録する"));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          address: "東京都千代田区千代田1-1", // 半角に変換されている
        })
      );
    });
  });

  // ---- 登録失敗 ----

  it("Supabaseのinsertが失敗したときエラーメッセージが表示される", async () => {
    const user = userEvent.setup();
    mockInsert.mockResolvedValue({ error: { message: "duplicate key" } });
    render(<NewPropertyPage />);

    await user.type(screen.getByPlaceholderText("例：○○マンション 301号室"), "テスト物件");
    await user.type(screen.getByPlaceholderText("例：東京都渋谷区渋谷1-1-1"), "東京都千代田区千代田1-1");
    await user.click(screen.getByText("物件を登録する"));

    await waitFor(() => {
      expect(screen.getByText("登録に失敗しました: duplicate key")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("未ログインの場合 /login へリダイレクトする", async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<NewPropertyPage />);

    await user.type(screen.getByPlaceholderText("例：○○マンション 301号室"), "テスト物件");
    await user.type(screen.getByPlaceholderText("例：東京都渋谷区渋谷1-1-1"), "東京都千代田区千代田1-1");
    await user.click(screen.getByText("物件を登録する"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  // ---- ジオコーディング ----

  it("ジオコーディングが失敗してもlat/lngがnullのまま登録できる", async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValue(new Error("Network Error"));
    mockInsert.mockResolvedValue({ error: null });
    render(<NewPropertyPage />);

    await user.type(screen.getByPlaceholderText("例：○○マンション 301号室"), "テスト物件");
    await user.type(screen.getByPlaceholderText("例：東京都渋谷区渋谷1-1-1"), "東京都千代田区千代田1-1");
    await user.click(screen.getByText("物件を登録する"));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ lat: null, lng: null })
      );
      expect(mockPush).toHaveBeenCalledWith("/properties");
    });
  });
});
