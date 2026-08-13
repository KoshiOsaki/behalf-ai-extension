# Gijiro logo

- `gijiro-logo-v1.svg`: 濃いグレー（`#191A1E`）のベタ塗り背景に紙を重ねた案
- `gijiro-logo-v3.svg`: 採用版。ブラッシュ質感の明るい地に紙を重ね、紙にも同じ質感を乗せた案
- `texture-brushed.png`: v3の地に使っているブラッシュテクスチャ（SVGにはdata URIで埋め込み済み）

どちらも構図は同じで、同じ議事録用紙を8枚回転させ、一周する紙の重なりを花として表している。

## アイコン生成

```
node scripts/build-icons.mjs [SVGパス]   # 省略時は v3
```

出力先:

- `public/icon/{16,32,48,96,128}.png`: 拡張機能アイコン（wxtは `public/icon` があればそれを使う）
- `assets/icon.png`: 512px。`@wxt-dev/auto-icons` の入力元
- `assets/store/icon-128.png`: Chrome Web Store用。ガイドラインに合わせて128キャンバスの中央に96で配置し、周囲16pxは透過

## カラー

v3（採用版）:

- Ground: `#E4E6E9` + ブラッシュテクスチャ
- Paper: `#5B4BC9`
- Live: `#2E9E68`

v1:

- Background: `#191A1E`
- Paper: `#9D8CF5`
- Live: `#65D69A`

不採用のコンセプト案（v2, v4〜v6 と初期のPNG案）は `tmp/brand-concepts-archive/` に退避している（git管理外）。
