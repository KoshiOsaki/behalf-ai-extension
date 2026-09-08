// 侍アイコン素案を「Figmaで編集しやすいSVG」として生成し、確認用PNGも書き出す。
//   node scripts/gen-samurai-icon.mjs
//
// 参照したステッカー系アイコンの作法に合わせている:
//   - 全パーツを閉じたシルエットにし、一定の太さのダーク輪郭線を巻く
//   - シルエットは太く、内側のディテールは細くして階層を出す
//   - 耳・髷は本体の後ろに置き、本体の輪郭線で自然に接合させる
//   - ほお紅は輪郭なしのソフトな面
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

const LINE = "#2B2551"; // 輪郭線
const SKIN = "#F9E3C8"; // 顔・手
const HAIR = "#5B4BC9"; // ブランド紫
const BLUSH = "#F0A0A0";
const BAND = "#7FCB63"; // 地面
const CLOTH = "#FFF6E9"; // 襟の白
const W_SIL = 22; // シルエットの線幅
const W_DET = 14; // ディテールの線幅

const sil = `stroke="${LINE}" stroke-width="${W_SIL}" stroke-linejoin="round" stroke-linecap="round"`;
const det = `fill="none" stroke="${LINE}" stroke-width="${W_DET}" stroke-linejoin="round" stroke-linecap="round"`;

/** 髷。頭の後ろに置き、頭の輪郭線で根元が隠れる。 */
const TOPKNOT = `<ellipse id="topknot" cx="256" cy="92" rx="35" ry="28" fill="${HAIR}" ${sil}/>`;

/** 顔。丸みを強めて親しみのある形にする。 */
const HEAD = `<path id="head" d="M256 122C328 122 380 174 380 248C380 322 328 374 256 374C184 374 132 322 132 248C132 174 184 122 256 122Z" fill="${SKIN}" ${sil}/>`;

/** 髪。中央に富士額、こめかみで下がる生え際。 */
const HAIR_SHAPE = `<path id="hair" d="M132 262C126 178 180 112 256 112C332 112 386 178 380 262C372 244 356 234 334 228C306 224 292 204 256 204C220 204 206 224 178 228C156 234 140 244 132 262Z" fill="${HAIR}" ${sil}/>`;

const BLUSHES = `<ellipse id="blush-left" cx="166" cy="304" rx="21" ry="13" fill="${BLUSH}"/>
    <ellipse id="blush-right" cx="336" cy="302" rx="22" ry="13" fill="${BLUSH}"/>`;

const EYE_RIGHT = `<ellipse id="eye-right" cx="302" cy="268" rx="17" ry="21" fill="${LINE}"/>`;
const EYE_LEFT = `<ellipse id="eye-left" cx="210" cy="268" rx="17" ry="21" fill="${LINE}"/>`;

/** 傷。顔色の縁取りを下に敷いてから線を描くので、同色の目と重なっても形が潰れない。 */
const SCAR = `<path id="scar-inset" d="M176 228L194 312" fill="none" stroke="${SKIN}" stroke-width="21" stroke-linecap="round"/>
    <path id="scar" d="M176 228L194 312" fill="none" stroke="${LINE}" stroke-width="11" stroke-linecap="round"/>`;

const MOUTH = `<path id="mouth" d="M236 320C244 330 268 330 276 320" ${det}/>`;

/** バスト。着物のV襟で侍だと分かる。 */
const BUST = `<path id="body" d="M256 352C186 352 140 392 122 444C110 478 106 506 104 528H408C406 506 402 478 390 444C372 392 326 352 256 352Z" fill="${HAIR}" ${sil}/>
    <path id="collar" d="M176 338L256 452L336 338L312 324L256 396L200 324Z" fill="${CLOTH}" stroke="${LINE}" stroke-width="14" stroke-linejoin="round"/>`;

/** のぞき込み型。地面の向こうから顔を出して手を掛ける。胴は地面の裏に隠す。 */
const PEEK_BAND = `<path id="ground" d="M-8 404C120 384 392 384 520 404V520H-8Z" fill="${BAND}"/>`;
const PEEK_HANDS = `<ellipse id="hand-left" cx="186" cy="392" rx="33" ry="26" fill="${SKIN}" ${sil}/>
    <ellipse id="hand-right" cx="326" cy="392" rx="33" ry="26" fill="${SKIN}" ${sil}/>`;

const variants = {
  peek: {
    label: "1 のぞき込み型・閉じ目に交差する傷",
    body: [HEAD, HAIR_SHAPE, TOPKNOT, BLUSHES, EYE_RIGHT, EYE_LEFT, SCAR, MOUTH, PEEK_BAND, PEEK_HANDS],
  },
  bust: {
    label: "2 バスト型・開いた目を貫く傷",
    body: [BUST, HEAD, HAIR_SHAPE, TOPKNOT, BLUSHES, EYE_RIGHT, EYE_LEFT, SCAR, MOUTH],
  },
};

mkdirSync(OUT, { recursive: true });

const wrap = (key, v) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <title>Gijiro samurai ${key}</title>
  <g id="samurai-${key}">
    ${v.body.filter(Boolean).join("\n    ")}
  </g>
</svg>
`;

const strip = [];
for (const [key, v] of Object.entries(variants)) {
  const svg = wrap(key, v);
  writeFileSync(`${OUT}/samurai-${key}.svg`, svg);

  for (const size of [512, 128]) {
    const art = await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: GROUND } })
      .composite([{ input: art }])
      .png()
      .toFile(`${OUT}/samurai-${key}-${size}.png`);
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
  .toFile(`${OUT}/samurai-compare-128.png`);

console.log(`wrote ${Object.keys(variants).length} drafts to ${OUT}`);
