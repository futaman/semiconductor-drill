# モジュールの作り方（分担用のルール）

半導体ドリルは「共通エンジン（`index.html`）＋モジュールごとのファイル（`modules/X.js`）」でできている。
モジュールA〜Eは、それぞれ別のセッションが並行して作る。先に [SPEC.md](SPEC.md)・[KNOWLEDGE.md](KNOWLEDGE.md) を読むこと。

## 0. 守ること（並行作業のため）

- **触ってよいのは自分のモジュールのファイルだけ**：`modules/X.js` と、メモ用の `modules/X.md`
- `index.html`・`SPEC.md`・ほかのモジュールのファイルは**編集しない**。エンジンに足りない機能や、SPEC に反映したいことは `modules/X.md` の「エンジンへの要望」「SPEC への反映」に書く（メインのセッションがまとめて取り込む）
- Artifact の公開はしない（メインのセッションがまとめて公開する）
- git は使っていない。ブランチの切り替えなども不要

## 1. ファイルの形

`modules/X.js`（X は A〜E）。**必ず即時関数で包む**（エンジンのグローバル変数と名前がぶつからないように）。

```js
(() => {
  const steps = [ /* 下の「2. ステップ」 */ ];

  registerModule({
    code: 'B',                          // A〜E
    name: '計算のしくみ',                 // 地図カードの見出し
    ds: '0と1、AND/OR、足し算ができるまで、メモリ',  // 地図カードの説明
    // label: 'モジュールB　計算のしくみ',  // 章扉の小見出し（省略時は自動）
    css: `...`,                         // 任意。クラス名は必ず .b- のように小文字のコードで始める
    figs: { name() { return '<svg ...>'; } },   // 静止した図
    sims: { name: { html(ctx) {...}, mount(el, ctx) {...} } },  // 動かせる図（3章）
    steps
  });
})();
```

`index.html` は `modules/A.js`〜`modules/E.js` を順に読み込む。ファイルがなければ、地図に「制作中」と出るだけ。

## 2. ステップ（1章ぶん）

1モジュール5〜6章。1章5分前後。流れは SPEC の「問い → 探求 → 発見 → 確認 → 余韻」。

```js
{
  id: 'b1', no: 1, title: '0と1',                 // id は「小文字のコード＋番号」
  headline: '明朝体の大見出し。問いの形で。',
  predict: { q: '予想クイズの問い', options: ['…', '…', '…'], answer: 1, right: '正解時の一言', wrong: '不正解時の一言' },
  // predict がない章（ふりかえりなど）は lead: '章扉の説明文' を書く
  explore:  [ /* ブロック */ ],
  discover: [ /* ブロック。予想に答えると現れる。省略可 */ ],
  quiz:     [ /* 確認問題 3〜4問（ふりかえり章は5〜6問） */ ],
  summary: 'この章のまとめ（1文）',
  next: '次の章への「引き」になる問い',
  deeper: [['A', 'しくみ：トランジスタ', 'a5']],   // [コード, 表示名, 飛び先の章id（省略すると先頭の章）]。サマリへは ['S', '表示名', 's4']
  sources: ['出典と計算。数字はすべてここに根拠を書く']
  // labels: { explore: '② たどり直す', ... }   // 区切りの見出しを変えたいとき
}
```

### ブロック（explore / discover の中身）

| t | 書き方 | 用途 |
|---|---|---|
| `p` | `{ t: 'p', h: '本文。<b>強調</b>' }` | 本文（短い段落） |
| `h` | `{ t: 'h', h: '小見出し' }` | 小見出し |
| `fig` | `{ t: 'fig', svg: 'name', cap: 'キャプション' }` | 静止した図（`figs.name`）。横長SVGはスマホで横スクロール。HTMLの図は `html: 'name'` |
| `sim` | `{ t: 'sim', id: 'name', cap: 'キャプション' }` | 動かせる図（`sims.name`） |
| `analogy` | `{ t: 'analogy', ttl: 'たとえ', rows: [['たとえ側', '本物'], ...], breaks: '崩れるところ' }` | アナロジーカード |
| `num` | `{ t: 'num', big: '190億', unit: '個', b: '太字の説明', l: '補足' }` | 数字カード |
| `column` | `{ t: 'column', tag: '人物コラム', ttl: '見出し', ps: ['段落', ...] }` | コラム（tag は「人物コラム」か「ほんとうはもう少し複雑」） |
| `recall` | `{ t: 'recall', from: 'S1', ttl: '段差', fig: 'step', to: 's1', h: '本文' }` | 伏線の呼び出し（前の図を小さく出す。`fig` はサマリの図名も使える：step, scale, chain, dome, process, osaka, share, zoom。ほかのモジュールの図は `figMod: 'A'` を添える） |
| `recap` | `{ t: 'recap', ids: ['b1', 'b2'] }` | 章のまとめ一覧（ふりかえり章用） |

### 確認問題

| type | 書き方 |
|---|---|
| `tf` | `{ type: 'tf', q: '文', answer: 0, ex: '解説' }`（0＝○、1＝×） |
| `choice` | `{ type: 'choice', q: '問い', options: [...4つ], answer: 0, ex: '解説' }` |
| `fill` | `{ type: 'fill', before: '前半', after: '後半', options: [...], answer: 0, ex: '解説' }` |
| `order` | `{ type: 'order', q: '問い', items: ['正しい順に書く', ...], ex: '解説' }`（表示時に並べ替えられる） |
| `explain` | `{ type: 'explain', q: '説明してみよう', model: '模範解答' }`（自己採点） |

## 3. シミュレータ（`sims`）── このドリルの主役

**各章に1つ以上、効果的な簡易シミュレータを置く**。読むより先に「触って、予想して、確かめる」体験をつくる。

```js
sims: {
  adder: {
    html(ctx) {            // 最初に描く HTML（文字列）。何も触らなくても意味が分かる初期状態にする
      return `<canvas class="sim-cv" width="640" height="260" id="b-adder-cv" aria-label="…"></canvas>
        <div class="sim-ctrl"><label for="b-adder-a">入力A</label><input type="range" id="b-adder-a" min="0" max="15" step="1" value="5"><output id="b-adder-a-out">5</output></div>
        <p class="sim-note" id="b-adder-note" aria-live="polite"></p>`;
    },
    mount(el, ctx) {       // イベントは el の中だけで付ける
      const raf = ...;
      return () => { /* 画面を離れるときの後片付け（cancelAnimationFrame など） */ };
    }
  }
}
```

- `ctx.reducedMotion`：true なら動きを止めるか最小限に（結果だけ表示）
- `ctx.color('electron')`：テーマの色を取り出す。**canvas は描くたびに取り出す**（ダークモード切り替えに追従するため）
- 要素の id は `b-` のように小文字のコードで始める
- 使える共通クラス：`.sim-ctrl`（ラベル＋スライダー＋数値の行）、`.seg`（ボタンの並び）、`.btn` / `.btn.primary`、`.sim-read`（読み取り値。`<b>` が大きな数字）、`.sim-note`（状況の一言）、`canvas.sim-cv`
- 表示する数値は必ず丸める（`toFixed`、`toLocaleString`）
- スマホ幅（375px）で操作できること。canvas は `width:100%` で縮むので、文字は大きめに描く。高DPIでは `devicePixelRatio` を考慮する
- 予想 → 操作 → 発見の順に組む。正解をシミュレータが先にばらさないよう、予想クイズとの関係を考える
- 物理的にうそにならない範囲で単純化する。単純化したところは「ほんとうはもう少し複雑」コラムに書く

## 4. 見た目のルール

- 色は**トークンだけ**を使う（`var(--…)`）。直接の色指定は、光の色など物理的に意味があるときだけ
  - 物理の図：`--electron`（電子・青）、`--hole`（正孔・オレンジ）、`--silicon`（グレー）、それぞれ `-soft` あり
  - 物理以外の強調・グラフ・ボタン：`--mark`（青緑）、光：`--uv`（紫）
  - 文字と面：`--ink` `--ink-2` `--ink-3` `--paper` `--card` `--rule`、正誤：`--ok` `--ng`
  - フォント：`--f-display`（明朝）、`--f-body`、`--f-mono`
- **青とオレンジを、電子・正孔以外の意味で使わない**（製造の図でも、レジスト＝紫 など別の色にする）
- SVG の文字は既存クラスが使える：`.t-h`（太字）、`.t-s`（補足）、`.t-m`（等幅）、`.t-e`（青）、`.t-k`（青緑）。面は `.f-si` `.f-es` `.f-os` `.f-card` `.f-k` `.f-uv` `.f-ink` など
- ライト／ダーク両方で読めること
- エンジンが使っているクラス名 `.b-up` `.b-low`（段差の帯）はモジュールBの接頭辞と重なるが、共通部品として予約済み。モジュール独自のクラスには使わない
- 押されている切り替えボタンは `.seg .btn[aria-pressed="true"]`、使えないボタンは `.btn[disabled]` で共通の見た目になる

## 5. 書き方のルール（SPEC と memory より）

- 対象は中学生レベルの知識の大人。丁寧語、短い文、言い切る。ナレーション調の問いでつなぐ
- アナロジーは SPEC 4章のルールに従う。特に**「ほぅ」は、その章の問いに答えるか、次の問いを生むものだけ**。比べるときは「何と何を、同じ物差しで比べているか」をはっきりさせる
- 数字はすべて計算と出典を確認し、`sources` に書く。確認できない数字は使わない
- 伏線（段差、純度など）とほかのモジュールへのリンク（`deeper`、`recall`）を意識する。モジュールAの章 id は a1〜a6（a1 電気が流れる、a2 結晶、a3 混ぜ物、a4 pn接合・LED、a5 トランジスタ、a6 ふりかえり）

## 6. 確認のしかた

`.claude/launch.json` の `drill`（`python -m http.server 8765`）をプレビューで起動し、`http://localhost:8765/#b1` のように章 id を付けて開く。すでに起動していれば使い回す。

- 全章を通しで解き、コンソールにエラーがないこと
- 375px 幅で横スクロールが出ない（図の枠の中は除く）こと、シミュレータが操作できること
- 見本：サマリは `index.html` の `STEPS`、モジュールAは `modules/A.js`
