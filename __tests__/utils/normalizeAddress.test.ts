import { describe, it, expect } from "vitest";

// テスト対象の関数（コンポーネントから切り出して共通化）
import { normalizeAddress } from "@/lib/normalizeAddress";

describe("normalizeAddress", () => {
  it("全角数字を半角に変換する", () => {
    expect(normalizeAddress("東京都千代田区千代田１－１")).toBe("東京都千代田区千代田1-1");
  });

  it("全角ハイフン（－）を半角に変換する", () => {
    expect(normalizeAddress("渋谷区渋谷２－２１－１")).toBe("渋谷区渋谷2-21-1");
  });

  it("全角スペースを半角に変換する", () => {
    expect(normalizeAddress("東京都　渋谷区")).toBe("東京都 渋谷区");
  });

  it("すでに半角の住所はそのまま返す", () => {
    expect(normalizeAddress("東京都千代田区千代田1-1")).toBe("東京都千代田区千代田1-1");
  });

  it("空文字はそのまま返す", () => {
    expect(normalizeAddress("")).toBe("");
  });

  it("郵便番号付き住所（全角）も変換する", () => {
    expect(normalizeAddress("〒100-0001 東京都千代田区千代田１－１")).toBe(
      "〒100-0001 東京都千代田区千代田1-1"
    );
  });
});
