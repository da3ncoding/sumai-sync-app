import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/login/page";

// next/navigationのモック
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Supabaseクライアントのモック
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
    },
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockInsert.mockReset();
  });

  // ---- 表示 ----

  it("初期表示でログインフォームが表示される", () => {
    render(<LoginPage />);
    expect(screen.getByText("SumaiSync")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("example@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("6文字以上")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
  });

  it("「新規登録」タブをクリックすると表示名フィールドが表示される", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));

    expect(screen.getByPlaceholderText("例：たろう")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
  });

  // ---- ログイン ----

  it("ログイン成功時に /properties へ遷移する", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("example@email.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("6文字以上"), "password123");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockPush).toHaveBeenCalledWith("/properties");
    });
  });

  it("ログイン失敗時にエラーメッセージが表示される", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("example@email.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("6文字以上"), "wrongpass");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("メールアドレスまたはパスワードが正しくありません")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ---- サインアップ ----

  it("サインアップ成功時に確認メール送信画面が表示される", async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    await user.type(screen.getByPlaceholderText("例：たろう"), "たろう");
    await user.type(screen.getByPlaceholderText("example@email.com"), "new@example.com");
    await user.type(screen.getByPlaceholderText("6文字以上"), "password123");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("確認メールを送りました")).toBeInTheDocument();
    });
  });

  it("サインアップ失敗時にエラーメッセージが表示される", async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    await user.type(screen.getByPlaceholderText("example@email.com"), "existing@example.com");
    await user.type(screen.getByPlaceholderText("6文字以上"), "password123");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("User already registered")).toBeInTheDocument();
    });
  });

  it("確認メール画面から「ログイン画面に戻る」でログインフォームに戻る", async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
    render(<LoginPage />);

    // サインアップして確認メール画面へ
    await user.click(screen.getByRole("button", { name: "新規登録" }));
    await user.type(screen.getByPlaceholderText("example@email.com"), "new@example.com");
    await user.type(screen.getByPlaceholderText("6文字以上"), "password123");
    await user.click(screen.getByTestId("submit-button"));
    await waitFor(() => screen.getByText("確認メールを送りました"));

    // ログイン画面に戻る
    await user.click(screen.getByText("ログイン画面に戻る"));
    expect(screen.getByPlaceholderText("example@email.com")).toBeInTheDocument();
  });
});
