// 住所の全角文字を半角に変換するユーティリティ
export function normalizeAddress(value: string): string {
  return value
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[－ー―]/g, "-")
    .replace(/　/g, " ");
}
