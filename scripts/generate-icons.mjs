import sharp from "sharp";
import { writeFileSync } from "fs";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// エメラルド背景 + 白の家アイコン SVG
function makeSvg(size) {
  const pad = size * 0.15;
  const s = size - pad * 2;

  // 家のパス（正規化座標 0〜100 → 実際のサイズにスケール）
  const scale = s / 100;
  const ox = pad; // オフセットX
  const oy = pad; // オフセットY

  // 屋根：三角形（頂点 50,5 → 5,48 → 95,48）
  const roofPoints = [
    [50, 8], [2, 50], [98, 50]
  ].map(([x, y]) => `${ox + x * scale},${oy + y * scale}`).join(" ");

  // 胴体：四角形（10,48 → 90,48 → 90,95 → 10,95）
  const bx = ox + 10 * scale;
  const by = oy + 48 * scale;
  const bw = 80 * scale;
  const bh = 47 * scale;

  // ドア（中央下）
  const dx = ox + 38 * scale;
  const dy = oy + 68 * scale;
  const dw = 24 * scale;
  const dh = 27 * scale;
  const dr = dw * 0.3;

  // 굴뚝（煙突）
  const cx = ox + 68 * scale;
  const cy = oy + 20 * scale;
  const cw = 10 * scale;
  const ch = 22 * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#34d399"/>
  <!-- 煙突 -->
  <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${cw * 0.2}" fill="white"/>
  <!-- 屋根 -->
  <polygon points="${roofPoints}" fill="white"/>
  <!-- 胴体 -->
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bw * 0.05}" fill="white"/>
  <!-- ドア -->
  <rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="${dr}" fill="#34d399"/>
</svg>`;
}

// 192x192
const svg192 = makeSvg(192);
await sharp(Buffer.from(svg192)).png().toFile("public/icons/icon-192.png");
console.log("✓ icon-192.png");

// 512x512
const svg512 = makeSvg(512);
await sharp(Buffer.from(svg512)).png().toFile("public/icons/icon-512.png");
console.log("✓ icon-512.png");

// favicon 32x32
const svgFav = makeSvg(32);
await sharp(Buffer.from(svgFav)).png().toFile("public/favicon.png");
console.log("✓ favicon.png");

console.log("アイコン生成完了！");
