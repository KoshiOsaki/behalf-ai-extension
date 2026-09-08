// マスター画像から拡張機能アイコンとChrome Web Store用アイコンを生成する。
//   node scripts/build-icons.mjs [assets/brand-concepts/gijiro-icon-master.png]
//
// マスターはPNG（黒方眼＋銀の紙）でもSVGでも渡せる。
// librsvg（sharpのSVGレンダラ）はCSSカスタムプロパティを解決しないため、
// SVGの場合だけ :root で定義した変数をレンダリング前に実値へ展開している。
import sharp from "sharp";
import { readFileSync } from "node:fs";

const source = process.argv[2] ?? "assets/brand-concepts/gijiro-icon-master.png";
const EXTENSION_SIZES = [16, 32, 48, 96, 128];
const CORNER_RADIUS_RATIO = 0.18;

/** :root のCSS変数を実値に展開する。 */
function inlineCustomProperties(svg) {
  const variables = new Map();
  for (const [, name, value] of svg.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    variables.set(name, value.trim());
  }
  return svg.replace(/var\(--([\w-]+)\)/g, (original, name) => variables.get(name) ?? original);
}

/** 角丸マスク。ストアのガイドラインが正方形ベタ塗りを避けるよう求めている。 */
function roundedMask(size, radius) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
}

// マスターは紙の周囲に広く黒方眼が残っているので、小さいサイズで紙が潰れないよう寄せて切る。
// 紙のバウンディングボックス（158,130）-（1066,1040）を中心に、影が切れない程度の余白だけ残す。
const MASTER_CROP = { left: 87, top: 60, width: 1050, height: 1050 };

async function render(master, size) {
  const cropped = source.endsWith(".svg")
    ? master
    : await sharp(master).extract(MASTER_CROP).png().toBuffer();
  const art = await sharp(cropped, { density: 600 }).resize(size, size).png().toBuffer();
  const mask = await sharp(roundedMask(size, Math.round(size * CORNER_RADIUS_RATIO))).png().toBuffer();
  return sharp(art).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

const master = source.endsWith(".svg")
  ? Buffer.from(inlineCustomProperties(readFileSync(source, "utf8")))
  : readFileSync(source);

for (const size of EXTENSION_SIZES) {
  await sharp(await render(master, size)).toFile(`public/icon/${size}.png`);
}
await sharp(await render(master, 512)).toFile("assets/icon.png");

// ストアアイコンは128x128キャンバスの中央に96x96で置き、周囲16pxを透過にする。
await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await render(master, 96), top: 16, left: 16 }])
  .png()
  .toFile("assets/store/icon-128.png");

console.log(`icons generated from ${source}`);
