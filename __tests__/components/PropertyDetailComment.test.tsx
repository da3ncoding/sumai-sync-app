import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyDetailPage from "@/app/(dashboard)/properties/[id]/page";

// next/navigationのモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "property-123" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.stubGlobal("fetch", vi.fn());

const mockGetUser = vi.fn();
const mockInsertComment = vi.fn();
const mockDeleteComment = vi.fn();

// コメントの初期データ
const testComments = [
  {
    id: "comment-1",
    comment: "日当たりがいいです",
    user_id: "user-123",
    created_at: "2025-01-01T00:00:00Z",
    users: { display_name: "たろう" },
  },
  {
    id: "comment-2",
    comment: "駅から遠いかも",
    user_id: "user-456", // 別ユーザーのコメント
    created_at: "2025-01-02T00:00:00Z",
    users: { display_name: "はなこ" },
  },
];

// fetchCommentsの返す値を切り替えるための変数
let currentComments = [...testComments];

vi.mock("@/lib/supabaseClient", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "properties") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "property-123",
                    title: "ぺんぎんハイツ",
                    address: "東京都千代田区千代田1-1",
                    url: null,
                    status: "active",
                    lat: 35.6762,
                    lng: 139.6503,
                  },
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "property_ratings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
            }),
          }),
        };
      }
      if (table === "property_comments") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: currentComments }),
            }),
          }),
          insert: (data: unknown) => mockInsertComment(data).then(() => Promise.resolve({ error: null })),
          delete: () => ({
            eq: (_col: string, val: string) =>
              mockDeleteComment(val).then(() => {
                currentComments = currentComments.filter((c) => c.id !== val);
                return Promise.resolve({ error: null });
              }),
          }),
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
              single: () => Promise.resolve({ data: { display_name: "ゆうた" } }),
            }),
          }),
        };
      }
    },
  }),
}));

describe("PropertyDetailPage - コメント", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockInsertComment.mockReset();
    mockDeleteComment.mockReset();
    mockInsertComment.mockResolvedValue(undefined);
    mockDeleteComment.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    currentComments = [...testComments];
  });

  it("既存コメントが表示される", async () => {
    render(<PropertyDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("日当たりがいいです")).toBeInTheDocument();
      expect(screen.getByText("駅から遠いかも")).toBeInTheDocument();
      expect(screen.getByText("たろう")).toBeInTheDocument();
      expect(screen.getByText("はなこ")).toBeInTheDocument();
    });
  });

  it("コメントを入力して送信するとinsertが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PropertyDetailPage />);

    await waitFor(() => screen.getByPlaceholderText("コメントを入力..."));

    await user.type(screen.getByPlaceholderText("コメントを入力..."), "収納が多くていい！");
    await user.click(screen.getByTestId("comment-submit")); // Sendアイコンのボタン

    await waitFor(() => {
      expect(mockInsertComment).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: "収納が多くていい！",
          property_id: "property-123",
          user_id: "user-123",
        })
      );
    });
  });

  it("送信後にコメント入力欄がクリアされる", async () => {
    const user = userEvent.setup();
    render(<PropertyDetailPage />);

    await waitFor(() => screen.getByPlaceholderText("コメントを入力..."));

    const input = screen.getByPlaceholderText("コメントを入力...");
    await user.type(input, "テストコメント");
    await user.click(screen.getByTestId("comment-submit"));

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("自分のコメントにだけ削除ボタンが表示される", async () => {
    render(<PropertyDetailPage />);

    await waitFor(() => screen.getByText("日当たりがいいです"));

    // 削除ボタンはまだ一度も呼ばれていない
    expect(mockDeleteComment).not.toHaveBeenCalled();
  });

  it("削除ボタンをクリックするとdeleteが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PropertyDetailPage />);

    await waitFor(() => screen.getByText("日当たりがいいです"));

    // SVGを持つボタンのうち削除ボタンをクリック
    const buttons = screen.getAllByRole("button");
    const trashButton = buttons.find(
      (btn) => btn.className.includes("zinc-600") || btn.className.includes("red-400")
    );
    expect(trashButton).toBeDefined();
    await user.click(trashButton!);

    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith("comment-1");
    });
  });

  it("空文字のコメントは送信できない", async () => {
    const user = userEvent.setup();
    render(<PropertyDetailPage />);

    await waitFor(() => screen.getByPlaceholderText("コメントを入力..."));

    await user.click(screen.getByTestId("comment-submit"));

    expect(mockInsertComment).not.toHaveBeenCalled();
  });
});
