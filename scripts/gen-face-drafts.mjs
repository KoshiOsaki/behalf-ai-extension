// 侍の顔アイコン素案を「Figmaで編集しやすいSVG」として生成し、確認用PNGも書き出す。
//   node scripts/gen-face-drafts.mjs
//
// Figma import で壊れないための制約:
//   - CSSクラスを使わず属性でインライン指定する
//   - <defs>/<use> を使わず実体の図形を並べる
//   - 円・角丸は <circle>/<ellipse>/<rect rx> で書く（Figmaで本物のEllipse/Rectangleになる）
//   - stroke は outline せず stroke のまま残す
//   - 全要素に id を付ける（Figmaのレイヤー名になる）
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "tmp/icon-drafts";
const GROUND = "#E4E6E9"; // 既存アイコンの地の色。プレビュー確認用にだけ敷く
const INK = "#3A2E8C"; // 髪・傷の濃い紫
const FACE = "#5B4BC9"; // ブランド紫
const LIGHT = "#E4E6E9"; // 目・口
const ACCENT = "#2E9E68";
const SKIN = "#F2C9A0"; // 肌トーン版
const SKIN_INK = "#8A4E2A"; // 肌トーン版の目・傷

/** 顔の輪郭。あご側を絞って male っぽい台形に寄せる。 */
const HEAD = `<path id="head" d="M156 246C156 194 200 160 256 160C312 160 356 194 356 246V272C356 330 312 384 256 384C200 384 156 330 156 272Z" fill="${FACE}"/>`;

/** 髪。前髪の生え際を弧にして、もみあげまで一続きの1パスで作る。 */
const HAIR_CAP = `<path id="hair" d="M154 252C148 226 148 200 156 184C172 152 208 136 256 136C304 136 340 152 356 184C364 200 364 226 358 252L338 258C342 236 318 226 256 226C194 226 170 236 174 258Z" fill="${INK}"/>`;
const SIDEBURNS = `<rect id="sideburn-left" x="156" y="228" width="22" height="76" rx="11" fill="${INK}"/>
    <rect id="sideburn-right" x="334" y="228" width="22" height="76" rx="11" fill="${INK}"/>`;

/** 髷。頭頂の小さな塊だけで侍と分かる。 */
const TOPKNOT = `<rect id="topknot" x="220" y="96" width="72" height="52" rx="26" fill="${INK}"/>`;

/** 鉢巻。髷の代わりの案。 */
const HACHIMAKI = `<rect id="headband" x="146" y="212" width="220" height="42" rx="10" fill="${ACCENT}"/>
    <path id="headband-tail" d="M150 240L98 274" fill="none" stroke="${ACCENT}" stroke-width="20" stroke-linecap="round"/>`;

/** 目。眉と一体の太いバーで、中央へ向かって下がると険しく見える。 */
const EYES = `<path id="eye-left" d="M184 282L228 294" fill="none" stroke="${LIGHT}" stroke-width="24" stroke-linecap="round"/>
    <path id="eye-right" d="M328 282L284 294" fill="none" stroke="${LIGHT}" stroke-width="24" stroke-linecap="round"/>`;

/** 傷のある側は閉じ目にする案。 */
const EYE_LEFT_CLOSED = `<path id="eye-left-closed" d="M184 290L228 290" fill="none" stroke="${LIGHT}" stroke-width="12" stroke-linecap="round"/>`;
const EYE_RIGHT_ONLY = `<path id="eye-right" d="M328 282L284 294" fill="none" stroke="${LIGHT}" stroke-width="24" stroke-linecap="round"/>`;

/** 傷。左目を縦に横切る。濃い紫なので明るい目の上でも読める。 */
const SCAR_THROUGH = `<path id="scar" d="M200 246L214 340" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`;
const SCAR_THROUGH_SHORT = `<path id="scar" d="M200 246L212 322" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`;

/** 傷。目にはかからず頬を斜めに走る。 */
const SCAR_CHEEK = `<path id="scar" d="M188 316L218 366" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`;

const MOUTH = `<path id="mouth" d="M234 344L278 344" fill="none" stroke="${LIGHT}" stroke-width="14" stroke-linecap="round"/>`;

/** 口ひげ。侍らしさが一段上がる。 */
const MUSTACHE = `<path id="mustache-left" d="M252 330C240 330 230 334 222 342" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>
    <path id="mustache-right" d="M260 330C272 330 282 334 290 342" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>`;
const MOUTH_LOW = `<path id="mouth" d="M238 358L274 358" fill="none" stroke="${LIGHT}" stroke-width="12" stroke-linecap="round"/>`;

const HEAD_SKIN = HEAD.replace(FACE, SKIN);
const EYES_DARK = EYES.replaceAll(LIGHT, SKIN_INK);
const SCAR_DARK = `<path id="scar" d="M200 246L214 340" fill="none" stroke="${SKIN_INK}" stroke-width="12" stroke-linecap="round"/>`;
const SCAR_DARK_SHORT = `<path id="scar" d="M200 246L212 322" fill="none" stroke="${SKIN_INK}" stroke-width="12" stroke-linecap="round"/>`;
const MOUTH_DARK = MOUTH.replace(LIGHT, SKIN_INK);
const MOUTH_DARK_LOW = MOUTH_LOW.replace(LIGHT, SKIN_INK);

const variants = {
  a: {
    label: "A 髷・目を横切る傷",
    body: [TOPKNOT, HEAD, HAIR_CAP, SIDEBURNS, EYES, SCAR_THROUGH, MOUTH],
  },
  b: {
    label: "B 髷・閉じ目＋頬の傷",
    body: [TOPKNOT, HEAD, HAIR_CAP, SIDEBURNS, EYE_LEFT_CLOSED, EYE_RIGHT_ONLY, SCAR_CHEEK, MOUTH],
  },
  c: {
    label: "C 鉢巻・目を横切る傷",
    body: [HEAD, HAIR_CAP, SIDEBURNS, HACHIMAKI, EYES, SCAR_THROUGH, MOUTH],
  },
  e: {
    label: "E 肌トーン・髷・傷",
    body: [TOPKNOT, HEAD_SKIN, HAIR_CAP, SIDEBURNS, EYES_DARK, SCAR_DARK, MOUTH_DARK],
  },
  f: {
    label: "F 肌トーン・髷・傷・口ひげ",
    body: [TOPKNOT, HEAD_SKIN, HAIR_CAP, SIDEBURNS, EYES_DARK, SCAR_DARK_SHORT, MUSTACHE, MOUTH_DARK_LOW],
  },
  d: {
    label: "D 髷・傷・口ひげ",
    body: [TOPKNOT, HEAD, HAIR_CAP, SIDEBURNS, EYES, SCAR_THROUGH_SHORT, MUSTACHE, MOUTH_LOW],
  },
};

const layerOrder = (parts) => parts.filter(Boolean).join("\n    ");

mkdirSync(OUT, { recursive: true });

const wrap = (key, v) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <title>Gijiro samurai face ${key.toUpperCase()}</title>
  <g id="samurai-${key}">
    ${layerOrder(v.body)}
  </g>
</svg>
`;

const strip = [];
for (const [key, v] of Object.entries(variants)) {
  const svg = wrap(key, v);
  writeFileSync(`${OUT}/face-${key}.svg`, svg);

  for (const size of [512, 128]) {
    const art = await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: GROUND } })
      .composite([{ input: art }])
      .png()
      .toFile(`${OUT}/preview-${key}-${size}.png`);
    if (size === 128) strip.push(art);
  }
}

// 128pxを横並びにして小サイズでの視認性を比べる。
const gap = 16;
await sharp({
  create: {
    width: 128 * strip.length + gap * (strip.length + 1),
    height: 128 + gap * 2,
    channels: 4,
    background: "#ffffff",
  },
})
  .composite(
    strip.flatMap((buf, i) => [
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="23" fill="${GROUND}"/></svg>`
        ),
        top: gap,
        left: gap + i * (128 + gap),
      },
      { input: buf, top: gap, left: gap + i * (128 + gap) },
    ])
  )
  .png()
  .toFile(`${OUT}/compare-128.png`);

console.log(`wrote ${Object.keys(variants).length} drafts to ${OUT}`);
