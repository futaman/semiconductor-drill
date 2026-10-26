/* モジュールE「社会と産業」── 真空管から、国どうしの取り合いまで */
(() => {

/* ===== 共通の道具 ===== */
const sig = (x, n = 2) => { if (!x) return 0; const p = Math.pow(10, Math.floor(Math.log10(Math.abs(x))) - n + 1); return Math.round(x / p) * p; };
const yen = x => !isFinite(x) ? '—' : '約' + (x >= 1e4 ? ja(sig(x)) : sig(x).toLocaleString('ja-JP')) + '円';
const ja = x => {
  for (const [u, s] of [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']]) if (x >= u) {
    const v = x / u;
    return (v >= 100 ? Math.round(v).toLocaleString('ja-JP') : v >= 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100)) + s;
  }
  return Math.round(x).toLocaleString('ja-JP');
};
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function fit(cv, h) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = Math.max(260, Math.round(cv.getBoundingClientRect().width || cv.parentNode.clientWidth || 600));
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}
function onResize(el, fn) {
  if ('ResizeObserver' in window) {
    let lw = 0;
    const ro = new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (w && w !== lw) { lw = w; fn(); } });
    ro.observe(el); return () => ro.disconnect();
  }
  window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn);
}
const press = (btns, on) => btns.forEach(b => b.setAttribute('aria-pressed', on(b)));
const segHTML = (label, items, cur, attr, vis) => `<div class="seg e-seg" role="group" aria-label="${label}">${vis ? `<span class="e-sl">${vis}</span>` : ''}${items.map(([v, t]) => `<button class="btn" data-${attr}="${v}" aria-pressed="${v === cur}">${t}</button>`).join('')}</div>`;

/* ===== データ ===== */
// 工程・地域ごとの付加価値のシェア（2019年）。SIA・BCG 2021 Exhibit 14。最先端の前工程は Exhibit 17
const REG = ['米国', '中国', '台湾', '韓国', '日本', '欧州', 'その他'];
const SHORT = { 米国: '米', 中国: '中', 台湾: '台', 韓国: '韓', 日本: '日', 欧州: '欧', その他: '他' };
const CHAIN = [
  { n: '設計ソフト・IP', s: { 米国: 74, 欧州: 20, その他: 6 } },
  { n: '計算用チップの設計', s: { 米国: 67, 中国: 5, 台湾: 7, 韓国: 3, 日本: 5, 欧州: 8, その他: 4 } },
  { n: '製造装置', s: { 米国: 41, 韓国: 4, 日本: 32, 欧州: 18, その他: 3 } },
  { n: '材料', s: { 米国: 11, 中国: 16, 台湾: 22, 韓国: 16, 日本: 19, 欧州: 12, その他: 3 } },
  { n: '製造（前工程）', s: { 米国: 12, 中国: 16, 台湾: 20, 韓国: 19, 日本: 17, 欧州: 9, その他: 6 }, adv: { 台湾: 92, 韓国: 8 } },
  { n: '組立・検査（後工程）', s: { 米国: 2, 中国: 38, 台湾: 27, 韓国: 11, 日本: 5, 欧州: 4, その他: 13 } }
];
// 実在のチップ：[年, トランジスタ数, 名前]
const CHIPS = [[1971, 2300, '4004'], [1974, 6000, '8080'], [1976, 8500, 'Z80'], [1978, 29000, '8086'], [1979, 68000, '68000'],
  [1985, 275000, '80386'], [1989, 1180235, '80486'], [1993, 3.1e6, 'Pentium'], [2000, 4.2e7, 'Pentium 4'], [2005, 2.5e8, 'Cell'],
  [2006, 2.91e8, 'Core 2 Duo'], [2013, 1e9, 'A7'], [2017, 4.3e9, 'A11'], [2020, 1.18e10, 'A14'], [2021, 5.7e10, 'M1 Max'],
  [2023, 1.9e10, 'A17 Pro'], [2023, 1.34e11, 'M2 Ultra']];
// 1つの地域が世界の65%以上を握る点（SIA・BCG 2021 Exhibit 19 の例）を、ウェーハの旅の順に並べたもの
const TOUR = [
  { t: '回路を設計する', use: '設計ソフト（EDA）', why: '何十億個ものトランジスタの配置は、ソフトなしには描けません。', who: ['米国'] },
  { t: '設計の部品を借りる', use: '命令の体系などの設計図（IP。Arm など）', why: 'よく使う回路は、一から描かずに設計図を借りてきます。', who: ['欧州'] },
  { t: 'ウェーハを用意する', use: 'シリコンウェーハ', why: '回路を刷る土台。鏡のように平らでないと、光のピントが合いません。', who: ['日本', '台湾'] },
  { t: '最先端の工場に入る', use: '10nm未満のロジックを刷る工場', why: 'ここから先の工程は、すべてこの工場の中で行います。', who: ['台湾'] },
  { t: '膜をつける', use: '特殊なガス', why: '膜をつけたり削ったりするのに、さまざまなガスを使います。', who: ['欧州'] },
  { t: 'レジストを塗り、現像する', use: 'フォトレジスト、塗布・現像の装置', why: '光に反応する膜を塗り、刷った模様を浮かび上がらせます。', who: ['日本'] },
  { t: '光で刷る（露光）', use: 'EUV露光装置', why: '最先端の細かさを刷れる露光装置は、ごく限られます。', who: ['欧州'] },
  { t: '混ぜ物を打ち込む', use: 'イオン注入の装置', why: 'n型・p型の場所をつくります。', who: ['米国'] },
  { t: '測って確かめる', use: '検査・計測の装置', why: '何十層も重ねるあいだ、ずれやゴミがないかを測り続けます。', who: ['米国'] },
  { t: '切り分けて組み立てる', use: '組立・検査の受託（後工程）', why: 'チップを切り分け、パッケージに収めて試験します。', who: ['中国', '台湾', '韓国'] }
];

/* ===== 図 ===== */
const figs = {
  eras() {
    const co = (b, s) => `<div class="e-co"><b>${b}</b>${s}</div>`;
    return `<div class="e-eras">
      <div class="e-era"><p class="y">1960年代</p>${co('チップの会社', '設計する／装置を手づくりする／工場で刷る')}</div>
      <div class="e-era"><p class="y">1967年ごろから</p>${co('チップの会社', '設計する／工場で刷る')}${co('装置メーカー', '装置をつくって売る')}</div>
      <div class="e-era"><p class="y">1980年代後半から</p>${co('ファブレス', '設計だけする')}${co('ファウンドリ', '設計を預かって刷る')}${co('装置メーカー', '装置をつくって売る')}</div>
    </div>`;
  },
  jpRow() {
    const rows = [['計算用チップ（ロジック）の設計', 5], ['メモリの設計', 8], ['アナログ・センサーなどの設計', 24], ['製造装置', 32], ['材料', 19], ['製造（前工程）', 17], ['組立・検査（後工程）', 5]];
    return `<p class="e-jp-h">日本の割合（工程ごと、2019年の付加価値）</p><div class="e-jp">${rows.map(([n, v]) =>
      `<div class="r"><span class="n">${n}</span><span class="t"><i style="width:${v / 40 * 100}%"></i></span><span class="v">${v}%</span></div>`).join('')}</div>
      <p class="e-jp-f">全体では14%。棒の長さは40%を右端としている。</p>`;
  }
};

/* ===== シミュレータ ===== */
// つなぎ目と失敗：100台つくって、何台が一発で動くか
const joints = {
  html() {
    return `<div class="e-units" id="e-jt-units" role="img" aria-label="つくった100台の結果"></div>
      <div class="sim-ctrl"><label for="e-jt-n">つなぎ目の数</label><input type="range" id="e-jt-n" min="0" max="60" step="1" value="30"><output id="e-jt-n-out">10,000か所</output></div>
      ${segHTML('1か所の失敗の確率', [['1000', '1,000回に1回'], ['10000', '1万回に1回'], ['100000', '10万回に1回']], '10000', 'r', '1か所の失敗')}
      <div class="sim-read"><span>全部うまくいく確率 <b id="e-jt-p">—</b></span><span>100台のうち動いた <b id="e-jt-ok">—</b>台</span></div>
      <div class="row"><button class="btn" id="e-jt-again">もう一度100台つくる</button></div>
      <p class="sim-note" id="e-jt-note" aria-live="polite"></p>`;
  },
  mount(el, ctx) {
    const box = el.querySelector('#e-jt-units'), sl = el.querySelector('#e-jt-n'), segs = [...el.querySelectorAll('[data-r]')];
    box.innerHTML = Array.from({ length: 100 }, () => '<i></i>').join('');
    const cells = [...box.children];
    let rate = 10000, seed = 1, us = [];
    const roll = () => { const r = rng(seed++); us = cells.map(() => r()); };
    const nOf = v => sig(Math.pow(10, 1 + v / 10));
    const pct = p => p >= 0.995 ? '99.5%以上' : p >= 0.1 ? Math.round(p * 100) + '%' : p >= 0.01 ? (p * 100).toFixed(1) + '%' : p >= 1e-4 ? (p * 100).toFixed(2) + '%' : 'ほぼ0%';
    const upd = () => {
      const N = nOf(+sl.value), P = Math.exp(N * Math.log(1 - 1 / rate));
      el.querySelector('#e-jt-n-out').textContent = N.toLocaleString('ja-JP') + 'か所';
      let ok = 0;
      cells.forEach((c, i) => { const g = us[i] < P; ok += g; c.className = g ? 'ok' : 'ng'; c.style.transitionDelay = ctx.reducedMotion ? '0s' : (i * 4) + 'ms'; });
      el.querySelector('#e-jt-p').textContent = pct(P);
      el.querySelector('#e-jt-ok').textContent = ok;
      const per = rate.toLocaleString('ja-JP');
      el.querySelector('#e-jt-note').textContent = N >= 4e6 ? `ENIACのはんだ付け（約500万か所）と同じくらい。${per}回に1回の失敗でも、一度で全部うまくいくことは、まずありません。`
        : P >= 0.9 ? `つなぎ目が少ないうちは、${per}回に1回の失敗はほとんど目立ちません。つなぎ目を増やしてみてください。`
        : P >= 0.2 ? `1か所ずつは${per}回に1回しか失敗しないのに、${N.toLocaleString('ja-JP')}か所あると、${Math.round((1 - P) * 10)}割ほどが動きません。`
        : `ほとんどが不良品。1か所の失敗はわずかでも、つなぎ目が増えると「どこか1か所」はほぼ必ず失敗します。`;
    };
    roll();
    sl.addEventListener('input', upd);
    segs.forEach(b => b.addEventListener('click', () => { rate = +b.dataset.r; press(segs, x => x === b); upd(); }));
    el.querySelector('#e-jt-again').addEventListener('click', () => { roll(); cells.forEach(c => c.className = ''); requestAnimationFrame(() => requestAnimationFrame(upd)); });
    upd();
  }
};

// ムーアの法則：年を動かすと、2年で2倍の線と実在のチップが重なる
const moore = {
  html() {
    return `<canvas class="sim-cv" id="e-mo-cv" aria-label="1971年からのトランジスタ数の増え方。線は2年で2倍、点は実在のチップ"></canvas>
      <div class="sim-ctrl"><label for="e-mo-y">年</label><input type="range" id="e-mo-y" min="1971" max="2023" step="1" value="2023"><output id="e-mo-y-out">2023年</output></div>
      ${segHTML('目盛り', [['log', '10倍ずつ'], ['lin', 'ふつう']], 'log', 'sc', '目盛り')}
      ${segHTML('倍になるペース', [['2', '2年で2倍'], ['1', '1年で2倍']], '2', 'pc', 'ペース')}
      <div class="row"><button class="btn primary" id="e-mo-play">▶ 1971年から再生</button></div>
      <div class="sim-read"><span>倍になった回数 <b id="e-mo-n">—</b>回</span><span>1971年の <b id="e-mo-x">—</b>倍</span><span>線の上では <b id="e-mo-v">—</b>個</span></div>
      <p class="sim-note" id="e-mo-note" aria-live="polite"></p>`;
  },
  mount(el, ctx) {
    const cv = el.querySelector('#e-mo-cv'), sl = el.querySelector('#e-mo-y'), play = el.querySelector('#e-mo-play');
    const scs = [...el.querySelectorAll('[data-sc]')], pcs = [...el.querySelectorAll('[data-pc]')];
    let log = true, T = 2, raf = 0, last = 0;
    const draw = () => {
      const Y0 = +sl.value, W = cv.getBoundingClientRect().width || 600;
      const { g, w, h } = fit(cv, W < 480 ? 270 : 320);
      const c = n => ctx.color(n), font = s => `${s}px ${ctx.color('f-body') || 'sans-serif'}`;
      const L = W < 480 ? 44 : 54, R = 12, Tp = 14, B = 26, pw = w - L - R, ph = h - Tp - B;
      const X = yr => L + (yr - 1969) / (2025 - 1969) * pw;
      const LMAX = 1.6e11;
      const Y = v => log ? Tp + ph - (Math.log10(Math.max(v, 1)) - 3) / 9 * ph : Tp + ph - v / LMAX * ph;
      g.fillStyle = c('paper'); g.fillRect(0, 0, w, h);
      g.font = font(11); g.lineWidth = 1;
      const ticks = log ? [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(e => [Math.pow(10, e), ['1千', '1万', '10万', '100万', '1000万', '1億', '10億', '100億', '1000億', '1兆'][e - 3]])
        : [[0, '0'], [5e10, '500億'], [1e11, '1000億'], [1.5e11, '1500億']];
      ticks.forEach(([v, s], i) => {
        const y = Y(v); g.strokeStyle = c('rule'); g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke();
        if (!log || W >= 480 || i % 2 === 0) { g.fillStyle = c('ink-3'); g.textAlign = 'right'; g.fillText(s, L - 6, y + 4); }
      });
      [1971, 1980, 1990, 2000, 2010, 2020].forEach(yr => { g.fillStyle = c('ink-3'); g.textAlign = 'center'; g.fillText(String(yr), X(yr), h - 8); });
      // 年のカーソル
      g.strokeStyle = c('ink-3'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(Y0), Tp); g.lineTo(X(Y0), Tp + ph); g.stroke(); g.setLineDash([]);
      // 倍々の線
      g.save(); g.beginPath(); g.rect(L, Tp, pw, ph); g.clip();
      g.strokeStyle = c('mark'); g.lineWidth = 2.5; g.beginPath();
      for (let yr = 1971; yr <= Y0 + 1e-9; yr += 0.25) { const v = 2300 * Math.pow(2, (yr - 1971) / T); yr === 1971 ? g.moveTo(X(yr), Y(v)) : g.lineTo(X(yr), Y(v)); }
      g.stroke(); g.restore();
      // 実在のチップ
      let lastChip = null;
      CHIPS.forEach(ch => { if (ch[0] > Y0) return; lastChip = ch; g.beginPath(); g.arc(X(ch[0]), Y(ch[1]), 4, 0, Math.PI * 2); g.fillStyle = c('ink'); g.fill(); g.strokeStyle = c('paper'); g.lineWidth = 1.5; g.stroke(); });
      if (lastChip) {
        const x = X(lastChip[0]), y = Y(lastChip[1]), right = x > L + pw * 0.6;
        g.font = font(12.5); g.fillStyle = c('ink'); g.textAlign = right ? 'right' : 'left';
        g.fillText(`${lastChip[2]}（${lastChip[0]}年）${ja(lastChip[1])}個`, x + (right ? -8 : 8), Math.max(Tp + 12, Math.min(Tp + ph - 6, y - 8)));
      }
      // 凡例は、線と点がない側に置く（10倍ずつなら右下、ふつうなら左上）
      const lx = log ? w - R - 6 : L + 8, ly = log ? Tp + ph - 26 : Tp + 14;
      g.font = font(12); g.textAlign = log ? 'right' : 'left';
      g.fillStyle = c('ink-2'); g.fillText('点：実在のチップ', lx, ly);
      g.fillStyle = c('mark'); g.fillText(T === 2 ? '線：2年で2倍' : '線：1年で2倍', lx, ly + 16);
      // 読み取り
      const n = (Y0 - 1971) / T, x2 = Math.pow(2, n), v = 2300 * x2;
      el.querySelector('#e-mo-y-out').textContent = Y0 + '年';
      el.querySelector('#e-mo-n').textContent = Number.isInteger(n) ? n : n.toFixed(1);
      el.querySelector('#e-mo-x').textContent = ja(x2);
      el.querySelector('#e-mo-v').textContent = ja(v);
      el.querySelector('#e-mo-note').textContent =
        T === 1 && v > 1.6e12 ? `1年で2倍のままなら、${Y0}年には${ja(v)}個。線は枠の外へ飛び出し、実在のチップははるか下にいます。1975年にムーアが「2年で2倍」に直したのは、このためです。`
        : !log && Y0 >= 2015 ? '「ふつう」の目盛りでは、2010年ごろまでの点がほとんど床に張りついて見えます。倍々で増えるものは、最後の数年が、それまでの全部より大きいのです。'
        : !log ? '「ふつう」の目盛りでは、何十年ぶんの点が床に張りついています。年を2023年まで進めてみてください。'
        : Y0 <= 1980 ? '1971年の4004は約2,300個。年を進めると、点はほぼ線に沿って増えていきます。'
        : '10倍ずつの目盛りでは、倍々の増え方がまっすぐな線になります。目盛りを「ふつう」に切り替えると、同じデータがどう見えるでしょうか。';
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; play.textContent = '▶ 1971年から再生'; };
    const step = t => {
      if (t - last > 70) { last = t; if (+sl.value >= 2023) return stop(); sl.value = +sl.value + 1; draw(); }
      raf = requestAnimationFrame(step);
    };
    play.addEventListener('click', () => {
      if (raf) return stop();
      if (ctx.reducedMotion) { sl.value = 2023; return draw(); }
      sl.value = 1971; draw(); play.textContent = '■ 止める'; last = 0; raf = requestAnimationFrame(step);
    });
    sl.addEventListener('input', () => { if (raf) stop(); draw(); });
    scs.forEach(b => b.addEventListener('click', () => { log = b.dataset.sc === 'log'; press(scs, x => x === b); draw(); }));
    pcs.forEach(b => b.addEventListener('click', () => { T = +b.dataset.pc; press(pcs, x => x === b); draw(); }));
    const off = onResize(el, draw);
    draw();
    return () => { cancelAnimationFrame(raf); off(); };
  }
};

// 工場の値段と歩留まり：ウェーハ1枚の良品から、チップ1個の「工場代」を見積もる
const FAB = { cap: 100000, years: 5, wafer: 150, edge: 3 };
const SIZES = [['100', '1cm角'], ['300', '1.7cm角'], ['800', '2.8cm角']];
const fab = {
  html() {
    return `<canvas class="sim-cv" id="e-fb-cv" aria-label="直径30cmのウェーハ。合格したチップと、欠陥が乗った不良のチップ"></canvas>
      ${segHTML('チップの大きさ', SIZES, '100', 'a', 'チップの大きさ')}
      <div class="sim-ctrl"><label for="e-fb-d">欠陥の多さ</label><input type="range" id="e-fb-d" min="0" max="20" step="1" value="2"><output id="e-fb-d-out"></output></div>
      <div class="sim-ctrl"><label for="e-fb-u">工場の稼働率</label><input type="range" id="e-fb-u" min="20" max="100" step="5" value="100"><output id="e-fb-u-out"></output></div>
      <div class="sim-ctrl"><label for="e-fb-c">工場の建設費</label><input type="range" id="e-fb-c" min="1" max="5" step="0.5" value="3"><output id="e-fb-c-out"></output></div>
      <div class="sim-read"><span>1枚から <b id="e-fb-n">—</b>個</span><span>合格 <b id="e-fb-g">—</b>個（歩留まり <b id="e-fb-y">—</b>）</span><span>1個あたりの工場代 <b id="e-fb-p">—</b></span></div>
      <div class="row"><button class="btn" id="e-fb-again">別のウェーハを刷る</button></div>
      <p class="sim-note" id="e-fb-note" aria-live="polite"></p>`;
  },
  mount(el, ctx) {
    const cv = el.querySelector('#e-fb-cv'), sd = el.querySelector('#e-fb-d'), su = el.querySelector('#e-fb-u'), sc = el.querySelector('#e-fb-c');
    const segs = [...el.querySelectorAll('[data-a]')];
    let area = 100, seed = 7, pts = [];
    const R = FAB.wafer, AREA = Math.PI * 15 * 15; // cm²
    const scatter = () => { const r = rng(seed++); pts = Array.from({ length: 1000 }, () => { const rr = R * Math.sqrt(r()), th = r() * Math.PI * 2; return [rr * Math.cos(th), rr * Math.sin(th)]; }); };
    const grid = a => {
      const s = Math.sqrt(a), Ru = R - FAB.edge, n = Math.ceil(R / s) + 1, list = [], idx = {};
      for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
        const x0 = i * s, y0 = j * s, x1 = x0 + s, y1 = y0 + s;
        if (Math.max(x0 * x0, x1 * x1) + Math.max(y0 * y0, y1 * y1) <= Ru * Ru) { idx[i + ',' + j] = list.length; list.push([x0, y0]); }
      }
      return { s, list, idx };
    };
    const draw = () => {
      const D = +sd.value * 0.05, u = +su.value, C = +sc.value;
      const G = grid(area), nd = Math.round(D * AREA), bad = new Set();
      const used = pts.slice(0, nd);
      used.forEach(([x, y]) => { const k = G.idx[Math.floor(x / G.s) + ',' + Math.floor(y / G.s)]; if (k !== undefined) bad.add(k); });
      const total = G.list.length, good = total - bad.size;
      const W = cv.getBoundingClientRect().width || 600, S = Math.min(W, 340);
      const { g, w, h } = fit(cv, S);
      const c = n => ctx.color(n), k = (S - 10) / (2 * R), cx = w / 2, cy = h / 2;
      g.fillStyle = c('paper'); g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(cx, cy, R * k, 0, Math.PI * 2); g.fillStyle = c('silicon-soft'); g.fill(); g.strokeStyle = c('silicon'); g.lineWidth = 1.2; g.stroke();
      g.beginPath(); g.arc(cx, cy + R * k, 4, Math.PI, 0); g.fillStyle = c('paper'); g.fill();
      const lw = G.s * k > 6 ? 1 : 0.5;
      G.list.forEach(([x, y], i) => {
        const b = bad.has(i);
        g.fillStyle = b ? c('ng-soft') : c('mark-soft'); g.strokeStyle = b ? c('ng') : c('mark'); g.lineWidth = lw;
        g.fillRect(cx + x * k, cy + y * k, G.s * k, G.s * k); g.strokeRect(cx + x * k + lw / 2, cy + y * k + lw / 2, G.s * k - lw, G.s * k - lw);
      });
      g.fillStyle = c('ink');
      used.forEach(([x, y]) => { g.beginPath(); g.arc(cx + x * k, cy + y * k, 1.6, 0, Math.PI * 2); g.fill(); });
      const perWafer = C * 1e12 / (FAB.cap * 12 * FAB.years * u / 100), perChip = good ? perWafer / good : Infinity;
      el.querySelector('#e-fb-d-out').textContent = D.toFixed(2) + '個/cm²';
      el.querySelector('#e-fb-u-out').textContent = u + '%';
      el.querySelector('#e-fb-c-out').textContent = C + '兆円';
      el.querySelector('#e-fb-n').textContent = total;
      el.querySelector('#e-fb-g').textContent = good;
      el.querySelector('#e-fb-y').textContent = Math.round(good / total * 100) + '%';
      el.querySelector('#e-fb-p').textContent = good ? yen(perChip) : '合格なし';
      let note = `欠陥は1枚に${nd}個。ウェーハ1枚が背負う工場代は${yen(perWafer)}で、それを合格した${good}個で割ります。`;
      if (area >= 800) note += '大きなチップは1枚から取れる数が少ないうえ、欠陥も拾いやすい。二重に高くつきます。';
      else if (D >= 0.5) note += '欠陥が多い工場では、合格するチップが減り、その分を残りのチップが背負います。';
      if (u < 100) note += `稼働率${u}%では、満員のときの${(100 / u).toFixed(1)}倍になります。`;
      el.querySelector('#e-fb-note').textContent = note;
    };
    scatter();
    [sd, su, sc].forEach(s => s.addEventListener('input', draw));
    segs.forEach(b => b.addEventListener('click', () => { area = +b.dataset.a; press(segs, x => x === b); draw(); }));
    el.querySelector('#e-fb-again').addEventListener('click', () => { scatter(); draw(); });
    const off = onResize(el, draw);
    draw();
    return off;
  }
};

// 分業の棒：地域を止める（stop）／選んだ地域だけで作る（self）
function chainSim(mode) {
  const P = mode === 'stop' ? 'e-cs' : 'e-cf';
  return {
    html() {
      return `${segHTML('対象のチップ', [['all', 'すべて'], ['adv', '最先端（10nm未満）']], 'all', 'm', '対象のチップ')}
        <p class="e-hint">${mode === 'stop' ? '止める地域をタップ（いくつでも）' : '作る地域を選ぶ（いくつでも）'}</p>
        <div class="seg e-seg e-${mode}" role="group" aria-label="地域">${REG.map(r => `<button class="btn e-rg" data-g="${r}" aria-pressed="false">${r}</button>`).join('')}</div>
        <div class="e-bars" id="${P}-bars"></div>
        <div class="sim-read"><span>作れるチップ <b id="${P}-min">—</b></span><span>上限を決めている工程 <b id="${P}-bn" style="font-size:18px">—</b></span></div>
        <p class="sim-note" id="${P}-note" aria-live="polite"></p>`;
    },
    mount(el) {
      const set = new Set(), ms = [...el.querySelectorAll('[data-m]')], rgs = [...el.querySelectorAll('[data-g]')];
      let adv = false;
      const on = r => mode === 'stop' ? !set.has(r) : set.has(r);
      const draw = () => {
        let min = 101, bn = null;
        const rows = CHAIN.map(row => {
          const s = adv && row.adv ? row.adv : row.s, tot = REG.reduce((a, r) => a + (s[r] || 0), 0);
          const segs = REG.filter(r => s[r]).sort((a, b) => on(b) - on(a));
          const left = segs.filter(on).reduce((a, r) => a + s[r], 0) / tot * 100;
          if (left < min - 1e-9) { min = left; bn = row.n; }
          return { row, s, tot, segs, left };
        });
        el.querySelector(`#${P}-bars`).innerHTML = rows.map(({ row, s, tot, segs, left }) => `<div class="e-row ${row.n === bn && min < 99.5 ? 'bn' : ''}">
          <span class="lb">${row.n}${adv && row.adv ? '<small>（最先端）</small>' : ''}</span>
          <span class="e-track">${segs.map(r => { const wd = s[r] / tot * 100; return `<i class="${on(r) ? '' : 'off'}" style="width:${wd}%" title="${r} ${s[r]}%">${wd >= 12 ? SHORT[r] + s[r] : ''}</i>`; }).join('')}
          <span class="lvl" style="left:${min}%"></span></span>
          <span class="pc">${Math.round(left)}%</span></div>`).join('');
        const names = [...set].join('・');
        el.querySelector(`#${P}-min`).textContent = Math.round(min) + '%';
        el.querySelector(`#${P}-bn`).textContent = min < 99.5 ? bn : '—';
        el.querySelector(`#${P}-note`).textContent = mode === 'stop'
          ? (!set.size ? '地域をタップして止めてみてください。黒い縦線は、いちばん短い棒の長さ＝作れるチップの上限です。'
            : `${names}が止まると、いちばん欠けるのは「${bn}」。チップはすべての工程を通らないとできないので、作れるのは、いつもの約${Math.round(min)}%まで。`)
          : (!set.size ? '地域を選んでください。選んだ地域の会社と工場だけで作ったとき、工程ごとにどれだけの力が残るかを見ます。'
            : set.size === REG.length ? 'すべての地域がそろうと、どの工程も100%。いつもの分業の姿です。'
            : `${names}だけで作ると、「${bn}」が足りず、作れるのは世界のいつもの量の約${Math.round(min)}%。`);
      };
      ms.forEach(b => b.addEventListener('click', () => { adv = b.dataset.m === 'adv'; press(ms, x => x === b); draw(); }));
      rgs.forEach(b => b.addEventListener('click', () => { const r = b.dataset.g; set.has(r) ? set.delete(r) : set.add(r); b.setAttribute('aria-pressed', set.has(r)); draw(); }));
      draw();
    }
  };
}

// ウェーハの旅：1地域が65%以上を握る「急所」をたどる
const tour = {
  html() {
    return `<ol class="e-path" id="e-tr-path">${TOUR.map((s, i) => `<li><button data-i="${i}" aria-label="第${i + 1}工程 ${s.t}">${i + 1}</button></li>`).join('')}</ol>
      <div class="e-tcard" id="e-tr-card" aria-live="polite"></div>
      <div class="row"><button class="btn e-nav" id="e-tr-prev">◀ 前へ</button><button class="btn primary e-nav" id="e-tr-next">次へ ▶</button></div>
      <p class="e-hint">止まる地域を選ぶ</p>
      ${segHTML('止まる地域', [['', 'なし'], ...REG.slice(0, 6).map(r => [r, r])], '', 'x')}
      <div class="sim-read" id="e-tr-tally"></div>
      <p class="sim-note" id="e-tr-note" aria-live="polite"></p>`;
  },
  mount(el) {
    const path = [...el.querySelectorAll('#e-tr-path button')], xs = [...el.querySelectorAll('[data-x]')];
    const next = el.querySelector('#e-tr-next'), prev = el.querySelector('#e-tr-prev');
    let cur = 0, stop = '';
    const blockAt = () => stop ? TOUR.findIndex(s => s.who.includes(stop)) : -1;
    const draw = () => {
      const b = blockAt(), s = TOUR[cur];
      path.forEach((p, i) => { p.className = i === cur ? 'cur' : i < cur ? 'seen' : ''; if (stop && TOUR[i].who.includes(stop)) p.classList.add('blk'); p.setAttribute('aria-current', i === cur ? 'step' : 'false'); });
      el.querySelector('#e-tr-card').innerHTML = `<p class="no">第${cur + 1}工程 / 全${TOUR.length}工程${cur >= 4 && cur <= 8 ? '　※5〜9は、層の数だけ何十回もくり返す' : ''}</p>
        <p class="tt">${s.t}</p><p class="us">使うもの：${s.use}</p><p class="wy">${s.why}</p>
        <p class="hd">世界の65%以上を握る地域</p><p>${s.who.map(r => `<span class="e-badge ${r === stop ? 'hit' : ''}">${r}</span>`).join('')}${s.who.length > 1 ? '<span class="e-and">合わせて</span>' : ''}</p>`;
      prev.disabled = cur === 0;
      next.disabled = cur === TOUR.length - 1 || (b >= 0 && cur >= b);
      const tally = {};
      TOUR.slice(0, cur + 1).forEach(t => t.who.forEach(r => tally[r] = (tally[r] || 0) + 1));
      el.querySelector('#e-tr-tally').innerHTML = '<span>ここまでに通った急所：</span>' + REG.filter(r => tally[r]).map(r => `<span>${r} <b>${tally[r]}</b></span>`).join('');
      el.querySelector('#e-tr-note').textContent = b >= 0 && cur >= b
        ? `${stop}が止まると、ウェーハは第${b + 1}工程「${TOUR[b].t}」で足止めされます。` + (TOUR[b].who.length > 1
          ? `ここは${TOUR[b].who.join('・')}が合わせて世界の65%以上を握る急所。${stop}の分が欠けるだけで、供給は大きく細ります。`
          : `ここは${stop}が世界の65%以上を握る急所。ほかの地域から集めても、いつもの3分の1ほどしか届きません。`)
        : cur === TOUR.length - 1 ? 'チップの完成です。とちゅうで、いくつの地域の急所を通ったでしょうか。'
        : stop ? `${stop}が止まっています。どこで足止めされるか、進めてみてください。`
        : '「次へ」で、ウェーハを1工程ずつ進めてみてください。';
    };
    path.forEach(p => p.addEventListener('click', () => { const b = blockAt(); cur = b >= 0 ? Math.min(+p.dataset.i, b) : +p.dataset.i; draw(); }));
    next.addEventListener('click', () => { if (cur < TOUR.length - 1) cur++; draw(); });
    prev.addEventListener('click', () => { if (cur > 0) cur--; draw(); });
    xs.forEach(b => b.addEventListener('click', () => { stop = b.dataset.x; press(xs, x => x === b); const bl = blockAt(); if (bl >= 0 && cur > bl) cur = bl; draw(); }));
    draw();
  }
};

/* ===== 教材 ===== */
const steps = [
{
  id: 'e1', no: 1, title: '真空管からICへ',
  headline: 'スイッチを増やすほど、機械が動かなくなる。なぜか。',
  predict: {
    q: 'はんだ付けが失敗するのは、1万回に1回。とても腕のいい職人です。では、1万か所をはんだ付けした装置が、1か所も失敗せずに完成する確率は？',
    options: ['ほぼ100%', '約90%', '約37%', 'ほぼ0%'],
    answer: 2,
    right: '正解。1万回に1回の失敗でも、1万か所あれば、3台に2台近くが不良品になります。',
    wrong: '答えは約37%。1万回に1回の失敗でも、1万か所あれば、3台に2台近くが不良品になります。'
  },
  explore: [
    { t: 'recall', from: 'S2', ttl: 'スイッチがスイッチを押す', fig: 'chain', to: 's2', h: 'スイッチは、スイッチを押せる。だから、つなげば計算ができる。では、そのスイッチどうしを「つなぐ」のは、誰だったのでしょう。' },
    { t: 'p', h: '1946年のコンピュータ ENIAC は、スイッチに真空管を約1万8000本使っていました。真空管や抵抗などの部品を結ぶ配線は、すべて人の手によるはんだ付け。その数は<b>約500万か所</b>にのぼりました。' },
    { t: 'p', h: '1947年にトランジスタが生まれ、スイッチは小さく、熱くならず、切れにくくなりました。ところが、別の壁が残ります。スイッチが小さくなっても、<b>つなぐのは相変わらず人の手</b>だったのです。' },
    { t: 'h', h: 'つなぎ目が増えると、何が起きるか' },
    { t: 'p', h: '装置が動くには、すべてのつなぎ目がうまくいっていなければなりません。1か所の失敗はわずかでも、つなぎ目が増えるほど「どこか1か所」が失敗する確率は大きくなります。つなぎ目の数を変えて、100台つくってみてください。' },
    { t: 'sim', id: 'joints', cap: '1つのマスが1台の装置。つなぎ目が1か所でも失敗した装置は動かない（赤）。各つなぎ目は、選んだ確率で、ほかと関係なく失敗するとした。' },
    { t: 'analogy', ttl: '豆電球の直列つなぎ', rows: [['豆電球1個', 'つなぎ目1か所'], ['全部の豆電球が点く', '装置が動く'], ['1個切れると、全部消える', '1か所の失敗で、装置が動かない'], ['豆電球を増やす', '部品とつなぎ目を増やす']],
      breaks: '本物の装置が、すべて1本の直列つなぎになっているわけではありません。また、切れた場所は探して直せます。ENIACの技術者も、そうして動かしていました。ただし、500万か所の中から1か所を探すのは気の遠くなる作業です。直しても、別の場所がまた切れる。部品を増やすほど、この追いかけっこは終わらなくなります。' },
    { t: 'p', h: '1950年代の技術者たちは、この壁を<b>「数の暴力」</b>（tyranny of numbers）と呼びました。性能を上げるには、スイッチを増やしたい。しかし増やすほど、組み立ては高くつき、壊れやすくなる。' }
  ],
  discover: [
    { t: 'num', big: '37', unit: '%', b: '1万か所が、すべてうまくいく確率', l: '1か所の失敗が1万回に1回でも、1万か所なら約37%。ENIACの約500万か所なら、一度で全部がうまくいく確率は、ほぼ0です。' },
    { t: 'h', h: '答えは「つながない」こと' },
    { t: 'p', h: '1958年、米国テキサス・インスツルメンツのジャック・キルビーは、トランジスタや抵抗を<b>1つの半導体のかけらの上に</b>作ってみせました。翌1959年、フェアチャイルドのロバート・ノイスが、部品どうしの配線まで、かけらの表面に<b>まとめて刷り込む</b>形を考えます。これが<b>集積回路（IC）</b>です。' },
    { t: 'p', h: 'ICのすごさは、部品を小さくしたことだけではありません。<b>人の手でつなぐ作業そのものを、なくした</b>ことです。部品もつなぎ目も、版画のように一度に刷る。つなぎ目がいくつ増えても、手作業は増えません。' },
    { t: 'column', tag: '人物コラム', ttl: 'ICを生んだ2人', ps: [
      'キルビーの最初のICは、ゲルマニウムのかけらの上の部品を、細い金の線でつないでいました。手作業のつなぎ目は、まだ残っていたのです。',
      'ノイスは、同じ会社のジャン・ヘルニが考えた「プレーナー」という平らな作り方を土台に、配線まで表面に刷り込む形を特許にしました。いまのチップは、この子孫です。',
      'キルビーは2000年にノーベル物理学賞を受けました。ノイスは1990年に亡くなっており、受賞者には含まれていません。ノーベル賞は、存命の人にしか贈られないからです。'
    ] },
    { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: 'ICにも、不良は出る', ps: [
      '刷ってつくるICにも、ゴミや欠陥による不良は出ます。ただし不良は「1台ずつの手作業の失敗」ではなく、「1枚のウェーハの中で、何割のチップが合格したか」という形で現れます。この割合（歩留まり）がお金を左右する話は、第3章で。'
    ] }
  ],
  quiz: [
    { type: 'tf', q: 'ICが画期的だったのは、トランジスタを初めて発明したからである。', answer: 1, ex: 'トランジスタは1947年の発明です。ICの画期的な点は、部品とつなぎ目を1つのかけらの上にまとめて刷り、人の手でつなぐ作業をなくしたことです。' },
    { type: 'choice', q: '「数の暴力」とは、どんな問題？', options: ['部品が増えるほど手作業のつなぎ目が増え、高くつき、壊れやすくなる', '数字が大きすぎて計算できない', '工場で働く人が足りない', 'スイッチが速すぎて熱くなる'], answer: 0, ex: '性能を上げようとスイッチを増やすほど、つなぎ目が増えて、どこか1か所が失敗しやすくなります。' },
    { type: 'fill', before: '1か所の失敗が1万回に1回でも、つなぎ目が1万か所あれば、全部うまくいく確率は約', after: 'しかない。', options: ['37%', '90%', '99%', '1%'], answer: 0, ex: '0.9999を1万回かけると約0.37。「わずかな失敗」も、数が増えると無視できなくなります。90%と答えやすいので注意。' },
    { type: 'order', q: '古い順に並べてください。', items: ['真空管のコンピュータ ENIAC が完成する', 'ベル研究所でトランジスタが生まれる', 'キルビーが1つのかけらの上に回路を作る', 'ノイスが配線まで刷り込むICを特許にする'], ex: '1946年 → 1947年 → 1958年 → 1959年。トランジスタからICまで、約10年です。' }
  ],
  summary: 'ICは、部品を小さくしただけでなく、人の手でつなぐ作業をなくした。だから、スイッチをいくらでも増やせるようになった。',
  next: 'では、一度に刷れるようになったスイッチは、どんな速さで増えていったのか。',
  deeper: [['A', 'しくみ：トランジスタ', 'a5'], ['C', 'つくりかた：刷る', 'c3']],
  sources: [
    'ENIAC：真空管 約17,468本（S2と同じ）、はんだ付け 約500万か所、重さ 約27トン（Wikipedia「ENIAC」）。',
    '「数の暴力（tyranny of numbers）」：ベル研究所のジャック・モートンの言葉として知られる（Wikipedia「Tyranny of numbers」、IEEE ETHW「Oral-History: Jack Kilby」）。',
    'IC：1958年9月12日、キルビーがゲルマニウムで実演（部品は金の細線でつないだ）。1959年、ノイスが一体型のICの考え方を特許に、ヘルニがプレーナー法を発明（Computer History Museum「The Silicon Engine」）。キルビーは2000年ノーベル物理学賞。',
    '確率の計算：0.9999^10,000 ≒ 0.368。シミュレータは、各つなぎ目が同じ確率で、ほかと関係なく失敗するとした模型。100台の結果は乱数で決めている。'
  ]
},
{
  id: 'e2', no: 2, title: 'ムーアの法則',
  headline: '2年で2倍。それを50年続けると、何倍になるか。',
  predict: {
    q: '1965年、ゴードン・ムーアは、チップに載る部品の数が倍々で増えていくと予想しました（のちに「2年で2倍」に修正）。2年で2倍を50年続けると、何倍になるでしょう？',
    options: ['約100倍', '約1万倍', '約3,000万倍', '約1兆倍'],
    answer: 2,
    right: '正解。2を25回かけると、約3,355万倍です。',
    wrong: '答えは約3,000万倍（正確には約3,355万倍）。2を25回かけるだけで、ここまで届きます。'
  },
  explore: [
    { t: 'p', h: '1971年、電卓のために作られたチップ「4004」には、トランジスタが約2,300個載っていました。2023年のスマホのチップ A17 Pro には約190億個。52年で<b>約800万倍</b>です。' },
    { t: 'p', h: 'この増え方を、早くから言い当てた人がいます。フェアチャイルドで研究開発を率いていたゴードン・ムーアです。1965年の雑誌記事で、チップに載る部品の数は毎年およそ2倍になっていて、この勢いは1975年まで続くと予想しました。1975年には、ペースを「2年で2倍」に直します。これが<b>ムーアの法則</b>です。' },
    { t: 'sim', id: 'moore', cap: '線は倍々の予想、点は実在のチップ。「1年で2倍」は1965年の最初の予想、「2年で2倍」は1975年の修正。年を動かし、目盛りを切り替えて、同じデータを2通りに見てみよう。' },
    { t: 'p', h: '目盛りを「ふつう」にすると、2010年ごろまでの点は、ほとんど床に張りついて見えます。倍々で増えるものは、<b>最後の数年が、それまでの全部より大きい</b>からです。2年で2倍なら、直近の2年で増えた数は、それまでの歴史で積み上げた数とほぼ同じになります。' },
    { t: 'analogy', ttl: '紙を折る', rows: [['1回折る', '約2年（1つの世代）'], ['紙の厚み', 'チップに載るトランジスタの数'], ['25回折る', '50年']],
      breaks: '試すと分かりますが、ふつうの紙は7〜8回ほどで折れなくなります。同じ動作のくり返しには限界があるのです。半導体も、同じ作り方のままでは、すぐに行き詰まります。50年間「次の1回」を折り続けられたのは、そのたびに新しい露光装置、新しい材料、立体的なトランジスタといった<b>別の発明</b>を持ち込んだからです。' },
    { t: 'h', h: '法則というより、約束' },
    { t: 'p', h: 'ムーアの法則は、重力のような自然の法則ではありません。業界全体が「次の世代はいつごろ、どこまで細かくするか」という道しるべ（ロードマップ）を共有し、装置や材料のメーカーも、そこに合わせて開発を進めてきました。<b>当たった予言というより、みんなで守ってきた約束</b>なのです。' }
  ],
  discover: [
    { t: 'num', big: '3,355万', unit: '倍', b: '2年で2倍を50年（25回）続けた倍率', l: '2を25回かけると33,554,432。1971年の約2,300個から始めると、2021年には約770億個になる計算です。2021年には、570億個を載せたパソコン用のチップ（M1 Max）が登場しています。' },
    { t: 'p', h: 'ただし、スマホのチップだけを見ると、ペースは少しゆっくりです。4004から A17 Pro までの52年で、倍になった回数は約23回。<b>約2.3年に1回</b>のペースでした。' },
    { t: 'p', h: '「次の1回」を折るための新しい発明。それは、新しい装置を並べた<b>新しい工場</b>の形で、世代ごとに必要になりました。' }
  ],
  quiz: [
    { type: 'tf', q: 'ムーアの法則は、物理学で証明された自然の法則である。', answer: 1, ex: '自然の法則ではなく、観察にもとづく予想です。業界がそれを目標として共有し、守り続けてきました。' },
    { type: 'choice', q: '2年で2倍のペースで10年たつと、何倍？', options: ['5倍', '10倍', '20倍', '32倍'], answer: 3, ex: '10年で5回倍になるので、2×2×2×2×2＝32倍です。「5倍」と答えやすいので注意。' },
    { type: 'fill', before: '2年で2倍に増えるものは、直近の2年で増えた数が、それまでに積み上げた', after: 'とほぼ同じになる。', options: ['全部の合計', '半分', '10分の1', '100分の1'], answer: 0, ex: '100個が200個になるとき、増えた100個は、それまでの全部（100個）と同じです。だから「ふつう」の目盛りでは、昔の点が床に張りつきます。' },
    { type: 'choice', q: '「紙を折る」たとえが崩れるところは？', options: ['紙は数回で折れなくなるが、半導体は新しい発明を持ち込んで倍増を続けてきた', '紙は厚くなるが、チップは薄くなる', '紙は白いが、チップは黒い', '紙は安いが、チップは高い'], answer: 0, ex: '同じ動作のくり返しでは限界が来ます。半導体の倍増は、毎回ちがう発明で支えられてきました。' }
  ],
  summary: 'トランジスタの数は、約2年で2倍のペースで50年増え続けた。それは自然の法則ではなく、業界が新しい発明で守ってきた約束だった。',
  next: '倍にするたびに必要になった、新しい工場。その値段は、いくらなのか。',
  deeper: [['B', '計算のしくみ'], ['C', 'つくりかた：刷る', 'c3']],
  sources: [
    'ムーアの予想：1965年4月19日『Electronics』誌「Cramming more components onto integrated circuits」（毎年2倍、1975年に部品6万5000個と予想）。1975年に「2年で2倍」へ修正（Computer History Museum「The Silicon Engine」）。',
    'トランジスタ数：Wikipedia「Transistor count」と各社の発表。4004 約2,300個（同表では2,250）、8080 6,000、Z80 8,500、8086 29,000、68000 68,000、80386 27.5万、80486 約118万、Pentium 310万、Pentium 4 4,200万、Cell 2.5億、Core 2 Duo 2.91億、A7 10億、A11 43億、A14 118億、M1 Max 570億、A17 Pro 190億、M2 Ultra 1,340億。',
    '計算：2^25＝33,554,432。2,300×2^25 ≒ 772億。190億÷2,300 ≒ 826万 ≒ 2^23、52年÷23回 ≒ 2.3年。',
    '業界のロードマップ：米国のNTRS（1992年〜）、国際的なITRS（1998〜2016年）。'
  ]
},
{
  id: 'e3', no: 3, title: '工場の値段と歩留まり',
  headline: '最先端のチップを作れる会社は、なぜ世界に数社しかないのか。',
  predict: {
    q: '熊本県菊陽町に建つ半導体工場（JASM）。計画中の第2工場と合わせた投資額は、およそいくらでしょう？',
    options: ['約300億円', '約3,000億円', '約3兆円', '約30兆円'],
    answer: 2,
    right: '正解。約2兆9,600億円です。',
    wrong: '答えは約3兆円（約2兆9,600億円）です。'
  },
  explore: [
    { t: 'recall', from: 'S4', ttl: '東京〜大阪に1円玉', fig: 'osaka', to: 's4', h: 'ウェーハを東京〜大阪の長さに拡大しても、層のずれは1円玉の厚みほど。この精度を毎日、大量に出し続けるには、何が必要でしょうか。' },
    { t: 'p', h: '答えは、とてつもなく高価な工場です。半導体の工場は、ほこり1つを嫌うクリーンルームの中に、精密な装置をずらりと並べた建物。熊本の例では、2つの工場で投資額が約3兆円。直径30cmのウェーハを、月に10万枚以上刷る計画です。' },
    { t: 'p', h: 'この3兆円は、つくったチップを売って取り戻すしかありません。では、チップ1個はどれだけの「工場代」を背負うのか。工場を経営する側に立って、見積もってみましょう。' },
    { t: 'sim', id: 'fab', cap: 'ウェーハ1枚に刷ったチップのうち、欠陥（黒い点）が乗ったものは不良（赤）。工場は月10万枚を刷れるとし、建設費を5年で取り戻すとして、合格したチップ1個あたりの「工場代」を計算する。1cm角はスマホのチップほど、2.8cm角は大型のAI向けチップほどの大きさ。' },
    { t: 'p', h: 'まず、チップを大きくしてみてください。欠陥の密度は同じなのに、不良の割合が増え、1枚から取れる数も減ります。合格したチップの割合を<b>歩留まり</b>と呼びます。' },
    { t: 'p', h: '次に、稼働率を下げてみてください。工場代は、刷っても刷らなくても同じだけかかります。注文が減って工場が半分しか動かないと、1個あたりの工場代は2倍になります。' },
    { t: 'analogy', ttl: '貸し切り会場の割り勘', rows: [['会場の貸し切り代', '工場の建設費'], ['集まった人数', '刷って合格したチップの数'], ['1人あたりの負担', 'チップ1個が背負う工場代']],
      breaks: '宴会なら、来た人の数で割ればすみます。工場では、刷ったのに不良になったチップは売れないので、その分も合格したチップが背負います。そして会場（工場）は数年で古くなります。ムーアの法則を追いかける限り、次の世代のために、また新しい会場を建てなければなりません。' },
    { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: 'ここで計算したのは「工場代」だけ', ps: [
      '本当のチップの値段には、材料、電気、人件費、設計の費用、そして利益が加わります。',
      '建設費を5年で取り戻すのは、計算のための仮定です。装置は数年で次の世代のものに置き換わっていくため、短めの年数にしました。',
      '欠陥は、ウェーハの上にでたらめに散らばるとしました。実際には、ウェーハの縁に多いなどの、かたよりがあります。'
    ] }
  ],
  discover: [
    { t: 'num', big: '3', unit: '兆円', b: '熊本の2つの工場への投資額（計画）', l: '約200億ドル（約2兆9,600億円、1ドル148円で換算）。完成すれば、ウェーハを月に10万枚以上刷る計画です。' },
    { t: 'h', h: '「建てる」より「埋める」が難しい' },
    { t: 'p', h: '3兆円の工場を5年で取り戻すには、何年ものあいだ、毎月10万枚ぶんの注文で工場を埋め続けなければなりません。しかも、数年ごとに次の世代の工場が要る。<b>それだけの注文を世界中から集め続けられる会社</b>しか、最先端の工場を持ち続けられないのです。' },
    { t: 'p', h: '実際、2019年の時点で、10nm以下の計算用チップ（ロジック）を量産できた会社は、世界に3社だけでした。米国のインテル、韓国のサムスン電子、台湾のTSMCです。' }
  ],
  quiz: [
    { type: 'tf', q: '欠陥の密度が同じなら、チップを大きくしても、チップ1個あたりの工場代は面積に比例して増えるだけである。', answer: 1, ex: '大きなチップは1枚から取れる数が減るうえに、欠陥も拾いやすく歩留まりが下がります。二重に効くので、面積の比よりも高くつきます。' },
    { type: 'choice', q: '工場の稼働率が100%から50%に下がると、チップ1個あたりの工場代は？', options: ['半分になる', '変わらない', '約2倍になる', '約4倍になる'], answer: 2, ex: '建設費は変わらないのに、刷る枚数が半分になるからです。工場は「建てたら、埋め続ける」ことが欠かせません。' },
    { type: 'fill', before: '刷ったチップのうち、合格したものの割合を', after: 'という。', options: ['歩留まり', '稼働率', '集積度', '純度'], answer: 0, ex: '稼働率は「工場がどれだけ動いているか」。歩留まりは「刷ったチップのうち何割が合格したか」。混同しやすいので注意。' },
    { type: 'explain', q: '最先端のチップを作れる会社が、世界に数社しかない理由を、「工場代」と「注文」という言葉を使って説明してみよう。', model: '最先端の工場は数兆円かかり、その工場代は、つくったチップを売って取り戻すしかありません。工場が空くと1個あたりの工場代がはね上がるので、何年も工場を埋めるだけの注文を世界中から集め続けられる会社でなければ、続けられません。しかも数年ごとに、次の世代の工場が必要になります。' }
  ],
  summary: '最先端の工場は数兆円。それを取り戻すには、歩留まりを上げ、何年も工場を埋めるだけの注文を集め続けなければならない。',
  next: 'ひとつの会社が、設計から装置づくりまで、すべてを背負えるのか。半導体の世界は、どう役割を分けてきたのか。',
  deeper: [['C', 'つくりかた：検査と歩留まり', 'c6']],
  sources: [
    'JASM：投資金額 約200億ドル（約2兆9,600億円、1ドル148円）、月間生産能力 10万枚以上（300mmウェーハ換算）。いずれも第1・第2工場の合算。第1工場は2022年4月着工、2024年第4四半期に量産開始（JASM「工場概要説明」2025年1月27日、内閣官房「国内投資拡大のための官民連携フォーラム」資料1）。',
    '10nm以下のロジックを量産できる会社はインテル・サムスン電子・TSMCの3社（SIA・BCG「Strengthening the Global Semiconductor Supply Chain in an Uncertain Era」2021年、2019年時点）。',
    'シミュレータの計算：直径300mmのウェーハ（縁の3mmは使わない）に正方形のチップを並べ、欠陥を面積あたりの密度に応じてでたらめに散らす。1枚あたりの工場代＝建設費÷（月10万枚×12か月×5年×稼働率）。3兆円・稼働率100%なら1枚あたり約50万円。',
    'チップの大きさの目安：スマホ用の A17 Pro 約104〜114mm²（S3と同じ）。大型のAI向けチップには800mm²を超えるものもある（NVIDIA H100 約814mm²）。'
  ]
},
{
  id: 'e4', no: 4, title: '分業の地図',
  headline: '1枚のチップは、いくつの国の手を通ってくるのか。',
  predict: {
    q: '1960年代、チップをつくる会社は、製造に使う装置をどうやって手に入れていたでしょう？',
    options: ['装置メーカーから買っていた', '自分たちで作っていた', '国から借りていた'],
    answer: 1,
    right: '正解。最初の10年ほどは、チップの会社が自分で装置を作っていました。',
    wrong: '答えは「自分たちで作っていた」。最初の10年ほどは、チップの会社が自分で装置を作っていました。'
  },
  explore: [
    { t: 'p', h: 'ICが生まれたころ、チップの会社は何でも自分でやりました。設計し、装置を手づくりし、工場で刷る。キルビーは、当時使った装置でいちばん高いものでも1万ドルしなかった、と振り返っています。' },
    { t: 'p', h: 'やがて作り方がそろい、装置はどんどん高価になっていきます。すると、役割が1つずつ<b>独立</b>していきました。' },
    { t: 'fig', html: 'eras', cap: '役割が分かれていった順番。まず装置づくりが独立し、次に「刷る」と「設計する」が分かれた。' },
    { t: 'p', h: '工場を持たず設計に専念する会社を<b>ファブレス</b>（ファブ＝工場、レス＝ない）、ほかの会社の設計を預かって刷る会社を<b>ファウンドリ</b>と呼びます。1987年に台湾で生まれたTSMCは、刷る仕事を専門にする会社の先駆けです。' },
    { t: 'analogy', ttl: '本づくりの分業', rows: [['作家', '設計だけをする会社（ファブレス）'], ['印刷所', '設計を預かって刷る会社（ファウンドリ）'], ['印刷機のメーカー', '製造装置のメーカー'], ['紙とインクのメーカー', '材料のメーカー（ウェーハ、レジストなど）']],
      breaks: '印刷所は、届いた原稿をそのまま刷れます。半導体では、作家（設計の会社）が印刷所（ファウンドリ）の機械のくせに合わせた「書き方のルール」を先にもらい、それに従って設計します。両者は二人三脚です。そして印刷機とちがい、工場は第3章で見たとおり数兆円。だから、最先端を刷れる印刷所は、世界でもごく限られます。' },
    { t: 'p', h: 'この分業が、第3章の悩みを解きました。設計の会社は数兆円の工場を持たずにすみ、ファウンドリは世界中の設計の会社から注文を集めて、工場を埋められる。' },
    { t: 'h', h: '国をまたいだ分業' },
    { t: 'p', h: 'いま、分業は国をまたいでいます。工程ごとに、どの地域がどれだけ担っているかを、同じ物差し（2019年の付加価値のシェア）で並べてみましょう。そして、どこかが止まったらどうなるか、試してみてください。' },
    { t: 'sim', id: 'chainStop', cap: '工程ごとに、各地域が担う割合（2019年）。地域をタップして止めると、その分が欠ける。チップはすべての工程を通らないとできないので、作れる量は、いちばん短い棒で決まる。' },
    { t: 'p', h: 'どの地域を止めても、どこかの工程が欠けます。設計ソフトは米国、組立は中国と台湾、製造装置は米国・日本・欧州。「最先端」に切り替えると、製造の棒は台湾と韓国の2つだけになります。' },
    { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: 'この模型の割り切り', ps: [
      'ここでは「付加価値のシェア」を、そのまま「その工程を担う力」とみなしました。設計・装置・材料は会社の本社がある地域の売上、製造と組立は工場がある場所の生産能力で数えています。',
      '装置や設計ソフトが止まっても、その日のうちに工場が止まるわけではありません。ただ、新しい装置や交換部品、保守が届かなくなり、じわじわ効いてきます。在庫があれば、しばらくはもちこたえられます。',
      '元の図で数字が書かれていない小さな値（3%未満）は、設計ソフトの行では「その他」に含め、ほかの行では省きました。'
    ] }
  ],
  discover: [
    { t: 'num', big: '50', unit: 'か所以上', b: '1つの地域が世界の65%以上を握っている工程や品目', l: 'SIA・BCGの分析（2019年）。設計ソフト、EUV露光装置、最先端の製造、メモリなど。1か所でも止まれば、世界中のチップづくりに響きます。' },
    { t: 'p', h: '半導体は、原油、石油製品、自動車に次いで、<b>世界で4番目に多く貿易されている品目</b>です。分業が細かいぶん、国境を何度も越えるのです。' }
  ],
  quiz: [
    { type: 'choice', q: 'ファブレスの会社がしていることは？', options: ['設計だけをして、刷るのはほかの会社に頼む', '刷る仕事だけを請け負う', '製造装置をつくる', '材料をつくる'], answer: 0, ex: 'ファブ（工場）がレス（ない）。刷る仕事を請け負うのはファウンドリです。' },
    { type: 'tf', q: '分業が進んだのは、装置や工場がどんどん高価になり、1社ですべてを背負うのが難しくなったからでもある。', answer: 0, ex: 'ファウンドリは多くの会社から注文を集めて工場を埋められ、ファブレスは数兆円の工場を持たずにすみます。' },
    { type: 'choice', q: 'シミュレータで、作れるチップの量を決めていたのは？', options: ['いちばん短い工程の棒', 'すべての棒の平均', 'いちばん長い棒', '棒の数'], answer: 0, ex: 'チップはすべての工程を通らないとできません。だから、いちばん欠けた工程が全体の上限になります。平均ではない点に注意。' },
    { type: 'order', q: '役割が分かれていった順に並べてください。', items: ['チップの会社が、装置も自分で作る', '装置をつくる専門のメーカーが育つ', '設計を預かって刷るファウンドリが生まれる', '工場を持たないファブレスの会社が広がる'], ex: 'Computer History Museum は、装置メーカーの独立がファウンドリを生み、それがファブレスの会社を可能にした、と整理しています。' }
  ],
  summary: '設計・装置・材料・製造・組立は、国や会社をまたいで分業されている。どこか1つが欠けると、全体が止まる。',
  next: 'この分業の地図の中で、日本はどこにいるのか。',
  deeper: [['C', 'つくりかた'], ['D', 'どこで使われてる？']],
  sources: [
    '分業の歴史とキルビーの言葉：Computer History Museum「The Silicon Engine」1967年「Turnkey Equipment Suppliers Change Industry Dynamics」。',
    '工程・地域ごとのシェア：SIA・BCG「Strengthening the Global Semiconductor Supply Chain in an Uncertain Era」2021年、Exhibit 14（2019年の付加価値）。設計ソフト・IP＝EDA and Core IP、計算用チップの設計＝Logic。最先端の前工程は Exhibit 17（10nm未満の生産能力 台湾92%・韓国8%。S5と同じ）。',
    '1地域が65%以上を握る点が50か所以上、世界で4番目に多く貿易される品目：同報告書。',
    'TSMC：1987年設立。ファウンドリという形は、1980年代後半から90年代に台湾の企業が切り開いた（同報告書）。'
  ]
},
{
  id: 'e5', no: 5, title: '日本の強み',
  headline: '日本の半導体は「負けた」のか。どこを見るかで、答えが変わる。',
  predict: {
    q: '日本の半導体の世界シェア（売上）は、1988年の約50%から、2019年には約10%に下がりました。では、半導体をつくる「製造装置」で、日本の会社が占める割合（2019年）は？',
    options: ['約3%', '約10%', '約30%', '約70%'],
    answer: 2,
    right: '正解。約3割。米国に次ぐ2位です。',
    wrong: '答えは約3割（32%）。米国（41%）に次ぐ2位です。'
  },
  explore: [
    { t: 'recall', from: 'S5', ttl: '50.3%から10.0%へ', fig: 'share', to: 's5', h: '日本は1988年に世界の半分を占め、2019年には約1割に。では、話はこれで終わりでしょうか。' },
    { t: 'p', h: 'S5の棒は、<b>完成したチップの売上</b>という物差しで測ったものです。物差しを変えると、景色が変わります。第4章と同じ物差し（2019年の付加価値のシェア）で、日本の数字を工程ごとに並べてみます。' },
    { t: 'fig', html: 'jpRow', cap: '工程ごとに見た、日本の割合。完成したチップの売上（S5の約1割）とは物差しが違う。' },
    { t: 'p', h: '目立つのは<b>製造装置</b>と、センサーやパワー半導体などの<b>アナログ系のチップ</b>。そして材料です。計算用のチップそのものより、<b>チップをつくるための道具と材料</b>の側に、日本の存在感があります。' },
    { t: 'analogy', ttl: '本づくりの分業（第4章のつづき）', rows: [['売れた本のランキング', '完成したチップの売上（日本は約1割）'], ['印刷機', '製造装置（日本は約3割）'], ['紙とインク', '材料（ウェーハ、レジストなど）']],
      breaks: 'ランキングに載らない印刷機や紙も、印刷所が忙しいときほどよく売れます。逆に、チップの注文が減れば、装置や材料の注文も減る。道具の側にいても、景気の波からは逃れられません。' },
    { t: 'h', h: 'ウェーハの旅を追いかける' },
    { t: 'p', h: '1枚のウェーハが、設計から完成までたどる道のりを追ってみましょう。とちゅうには、1つの地域が世界の65%以上を握る<b>「急所」</b>がいくつもあります。止まる地域を選ぶと、ウェーハがどこで足止めされるかも分かります。' },
    { t: 'sim', id: 'tour', cap: '工程を1つずつ進めると、使う道具や材料と、世界の65%以上を握る地域が出る（SIA・BCGが挙げた例。すべてではない）。' },
    { t: 'p', h: '日本が握る急所は、ウェーハ（台湾と合わせて）、回路を刷るための感光材（フォトレジスト）、それを塗って現像する装置など。どれも、<b>刷る</b>という工程のまわりに集まっています。' },
    { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: 'なぜ、1割まで下がったのか', ps: [
      '理由は1つではなく、見方も分かれます。よく挙げられるのは、1986年の日米半導体協定をはじめとする貿易摩擦、メモリの激しい値下げ競争、そして第4章で見た、設計と刷る仕事の分業（ファブレスとファウンドリ）の広がりです。',
      '一方で、装置や材料の分野では、日本の会社が長い時間をかけて技術を積み上げてきました。ここでは、どちらも事実の紹介にとどめます。'
    ] }
  ],
  discover: [
    { t: 'num', big: '32', unit: '%', b: '製造装置の世界の付加価値のうち、日本の会社の割合（2019年）', l: '米国（41%）に次ぐ2位。完成したチップの売上シェア（約10%）とは、出典も物差しも違うことに注意してください。' },
    { t: 'p', h: 'もう1つ大事なことがあります。シミュレータでどの地域を止めても、ウェーハはどこかで足止めされました。<b>どの地域も、どこかで急所を握り、どこかで急所を握られている</b>のです。' },
    { t: 'p', h: '日本も、設計ソフトや露光装置、組立の多くを、ほかの地域に頼っています。日本の強みは、<b>ひとりでは使えない強み</b>なのです。' }
  ],
  quiz: [
    { type: 'tf', q: '日本の半導体の売上シェアが約1割になったので、日本は半導体の分業にほとんど関わっていない。', answer: 1, ex: '製造装置では約3割、材料では約2割を担い、ウェーハやフォトレジストなど、世界の65%以上を握る品目もあります。' },
    { type: 'choice', q: '2019年の付加価値のシェアで、日本の割合がいちばん大きかった工程は？', options: ['製造装置', '設計ソフト', '組立・検査', '計算用チップの設計'], answer: 0, ex: '製造装置で32%。計算用チップの設計や組立・検査は5%ほどです。' },
    { type: 'fill', before: '日本が65%以上を握る急所は、ウェーハやフォトレジストなど、回路を', after: '工程のまわりに多い。', options: ['刷る', '設計する', '組み立てる', '売る'], answer: 0, ex: 'ウェーハは刷る土台、フォトレジストは刷るための感光材、塗布・現像の装置は刷った模様を浮かび上がらせる道具です。' },
    { type: 'choice', q: '「日本のシェアは約1割」と「製造装置は約3割」。2つの数字が違うのはなぜ？', options: ['測っているもの（物差し）が違うから', 'どちらかが間違っているから', '年が大きく違うから', '通貨が違うから'], answer: 0, ex: '約1割は「完成したチップの売上」（経済産業省）、約3割は「製造装置の付加価値」（SIA・BCG）。同じ日本でも、何を数えるかで数字は変わります。' }
  ],
  summary: '完成したチップの売上では約1割でも、装置や材料など「刷るための道具」の側で、日本は世界の急所を握っている。',
  next: 'どの国も急所を握り、握られている。では、国はこの状況に、どう備えようとしているのか。',
  deeper: [['C', 'つくりかた：刷る', 'c3'], ['D', 'どこで使われてる？']],
  sources: [
    '日本の売上シェア 1988年50.3%→2019年10.0%：経済産業省「半導体戦略（概略）」2021年6月（Omdia のデータ）。S5と同じ。',
    '工程ごとの日本の割合：SIA・BCG 2021年 Exhibit 14（2019年の付加価値）。計算用チップ（ロジック）の設計5%、メモリ8%、アナログ・センサーなど（DAO）24%、製造装置32%（米国41%）、材料19%、前工程17%、組立・検査5%、全体14%。',
    '1地域が65%以上を握る品目：同 Exhibit 19（例であり、すべてではない）。日本：フォトレジスト、レジスト処理など12種の装置、シリコンウェーハ（台湾と合わせて）。米国：設計ソフト、イオン注入・検査計測など23種の装置。欧州：EUV露光など3種の装置、特殊ガス、IP（Arm）。台湾：10nm未満のロジックの製造。中国・台湾・韓国：組立・検査の受託。',
    '日米半導体協定：1986年締結。'
  ]
},
{
  id: 'e6', no: 6, title: '経済安全保障',
  headline: '1つの国だけで、半導体をすべて作れるか。',
  predict: {
    q: '世界の各地域が、それぞれ自分の地域だけで半導体をすべて作ろうとしたら（自給自足）、半導体の値段はどうなるでしょう？ 米国の業界団体とコンサルティング会社が試算しました。',
    options: ['ほとんど変わらない', '1〜2割上がる', '35〜65%上がる', '10倍になる'],
    answer: 2,
    right: '正解。しかも、少なくとも1兆ドル（約150兆円）の追加の投資が必要だと見積もられています。',
    wrong: '答えは35〜65%。しかも、少なくとも1兆ドル（約150兆円）の追加の投資が必要だと見積もられています。'
  },
  explore: [
    { t: 'p', h: '第4章と第5章で見たように、半導体は国をまたいだ分業でできています。どの地域も、どこかの急所を握り、どこかの急所を握られている。この形は、ふだんは安く、速くチップを届けてくれます。' },
    { t: 'p', h: 'しかし、2021年のような品不足（S5）、地震や事故、国どうしの対立が起きると、1か所の急所が全体を止めかねません。国の安全を、経済の面から守ろうとする考え方を<b>経済安全保障</b>と呼びます。' },
    { t: 'h', h: '自分の地域だけで作ってみる' },
    { t: 'sim', id: 'chainSelf', cap: '作る地域を選ぶと、その地域の会社と工場だけで作ったときに、工程ごとにどれだけの力が残るかが分かる。作れる量は、いちばん短い棒で決まる（第4章と同じ模型）。' },
    { t: 'p', h: 'どの地域も、1つだけでは、いつもの量のわずかしか作れません。いくつかの地域を組み合わせて、ようやく棒がそろってきます。' },
    { t: 'analogy', ttl: 'スーパーと家庭菜園', rows: [['スーパーで買う', '国をまたいだ分業'], ['全部を家庭菜園でまかなう', '自給自足'], ['物流が止まり、棚が空になる', '2021年のような品不足'], ['非常用の備え', '在庫や、国内の工場']],
      breaks: '野菜なら、庭で数か月で育ちます。半導体の工場は、建てるのに2〜4年、最先端なら数兆円かかります。しかも野菜とちがい、最先端の半導体は、技術を持つ一握りの会社にしか作れません。「いざとなったら自分で作る」が、すぐにはできないのです。' },
    { t: 'h', h: '国が使う2つの道具' },
    { t: 'p', h: '各国の対策は、大きく2つに分けられます。1つは<b>呼び込む</b>こと。補助金を出して、自分の国に工場を建ててもらいます。米国は2022年に、半導体に約527億ドルをあてる法律（CHIPS法）をつくりました。EUも2023年に、官民で430億ユーロの投資を動かす計画（欧州半導体法）を定めています。日本は熊本の工場に、第1工場で最大4,760億円、第2工場で最大7,320億円の助成を決めました。' },
    { t: 'p', h: 'もう1つは<b>出さない</b>こと。先端の技術や装置が、望まない相手に渡らないよう、輸出を管理します。米国は2022年10月、中国向けを中心に、先端の半導体と製造装置の輸出の規制を強めました。日本も2023年7月、先端の製造装置など23品目を、輸出に許可が必要な品目に加えています。' },
    { t: 'p', h: 'ただし、呼び込んだ工場もすぐには動きません。熊本の第1工場は、2022年4月の着工から量産まで、約2年8か月かかりました。' }
  ],
  discover: [
    { t: 'num', big: '1兆', unit: 'ドル以上', b: '各地域が自給自足するのに必要な、追加の投資（試算）', l: '値段は35〜65%上がると見積もられています（SIA・BCG、2021年）。いまの分業は、それだけの費用を節約してくれていたともいえます。' },
    { t: 'p', h: 'つまり答えは、「全部を自分で持つ」でも「全部を人に任せる」でもありません。急所がどこにあるかを知り、補い合いながら、分業の良さを残す。各国の政策は、その<b>バランス</b>を探る試みです。' },
    { t: 'h', h: 'モジュールEのふりかえり' },
    { t: 'recap', ids: ['e1', 'e2', 'e3', 'e4', 'e5'] }
  ],
  quiz: [
    { type: 'tf', q: '半導体を自分の国だけで作れるようにすれば、値段も下がり、良いことしかない。', answer: 1, ex: '試算では、各地域が自給自足すると値段は35〜65%上がり、少なくとも1兆ドルの追加の投資が必要です。安全と費用のあいだで、バランスを取る必要があります。' },
    { type: 'choice', q: '「呼び込む」にあたる政策は？', options: ['補助金を出して、国内に工場を建ててもらう', '先端の装置の輸出に、許可を必要にする', '工場の建設を禁止する', '在庫を減らす'], answer: 0, ex: '輸出に許可を必要にするのは「出さない」ほうの道具です。' },
    { type: 'choice', q: 'シミュレータで1つの地域だけを選んだとき、作れる量がわずかになったのはなぜ？', options: ['どの地域にも、担う割合が小さい工程があり、それが上限になるから', 'どの地域も工場の数が少ないから', 'どの地域も人口が少ないから', 'どの地域も電気が足りないから'], answer: 0, ex: '米国なら組立・検査、日本や台湾なら設計ソフト、というように、どの地域にも欠けた工程があります。' },
    { type: 'order', q: 'モジュールEの流れの順に並べてください。', items: ['ICで、人の手でつなぐ作業がなくなる', 'トランジスタの数が、約2年で2倍に増え続ける', '工場が数兆円になり、作れる会社が絞られる', '設計・装置・材料・製造が、国をまたいで分業される', '各国が急所を補い合いながら、備えを探る'], ex: 'つなぐ作業がなくなったから倍々で増やせ、増やすために工場が高くなり、高くなったから分業が進み、分業したから急所が生まれました。1本の流れです。' },
    { type: 'explain', q: 'なぜ国どうしが半導体を取り合うのか。モジュールEで学んだことを使って、30秒で説明してみよう。', model: 'ICで一度に刷れるようになったチップは、トランジスタの数を約2年で2倍に増やしてきました。そのために工場は数兆円にまでなり、作れる会社は絞られ、設計・装置・材料・製造は国をまたいで分業されています。どの国も急所を握り、握られているので、1か所が止まると世界中の製品が止まりかねません。だから各国は、工場を呼び込み、技術の流出を管理しながら、備えようとしています。' }
  ],
  summary: '半導体は、1つの国だけでは作れない。急所を知り、補い合いながら、分業の良さを残すバランスが問われている。',
  next: 'モジュールEはここまで。チップの中で何が起きているのか、どう作られるのかは、ほかのモジュールで。',
  deeper: [['A', 'しくみ'], ['C', 'つくりかた'], ['D', 'どこで使われてる？']],
  sources: [
    '自給自足の試算：SIA・BCG「Strengthening the Global Semiconductor Supply Chain in an Uncertain Era」2021年（少なくとも1兆ドルの追加の先行投資、値段は35〜65%上昇。工場の建設は2〜4年）。1ドル＝148円で換算（JASMの資料と同じ）。',
    'シミュレータの数字：第4章と同じ（同報告書 Exhibit 14・17）。',
    'CHIPS法：2022年8月成立。半導体に約527億ドル（うち工場建設の支援が約390億ドル）（OECD、McKinsey の解説）。欧州半導体法：2023年9月発効、官民で430億ユーロ超の投資を動かす計画。',
    'JASMへの助成：第1工場 最大4,760億円（2022年6月認定）、第2工場 最大7,320億円（2024年2月認定）（経済産業省、参議院 質問主意書）。第1工場は2022年4月着工、2024年12月量産開始（JASM「工場概要説明」2025年1月）。',
    '輸出管理：米国 2022年10月。日本 2023年7月23日、先端半導体の製造装置など23品目を追加（CSIS ほかの報道・解説）。'
  ]
}
];

registerModule({
  code: 'E',
  name: '社会と産業',
  ds: '真空管からICへ、ムーアの法則、工場の値段、分業、日本の強み、経済安全保障',
  css: `
.e-seg .btn[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.e-stop .btn[aria-pressed="true"] { background: var(--ng-soft); color: var(--ng); border-color: var(--ng); text-decoration: line-through; }
.e-self .btn[aria-pressed="true"] { background: var(--mark-soft); color: var(--ink); border-color: var(--mark); }
.e-sl { align-self: center; font-size: 13px; color: var(--ink-2); margin-right: 4px; }
.e-hint { font-size: 13px; color: var(--ink-3); margin: 14px 0 -4px; }
.e-units { display: grid; grid-template-columns: repeat(20, minmax(0, 1fr)); gap: 3px; }
.e-units i { aspect-ratio: 1; border-radius: 2px; background: var(--rule); transition: background-color .25s; }
.e-units i.ok { background: var(--mark); } .e-units i.ng { background: var(--ng); }
.e-bars { display: grid; gap: 10px; margin-top: 16px; }
.e-row { display: grid; grid-template-columns: 9.5em minmax(0, 1fr) 3em; gap: 10px; align-items: center; font-size: 13.5px; line-height: 1.4; }
.e-row .lb { color: var(--ink-2); } .e-row .lb small { font-size: 11px; }
.e-row.bn .lb, .e-row.bn .pc { color: var(--ink); font-weight: 700; }
.e-row .pc { text-align: right; font-family: var(--f-mono); color: var(--ink-2); }
.e-track { position: relative; display: flex; height: 30px; border-radius: 6px; overflow: hidden; background: var(--paper); border: 1px solid var(--rule); }
.e-track i { flex: none; display: flex; align-items: center; justify-content: center; font: normal 500 11px var(--f-mono); color: var(--ink); background: var(--mark-soft); border-right: 1px solid var(--card); white-space: nowrap; overflow: hidden; }
.e-track i.off { background: repeating-linear-gradient(135deg, transparent 0 4px, var(--rule) 4px 5px); color: var(--ink-3); text-decoration: line-through; }
.e-row.bn .e-track { border-color: var(--ink); }
.e-track .lvl { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--ink); }
.e-path { list-style: none; padding: 0; margin: 0 0 12px; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 4px; }
.e-path li { display: flex; justify-content: center; }
.e-path button { width: 100%; max-width: 40px; aspect-ratio: 1; padding: 0; border-radius: 50%; border: 1px solid var(--rule); background: var(--card); font: 500 12px var(--f-mono); color: var(--ink-3); }
.e-path button.seen { background: var(--mark-soft); border-color: var(--mark); color: var(--ink); }
.e-path button.cur { background: var(--mark); border-color: var(--mark); color: var(--card); }
.e-path button.blk { border-color: var(--ng); box-shadow: inset 0 0 0 2px var(--ng-soft); }
.e-path button.blk:not(.cur) { color: var(--ng); }
.e-tcard { background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; padding: 14px 16px; min-height: 196px; font-size: 14.5px; line-height: 1.7; }
.e-tcard p { margin: 0 0 4px; }
.e-tcard .no { font: 12px var(--f-mono); color: var(--mark); }
.e-tcard .tt { font-family: var(--f-display); font-weight: 700; font-size: 20px; margin: 2px 0 6px; }
.e-tcard .us { font-weight: 500; } .e-tcard .wy { color: var(--ink-2); }
.e-tcard .hd { font-size: 12px; color: var(--ink-3); margin-top: 10px; }
.e-badge { display: inline-block; border: 1px solid var(--ink-3); border-radius: 999px; padding: 0 12px; font-size: 13.5px; margin: 0 6px 4px 0; }
.e-badge.hit { border-color: var(--ng); background: var(--ng-soft); color: var(--ng); }
.e-and { font-size: 12px; color: var(--ink-3); }
.e-nav[disabled] { opacity: .4; cursor: default; }
.e-eras { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.e-era { border: 1px solid var(--rule); border-radius: 10px; padding: 12px 14px; background: var(--paper); }
.e-era .y { font: 12px var(--f-mono); color: var(--mark); margin: 0 0 4px; }
.e-co { border: 1px solid var(--ink-3); border-radius: 8px; padding: 6px 10px; margin-top: 8px; font-size: 13px; line-height: 1.6; color: var(--ink-2); background: var(--card); }
.e-co b { display: block; font-size: 14px; color: var(--ink); }
.e-jp-h { font-weight: 700; font-size: 14px; margin: 0 0 10px; }
.e-jp { display: grid; gap: 8px; }
.e-jp .r { display: grid; grid-template-columns: 15em minmax(0, 1fr) 3em; gap: 10px; align-items: center; font-size: 13.5px; line-height: 1.4; }
.e-jp .n { color: var(--ink-2); }
.e-jp .t { height: 16px; background: var(--paper); border-radius: 3px; overflow: hidden; }
.e-jp .t i { display: block; height: 100%; background: var(--mark); }
.e-jp .v { text-align: right; font-family: var(--f-mono); }
.e-jp-f { font-size: 12px; color: var(--ink-3); margin: 10px 0 0; }
@media (max-width: 720px) { .e-eras { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 560px) {
  .e-units { grid-template-columns: repeat(10, minmax(0, 1fr)); }
  .e-row, .e-jp .r { grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; }
  .e-row .e-track, .e-jp .r .t { grid-column: 1 / -1; grid-row: 2; }
}
`,
  figs,
  sims: { joints, moore, fab, chainStop: chainSim('stop'), chainSelf: chainSim('self'), tour },
  steps
});
})();
