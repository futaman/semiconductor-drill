/* モジュールC「つくりかた」 ─ 主人公＝スマホのチップの中の1個のトランジスタ。
   寄りの図は、主人公のまわりを切り出した断面ブロック（全章で同じ角度・同じ大きさ）。
   引きの図には現在地ピンと縮尺バッジを出す。 */
(() => {
  /* ===== 共通の道具 ===== */
  const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const jaBig = n => {
    for (const [v, u] of [[1e12, '兆'], [1e8, '億'], [1e4, '万']]) if (n >= v) { const q = n / v; return (q >= 10 ? Math.round(q).toLocaleString('ja-JP') : +q.toFixed(1)) + u; }
    return Math.round(n).toLocaleString('ja-JP');
  };
  const pin = (x, y, label, flip) => `<g class="c-pin"><path d="M ${x} ${y} l -9 -16 a 11 11 0 1 1 18 0 z"/><circle cx="${x}" cy="${y - 23}" r="4.5" class="c-pin-dot"/>
    <text x="${flip ? x - 16 : x + 16}" y="${y - 18}" class="c-pin-tx" text-anchor="${flip ? 'end' : 'start'}">${label}</text></g>`;
  const badge = txt => `<span class="c-badge"><span>いま見ている大きさ</span>${txt}</span>`;

  /* ----- 断面ブロック：横に50列、各列に下から層を積む ----- */
  const NC = 50, CW = 2, DEP = 34, CX = .55, CZ = .42;
  const P = (v, x, y, z) => [(v.x0 + (x + y * CX) * v.k).toFixed(1), (v.y0 - (z + y * CZ) * v.k).toFixed(1)];
  const poly = (pts, cls) => `<polygon points="${pts.map(p => p.join(',')).join(' ')}"${cls ? ` class="${cls}"` : ''}/>`;
  function box(v, r) {
    const y0 = r.y0 || 0, y1 = r.y1 == null ? DEP : r.y1;
    const f = [P(v, r.x0, y0, r.z0), P(v, r.x1, y0, r.z0), P(v, r.x1, y0, r.z1), P(v, r.x0, y0, r.z1)];
    const t = [P(v, r.x0, y0, r.z1), P(v, r.x1, y0, r.z1), P(v, r.x1, y1, r.z1), P(v, r.x0, y1, r.z1)];
    const s = [P(v, r.x1, y0, r.z0), P(v, r.x1, y1, r.z0), P(v, r.x1, y1, r.z1), P(v, r.x1, y0, r.z1)];
    return `<g class="c-m-${r.m}${r.flash ? ' c-new' : ''}">${poly(f)}${poly(t)}${poly(t, 'c-ov-t')}${poly(s)}${poly(s, 'c-ov-s')}</g>`;
  }
  function toRects(cols, flashT) {
    const out = []; let prev = new Map();
    cols.forEach((col, i) => {
      const next = new Map(); let z = 0;
      col.forEach(L => {
        const z0 = z, z1 = z + L.h; z = z1;
        if (L.m === 'void' || L.h <= 0) return;
        const fl = flashT != null && L.t === flashT, key = `${L.m}|${z0.toFixed(2)}|${z1.toFixed(2)}|${fl}`;
        let r = prev.get(key);
        if (r) r.x1 = (i + 1) * CW; else { r = { m: L.m, x0: i * CW, x1: (i + 1) * CW, z0, z1, flash: fl }; out.push(r); }
        next.set(key, r);
      });
      prev = next;
    });
    return out;
  }
  // 手前・右・上にあるものほど後に描く（奥行き方向に掃いて重なるものを順序づける）
  function order(rs) {
    const n = rs.length, adj = rs.map(() => []), deg = new Array(n).fill(0), E = 1e-6;
    const hit = (a, b) => {
      const lo = Math.max(0, (b.x0 - a.x1) / CX, (b.z0 - a.z1) / CZ), hi = Math.min(DEP, (b.x1 - a.x0) / CX, (b.z1 - a.z0) / CZ);
      return lo + E < hi;
    };
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b && hit(rs[a], rs[b])) { adj[a].push(b); deg[b]++; }
    const q = [], res = [], used = new Array(n).fill(false);
    rs.forEach((r, i) => { if (!deg[i]) q.push(i); });
    while (q.length) { const i = q.shift(); used[i] = true; res.push(rs[i]); adj[i].forEach(j => { if (--deg[j] === 0) q.push(j); }); }
    rs.forEach((r, i) => { if (!used[i]) res.push(r); });
    return res;
  }
  const drawCols = (v, cols, flashT) => order(toRects(cols, flashT)).map(r => box(v, r)).join('');
  const colH = col => col.reduce((s, l) => s + l.h, 0);
  const VB = { x0: 30, y0: 360, k: 4.4 };
  // 電子の部屋（n型）には、正面に電子の粒を描く
  function roomDots(v, cols) {
    let s = '';
    toRects(cols).filter(r => r.m === 'n').forEach(r => {
      for (let x = r.x0 + 3; x < r.x1 - 1; x += 5) for (const dz of [.3, .7]) {
        const [px, py] = P(v, x + (dz > .5 ? 2.2 : 0), 0, r.z0 + (r.z1 - r.z0) * dz);
        s += `<circle cx="${px}" cy="${py}" r="${(v.k * .65).toFixed(1)}" class="c-el"/>`;
      }
    });
    return s;
  }
  const legend = items => `<div class="c-legend">${items.map(([m, t]) => `<span><i class="c-sw c-sw-${m}"></i>${t}</span>`).join('')}</div>`;

  /* ----- 主人公の体をつくる工程（C4で使い、C5・C6でも完成形を再利用する） ----- */
  const GATE = i => i >= 21 && i <= 28;
  const initBody = () => Array.from({ length: NC }, (_, i) => i < 5 || i >= 45 ? [{ m: 'si', h: 18, t: -1 }, { m: 'ox', h: 12, t: -1 }] : [{ m: 'si', h: 30, t: -1 }]);
  const top = col => col[col.length - 1];
  const hasRes = c => c.some(col => col.some(l => l.m === 'res' || l.m === 'resx'));
  const OPS = {
    ox: { label: '薄いガラスの膜', run(c, t) {
      let n = 0; c.forEach(col => { const p = top(col); if (p.m === 'si' || p.m === 'n') { col.push({ m: 'ox', h: 1.6, t, thin: 1 }); n++; } });
      return n ? '表面のシリコンを熱で酸化させ、ごく薄いガラス（酸化シリコン）の膜をつくった。門と通り道を隔てる膜になる。' : 'むき出しのシリコンがないので、何も変わらない。'; } },
    dep: { label: '門の材料を積む', run(c, t) { c.forEach(col => col.push({ m: 'poly', h: 5, t })); return '門の材料（電気を通すシリコンの膜）を、全面に積んだ。'; } },
    coat: { label: 'レジストを塗る', run(c, t) {
      if (c.some(col => top(col).m === 'res' || top(col).m === 'resx')) return 'もうレジストが塗ってある。';
      const H = Math.max(...c.map(colH)) + 6; c.forEach(col => col.push({ m: 'res', h: H - colH(col), t })); return '光に反応する薬（レジスト）を全面に塗った。'; } },
    expose: { label: '版で光を当てる', run(c, t) {
      let n = 0; c.forEach((col, i) => { const p = top(col); if (p.m === 'res' && !GATE(i)) { p.m = 'resx'; p.t = t; n++; } });
      return n ? '門の形の版を通して光を当てた。光が当たったレジストだけ、溶けやすく変わった（形はまだ変わらない）。' : 'レジストがないので、光を当てても何も変わらない。'; } },
    develop: { label: '現像する', run(c) {
      let n = 0; c.forEach(col => { if (top(col).m === 'resx') { col.pop(); n++; } });
      return n ? '現像液で洗うと、光が当たったところだけ溶け落ちた。門の形の型紙ができた。' : '光が当たったレジストがないので、何も溶けない。'; } },
    etch: { label: '削る', run(c) {
      let n = 0; c.forEach(col => { const p = top(col); if (p.m === 'poly' || (p.m === 'ox' && p.thin)) { col.pop(); n++; } });
      if (!n) return hasRes(c) ? 'レジストに守られていて、削れるところがない。' : '削る膜がない。';
      return hasRes(c) ? '型紙のないところを、真下に削った。' : '型紙がないので、全面が削れた。'; } },
    strip: { label: 'レジストをはがす', run(c) {
      let n = 0; c.forEach(col => { while (top(col).m === 'res' || top(col).m === 'resx') { col.pop(); n++; } });
      return n ? 'レジストをはがした。役目を終えた型紙は捨てる。' : 'はがすレジストがない。'; } },
    implant: { label: '不純物を打ち込む', run(c, t) {
      let n = 0, b = 0;
      c.forEach(col => {
        let k = col.length - 1; while (k > 0 && col[k].m === 'ox' && col[k].thin) k--;
        if (col[k].m === 'si') { col.splice(k, 1, { m: 'si', h: col[k].h - 8, t: col[k].t }, { m: 'n', h: 8, t }); n++; } else if (col[k].m !== 'n') b++;
      });
      return n ? `リンなどの原子を高速で打ち込み、電子をたくわえた「部屋」をつくった。${b ? '上に何かが乗っている場所には入らない。' : ''}` : '打ち込める場所がない（上に何かが乗っているか、もう部屋になっている）。'; } }
  };
  const CANON = ['ox', 'dep', 'coat', 'expose', 'develop', 'etch', 'strip', 'implant'];
  function finishedBody() { const c = initBody(); CANON.forEach((k, t) => OPS[k].run(c, t)); return c; }
  function judge(c) {
    if (hasRes(c)) return { k: 'res', msg: 'まだレジストが残っている。はがしてから試そう。' };
    const g = []; c.forEach((col, i) => { if (col.some(l => l.m === 'poly')) g.push(i); });
    if (!g.length) return { k: 'none', msg: '門がない。これでは電気を切り替えられない。' };
    if (g.length > 12) return { k: 'blanket', msg: '門の材料が区画全体をおおったまま。門の形に削れていない。' };
    for (const i of g) { const col = c[i], p = col.findIndex(l => l.m === 'poly'); if (!(p > 0 && col[p - 1].m === 'ox' && col[p - 1].thin)) return { k: 'leak', msg: '門と通り道の間に、薄いガラスの膜がない。門の電気が通り道へ漏れてしまう。' }; }
    const isN = i => { const s = c[i].filter(l => l.m === 'si' || l.m === 'n'); return s[s.length - 1].m === 'n'; };
    if (g.some(isN)) return { k: 'always', msg: '門の下の通り道まで「部屋」になっている。門を閉じても電気が流れっぱなしで、スイッチにならない。' };
    if (!isN(g[0] - 1) || !isN(g[g.length - 1] + 1)) return { k: 'noroom', msg: '門の両側に、電子をたくわえた部屋がない。門を開いても、電気の入口と出口がない。' };
    return { k: 'ok', msg: '' };
  }

  /* ===== 静止した図 ===== */
  const figs = {
    pure() {
      let s = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
        const x = 26 + c * 32, y = 24 + r * 30;
        if (c < 7) s += `<line x1="${x}" y1="${y}" x2="${x + 32}" y2="${y}" class="ln"/>`;
        if (r < 3) s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 30}" class="ln"/>`;
      }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
        const x = 26 + c * 32, y = 24 + r * 30, odd = r === 1 && c === 5;
        s += `<circle cx="${x}" cy="${y}" r="9" class="${odd ? 'f-ink' : 'f-si'}"/>`;
      }
      s += `<circle cx="210" cy="68" r="5" class="f-e"/><text x="186" y="58" class="t-e" text-anchor="end">余った電子</text>`;
      return `<svg viewBox="0 0 280 140" role="img" aria-label="シリコンの結晶に、別の原子が1つ混じると、動ける電子が生まれる">${s}<text x="140" y="134" class="t-s" text-anchor="middle">1つ混じるだけで、動ける電子が生まれる</text></svg>`;
    }
  };

  /* ===== シミュレータ ===== */
  const sims = {};

  /* --- C1 純度のものさし --- */
  sims.purity = {
    html: () => `<div class="c-sim">
      <svg viewBox="0 0 420 272" class="c-svg c-mid" role="img" aria-label="混ぜ物の量を、シリコン原子何個に1個かで並べたものさし"></svg>
      <div class="sim-ctrl"><label for="c-pur-n">原料の純度（9の数）</label><input type="range" id="c-pur-n" min="2" max="11" step="1" value="4"><output id="c-pur-out"></output></div>
      <div class="sim-read"><span>勝手な混じり物 <b id="c-pur-r"></b></span><span>主人公1個の体に <b id="c-pur-p"></b></span></div>
      <p class="sim-note" id="c-pur-note" aria-live="polite"></p></div>`,
    mount(el) {
      const svg = el.querySelector('svg'), inp = el.querySelector('#c-pur-n');
      const X = e => 30 + (e - 2) * 36; // e = 10の何乗個に1個か
      const THIN = Math.log10(4e7), THICK = Math.log10(500);
      const draw = () => {
        const N = +inp.value, err = Math.pow(10, -N) * 4e7, bad = err >= 0.1;
        let s = `<line x1="30" y1="150" x2="390" y2="150" class="c-axis"/>`;
        for (let e = 2; e <= 12; e++) s += `<line x1="${X(e)}" y1="144" x2="${X(e)}" y2="156" class="c-axis"/>`;
        [[2, '100'], [4, '1万'], [6, '100万'], [8, '1億'], [10, '100億'], [12, '1兆']].forEach(([e, t]) => s += `<text x="${X(e)}" y="206" class="c-tx-m" text-anchor="middle">${t}</text>`);
        s += `<text x="30" y="262" class="c-tx-s">← 多い</text><text x="390" y="262" class="c-tx-s" text-anchor="end">少ない →</text>`;
        s += `<text x="210" y="262" class="c-tx-m" text-anchor="middle">原子 何個に1個？</text>`;
        // わざと混ぜる量
        s += `<rect x="${X(THICK) - 6}" y="112" width="12" height="34" rx="3" class="c-k"/><line x1="${X(THICK)}" y1="62" x2="${X(THICK)}" y2="110" class="c-lead"/><text x="26" y="28" class="c-tx-k">わざと混ぜる（部屋）</text><text x="26" y="52" class="c-tx-s">約500個に1個</text>`;
        s += `<rect x="${X(THIN) - 6}" y="112" width="12" height="34" rx="3" class="c-k"/><text x="${X(THIN)}" y="78" class="c-tx-k" text-anchor="middle">わざと混ぜる（土台）</text><text x="${X(THIN)}" y="102" class="c-tx-s" text-anchor="middle">数千万個に1個</text>`;
        // 勝手な混じり物
        const jx = X(N);
        s += `<path d="M ${jx} 156 l -11 22 h 22 z" class="${bad ? 'c-ng' : 'c-ok'}"/><text x="${jx}" y="236" class="c-tx" text-anchor="${N >= 10 ? 'end' : N <= 3 ? 'start' : 'middle'}">勝手な混じり物</text>`;
        svg.innerHTML = s;
        el.querySelector('#c-pur-out').textContent = N === 2 ? '99%' : '99.' + '9'.repeat(N - 2) + '%';
        el.querySelector('#c-pur-r').textContent = jaBig(Math.pow(10, N)) + '個に1個';
        const per = 1e7 * Math.pow(10, -N);
        el.querySelector('#c-pur-p').textContent = per >= 1 ? '約' + jaBig(per) + '個' : '主人公' + jaBig(1 / per) + '個に1個';
        el.querySelector('#c-pur-note').textContent = err >= 1
          ? `勝手な混じり物が、土台にわざと混ぜた量の約${jaBig(err)}倍。主人公の性質は、設計ではなく偶然で決まってしまう。`
          : err >= 0.1 ? `土台にわざと混ぜた量が、混じり物のせいで最大${Math.round(err * 100)}%狂う。まだ足りない。`
          : `土台の狂いは最大${(err * 100).toFixed(err * 100 < 1 ? 2 : 1)}%。${N >= 11 ? 'ほぼ設計どおり。これがイレブンナイン。' : 'かなり近づいた。'}`;
      };
      inp.addEventListener('input', draw); draw();
    }
  };

  /* --- C2 引きの図：結晶 → ウェーハ → 断面 --- */
  sims.wafer = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('<b id="c-wf-b"></b>')}<svg viewBox="0 0 600 360" class="c-svg" role="img" aria-label="結晶の引き上げからウェーハの断面までの引きの図"></svg></div>
      <div class="seg" role="group" aria-label="縮尺"><button class="btn" data-l="0">① 結晶を育てる</button><button class="btn" data-l="1">② ウェーハ</button><button class="btn" data-l="2">③ ウェーハの断面</button></div>
      <p class="sim-note" id="c-wf-note" aria-live="polite"></p></div>`,
    mount(el) {
      const svg = el.querySelector('svg'); let L = 0;
      const views = [
        () => ({ b: '約1m（装置の中）', n: 'とけたシリコンに種の結晶を浸し、回しながらゆっくり引き上げる。結晶は種の原子の並びをまねて育ち、断面が丸い円柱になる。',
          s: `<path d="M 170 250 L 180 330 L 420 330 L 430 250" class="c-line"/><path d="M 182 272 L 418 272 L 414 326 L 186 326 Z" class="c-melt"/>
            <text x="300" y="306" class="c-tx-s" text-anchor="middle">とけたシリコン（約1414℃）</text>
            <line x1="300" y1="20" x2="300" y2="64" class="c-line"/><rect x="292" y="60" width="16" height="16" class="c-k"/>
            <path d="M 300 76 L 236 110 L 236 250 Q 300 280 364 250 L 364 110 Z" class="c-ingot"/>
            ${[0, 1, 2, 3].map(i => `<path d="M 236 ${136 + i * 30} Q 300 ${150 + i * 30} 364 ${136 + i * 30}" class="c-ingot-ln"/>`).join('')}
            <path d="M 386 120 a 40 12 0 1 1 -20 -8" class="c-arrow"/><path d="M 366 104 l 0 10 l 9 -4" class="c-arrow"/>
            <text x="372" y="166" class="c-tx-s">回しながら</text><path d="M 470 140 L 470 70" class="c-arrow"/><path d="M 463 80 L 470 68 L 477 80" class="c-arrow"/><text x="484" y="104" class="c-tx-s">ゆっくり引く</text>
            <text x="120" y="90" class="c-tx-s" text-anchor="middle">種の結晶</text><line x1="160" y1="84" x2="288" y2="68" class="c-lead"/>
            <text x="120" y="190" class="c-tx" text-anchor="middle">インゴット</text><text x="120" y="216" class="c-tx-m" text-anchor="middle">直径 約30cm</text>` }),
        () => ({ b: '直径300mm', n: 'インゴットを薄く切り、鏡のように磨くとウェーハになる。ピンの場所に、やがて主人公が生まれる（点線は将来のチップ）。',
          s: (() => { let g = ''; const cx = 300, cy = 180, R = 150;
            for (let x = -150; x < 150; x += 15) for (let y = -150; y < 150; y += 15) if (Math.max(Math.hypot(x, y), Math.hypot(x + 15, y), Math.hypot(x, y + 15), Math.hypot(x + 15, y + 15)) < R - 4) g +=`<rect x="${cx + x}" y="${cy + y}" width="15" height="15" class="c-die"/>`;
            return `<circle cx="${cx}" cy="${cy}" r="${R}" class="c-wafer"/><path d="M ${cx - 70} ${cy - 110} Q ${cx - 20} ${cy - 140} ${cx + 40} ${cy - 128}" class="c-sheen"/>${g}
              <path d="M ${cx - 5} ${cy + R} l 5 -8 l 5 8" class="c-line"/><text x="${cx + 20}" y="${cy + R + 2}" class="c-tx-m">結晶の向きを示す切り欠き</text>${pin(cx + 52, cy - 8, '主人公はここに', false)}`; })() }),
        () => ({ b: '厚さ0.775mm', n: '厚さ0.775mmのうち、主人公の体があるのは表面から数µm以内。厚みの1%にも満たない薄皮で、残りはそれを支える土台。',
          s: `<rect x="40" y="140" width="500" height="150" class="c-slab"/><path d="M 40 140 L 540 140" class="c-skin"/>
            <text x="290" y="226" class="c-tx" text-anchor="middle">ほとんどが土台</text>
            <path d="M 560 140 L 560 290 M 552 140 h 16 M 552 290 h 16" class="c-line"/><text x="560" y="320" class="c-tx-m" text-anchor="end">0.775mm</text>
            ${pin(200, 136, '主人公の体は表面の数µm', false)}<text x="40" y="340" class="c-tx-m">※表面の青緑の線は、太く描いています</text>` })
      ];
      const draw = () => { const v = views[L](); svg.innerHTML = v.s; el.querySelector('#c-wf-b').textContent = v.b; el.querySelector('#c-wf-note').textContent = v.n; el.querySelectorAll('[data-l]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.l === L)); };
      el.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { L = +b.dataset.l; draw(); }));
      draw();
    }
  };

  /* --- C2 ピント合わせ --- */
  sims.focus = {
    html: () => `<div class="c-sim"><svg viewBox="0 0 420 320" class="c-svg c-mid" role="img" aria-label="ウェーハのでこぼこと、刷り上がりのにじみ">
      <defs>${[1, 2, 3, 4].map(i => `<filter id="c-bl${i}" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="${i * 1.6}"/></filter>`).join('')}</defs><g></g></svg>
      <div class="sim-ctrl"><label for="c-fo-a">表面のでこぼこ</label><input type="range" id="c-fo-a" min="0" max="40" step="1" value="4"><output id="c-fo-out"></output></div>
      <div class="sim-read"><span>くっきり刷れた線 <b id="c-fo-n"></b></span></div>
      <p class="sim-note" id="c-fo-note" aria-live="polite"></p></div>`,
    mount(el) {
      const g = el.querySelector('svg g'), inp = el.querySelector('#c-fo-a'), HB = 10, FY = 130;
      const f = x => .6 * Math.sin(x / 47) + .4 * Math.sin(x / 19 + 1.3);
      const draw = () => {
        const A = +inp.value; let s = '';
        s += `<rect x="20" y="14" width="380" height="34" rx="17" class="c-lens"/><text x="210" y="37" class="c-tx-s" text-anchor="middle">レンズ</text>`;
        for (let x = 40; x <= 380; x += 34) s += `<line x1="${x}" y1="48" x2="${x}" y2="${FY}" class="c-uvray"/>`;
        s += `<rect x="10" y="${FY - HB}" width="400" height="${HB * 2}" class="c-band"/><text x="408" y="${FY - HB - 6}" class="c-tx-m" text-anchor="end">ピントが合う幅</text>`;
        let d = `M 10 ${FY + 60}`; for (let x = 10; x <= 410; x += 5) d += ` L ${x} ${(FY + A * f(x)).toFixed(1)}`;
        s += `<path d="${d} L 410 ${FY + 60} Z" class="c-surf"/><text x="18" y="${FY + 54}" class="c-tx-s">ウェーハの表面</text>`;
        s += `<text x="18" y="226" class="c-tx-s">刷り上がり</text><rect x="10" y="236" width="400" height="74" rx="6" class="c-print"/>`;
        let ok = 0;
        for (let i = 0; i < 16; i++) {
          const x = 28 + i * 24.3, dev = Math.max(0, Math.abs(A * f(x)) - HB) / HB, lv = Math.min(4, Math.ceil(dev * 2.2));
          if (!lv) ok++;
          s += `<rect x="${(x - 4).toFixed(1)}" y="248" width="8" height="50" class="c-pline"${lv ? ` filter="url(#c-bl${lv})" opacity="${(1 / (1 + dev)).toFixed(2)}"` : ''}/>`;
        }
        g.innerHTML = s;
        el.querySelector('#c-fo-out').textContent = (A / HB).toFixed(1) + '倍';
        el.querySelector('#c-fo-n').textContent = ok + ' / 16本';
        el.querySelector('#c-fo-note').textContent = ok === 16 ? '高低差がピントの合う幅に収まっていれば、どこもくっきり刷れる。' : ok > 8 ? 'でこぼこがピントの幅からはみ出したところで、線がにじみ始めた。' : '線のほとんどがにじんだ。隣の線とくっつけば、回路はつながってしまう。';
      };
      inp.addEventListener('input', draw); draw();
    }
  };

  /* --- C3 露光と現像（断面ブロック） --- */
  sims.expose = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('幅 約0.2µm')}<svg viewBox="0 0 600 400" class="c-svg" role="img" aria-label="断面ブロックに版を通して光を当て、現像する"></svg></div>
      <div class="seg" role="group" aria-label="光の量"><span class="c-lbl">光の量</span><button class="btn" data-d="0">少なすぎ</button><button class="btn" data-d="1">ちょうど</button><button class="btn" data-d="2">多すぎ</button></div>
      <div class="seg"><button class="btn primary" data-a="exp">① 光を当てる</button><button class="btn primary" data-a="dev">② 現像する</button><button class="btn" data-a="reset">最初から</button></div>
      <p class="sim-note" aria-live="polite"></p>
      ${legend([['si', 'シリコン（土台）'], ['ox', 'ガラスの膜'], ['res', 'レジスト'], ['resx', '光で変わったレジスト'], ['mask', '版の影']])}</div>`,
    mount(el) {
      const svg = el.querySelector('svg'), note = el.querySelector('.sim-note');
      let dose = 1, stage = 0, cols, t = 0, timer;
      const reset = () => { cols = Array.from({ length: NC }, () => [{ m: 'si', h: 30, t: -1 }, { m: 'ox', h: 3, t: -1 }, { m: 'res', h: 6, t: -1 }]); stage = 0; t = 0; };
      const open = i => dose === 2 ? i < 7 || i >= 43 : i < 5 || i >= 45;
      const draw = (rays) => {
        const V = { x0: 30, y0: 385, k: 4.4 };
        let s = drawCols(V, cols, t);
        const mz = 54, plate = (x0, x1, m) => box(V, { m, x0, x1, z0: mz, z1: mz + 1.5 });
        s += plate(0, 10, 'glass') + plate(10, 90, 'mask') + plate(90, 100, 'glass');
        const [lx, ly] = P(V, 50, DEP / 2, mz + 1.5); s += `<text x="${lx}" y="${+ly + 7}" class="c-tx" text-anchor="middle">版（マスク）</text>`;
        if (rays) [3, 7, 93, 97].forEach(x => { const a = P(V, x, DEP / 2, 70), b = P(V, x, DEP / 2, 40); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="c-uvray c-run"/>`; });
        s += `<text x="290" y="26" class="c-tx-k" text-anchor="middle">光（紫外線）は上から ↓</text>`;
        svg.innerHTML = s;
        el.querySelectorAll('[data-d]').forEach(b => { b.setAttribute('aria-pressed', +b.dataset.d === dose); b.disabled = stage > 0; });
        el.querySelector('[data-a="exp"]').disabled = stage !== 0; el.querySelector('[data-a="dev"]').disabled = stage !== 1;
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
        if (b.dataset.d) { dose = +b.dataset.d; draw(); note.textContent = ['光が弱すぎると、レジストの底まで変わらない。', '光の量は、ちょうどよい設定。', '光が強すぎると、版の影の下まで光が回り込む。'][dose]; return; }
        const a = b.dataset.a;
        if (a === 'reset') { reset(); draw(); note.textContent = 'ウェーハにガラスの膜とレジストを塗った状態。版は主人公の区画を影で守る形。'; return; }
        if (a === 'exp' && stage === 0) {
          t = 1; cols.forEach((col, i) => { if (!open(i)) return; const r = col.pop(); if (dose === 0) col.push({ m: 'res', h: 3, t: -1 }, { m: 'resx', h: 3, t }); else col.push({ m: 'resx', h: r.h, t }); });
          stage = 1; draw(true); clearTimeout(timer); timer = setTimeout(() => draw(false), RM() ? 0 : 1400);
          note.textContent = '光が当たったところだけ、レジストの性質が変わった。見た目の形は、まだ何も変わっていない。';
        } else if (a === 'dev' && stage === 1) {
          t = 2; cols.forEach(col => { if (top(col).m === 'resx') col.pop(); }); stage = 2; draw();
          note.textContent = dose === 0 ? '底にレジストが残ってしまった。これでは、下の膜を削れない。' : dose === 2 ? '光が影に回り込んだぶん、型紙が細った。主人公の区画が設計よりやせてしまう。' : '版の影のとおりに、主人公の区画の型紙ができた。';
        }
      });
      reset(); draw(); note.textContent = 'ウェーハにガラスの膜とレジストを塗った状態。版は主人公の区画を影で守る形。';
      return () => clearTimeout(timer);
    }
  };

  /* --- C3 ウェーハ全体に版を刷っていく --- */
  const CHIP_TR = 190e8;
  sims.shots = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('直径300mm')}<svg viewBox="0 0 440 440" class="c-svg c-sq" role="img" aria-label="ウェーハに版を1回ずつ刷っていく"></svg></div>
      <div class="seg"><button class="btn primary" data-a="one">1回刷る</button><button class="btn" data-a="all">残りを全部刷る</button><button class="btn" data-a="dust" aria-pressed="false">版にゴミをつける</button><button class="btn" data-a="reset">最初から</button></div>
      <div class="sim-read"><span>刷った回数 <b class="c-sh-n">0</b></span><span>刷られたチップ <b class="c-sh-c">0</b>個</span><span>トランジスタ <b class="c-sh-t">0</b>個</span></div>
      <p class="sim-note" aria-live="polite"></p></div>`,
    mount(el) {
      const svg = el.querySelector('svg'), note = el.querySelector('.sim-note');
      const S = 1.3, C = 220, R = 150, chips = [], shots = [];
      for (let x = -150; x < 150; x += 10) for (let y = -155; y < 155; y += 10) {
        const far = Math.max(...[[x, y], [x + 10, y], [x, y + 10], [x + 10, y + 10]].map(p => Math.hypot(p[0], p[1])));
        if (far <= R - 3) chips.push({ x, y, p: 0, d: 0 });
      }
      const me = chips.find(c => c.x === 20 && c.y === 5);
      for (let gy = -165; gy < 165; gy += 30) { const row = []; for (let gx = -160; gx < 160; gx += 20) { const in_ = chips.filter(c => c.x >= gx && c.x < gx + 20 && c.y >= gy && c.y < gy + 30); if (in_.length) row.push({ gx, gy, in_ }); } if ((gy / 30 | 0) % 2) row.reverse(); shots.push(...row); }
      let n = 0, dust = false, timer;
      const draw = last => {
        let s = `<circle cx="${C}" cy="${C}" r="${R * S}" class="c-wafer"/>`;
        chips.forEach(c => { s += `<rect x="${C + c.x * S}" y="${C + c.y * S}" width="${10 * S}" height="${10 * S}" class="c-chip${c.p ? ' on' : ''}"/>`; if (c.d) s += `<circle cx="${C + (c.x + 7) * S}" cy="${C + (c.y + 3) * S}" r="2.6" class="c-dust"/>`; });
        if (last) s += `<rect x="${C + last.gx * S}" y="${C + last.gy * S}" width="${20 * S}" height="${30 * S}" class="c-shot"/>`;
        s += pin(C + (me.x + 5) * S, C + (me.y + 5) * S, '主人公のチップ', false);
        svg.innerHTML = s;
        const pc = chips.filter(c => c.p).length;
        el.querySelector('.c-sh-n').textContent = n + ' / ' + shots.length;
        el.querySelector('.c-sh-c').textContent = pc;
        el.querySelector('.c-sh-t').textContent = pc ? '約' + jaBig(pc * CHIP_TR) : '0';
      };
      const shoot = () => {
        if (n >= shots.length) return false;
        const sh = shots[n++]; sh.in_.forEach(c => { c.p = 1; c.d = dust ? 1 : 0; });
        if (sh.in_.includes(me)) note.textContent = `主人公が刷られた。同じ1回の光で、隣のチップ${sh.in_.length - 1}個ぶんの兄弟も一緒に。`;
        else if (n === shots.length) note.textContent = dust ? `全${shots.length}回で1枚。版のゴミは、刷ったすべてのチップの同じ場所に写った。` : `全${shots.length}回で1枚を刷り終えた。本物の装置なら、ここまで約20秒。`;
        else note.textContent = `1回の光で、チップ${sh.in_.length}個ぶんを同時に刷った。`;
        draw(sh); return true;
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
        const a = b.dataset.a; clearInterval(timer);
        if (a === 'one') { if (!shoot()) note.textContent = 'もう全部刷った。「最初から」でやり直せる。'; }
        if (a === 'all') { if (RM()) { while (shoot()); } else timer = setInterval(() => { if (!shoot()) clearInterval(timer); }, 45); }
        if (a === 'dust') { dust = !dust; b.setAttribute('aria-pressed', dust); note.textContent = dust ? '版に小さなゴミがついた。このまま刷るとどうなるか。' : '版をきれいにした。'; }
        if (a === 'reset') { n = 0; chips.forEach(c => { c.p = 0; c.d = 0; }); draw(); note.textContent = 'まだ何も刷っていないウェーハ。'; }
      });
      draw(); note.textContent = '1回に刷れるのは、約2.6cm×3.3cm。この図ではチップ6個ぶん。';
      return () => clearInterval(timer);
    }
  };

  /* --- C4 削る：プラズマと液の比較 --- */
  sims.etch = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('幅 約0.2µm')}<svg viewBox="10 110 580 270" class="c-svg" role="img" aria-label="真下にだけ削る場合と、全方向に削れる場合の比較"></svg></div>
      <div class="seg" role="group" aria-label="削り方"><button class="btn" data-m="p">プラズマ（真下へ）</button><button class="btn" data-m="w">液（全方向へ）</button></div>
      <div class="sim-ctrl"><label for="c-et-d">削る深さ</label><input type="range" id="c-et-d" min="0" max="20" step="1" value="12"><output id="c-et-out"></output></div>
      <div class="sim-read"><span>主人公の区画の幅（上面） <b class="c-et-w"></b></span></div>
      <div class="seg"><button class="btn primary" data-a="fill">溝をガラスで埋めて磨く</button></div>
      <p class="sim-note" aria-live="polite"></p>
      ${legend([['si', 'シリコン（土台）'], ['ox', 'ガラス'], ['res', 'レジスト（型紙）']])}</div>`,
    mount(el) {
      const svg = el.querySelector('svg'), inp = el.querySelector('#c-et-d'), note = el.querySelector('.sim-note');
      let mode = 'p', filled = false;
      const draw = () => {
        const d = +inp.value, cols = [];
        let full = 0;
        for (let i = 0; i < NC; i++) {
          const xc = (i + .5) * CW, opn = i < 5 || i >= 45;
          if (filled) { cols.push(opn ? [{ m: 'si', h: 30 - d, t: -1 }, { m: 'ox', h: d, t: 9 }] : [{ m: 'si', h: 30, t: -1 }]); continue; }
          if (opn) { cols.push([{ m: 'si', h: 30 - d, t: -1 }, { m: 'void', h: d }, { m: 'void', h: 3 }]); continue; }
          const dist = Math.min(xc - 10, 90 - xc), r = mode === 'w' && dist < d ? Math.sqrt(d * d - dist * dist) : 0;
          if (r > 0) cols.push([{ m: 'si', h: 30 - r, t: -1 }, { m: 'void', h: r }, { m: 'void', h: 3 }, { m: 'res', h: 6, t: -1 }]);
          else { full++; cols.push([{ m: 'si', h: 30, t: -1 }, { m: 'ox', h: 3, t: -1 }, { m: 'res', h: 6, t: -1 }]); }
        }
        svg.innerHTML = drawCols(VB, cols, filled ? 9 : null) + (filled ? (() => { const [x, y] = P(VB, 50, 0, 30); return `<text x="${x}" y="${+y + 50}" class="c-tx" text-anchor="middle">主人公の区画</text>`; })() : '');
        el.querySelector('#c-et-out').textContent = d === 0 ? 'なし' : d <= 7 ? '浅い' : d <= 14 ? '中くらい' : '深い';
        el.querySelector('.c-et-w').textContent = Math.round(full / 40 * 100) + '%';
        el.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === mode));
        el.querySelector('[data-a="fill"]').disabled = filled || mode !== 'p' || d < 6;
        if (filled) note.textContent = '溝をガラスで埋め、余分を磨いて平らにした。主人公の区画が、ガラスの壁で隣と仕切られた。';
        else if (mode === 'w' && d > 0) note.textContent = `液は型紙の下にも回り込み、横にもえぐる。区画の上面は設計の${Math.round(full / 40 * 100)}%にやせた。型紙は宙に浮いている。`;
        else note.textContent = d ? 'プラズマは真下にだけ削る。型紙のとおりの溝ができた。' : '削る前。紫のレジストが型紙。';
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
        if (b.dataset.m) { mode = b.dataset.m; filled = false; }
        if (b.dataset.a === 'fill') filled = true;
        draw();
      });
      inp.addEventListener('input', () => { filled = false; draw(); });
      draw();
    }
  };

  /* --- C4 主人公の体をつくる（工程ボタン） --- */
  sims.build = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('幅 約0.2µm')}<svg viewBox="10 96 580 304" class="c-svg" role="img" aria-label="工程ボタンで、主人公の断面ブロックが変わっていく"></svg></div>
      <div class="c-ops">${['dep', 'implant', 'etch', 'coat', 'strip', 'ox', 'develop', 'expose'].map(k => `<button class="btn" data-op="${k}">${OPS[k].label}</button>`).join('')}</div>
      <div class="seg"><button class="btn primary" data-a="test" aria-pressed="false">門に電圧をかける</button><button class="btn" data-a="hint">ヒント</button><button class="btn" data-a="reset">やり直す</button></div>
      <p class="c-log"></p><p class="sim-note" aria-live="polite"></p>
      ${legend([['si', 'シリコン（土台）'], ['n', '部屋（電子をたくわえる）'], ['ox', 'ガラス（電気を通さない）'], ['poly', '門の材料'], ['res', 'レジスト'], ['resx', '光で変わったレジスト']])}</div>`,
    mount(el) {
      const svg = el.querySelector('svg'), note = el.querySelector('.sim-note'), log = el.querySelector('.c-log'), tb = el.querySelector('[data-a="test"]');
      let cols, hist, t, on, raf, msg;
      const reset = () => { cols = initBody(); hist = []; t = 0; on = false; msg = '主人公の区画ができた状態から始める。左右のガラスの壁が、隣の兄弟との仕切り。'; };
      const flow = () => {
        cancelAnimationFrame(raf);
        const j = judge(cols), run = (on && j.k === 'ok') || j.k === 'always';
        if (!run) return;
        const dots = svg.querySelectorAll('.c-flow circle'); if (!dots.length) return;
        if (RM()) return;
        const t0 = performance.now();
        const step = now => { const p = (now - t0) / 1600; dots.forEach((c, i) => { const f = (p + i / dots.length) % 1; c.setAttribute('cx', (+c.dataset.a + (c.dataset.b - c.dataset.a) * f).toFixed(1)); }); raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
      };
      const draw = () => {
        let s = drawCols(VB, cols, t) + roomDots(VB, cols);
        const j = judge(cols), run = (on && j.k === 'ok') || j.k === 'always';
        if (j.k === 'ok' || j.k === 'always') {
          const z = 30 - 1.4;
          if (run) { const a = P(VB, 42, 0, z), b = P(VB, 58, 0, 30); s += `<rect x="${a[0]}" y="${b[1]}" width="${(b[0] - a[0]).toFixed(1)}" height="${(a[1] - b[1]).toFixed(1)}" class="c-chan"/>`; }
          const A = P(VB, 22, 0, z)[0], B = P(VB, 78, 0, z)[0], y = P(VB, 0, 0, z)[1];
          s += `<g class="c-flow">${run ? [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${(+A + (B - A) * i / 6).toFixed(1)}" cy="${y}" r="3.6" data-a="${A}" data-b="${B}" class="c-el"/>`).join('') : ''}</g>`;
          const lab = (x, z2, tx) => { const [px, py] = P(VB, x, 0, z2); return `<text x="${px}" y="${(+py + 36).toFixed(1)}" class="c-tx-s" text-anchor="middle">${tx}</text>`; };
          s += lab(26, 0, '入口の部屋') + lab(74, 0, '出口の部屋');
          const [gx, gy] = P(VB, 50, DEP / 2, 36.6); s += `<text x="${gx}" y="${(+gy - 22).toFixed(1)}" class="c-tx" text-anchor="middle">門</text>`;
          if (on && j.k === 'ok') { s += `<text x="${gx}" y="${(+gy - 48).toFixed(1)}" class="c-tx-k" text-anchor="middle">＋ 電圧</text>`; }
        }
        svg.innerHTML = s;
        log.textContent = hist.length ? hist.map((k, i) => `${i + 1} ${OPS[k].label}`).join(' → ') : '工程の記録：まだ何もしていない';
        tb.setAttribute('aria-pressed', on); tb.textContent = on ? '電圧をやめる' : '門に電圧をかける';
        note.textContent = msg; flow();
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
        if (b.dataset.op) { t++; hist.push(b.dataset.op); on = false; msg = OPS[b.dataset.op].run(cols, t); return draw(); }
        const a = b.dataset.a;
        if (a === 'reset') { reset(); return draw(); }
        if (a === 'hint') {
          const ok = hist.every((k, i) => k === CANON[i]);
          msg = !ok ? 'お手本の順番から外れている。結果を「門に電圧をかける」で確かめたら、「やり直す」で最初から。' : hist.length >= CANON.length ? 'もう完成している。「門に電圧をかける」で動かしてみよう。' : `次は「${OPS[CANON[hist.length]].label}」。` + ['門と通り道の間には、電気を通さない膜が要る。', '門になる材料を、まず全面に。', '門の形を刷るには、光に反応する薬が要る。', '門の形の版を使う。', '光で変わっただけでは、まだ形がない。', '型紙のないところを取り除く。', '型紙はもう用済み。', '最後に部屋をつくる。いま、門が傘になってくれる。'][hist.length];
          return draw();
        }
        if (a === 'test') {
          const j = judge(cols); on = !on;
          if (!on) msg = j.k === 'always' ? '電圧をやめても、電気が流れ続けている。スイッチとして失敗。' : '電圧をやめた。';
          else msg = j.k === 'ok' ? 'スイッチとして動いた！ 門の電圧が通り道に電子を集め、入口の部屋から出口の部屋へ電気が流れる。もう一度押すと止まる。' : j.k === 'always' ? '電気は流れた。でも電圧をやめても流れ続ける。' : j.msg;
          if (j.k !== 'ok') on = j.k === 'always' ? on : false;
          return draw();
        }
      });
      reset(); draw();
      return () => cancelAnimationFrame(raf);
    }
  };

  /* --- C5 ループのカウンター（配線を1階ずつ積む） --- */
  const STATIONS = ['膜を積む', 'レジストを塗る', '版で刷る', '現像する', '溝を削る', 'レジストをはがす', '銅を埋める', '磨いて平らに'];
  const FLOOR = i => { const tier = i <= 4 ? 0 : i <= 10 ? 1 : i <= 16 ? 2 : 3; const [p, w, h] = [[14, 7, 8], [24, 12, 12], [50, 25, 20], [100, 50, 34]][tier]; return { p, w, h, dir: i % 2 ? 'd' : 'x', tier }; };
  function towerSVG(nf, flash, H) {
    const body = finishedBody();
    let totalZ = 48; for (let i = 1; i <= nf; i++) totalZ += FLOOR(i).h;
    const k = Math.min(3.8, (H - 70) / (totalZ + DEP * CZ)), w = (100 + DEP * CX) * k;
    const v = { k, x0: (600 - w) / 2 + 40, y0: H - 24 };
    let s = drawCols(v, body) + roomDots(v, body);
    // コンタクト：部屋と門から上へ伸びる柱
    [[22, 28, 30], [47, 53, 36.6], [72, 78, 30]].forEach(([a, b, z]) => s += box(v, { m: 'w', x0: a, x1: b, z0: z, z1: 48, y0: 13, y1: 21 }));
    s += box(v, { m: 'glass', x0: 0, x1: 100, z0: 30, z1: 48 });
    let z = 48;
    for (let i = 1; i <= nf; i++) {
      const F = FLOOR(i), fl = i === flash, z1 = z + F.h, ms = [];
      if (F.dir === 'd') for (let x = (F.p - F.w) / 2; x < 100; x += F.p) ms.push({ x0: Math.max(0, x), x1: Math.min(100, x + F.w), y0: 0, y1: DEP });
      else if (F.tier < 2) for (let y = (F.p - F.w) / 2; y < DEP; y += F.p) ms.push({ x0: 0, x1: 100, y0: Math.max(0, y), y1: Math.min(DEP, y + F.w) });
      else ms.push({ x0: 0, x1: 100, y0: DEP * .2, y1: DEP * .8 });
      (F.dir === 'd' ? ms : ms.slice().reverse()).forEach(m => s += box(v, Object.assign({ m: 'cu', z0: z + F.h * .15, z1: z1 - F.h * .15, flash: fl }, m)));
      s += box(v, { m: 'glass', x0: 0, x1: 100, z0: z, z1 });
      z = z1;
    }
    const [gx, gy] = P(v, 42, 0, 33);
    s += `<line x1="${(+gx - 6).toFixed(1)}" y1="${gy}" x2="${(v.x0 - 30).toFixed(1)}" y2="${gy}" class="c-lead"/><text x="${(v.x0 - 36).toFixed(1)}" y="${(+gy + 6).toFixed(1)}" class="c-tx-k" text-anchor="end">主人公</text>`;
    if (nf) { const [fx, fy] = P(v, 100, DEP, z); s += `<text x="${(+fx + 10).toFixed(1)}" y="${(+fy + 6).toFixed(1)}" class="c-tx-s">${nf}階</text>`; }
    return { s, k };
  }
  sims.loop = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('<b class="c-lp-b">幅 約0.2µm</b>')}<svg viewBox="0 0 600 560" class="c-svg c-tall" role="img" aria-label="主人公の上に配線の階が積み上がる"></svg></div>
      <div class="c-loopbox"><svg viewBox="0 0 150 150" class="c-ring" aria-hidden="true"></svg>
        <div class="sim-read" style="margin:0"><span>配線の階 <b class="c-lp-f">0</b>/ 20</span><span>ループを回った工程 <b class="c-lp-s">0</b></span></div></div>
      <div class="seg"><button class="btn primary" data-a="one">1周まわす（1階ぶん）</button><button class="btn" data-a="all">20階まで一気に</button><button class="btn" data-a="reset">最初から</button></div>
      <p class="sim-note" aria-live="polite"></p>
      ${legend([['cu', '銅の配線'], ['w', '縦の柱（部屋・門とつなぐ）'], ['glass', 'ガラスの床']])}</div>`,
    mount(el) {
      const svg = el.querySelector('svg.c-tall'), ring = el.querySelector('.c-ring'), note = el.querySelector('.sim-note');
      let nf = 0, st = -1, timer, busy = false;
      const drawRing = () => {
        let s = `<circle cx="75" cy="75" r="56" class="c-ringc"/>`;
        STATIONS.forEach((_, i) => { const a = -Math.PI / 2 + i / 8 * Math.PI * 2; s += `<circle cx="${(75 + 56 * Math.cos(a)).toFixed(1)}" cy="${(75 + 56 * Math.sin(a)).toFixed(1)}" r="8" class="c-st${i === st ? ' on' : i < st ? ' done' : ''}"/>`; });
        s += `<text x="75" y="70" class="c-tx-m" text-anchor="middle" style="font-size:12px">${st >= 0 ? (st + 1) + ' / 8' : 'ループ'}</text><text x="75" y="92" class="c-ringt" text-anchor="middle">${st >= 0 ? STATIONS[st] : '待機中'}</text>`;
        ring.innerHTML = s;
      };
      const draw = flash => {
        const { s, k } = towerSVG(nf, flash, 560); svg.innerHTML = s;
        el.querySelector('.c-lp-f').textContent = nf; el.querySelector('.c-lp-s').textContent = nf * 8;
        el.querySelector('.c-lp-b').textContent = k < 3.79 ? '幅 約0.2µm（縮小）' : '幅 約0.2µm';
        drawRing();
      };
      const finishFloor = () => {
        nf++; st = -1; draw(nf); busy = false;
        const F = FLOOR(nf);
        note.textContent = nf === 20 ? '20階建ての完成。主人公は、ビルの床下の小さな部屋にいる。上の階ほど、配線は太く厚い。' : F.tier === 0 ? `${nf}階：細い配線。すぐ隣のトランジスタどうしをつなぐ。階ごとに配線の向きを変えて、立体交差させる。` : F.tier === 1 ? `${nf}階：少し太い配線。回路のまとまりどうしをつなぐ。` : F.tier === 2 ? `${nf}階：太い配線。チップの遠くまで電気を運ぶ。` : `${nf}階：いちばん太い配線。電源を配る。`;
      };
      const loopOnce = (fast) => {
        if (nf >= 20 || busy) return; busy = true;
        if (fast || RM()) { st = 7; return finishFloor(); }
        st = 0; drawRing();
        timer = setInterval(() => { st++; if (st >= 8) { clearInterval(timer); finishFloor(); } else drawRing(); }, 170);
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
        const a = b.dataset.a;
        if (a === 'one') loopOnce(false);
        if (a === 'all') { clearInterval(timer); busy = false; const go = () => { if (nf >= 20) return; loopOnce(true); timer = setTimeout(go, RM() ? 0 : 260); }; go(); }
        if (a === 'reset') { clearInterval(timer); clearTimeout(timer); nf = 0; st = -1; busy = false; draw(); note.textContent = '主人公ができあがった状態。部屋と門から、縦の柱が上へ伸びている。'; }
      });
      draw(); note.textContent = '主人公ができあがった状態。部屋と門から、縦の柱が上へ伸びている。';
      return () => { clearInterval(timer); clearTimeout(timer); };
    }
  };

  /* --- C5 見当合わせ（重ね合わせのずれ） --- */
  sims.overlay = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('幅 約90nm')}<svg viewBox="0 36 420 268" class="c-svg c-mid" role="img" aria-label="上の階の縦穴と、下の階の配線の重なり"></svg></div>
      <div class="sim-ctrl"><label for="c-ov-x">上の階の版のずれ</label><input type="range" id="c-ov-x" min="-20" max="20" step="0.5" value="0"><output id="c-ov-out"></output></div>
      <div class="sim-read"><span>つながっている幅 <b class="c-ov-c"></b></span></div>
      <p class="sim-note" aria-live="polite"></p></div>`,
    mount(el) {
      const svg = el.querySelector('svg'), inp = el.querySelector('#c-ov-x'), note = el.querySelector('.sim-note');
      const K = 4.6, C = 210, X = nm => C + nm * K, WW = 14, PITCH = 28, VW = 12;
      const draw = () => {
        const o = +inp.value, v0 = o - VW / 2, v1 = o + VW / 2;
        const ov = Math.max(0, Math.min(v1, WW / 2) - Math.max(v0, -WW / 2)), short = v1 >= PITCH - WW / 2 || v0 <= -(PITCH - WW / 2);
        let s = `<rect x="6" y="70" width="408" height="200" class="c-glass2"/>`;
        [-PITCH, 0, PITCH].forEach(c => s += `<rect x="${X(c - WW / 2)}" y="200" width="${WW * K}" height="60" class="c-cu2"/>`);
        s += `<rect x="${X(v0)}" y="130" width="${VW * K}" height="70" class="c-cu2 c-via"/><rect x="${X(o - 22)}" y="80" width="${44 * K}" height="50" class="c-cu2"/>`;
        if (ov > 0) s += `<rect x="${X(Math.max(v0, -WW / 2))}" y="196" width="${ov * K}" height="8" class="${ov >= VW * .75 ? 'c-ok' : 'c-ng'}"/>`;
        if (short) s += `<circle cx="${X(o > 0 ? PITCH - WW / 2 : -(PITCH - WW / 2))}" cy="200" r="13" class="c-sparkc"/>`;
        s += `<text x="${X(0)}" y="290" class="c-tx-s" text-anchor="middle">下の階の配線</text><text x="${X(-PITCH)}" y="290" class="c-tx-m" text-anchor="middle">隣</text><text x="${X(PITCH)}" y="290" class="c-tx-m" text-anchor="middle">隣</text>`;
        s += `<text x="${X(o)}" y="60" class="c-tx-s" text-anchor="middle">上の階の配線と縦穴</text>`;
        svg.innerHTML = s;
        el.querySelector('#c-ov-out').textContent = (o > 0 ? '+' : '') + o.toFixed(1) + 'nm';
        el.querySelector('.c-ov-c').textContent = Math.round(ov / VW * 100) + '%';
        note.textContent = short ? 'ずれすぎて、縦穴が隣の配線に触れた。ショート（つながってはいけない配線がつながる）。' : ov <= 0 ? '縦穴が下の配線から外れた。電気がつながらない。' : ov < VW * .75 ? 'つながってはいるが、接する面が狭い。電気が通りにくく、熱も出る。' : Math.abs(o) <= 1.1 ? 'ぴったり。最新の露光装置のずれ（約1.1nm）は、この範囲。' : 'まだ大丈夫。でも、余裕は数nmしかない。';
      };
      inp.addEventListener('input', draw); draw();
    }
  };

  /* --- C6 ゴミと歩留まり --- */
  sims.dust = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('<b class="c-du-b">直径300mm</b>')}<svg viewBox="0 0 440 440" class="c-svg c-sq" role="img" aria-label="ウェーハにゴミが落ちると、当たったチップが不合格になる"></svg></div>
      <div class="seg" role="group" aria-label="ウェーハの大きさ"><span class="c-lbl">ウェーハ</span><button class="btn" data-w="100">直径200mm</button><button class="btn" data-w="150">直径300mm</button></div>
      <div class="seg" role="group" aria-label="チップの大きさ"><span class="c-lbl">チップ</span><button class="btn" data-c="10">10mm角（スマホ級）</button><button class="btn" data-c="25">25mm角（大型）</button></div>
      <div class="seg"><button class="btn primary" data-a="dust">ゴミを10粒まく</button><button class="btn" data-a="clean">ふき取る</button></div>
      <div class="sim-read"><span>取れるチップ <b class="c-du-n"></b>個</span><span>縁のむだ <b class="c-du-e"></b></span><span>合格 <b class="c-du-g"></b>個</span><span>歩留まり <b class="c-du-y"></b></span></div>
      <p class="sim-note" aria-live="polite"></p></div>`,
    mount(el) {
      const svg = el.querySelector('svg'), note = el.querySelector('.sim-note'), S = 1.3, C = 220;
      let R = 150, cs = 10, chips, dust = [], me;
      const layout = () => {
        chips = []; dust = [];
        for (let x = -R; x < R; x += cs) for (let y = -R - cs / 2; y < R; y += cs) {
          const far = Math.max(...[[x, y], [x + cs, y], [x, y + cs], [x + cs, y + cs]].map(p => Math.hypot(p[0], p[1])));
          if (far <= R - 3) chips.push({ x, y, bad: 0 });
        }
        me = chips.reduce((a, c) => Math.hypot(c.x + cs / 2 - 22, c.y + cs / 2 - 12) < Math.hypot(a.x + cs / 2 - 22, a.y + cs / 2 - 12) ? c : a);
      };
      const draw = () => {
        let s = `<circle cx="${C}" cy="${C}" r="${R * S}" class="c-wafer"/>`;
        chips.forEach(c => s += `<rect x="${C + c.x * S}" y="${C + c.y * S}" width="${cs * S}" height="${cs * S}" class="c-chip ${c.bad ? 'bad' : 'good'}"/>`);
        dust.forEach(d => s += `<circle cx="${(C + d[0] * S).toFixed(1)}" cy="${(C + d[1] * S).toFixed(1)}" r="3.2" class="c-dust"/>`);
        s += pin(C + (me.x + cs / 2) * S, C + (me.y + cs / 2) * S, '主人公のチップ', false);
        svg.innerHTML = s;
        const n = chips.length, g = chips.filter(c => !c.bad).length;
        el.querySelector('.c-du-n').textContent = n;
        el.querySelector('.c-du-e').textContent = Math.round((1 - n * cs * cs / (Math.PI * R * R)) * 100) + '%';
        el.querySelector('.c-du-g').textContent = g;
        el.querySelector('.c-du-y').textContent = Math.round(g / n * 100) + '%';
        el.querySelector('.c-du-b').textContent = '直径' + R * 2 + 'mm';
        el.querySelectorAll('[data-w]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.w === R));
        el.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.c === cs));
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
        if (b.dataset.w) { R = +b.dataset.w; layout(); draw(); note.textContent = `ウェーハを変えた。縁でむだになる面積の割合を比べてみよう。`; return; }
        if (b.dataset.c) { cs = +b.dataset.c; layout(); draw(); note.textContent = 'チップの大きさを変えた。同じ数のゴミをまいて、歩留まりを比べてみよう。'; return; }
        if (b.dataset.a === 'clean') { dust = []; chips.forEach(c => c.bad = 0); draw(); note.textContent = 'ゴミをふき取った。'; return; }
        if (b.dataset.a === 'dust') {
          let hitMe = false;
          for (let i = 0; i < 10; i++) {
            const r = R * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2, p = [r * Math.cos(a), r * Math.sin(a)]; dust.push(p);
            chips.forEach(c => { if (p[0] >= c.x && p[0] < c.x + cs && p[1] >= c.y && p[1] < c.y + cs) { c.bad = 1; if (c === me) hitMe = true; } });
          }
          draw();
          note.textContent = hitMe ? '主人公のチップにゴミが当たった。同じチップの兄弟たちごと、このチップは不合格。' : me.bad ? '主人公のチップは、すでに不合格になっている。' : `ゴミは合わせて${dust.length}粒。主人公のチップは、いまのところ無事。`;
        }
      });
      layout(); draw(); note.textContent = 'ゴミのないウェーハ。縁で欠けるチップは、はじめから数に入らない（灰色の部分がむだ）。';
    }
  };

  /* --- C6 まちがい探し（隣のチップとの引き算） --- */
  sims.diff = {
    html: () => `<div class="c-sim"><svg viewBox="0 0 600 240" class="c-svg" role="img" aria-label="隣どうしのチップの画像を引き算して、違うところを見つける"></svg>
      <div class="seg" role="group" aria-label="ゴミの場所"><button class="btn" data-k="one">ゴミ：右のチップだけ</button><button class="btn" data-k="mask">ゴミ：版についていた</button></div>
      <div class="seg"><button class="btn primary" data-a="sub">引き算する</button></div>
      <p class="sim-note" aria-live="polite"></p></div>`,
    mount(el) {
      const svg = el.querySelector('svg'), note = el.querySelector('.sim-note');
      let kind = 'one', done = false;
      const pat = (ox, defA, defB, diff) => {
        let s = `<rect x="${ox}" y="20" width="170" height="170" rx="6" class="c-print"/>`;
        let x = 7;
        if (!diff) for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { x = (x * 37 + 11) % 97; if (x % 3) s += `<rect x="${ox + 10 + c * 19.5}" y="${30 + r * 19.5}" width="${x % 2 ? 15 : 8}" height="${x % 5 ? 8 : 15}" class="c-patt"/>`; }
        if (defA || defB) s += `<circle cx="${ox + 112}" cy="${76}" r="7" class="c-dust"/>`;
        return s;
      };
      const draw = () => {
        const mask = kind === 'mask';
        let s = pat(10, mask, false) + pat(215, true, false);
        s += `<text x="95" y="215" class="c-tx-s" text-anchor="middle">左のチップ</text><text x="300" y="215" class="c-tx-s" text-anchor="middle">右のチップ</text>`;
        s += `<text x="200" y="110" class="c-tx" text-anchor="middle">−</text><text x="402" y="110" class="c-tx" text-anchor="middle">＝</text>`;
        s += done ? pat(420, false, !mask, true) : `<rect x="420" y="20" width="170" height="170" rx="6" class="c-print c-dash"/><text x="505" y="110" class="c-tx-m" text-anchor="middle">？</text>`;
        s += `<text x="505" y="215" class="c-tx-s" text-anchor="middle">違いだけ</text>`;
        svg.innerHTML = s;
        el.querySelectorAll('[data-k]').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === kind));
      };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
        if (b.dataset.k) { kind = b.dataset.k; done = false; note.textContent = kind === 'mask' ? '版にゴミがついていた場合。ゴミはすべてのチップの同じ場所に刷られている。' : '右のチップにだけ、ゴミが1粒落ちている。見つけられるかな。'; }
        if (b.dataset.a === 'sub') { done = true; note.textContent = kind === 'mask' ? '差はゼロ。2枚とも同じ場所が間違っているので、見比べても気づけない。だから、版そのものも別の方法で調べる。' : '同じ模様は打ち消し合い、ゴミだけが浮かび上がった。'; }
        draw();
      });
      draw(); note.textContent = '右のチップにだけ、ゴミが1粒落ちている。見つけられるかな。';
    }
  };

  /* --- C6 旅立ち：主人公からスマホまでズームアウト --- */
  sims.zoomout = {
    html: () => `<div class="c-sim"><div class="c-stage">${badge('<b class="c-zo-b"></b>')}<svg viewBox="90 0 420 360" class="c-svg c-mid" role="img" aria-label="主人公からスマホまでのズームアウト"></svg></div>
      <div class="seg"><button class="btn" data-a="in">← 寄る</button><button class="btn primary" data-a="out">引く →</button><span class="c-lbl c-zo-l"></span></div>
      <p class="sim-note" aria-live="polite"></p></div>`,
    mount(el) {
      const svg = el.querySelector('svg'), note = el.querySelector('.sim-note'); let L = 0;
      const body = finishedBody();
      const lv = [
        { b: '幅 約0.2µm', l: '1 / 5　主人公', n: 'できあがった主人公。ここから、ズームアウトしていく。', s: () => drawCols({ x0: 140, y0: 290, k: 2.6 }, body) + roomDots({ x0: 140, y0: 290, k: 2.6 }, body) + pin(...P({ x0: 140, y0: 290, k: 2.6 }, 50, DEP / 2, 37).map(Number), '主人公', false) },
        { b: '幅 約2µm', l: '2 / 5　トランジスタの列', n: '主人公のまわりには、同じ形の兄弟がずらりと並ぶ。', s: () => { let s = ''; for (let i = 0; i < 6; i++) s += `<rect x="40" y="${50 + i * 46}" width="520" height="18" class="c-finr"/>`; for (let j = 0; j < 17; j++) s += `<rect x="${52 + j * 30}" y="36" width="9" height="290" class="c-gatel"/>`; return s + `<rect x="268" y="132" width="42" height="42" class="c-hilite"/>` + pin(289, 128, '主人公', false); } },
        { b: '幅 約1cm', l: '3 / 5　チップ', n: '指先ほどのチップ。この中に、主人公を含む約190億個。', s: () => { let s = `<rect x="150" y="30" width="300" height="300" rx="4" class="c-diebig"/>`; [[166, 46, 130, 110], [304, 46, 130, 70], [304, 124, 130, 90], [166, 164, 130, 150], [304, 222, 130, 92]].forEach(b => s += `<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" class="c-blockr"/>`); return s + pin(372, 168, '主人公', false); } },
        { b: '幅 約3cm', l: '4 / 5　パッケージ', n: '合格したチップは切り分けられ、パッケージに収められる。基板の上の黒い四角は、チップそのものではなくパッケージ。', s: () => `<rect x="60" y="40" width="480" height="290" rx="10" class="c-board"/><rect x="210" y="100" width="180" height="170" rx="8" class="c-pkg"/><rect x="250" y="135" width="100" height="100" class="c-diein"/>` + pin(318, 170, '主人公', false) },
        { b: '幅 約15cm', l: '5 / 5　スマホ', n: '主人公の旅は、あなたのポケットの中で終わる。そして、ここから毎秒何十億回もの仕事が始まる。', s: () => `<rect x="190" y="14" width="220" height="334" rx="30" class="c-phone"/><rect x="204" y="40" width="192" height="282" rx="10" class="c-screen"/><rect x="232" y="80" width="136" height="120" rx="6" class="c-board"/><rect x="282" y="116" width="36" height="36" rx="3" class="c-pkg"/>` + pin(300, 132, '主人公', false) }
      ];
      const draw = () => {
        svg.innerHTML = lv[L].s();
        el.querySelector('.c-zo-b').textContent = lv[L].b; el.querySelector('.c-zo-l').textContent = lv[L].l; note.textContent = lv[L].n;
        el.querySelector('[data-a="in"]').disabled = L === 0; el.querySelector('[data-a="out"]').disabled = L === lv.length - 1;
      };
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !el.contains(b)) return; L = Math.max(0, Math.min(lv.length - 1, L + (b.dataset.a === 'out' ? 1 : -1))); draw(); });
      draw();
    }
  };

  /* ===== 教材データ ===== */
  const steps = [
  {
    id: 'c1', no: 1, title: '体になるシリコン',
    headline: '主人公の体は、どこまで純粋でなければならないのか。',
    predict: {
      q: 'この章から、スマホのチップの中の「1個のトランジスタ」を主人公に、できあがるまでを追いかけます。主人公の体はシリコン。その原料に求められる純度は、どれくらいだと思いますか？',
      options: ['99%（9が2つ）', '99.9999%（9が6つ）', '99.999999999%（9が11個）'],
      answer: 2,
      right: '正解。9が11個。「イレブンナイン」と呼ばれる純度です。',
      wrong: '答えは9が11個。「イレブンナイン」と呼ばれる純度です。'
    },
    explore: [
      { t: 'p', h: 'この旅の主人公を紹介します。あなたのスマホのチップに入っている約190億個のトランジスタ（電気で電気を切り替えるスイッチ）のうちの、<b>たった1個</b>です。モジュールCでは、この1個が生まれるまでを最後まで追いかけます。' },
      { t: 'p', h: '主人公の体はシリコンでできています。原料は、ありふれた石や砂。では、なぜその原料を、とてつもなく純粋にしなければならないのでしょうか。' },
      { t: 'recall', from: 'A3', ttl: '混ぜ物', fig: 'pure', to: 'a3', h: '純粋なシリコンでは、原子どうしが手をつなぎ合っていて、自由に動ける電子がほとんどいません。だから、別の原子をほんの少し混ぜるだけで、電気の通しやすさががらりと変わる。半導体の性質は、<b>混ぜ物で決まる</b>のでした。' },
      { t: 'h', h: '作る側の悩み：混ぜたくないものも、効いてしまう' },
      { t: 'p', h: 'トランジスタを作るときは、わざと混ぜ物をします。ただし、その量はほんのわずか。主人公が立つ土台のシリコンには、原子<b>数千万個に1個</b>ほどしか混ぜません。' },
      { t: 'p', h: 'では、原料に「勝手な混じり物」が残っていたらどうなるか。わざと混ぜる量と、勝手に混じる量を、同じものさし（シリコン原子何個に1個か）に並べてみます。' },
      { t: 'sim', id: 'purity', cap: 'つまみで原料の純度（9の数）を変えてみよう。▲が勝手な混じり物。土台にわざと混ぜる量（右の青緑）に近いほど、主人公の性質は狙いどおりにならない。' },
      { t: 'p', h: '9が7つ以下だと、勝手な混じり物のほうが、わざと混ぜる量より多くなります。主人公の性質は、設計ではなく偶然で決まってしまう。9が11個まで来て、狂いはやっと0.04%ほどに収まります。' },
      { t: 'h', h: '石を、どうやって「洗う」のか' },
      { t: 'p', h: '石を炭と一緒に電気炉で熱すると、純度およそ98%のシリコンが取れます。ここからが本番です。固体のシリコンは、混じり物ごと固まっているので、そのままでは洗えません。' },
      { t: 'p', h: 'そこで、シリコンをいったん<b>沸きやすい液体</b>に変えます。塩化水素と反応させて「トリクロロシラン」という物質にすると、約32℃で沸く。沸く温度の違いを利用して混じり物を分け、最後に高温の棒の上でシリコンの固体に戻します。' },
      { t: 'analogy', ttl: '理科室の蒸留', rows: [['泥水', '混じり物の多いシリコン（純度およそ98%）'], ['沸かして湯気にする', 'シリコンを、沸きやすい液体（トリクロロシラン）に変える'], ['沸く温度の違いで分ける', '沸点の違いで、混じり物を取り除く'], ['湯気を冷やして水に戻す', '高温の棒の上で、シリコンの固体に戻す']],
        breaks: '泥水は沸かせば湯気になりますが、シリコンそのものは3000℃を超えるまで沸きません。だから化学反応で「シリコンを含む、沸きやすい物質」に変えてから蒸留します。また、ホウ素の化合物のように沸く温度が近い混じり物は分けにくく、何段にも重ねて蒸留します。' }
    ],
    discover: [
      { t: 'p', h: '答えは9が11個。シリコン原子<b>1000億個</b>の中に、別の原子が1個あるかないか、という純度です。' },
      { t: 'num', big: '1000億', unit: '個に1個', b: '半導体用のシリコンに許される混じり物', l: '純度99.999999999%（イレブンナイン）。地球の全人口（約80億人）を12回集めて、やっと1人だけ違う人が混じる割合です。' },
      { t: 'p', h: 'それでも、主人公1個の体（シリコン原子およそ1000万個）で見れば、混じり物が紛れ込むのは<b>主人公1万個に1個</b>ほど。ほとんどの主人公は、混じり物ひとつない体で生まれます。' },
      { t: 'p', h: 'ただし、純粋になっただけでは、まだ主人公の土台にはなれません。この時点のシリコンは、小さな結晶がばらばらの向きで寄せ集まった「多結晶」。原子の並びがそろっていないと、電子の通り道が乱れてしまいます。' }
    ],
    quiz: [
      { type: 'tf', q: '半導体用のシリコンは、純度99%あれば十分だ。', answer: 1, ex: '99%では、100個に1個が混じり物。土台にわざと混ぜる量（数千万個に1個）より、はるかに多くなってしまいます。求められるのは9が11個です。' },
      { type: 'choice', q: 'なぜ、原料のシリコンをそこまで純粋にする必要があるのか？', options: ['純粋なほど、シリコンが硬くなるから', '半導体の性質は、ほんのわずかな混ぜ物で決まるから', '純粋なほど、見た目が美しいから', '混じり物があると、ウェーハが丸くならないから'], answer: 1, ex: '純粋なシリコンには動ける電子がほとんどないので、ほんの少しの混ぜ物で性質が変わります。わざと混ぜる量を狙いどおりにするには、勝手な混じり物を、それよりずっと少なくしておく必要があります。' },
      { type: 'fill', before: 'シリコンをいったん沸きやすい液体に変え、', after: 'で混じり物を取り除く。', options: ['蒸留', '磁石', 'ろ紙', 'ふるい'], answer: 0, ex: 'トリクロロシランは約32℃で沸きます。沸く温度の違いを利用して分けるのが蒸留です。' },
      { type: 'order', q: '石から純粋なシリコンができるまでの順に並べてください。', items: ['石を炭と一緒に熱して、純度98%ほどのシリコンを取り出す', 'シリコンを、沸きやすい液体（トリクロロシラン）に変える', '蒸留して混じり物を分ける', '高温の棒の上で、純粋なシリコンの固体に戻す'], ex: '固体のままでは洗えないので、いったん液体にして蒸留し、また固体に戻します。' }
    ],
    summary: '主人公の体は、9が11個の純度のシリコン。半導体の性質は混ぜ物で決まるから、勝手な混じり物はそれよりずっと少なくしておく。',
    next: 'では、粒々のシリコンを、どうやって原子の並びがそろった一つの結晶にするのか。',
    deeper: [['A', 'しくみ：混ぜ物で変わる', 'a3']],
    sources: [
      '半導体用多結晶シリコンの純度 11N（原子1000億個あたり不純物1個以下）：電波新聞デジタル「トクヤマ 半導体材料の分析力高め『11N』の先へ」2026年8月24日。',
      '地球の人口 約80億人 × 12 = 960億 ≒ 1000億。',
      '土台の混ぜ物：抵抗率10Ω·cm前後のp型ウェーハのホウ素はおよそ1.3×10¹⁵個/cm³。シリコンの原子は約5×10²²個/cm³なので、約4000万個に1個（「数千万個に1個」）。部屋（ソース・ドレイン）は10²⁰個/cm³程度で、約500個に1個。',
      'シミュレータの「狂い」：混じり物がすべて混ぜ物として働くとした最悪の見積もり。9が11個のとき 10⁻¹¹ × 4000万 ＝ 0.04%、9が7つのとき 4倍。',
      '主人公の体の原子の数：約70nm四方（サマリS3の計算）× 深さ約50nm ≒ 25万nm³。1nm³あたりシリコン原子は約50個なので約1200万個（およそ1000万個）。1000万 × 10⁻¹¹ ＝ 10⁻⁴ → 主人公1万個に1個。',
      '金属級シリコン（純度約98%）からトリクロロシラン（沸点31.8℃）をつくり、蒸留したのち析出させる工程、ホウ素の化合物が分けにくいこと：米国特許 US10294109「Primary distillation boron reduction」、US8518352 ほか。シリコンの沸点は約3265℃。'
    ]
  },
  {
    id: 'c2', no: 2, title: '土台をつくる',
    headline: '主人公は、どんな土地に生まれるのか。',
    predict: {
      q: 'シリコンの結晶を薄く切った円盤を「ウェーハ」と呼びます。チップは四角いのに、ウェーハはなぜ丸いのでしょう？',
      options: ['丸いほうが、工場の中で運びやすいから', '結晶を回しながら引き上げて育てるので、円柱になるから', '四角いと、角から割れやすいから'],
      answer: 1,
      right: '正解。丸いのは、結晶の生まれ方そのものの形です。',
      wrong: '答えは「結晶を回しながら引き上げて育てるから」。丸いのは、生まれ方そのものの形です。'
    },
    explore: [
      { t: 'p', h: 'C1で純粋になったシリコンは、小さな結晶の寄せ集め（多結晶）です。これを、原子の並びがすみずみまでそろった<b>一つの結晶</b>に育て直します。' },
      { t: 'p', h: 'シリコンを約1414℃でとかし、そこへ小さな「種」の結晶を浸します。種を回しながら、ゆっくり引き上げる。とけたシリコンは、種の原子の並びをまねながら固まり、大きな円柱の結晶（インゴット）になります。急いで引くと、原子が並ぶ前に固まって、並びが乱れてしまいます。' },
      { t: 'sim', id: 'wafer', cap: '引きの図。ボタンで縮尺を変えてみよう。右上のバッジが、いま見ている大きさ。ピンが主人公の生まれる場所。' },
      { t: 'p', h: 'インゴットを薄く切り、表面を鏡のように磨くとウェーハになります。直径30cm、厚さ0.775mm。主人公が生まれるのは、この表面です。' },
      { t: 'h', h: 'なぜ、鏡のように磨くのか' },
      { t: 'p', h: '理由は、次の章で回路を<b>光で刷る</b>からです。光で刷るときは、ピントを合わせなければなりません。ところが、ピントが合う幅はごくわずか。表面にでこぼこがあると、場所によってピントが外れ、模様がにじみます。' },
      { t: 'sim', id: 'focus', cap: 'でこぼこを大きくして、刷り上がりの線がどうなるか見てみよう。' }
    ],
    discover: [
      { t: 'p', h: '答えは「結晶を回しながら引き上げるから」。ウェーハが丸いのは、生まれ方そのものの形です。この丸さは、C6で「縁のむだ」として効いてきます。' },
      { t: 'p', h: 'そして表面の平らさ。光で1回に刷る範囲（約2.6cm×3.3cm）の中で、でこぼこは数十nm（ナノメートル）以下に抑えられています。' },
      { t: 'num', big: '0.1', unit: 'mmほど', b: '1回に刷る範囲を、サッカー場の長さまで拡大したときのでこぼこ', l: '約2.6cmを約100mまで（約3800倍に）拡大しても、でこぼこは紙1〜2枚の厚さほど。' },
      { t: 'p', h: 'ただし、主人公の体があるのは、表面からわずか数µm（マイクロメートル）以内。厚さ0.775mmの1%にも満たない<b>薄皮</b>です。残りの厚みは、その薄皮を割れないように支える土台です。' }
    ],
    quiz: [
      { type: 'tf', q: 'ウェーハが丸いのは、運びやすくするために丸く削っているからだ。', answer: 1, ex: '結晶を回しながら引き上げて育てるので、もともと円柱の形になります。それを薄く切るので丸いのです。' },
      { type: 'choice', q: 'ウェーハの表面を鏡のように平らに磨く、いちばんの理由は？', options: ['見た目を美しくするため', '光で模様を刷るとき、ピントを合わせるため', '電気を通しやすくするため', '重さを軽くするため'], answer: 1, ex: 'ピントが合う幅はわずかなので、でこぼこがあると模様がにじみます。' },
      { type: 'fill', before: '結晶を急いで引き上げると、原子が', after: '前に固まって、並びが乱れる。', options: ['並ぶ', 'とける', '光る', '増える'], answer: 0, ex: '結晶は、種の原子の並びをまねながら育ちます。急ぐと、並ぶ前に固まってしまいます。' },
      { type: 'choice', q: '厚さ0.775mmのウェーハのうち、主人公の体があるのは？', options: ['表面から数µm以内の薄皮', '厚みのちょうど真ん中', '裏側の表面', '厚み全体'], answer: 0, ex: '主人公が使うのは表面のごく薄い部分だけ。残りは、それを支える土台です。' }
    ],
    summary: '主人公の土地は、原子の並びがそろった一つの結晶を薄く切って磨いた、丸いウェーハの表面。平らなのは、光で刷るから。',
    next: '髪の毛よりはるかに細い主人公を、どうやって描くのか。',
    deeper: [['A', 'しくみ：シリコンの結晶', 'a2']],
    sources: [
      '300mmウェーハの直径 300mm・厚さ 775µm：SEMI M1 規格（米国特許 US8890331 などでの引用による）。',
      'シリコンの融点 約1414℃。',
      '急いで引き上げると結晶が乱れること：『人工晶体学報』51巻7号（2022年、300mm CZシリコン単結晶の成長）ほか。具体的な引き上げ速度は、この教材では扱わない。',
      '1回に刷る範囲 26mm×33mm：ASML TWINSCAN NXE:3600D 製品情報。',
      '平坦度：NIST の論文が引用する ITRS 2006 の見通し（300mmウェーハの露光範囲ごとの平坦度：2010年に45nm未満、2015年に25nm程度）。26mm → 100m は約3800倍。25〜45nm × 3800 ≒ 0.1〜0.17mm。紙1枚は約0.1mmとした。',
      '主人公の体の深さ「数µm以内」は、一般的なCMOSの構造（素子を分ける溝や不純物の層の深さ）からの概算。',
      'シミュレータのピントの幅とでこぼこは、比をわかりやすくした説明用の値。'
    ]
  },
  {
    id: 'c3', no: 3, title: '版で刷る',
    headline: '髪の毛よりずっと細い主人公を、どうやって描くのか。',
    predict: {
      q: 'チップ1枚には、主人公の兄弟が約190億個。もし1個を1秒で作れたとしても、チップ1枚ぶん作り終えるのに、どれくらいかかるでしょう？',
      options: ['約6年', '約600年', '約6000年'],
      answer: 2,
      right: '正解。休まず作っても約6000年。1個ずつでは、とても間に合いません。',
      wrong: '答えは約6000年。1個ずつでは、とても間に合いません。'
    },
    explore: [
      { t: 'recall', from: 'S3', ttl: 'スイッチが数百億個', fig: 'dome', to: 's3', h: 'チップを東京ドームの大きさに拡大すると、主人公はゴマ粒ほど。そのゴマ粒が、ドームいっぱいに190億個。この数を、どうやって作るのか。' },
      { t: 'p', h: '答えは、<b>1個ずつは作らない</b>ことです。回路の模様を描いた「版」を用意し、光で一度に刷る。主人公は、兄弟たちと一緒に、同じ瞬間に生まれます。' },
      { t: 'analogy', ttl: '縮小コピー機で版画を刷る', rows: [['版（原版）', 'マスク（回路の原版）'], ['縮小コピー機', 'レンズ（4分の1に縮める）'], ['紙', 'レジストを塗ったウェーハ'], ['同じ絵を何枚も刷る', '1枚のウェーハに、同じチップを何百個も刷る'], ['多色刷りで色を重ねる', '層を何十も重ねる（C5へ）']],
        breaks: '版画はインクを紙に「のせ」ます。露光は、光でレジストの性質を「変える」だけ。この時点では、まだ何も形になっていません。現像し、削って（C4）、はじめて形になります。' },
      { t: 'p', h: '版は完成品の4倍の大きさで描きます。大きく描いて小さく刷るほうが、小さく描くよりずっと正確にできるからです（サマリS4）。' },
      { t: 'h', h: '光で刷っても、まだ形はない' },
      { t: 'p', h: 'ウェーハの表面に、光が当たると性質が変わる薬（<b>レジスト</b>）を薄く塗ります。版を通して光を当てると、光が当たったところだけ溶けやすく変わる。現像液で洗うと、そこだけが流れ落ちて、型紙ができます。' },
      { t: 'sim', id: 'expose', cap: '主人公のまわりを切り出した断面ブロック。この章からC5まで、同じ角度・同じ大きさで見ていく。光の量を選んで「光を当てる」→「現像する」。' },
      { t: 'p', h: 'ここで刷ったのは、主人公の「区画」の型紙です。光の量がちょうどよいと、版の形がそのまま写ります。少なすぎると底にレジストが残り、多すぎると光が版の影に回り込んで、区画がやせてしまいます。' },
      { t: 'p', h: 'レジストが反応するのは、主に青から紫外線の光です。だから露光をする部屋は、青い光を含まない<b>黄色い照明</b>になっています。工場の写真が黄色っぽいのは、このためです。' },
      { t: 'h', h: '1回で刷るのは、チップ数個ぶん' },
      { t: 'p', h: '露光装置が1回に刷れるのは、約2.6cm×3.3cm。チップ数個ぶんです。装置はウェーハを少しずつずらしながら、同じ版で何十回も刷っていきます。' },
      { t: 'sim', id: 'shots', cap: '「1回刷る」で、ウェーハに版を写す。ピンが主人公のチップ。「版にゴミをつける」と、どうなるか。' }
    ],
    discover: [
      { t: 'p', h: '1個1秒なら約6000年。では、実際の装置は？ 最新の露光装置は、ウェーハ1枚を刷るのに<b>約20秒</b>しかかかりません。' },
      { t: 'num', big: '約20', unit: '秒', b: 'ウェーハ1枚（チップ約600個、トランジスタ10兆個以上）を、1層ぶん刷る時間', l: '1時間にウェーハ約160枚を刷れる装置の場合。主人公も、兄弟たちと一緒に、一瞬で写し取られます。' },
      { t: 'p', h: 'ただし、版を使うことには怖さもあります。版にゴミが1粒ついていたら、そのゴミも縮小されて、<b>すべてのチップの同じ場所</b>に刷られてしまう。だから版も、ウェーハも、空気も、徹底的にきれいにしておく必要があります（C6）。' },
      { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '細く描くには、細い光', ps: [
        '刷れる線の細さは、光の波長でおおよそ決まります。最新の装置が使うのは、波長13.5nmの「極端紫外線（EUV）」。この光は空気にも吸われてしまうため、装置の中を真空にし、レンズの代わりに鏡で光を集めます。光をつくるのも一苦労で、スズの小さな粒をプラズマにして光らせています。',
        'また、版にインクを付けて押し付ける、本物の版画（はんこ）に近い方法「ナノインプリント」も開発されています。'
      ] }
    ],
    quiz: [
      { type: 'tf', q: 'チップの中のトランジスタは、1個ずつ機械で組み立てて作る。', answer: 1, ex: '1個ずつでは何千年もかかります。版と光で、何兆個もの兄弟をいっぺんに刷ります。' },
      { type: 'choice', q: '版画のたとえで「紙」にあたるのは？', options: ['レジストを塗ったウェーハ', 'マスク（版）', 'レンズ', '光'], answer: 0, ex: '版＝マスク、縮小コピー機＝レンズ、紙＝レジストを塗ったウェーハです。' },
      { type: 'choice', q: '光の量が多すぎると、どうなる？', options: ['光が版の影に回り込み、型紙がやせる', '何も変わらない', 'レジストが固まって溶けなくなる', 'ウェーハが割れる'], answer: 0, ex: '光が影の下まで回り込むと、そのぶん型紙が細ります。少なすぎると、今度は底にレジストが残ります。' },
      { type: 'tf', q: '版にゴミがついていると、そのゴミはすべてのチップの同じ場所に刷られてしまう。', answer: 0, ex: '同じ版で何十回も刷るので、版のゴミは、刷ったすべてのチップに写ります。' }
    ],
    summary: '主人公は1個ずつではなく、版と光で、何兆個もの兄弟と一緒に刷られる。ただし光で刷っただけでは、まだ型紙にすぎない。',
    next: '光で刷っただけの型紙を、どうやって本物の体にするのか。',
    deeper: [['E', '社会と産業']],
    sources: [
      '190億 × 1秒 ÷（365.25日 × 86400秒）≒ 6020年。',
      'ASML TWINSCAN NXE:3600D：1回の露光範囲 26mm×33mm、波長13.5nm（スズのプラズマ光源）。縮小率4倍は NXE:3400B・3400C の製品情報（ZEISS の4倍縮小光学系）。',
      '処理能力：毎時160枚（30mJ/cm²のとき。ASML、SPIE Advanced Lithography 2023 の発表資料）。3600秒 ÷ 160 ≒ 22.5秒。実際の工場では、層によって別の種類の装置も使う。',
      'チップの数：A17 Pro の面積を約104mm²として、直径300mmのウェーハから取れる数を一般的な概算式（ウェーハ面積 ÷ チップ面積 − 縁のむだ）で計算すると約610個。610 × 190億 ≒ 11.6兆。',
      '黄色い照明：レジストは青〜紫外線に反応するため、露光の部屋では青い光を含まない照明を使う（照明メーカー Regiolux の解説ほか）。',
      '版のゴミも縮小されてチップに刷られること：Samsung Newsroom「Eight Major Steps to Semiconductor Fabrication, Part 4」2015年。',
      'ナノインプリント：キヤノン ニュースリリース（2023年10月13日）。',
      'シミュレータのチップ（10mm角）と1回に刷る範囲（チップ6個ぶん）は、説明のために単純化した。'
    ]
  },
  {
    id: 'c4', no: 4, title: '体をつくる',
    headline: '光で刷った型紙を、どうやって「体」にするのか。',
    predict: {
      q: '主人公には、門（ゲート）の両側に、電子をたくわえた「部屋」が必要です。部屋は、不純物の原子を打ち込んで作ります。打ち込むのは、門を作る前と後、どちらがよいでしょう？',
      options: ['門を作る前', '門を作った後', 'どちらでも同じ'],
      answer: 1,
      right: '正解。門を作った後に打ち込むと、門そのものが型紙になります。',
      wrong: '答えは「門を作った後」。門そのものが型紙になるからです。'
    },
    explore: [
      { t: 'p', h: 'C3で刷ったのは、主人公の区画の型紙でした。型紙のないところを削ると、溝ができます。' },
      { t: 'h', h: '真下にだけ削る' },
      { t: 'p', h: '削り方は2通りあります。薬の液にひたす方法と、ガスに電気をかけてつくった<b>プラズマ</b>を当てる方法。液は、あらゆる方向に同じ速さで溶かします。プラズマは、電気の力でイオン（電気を帯びた粒）を真下へ打ち付けるので、真下にだけ削れます。' },
      { t: 'sim', id: 'etch', cap: '削り方と深さを変えてみよう。液で深く削ると、型紙の下までえぐれて、主人公の区画がやせる。' },
      { t: 'p', h: 'プラズマで掘った溝をガラス（酸化シリコン）で埋め、表面を平らに磨くと、主人公の<b>区画</b>ができあがります。隣の兄弟とは、このガラスの壁で仕切られます。' },
      { t: 'h', h: 'いよいよ、主人公の体をつくる' },
      { t: 'p', h: 'サマリS2で見たとおり、トランジスタは「門に電圧をかけると、通り道が開いて電気が流れる」スイッチです。体の部品は3つ。電気の入口と出口になる2つの<b>部屋</b>、その間の<b>通り道</b>、そして道の上の<b>門</b>。門と道の間には、電気を通さない薄いガラスの膜をはさみます。' },
      { t: 'p', h: '下の工程ボタンを順に押して、主人公を完成させてください。できたら「門に電圧をかける」で動かしてみましょう。わざと順番を変えると、どうなるかも試せます。' },
      { t: 'sim', id: 'build', cap: '工程ボタンで、主人公の体ができていく。変わった層は一瞬光る。青い粒は部屋の電子。' }
    ],
    discover: [
      { t: 'p', h: '答えは「門を作った後」。門をつくってから不純物を打ち込むと、門が傘になって、その下には入りません。部屋は門の両側にだけでき、<b>部屋の端が、門の端にぴったりそろう</b>。位置を合わせる作業をしなくても、ずれようがないのです。' },
      { t: 'p', h: '先に打ち込むと、門の下の通り道まで部屋になってしまいます。そうなると、門を閉じても電気が流れっぱなし。スイッチになりません。' },
      { t: 'num', big: '0', unit: 'nm', b: '門と部屋の位置合わせに必要な精度（原理上）', l: '門そのものを型紙にするので、門と部屋を別々に合わせる必要がありません。実際には、打ち込んだ原子が熱で少し横に広がる分だけ、門の下に入り込みます。' },
      { t: 'column', tag: '人物コラム', ttl: '門を傘にする発明', ps: [
        '門を先に作り、それを型紙にして部屋をつくる方法は「セルフアライン（自己整合）」と呼ばれます。1967年、米国ベル研究所のカーウィンらは、門の材料をアルミニウムからシリコンに替えました。シリコンなら、部屋をつくるときの高温にも耐えられるからです。',
        '1968年、フェアチャイルド社のフェデリコ・ファジンとトム・クラインが、これを製品のチップに使える技術に仕上げます。ファジンはその後インテルに移り、世界初のマイクロプロセッサの開発を率いました。'
      ] },
      { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '主人公は、本当はもっと立体的', ps: [
        'ここで追っているのは、平らな形のトランジスタです。最新のチップでは、通り道を薄い板のように立て、門が三方から（さらに新しいものでは四方から）包み込む形になっています。門が通り道を囲むほど、電気をしっかり止められるからです。',
        '作り方の考え方（膜を積む・刷る・削る・打ち込む）は同じですが、工程はずっと多く、複雑になります。'
      ] }
    ],
    quiz: [
      { type: 'tf', q: '光で刷ったレジストの模様は、そのままトランジスタの部品になる。', answer: 1, ex: 'レジストは型紙にすぎません。型紙を使って下の膜を削ったり、不純物を打ち込んだりしたあと、はがして捨てます。' },
      { type: 'choice', q: 'プラズマで「真下にだけ」削るのはなぜ？', options: ['横にも削れると、型紙の下までえぐれて区画がやせるから', '液より音が静かだから', 'ウェーハが丸くなるから', '削ったあとに磨かなくてよいから'], answer: 0, ex: '横に削れたぶんだけ、型紙より細くなってしまいます。細かい模様ほど、真下にだけ削ることが大切です。' },
      { type: 'order', q: '主人公の門をつくる順に並べてください。', items: ['門の材料の膜を積む', 'レジストを塗る', '版で光を当てて現像する', '型紙のないところを削る', 'レジストをはがす'], ex: '積む → 塗る → 刷る（現像） → 削る → はがす。この流れは、C5の配線づくりでもくり返します。' },
      { type: 'choice', q: '部屋の不純物を「門を作った後」に打ち込むと、何がうれしい？', options: ['門が型紙になり、部屋が門の両側にぴったりそろう', '不純物が少なくて済む', '門が光るようになる', '削る工程が要らなくなる'], answer: 0, ex: '門が傘になって、その下に原子が入りません。位置合わせなしで、部屋の端と門の端がそろいます。' }
    ],
    summary: '型紙のないところを真下に削り、門をつくってから不純物を打ち込む。こうして主人公は「スイッチの体」を手に入れる。',
    next: 'けれど、スイッチは1個だけでは何もできない。主人公は、どうやって190億個の仲間とつながるのか。',
    deeper: [['A', 'しくみ：トランジスタ', 'a5']],
    sources: [
      'プラズマ（反応性イオン）による異方性エッチングと、液による等方性エッチングの違い、素子分離（溝を絶縁物で埋める）、ゲート形成、イオン注入の順序：東京エレクトロン「半導体ができるまで（半導体製造プロセス）」ほか一般的な説明。',
      'セルフアライン・シリコンゲート：Computer History Museum「1968: Silicon Gate Technology Developed for ICs」（The Silicon Engine）。',
      '立体的なトランジスタ（FinFET、GAA）：Applied Materials ブログ「Materials Engineering Is Key to Enabling Continued Logic Scaling」。',
      'シミュレータは、平らな形のトランジスタを単純化したもの。膜の厚さや部屋の深さは見やすさを優先した。'
    ]
  },
  {
    id: 'c5', no: 5, title: '配線と積み上げ',
    headline: '主人公の上には、何階建ての建物が乗るのか。',
    predict: {
      q: '主人公どうしをつなぐ金属の配線は、主人公の上に何階も重ねて作ります。最新のチップでは、何階くらいだと思いますか？',
      options: ['2〜3階', '約8階', '約20階'],
      answer: 2,
      right: '正解。主人公の上には、約20階建ての配線が乗ります。',
      wrong: '答えは約20階。主人公の上には、20階建てほどの配線が乗ります。'
    },
    explore: [
      { t: 'p', h: '1個のスイッチだけでは、計算はできません。サマリS2で見たとおり、あるスイッチから出た電気が、次のスイッチの門を押す。この連鎖をつくるには、主人公の部屋と門を、仲間たちと<b>配線</b>でつながなければなりません。' },
      { t: 'p', h: 'ところが、平面の上だけでは配線が交差してしまいます。そこで、主人公の上にガラスの床を1枚ずつ重ね、その中に銅の配線を通していきます。1階ぶんの作り方は、C3・C4と同じ<b>「積む → 刷る → 削る → 埋める」</b>のくり返しです。' },
      { t: 'sim', id: 'loop', cap: '「1周まわす」と、ループを1周して配線が1階ぶん積み上がる。主人公は、いちばん下の小さな部屋。' },
      { t: 'p', h: '下の階ほど配線は細く、すぐ隣どうしをつなぎます。上の階ほど太く、チップの遠くまで電気を運び、電源も配ります。' },
      { t: 'analogy', ttl: '街の道路網', rows: [['路地', '下の階の細い配線（すぐ隣のトランジスタをつなぐ）'], ['幹線道路', '中ほどの階の配線（回路のまとまりどうしをつなぐ）'], ['高速道路', '上の階の太い配線（チップの端から端へ。電源も運ぶ）'], ['立体交差', '階を変えて、配線どうしを交差させる']],
        breaks: '道路は車が増えるほど混みますが、配線で問題になるのは「細さ」です。細い配線ほど電気が通りにくく、熱も出る。だから遠くまで運ぶ配線ほど、太く厚くします。また、階と階をつなぐのは坂道ではなく、真下に掘った縦の穴です。' },
      { t: 'h', h: '多色刷りの「見当合わせ」' },
      { t: 'p', h: 'C3の版画、覚えていますか。多色刷りでは、色がずれないよう、紙の角に「見当」という目印を付けて版を合わせます。チップも同じです。上の階の縦穴は、下の階の配線の真上に、ぴったり重ねなければなりません。' },
      { t: 'sim', id: 'overlay', cap: 'つまみで、上の階の版をずらしてみよう。どこまでずれると、つながらなくなるか。' }
    ],
    discover: [
      { t: 'p', h: '答えは約20階。たとえば、TSMCの3nm世代でつくられたインテルのチップ（Lunar Lake）は、配線が20層あります。主人公は、<b>20階建てのビルの床下</b>にいるのです。' },
      { t: 'num', big: '20', unit: '階', b: '主人公の上に積み上がる配線の階（最新のチップの例）', l: '階ごとにループを1周するので、工程は全部で最大1400ほどになります。' },
      { t: 'recall', from: 'S4', ttl: '東京〜大阪の1円玉', fig: 'osaka', to: 's4', h: 'ウェーハを東京〜大阪の長さに拡大しても、層のずれは1円玉の厚みほど。その精度で、20階ぶんの見当を合わせ続けます。' },
      { t: 'p', h: 'ループを何十周もするので、時間もかかります。ウェーハが工場に入ってから完成するまで、平均でおよそ<b>12週間</b>。最先端のチップでは14〜20週間。主人公が生まれるまでには、季節がひとつ変わります。' }
    ],
    quiz: [
      { type: 'tf', q: '配線は、すべてトランジスタと同じ平面の上に並べる。', answer: 1, ex: '平面だけでは交差してしまうので、主人公の上に何階も重ね、階を変えて立体交差させます。' },
      { type: 'choice', q: '上の階ほど配線が太いのはなぜ？', options: ['遠くまで電気を運び、電源も配るから', '上の階ほど作るのが簡単だから', '見た目をそろえるため', '下の階を冷やすため'], answer: 0, ex: '細い配線ほど電気が通りにくいので、遠くまで運ぶ配線ほど太く厚くします。' },
      { type: 'fill', before: '1階ぶんの配線は「積む → 刷る → 削る → 埋める」の', after: 'でつくる。', options: ['くり返し', '一発勝負', '手作業', '3Dプリンタ'], answer: 0, ex: '同じループを階の数だけ回します。だから何か月もかかります。' },
      { type: 'choice', q: '上の階の縦穴が、下の配線からずれすぎると？', options: ['つながらない、または隣の配線とショートする', '電気がかえって速く流れる', '何も変わらない', '配線が太くなる'], answer: 0, ex: 'ずれれば接する面が減り、さらにずれると外れたり、隣の配線に触れたりします。だから見当合わせはナノメートルの精度です。' }
    ],
    summary: '主人公の上に、積む・刷る・削る・埋めるのループで、約20階の配線を重ねる。各階は、ナノメートルの精度で見当を合わせる。',
    next: 'こうして何か月もかけて完成した主人公。けれど、本当にちゃんと動くのか。',
    deeper: [['B', '計算のしくみ']],
    sources: [
      'Intel Lunar Lake（TSMC N3）の配線 20層：TechInsights「Intel Lunar Lake 16th Gen TSMC N3 Digital Floorplan Analysis」。配線の層数はチップや製法によって異なる。',
      '工程数 最大約1400、ウェーハ完成までのサイクルタイム 平均約12週間（先端は14〜20週間）、組立・検査にさらに約6週間：SIA「Chipmakers Are Ramping Up Production to Address Semiconductor Shortage. Here’s Why that Takes Time」2021年。',
      '重ね合わせ精度 約1.1nm：ASML NXE:3600D（装置どうしの重ね合わせの仕様。SPIE Advanced Lithography 2023 の ASML 発表資料）。',
      'シミュレータの配線の幅・間隔・厚さ、1周8工程は説明用の値。上の階は図に収めるため実物より細く薄く描いた。'
    ]
  },
  {
    id: 'c6', no: 6, title: '検査と旅立ち',
    headline: '主人公は、合格できるのか。',
    predict: {
      q: '完成間近のウェーハの上に、目に見えないほど小さなゴミが1粒落ちました。ダメになるのはどこでしょう？',
      options: ['ウェーハ1枚まるごと', 'ゴミが落ちたチップ1個', '同じ列のチップすべて'],
      answer: 1,
      right: '正解。ダメになるのは、ゴミが落ちたチップです。',
      wrong: '答えは「ゴミが落ちたチップ1個」。ほかのチップは無事です。'
    },
    explore: [
      { t: 'p', h: 'ナノメートルの配線の上に、ゴミが1粒落ちたら。配線が途切れたり、隣どうしがつながったりして、そのチップは動きません。主人公の兄弟190億個ごと、不合格です。' },
      { t: 'sim', id: 'dust', cap: 'ゴミをまいて、合格するチップの数を数えてみよう。チップの大きさ、ウェーハの大きさを変えると？' },
      { t: 'p', h: '同じ数のゴミでも、チップが大きいほど当たりやすく、不合格が増えます。そして、ウェーハが丸く、チップが四角い以上、縁は必ずむだになる。ウェーハを大きくすると、縁で捨てる割合が減ります。C2で見た「丸いウェーハ」が、ここで効いてきます。' },
      { t: 'h', h: 'きれいな部屋の、いちばんのゴミ' },
      { t: 'p', h: 'だから工場は<b>クリーンルーム</b>の中にあります。最もきれいな等級（ISOクラス1）では、1m³の空気の中に、0.1µm以上の粒が10個以下。それでも、中で働く人の体からは、皮膚のかけらや髪、息の細かな粒が出続けます。' },
      { t: 'p', h: '工場の人が全身を覆う服を着るのは、人を守るためではありません。<b>ウェーハを、人から守るため</b>です。' },
      { t: 'h', h: 'まちがい探しで、ゴミを見つける' },
      { t: 'p', h: 'ウェーハは、途中で何度もカメラで調べます。ウェーハには同じチップが並んでいるので、隣どうしの画像を<b>引き算</b>すれば、違うところだけが浮かび上がります。' },
      { t: 'sim', id: 'diff', cap: '隣どうしのチップの画像を引き算する。版についていたゴミだと、どうなるか。' },
      { t: 'analogy', ttl: 'まちがい探し', rows: [['2枚の絵', '隣どうしのチップの画像'], ['見比べる', '画像を引き算する'], ['違うところ', 'ゴミや欠陥']],
        breaks: '2枚とも同じ場所が間違っていたら、見比べても気づけません。版（マスク）が原因の欠陥は、すべてのチップの同じ場所に出る。C3で見たとおりです。だから版そのものも、別の方法で調べます。' },
      { t: 'p', h: '最後に、チップ一つひとつに細い針を当てて電気を流し、ちゃんと動くかを確かめます。合格したチップだけが、ウェーハから切り分けられ、パッケージに収められて旅立ちます。' }
    ],
    discover: [
      { t: 'p', h: '答えは「ゴミが落ちたチップ1個」。1枚のウェーハのうち、合格したチップの割合を<b>歩留まり</b>といいます。同じ設備、同じ材料で作っても、歩留まりが上がれば、売れるチップがそのまま増える。工場のもうけは、この数字で大きく変わります。' },
      { t: 'p', h: 'さあ、合格した主人公を見送りましょう。サマリでは、スマホからシリコン原子まで「ズームイン」しました。最後は逆向きに、主人公からスマホまで、ズームアウトします。' },
      { t: 'sim', id: 'zoomout', cap: '「引く」を押して、主人公の旅の終点まで。' },
      { t: 'num', big: '190億', unit: '分の1', b: 'あなたのスマホのチップの中で、主人公が占める数', l: '石から始まり、9が11個の純度、丸いウェーハ、版と光、20階の配線、まちがい探し。約3か月の旅を終えた主人公は、190億の兄弟と一緒に、今日もあなたのポケットで働いています。' },
      { t: 'recap', ids: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] }
    ],
    quiz: [
      { type: 'choice', q: '同じ数のゴミが落ちたとき、歩留まりが下がりやすいのは？', options: ['チップが大きいとき', 'チップが小さいとき', 'ウェーハが厚いとき', 'ウェーハが薄いとき'], answer: 0, ex: '大きなチップほど、ゴミに当たる確率が高くなります。' },
      { type: 'tf', q: 'クリーンルームで働く人の服は、主に作業する人をゴミから守るためのものだ。', answer: 1, ex: 'いちばんの目的は、人の体から出るゴミから、ウェーハを守ることです。' },
      { type: 'choice', q: 'まちがい探し（隣のチップとの引き算）で見つけにくい欠陥は？', options: ['版のゴミのように、すべてのチップの同じ場所に出る欠陥', '1つのチップにだけ落ちたゴミ', 'チップの端に落ちたゴミ', '大きなゴミ'], answer: 0, ex: '2枚とも同じ場所が間違っていると、引き算しても差がゼロになります。' },
      { type: 'order', q: 'モジュールCの旅の順に並べてください。', items: ['シリコンを9が11個まで純粋にする', '結晶を育ててウェーハに切る', '版と光で型紙を刷る', '削って、打ち込んで、主人公の体をつくる', '配線を20階ぶん積み上げる', '検査して、切り分けて、パッケージに収める'], ex: '純度 → ウェーハ → 刷る → 体 → 配線 → 検査と旅立ち。' },
      { type: 'explain', q: '主人公（1個のトランジスタ）の立場で、自分が生まれるまでを30秒で説明してみよう。', model: 'わたしの体は、9が11個の純度まで蒸留したシリコンです。回しながら引き上げて育てた結晶を薄く切った、丸いウェーハの表面で生まれました。版と光で、兄弟何兆個と一緒に型紙を刷られ、真下に削られ、門をつくってから部屋を打ち込まれてスイッチになりました。その上に約20階の配線を重ね、まちがい探しと電気の試験に合格して、パッケージに収まり、いまはスマホの中で働いています。' }
    ],
    summary: '主人公は検査を経てパッケージに収まり、スマホの中へ。合格するチップの割合（歩留まり）が、工場のもうけを決める。',
    next: 'これほどの工場を持てる国や会社は、なぜ限られているのか。',
    deeper: [['E', '社会と産業'], ['D', 'どこで使われてる？']],
    sources: [
      'クリーンルームの等級：ISO 14644-1:2015 表1（クラス1：0.1µm以上の粒子が1m³あたり10個以下）。',
      '隣のチップの画像との比較による欠陥検査と、その限界（すべてのチップに共通する欠陥は見つからない）：日立ハイテク「半導体の部屋」。',
      'シミュレータの歩留まりは、ゴミが当たったチップを不合格とする単純なモデル。縁から3mmは使わないとした。実際には、ゴミの大きさや落ちた場所によっては動くこともある。',
      '主人公の旅の期間「約3か月」：SIA（2021年）のサイクルタイム平均約12週間による。',
      'A17 Pro のトランジスタ数 190億個（Apple、2023年）。'
    ]
  }
  ];

  registerModule({
    code: 'C',
    name: 'つくりかた',
    ds: '1個のトランジスタが生まれるまで。純度、ウェーハ、版と光、削る・打ち込む、20階の配線、検査',
    css: `
:root { --c-cu: #A68A45; --c-cu-d: #7A632C; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --c-cu: #C2A65C; --c-cu-d: #E3CB86; } }
:root[data-theme="dark"] { --c-cu: #C2A65C; --c-cu-d: #E3CB86; }
.c-sim .c-svg { display: block; width: 100%; height: auto; min-width: 0; }
.c-sim .c-sq { max-width: 440px; margin: 0 auto; }
.c-sim .c-mid { max-width: 520px; margin: 0 auto; }
.c-sim .c-tall { max-height: 70vh; }
.c-stage { display: flex; flex-direction: column; }
.c-badge { align-self: flex-end; display: flex; align-items: baseline; gap: 8px; font: 500 12.5px var(--f-mono); color: var(--ink); background: var(--paper); border: 1px solid var(--rule); border-radius: 999px; padding: 2px 12px; margin-bottom: 6px; line-height: 1.6; }
.c-badge > span { font: 400 11px var(--f-body); color: var(--ink-3); }
.c-badge b { font-weight: 500; }
.c-lbl { font-size: 13px; color: var(--ink-3); align-self: center; }
.c-sim .btn[aria-pressed="true"] { background: var(--mark-soft); border-color: var(--mark); color: var(--ink); }
.c-sim .btn[disabled] { opacity: .4; cursor: default; }
.c-ops { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
.c-ops .btn { border-radius: 10px; padding: 8px 6px; font-size: 13.5px; line-height: 1.4; }
.c-log { font: 12px/1.7 var(--f-mono); color: var(--ink-3); margin: 10px 0 0; }
.c-legend { display: flex; flex-wrap: wrap; gap: 2px 14px; margin-top: 10px; font-size: 12.5px; color: var(--ink-2); }
.c-sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; border: 1px solid var(--ink-3); }
.c-sw-si { background: var(--silicon-soft); border-color: var(--silicon); }
.c-sw-n { background: var(--electron-soft); border-color: var(--electron); }
.c-sw-ox, .c-sw-glass { background: color-mix(in srgb, var(--ink-3) 34%, var(--card)); }
.c-sw-poly { background: color-mix(in srgb, var(--ink) 70%, var(--card)); }
.c-sw-res { background: color-mix(in srgb, var(--uv) 42%, var(--card)); border-color: var(--uv); }
.c-sw-resx { background: color-mix(in srgb, var(--uv) 12%, var(--card)); border: 1px dashed var(--uv); }
.c-sw-mask { background: color-mix(in srgb, var(--ink-2) 55%, var(--paper)); }
.c-sw-cu { background: var(--c-cu); border-color: var(--c-cu-d); }
.c-sw-w { background: color-mix(in srgb, var(--ink-2) 55%, var(--card)); }
.c-loopbox { display: flex; align-items: center; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
.c-sim svg.c-ring { width: 120px; height: 120px; min-width: 0; flex: none; }
.c-ringc { fill: none; stroke: var(--rule); stroke-width: 3; }
.c-st { fill: var(--card); stroke: var(--ink-3); stroke-width: 1.5; }
.c-st.done { fill: var(--mark-soft); stroke: var(--mark); } .c-st.on { fill: var(--mark); stroke: var(--mark); }
.c-ringt { fill: var(--ink); font: 700 13px var(--f-body); }
@media (max-width: 480px) { .c-ops { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.c-sim polygon { stroke-width: .9; stroke-linejoin: round; stroke-opacity: .75; }
.c-m-si > polygon { fill: var(--silicon-soft); stroke: var(--silicon); }
.c-m-n > polygon { fill: var(--electron-soft); stroke: var(--electron); }
.c-m-ox > polygon { fill: color-mix(in srgb, var(--ink-3) 34%, var(--card)); stroke: var(--ink-3); }
.c-m-poly > polygon { fill: color-mix(in srgb, var(--ink) 70%, var(--card)); stroke: var(--ink); }
.c-m-res > polygon { fill: color-mix(in srgb, var(--uv) 42%, var(--card)); stroke: var(--uv); }
.c-m-resx > polygon { fill: color-mix(in srgb, var(--uv) 12%, var(--card)); stroke: var(--uv); stroke-dasharray: 3 2; }
.c-m-mask > polygon { fill: color-mix(in srgb, var(--ink-2) 55%, var(--paper)); stroke: var(--ink-2); }
.c-m-glass > polygon { fill: color-mix(in srgb, var(--ink-3) 12%, transparent); stroke: var(--ink-3); stroke-opacity: .45; }
.c-m-cu > polygon { fill: var(--c-cu); stroke: var(--c-cu-d); }
.c-m-w > polygon { fill: color-mix(in srgb, var(--ink-2) 55%, var(--card)); stroke: var(--ink-2); }
.c-sim polygon.c-ov-t { fill: #fff; fill-opacity: .38; stroke: none; }
.c-sim polygon.c-ov-s { fill: #000; fill-opacity: .14; stroke: none; }
.c-m-glass > polygon.c-ov-t, .c-m-glass > polygon.c-ov-s { display: none; }
.c-new > polygon:not(.c-ov-t):not(.c-ov-s) { animation: c-flash 1.4s ease-out both; }
@keyframes c-flash { 0%, 35% { stroke: var(--mark); stroke-width: 3; stroke-opacity: 1; } }
.c-el { fill: var(--electron); }
.c-chan { fill: var(--electron); fill-opacity: .25; }
.c-pin path { fill: var(--mark); } .c-pin-dot { fill: var(--card); }
.c-pin-tx { fill: var(--mark); font: 700 22px var(--f-body); paint-order: stroke; stroke: var(--card); stroke-width: 5px; stroke-linejoin: round; }
.c-tx { fill: var(--ink); font: 700 21px var(--f-body); }
.c-tx-s { fill: var(--ink-2); font: 400 18px var(--f-body); }
.c-tx-m { fill: var(--ink-3); font: 400 15px var(--f-mono); }
.c-tx-k { fill: var(--mark); font: 700 18px var(--f-body); }
.c-tx, .c-tx-s, .c-tx-m, .c-tx-k { paint-order: stroke; stroke: var(--card); stroke-width: 4px; stroke-linejoin: round; }
.c-axis { stroke: var(--ink-3); stroke-width: 1.5; }
.c-k { fill: var(--mark); } .c-ok { fill: var(--ok); } .c-ng { fill: var(--ng); }
.c-line { fill: none; stroke: var(--ink-3); stroke-width: 2; }
.c-lead { stroke: var(--ink-3); stroke-width: 1.2; stroke-dasharray: 3 3; }
.c-arrow { fill: none; stroke: var(--mark); stroke-width: 2.4; }
.c-melt { fill: var(--silicon); fill-opacity: .55; }
.c-ingot { fill: var(--silicon-soft); stroke: var(--silicon); stroke-width: 1.5; }
.c-ingot-ln { fill: none; stroke: var(--silicon); stroke-opacity: .5; }
.c-wafer { fill: var(--silicon-soft); stroke: var(--silicon); stroke-width: 1.5; }
.c-sheen { fill: none; stroke: var(--card); stroke-width: 6; stroke-linecap: round; opacity: .8; }
.c-die { fill: none; stroke: var(--silicon); stroke-opacity: .5; stroke-dasharray: 2 2; }
.c-slab { fill: var(--silicon-soft); stroke: var(--silicon); stroke-width: 1.5; }
.c-skin { stroke: var(--mark); stroke-width: 5; }
.c-lens { fill: color-mix(in srgb, var(--ink-3) 14%, var(--card)); stroke: var(--ink-3); }
.c-uvray { stroke: var(--uv); stroke-width: 2.5; stroke-dasharray: 7 5; opacity: .75; }
.c-run { animation: c-dash .6s linear infinite; }
@keyframes c-dash { to { stroke-dashoffset: -24; } }
.c-band { fill: var(--mark-soft); opacity: .85; }
.c-surf { fill: var(--silicon-soft); stroke: var(--silicon); stroke-width: 2; }
.c-print { fill: var(--paper); stroke: var(--rule); }
.c-pline { fill: var(--ink); }
.c-chip { fill: var(--card); stroke: var(--silicon); stroke-width: .6; }
.c-chip.on { fill: color-mix(in srgb, var(--uv) 22%, var(--card)); }
.c-chip.bad { fill: var(--ng-soft); stroke: var(--ng); }
.c-chip.good { fill: color-mix(in srgb, var(--ok) 16%, var(--card)); }
.c-shot { fill: none; stroke: var(--uv); stroke-width: 3; }
.c-dust { fill: var(--ng); }
.c-glass2 { fill: color-mix(in srgb, var(--ink-3) 10%, var(--card)); stroke: var(--rule); }
.c-cu2 { fill: var(--c-cu); stroke: var(--c-cu-d); }
.c-via { fill-opacity: .9; }
.c-sparkc { fill: none; stroke: var(--ng); stroke-width: 4; }
.c-patt { fill: color-mix(in srgb, var(--ink) 45%, var(--card)); }
.c-dash { stroke-dasharray: 5 4; }
.c-finr { fill: var(--silicon-soft); stroke: var(--silicon); }
.c-gatel { fill: color-mix(in srgb, var(--ink) 70%, var(--card)); }
.c-hilite { fill: none; stroke: var(--mark); stroke-width: 3; }
.c-diebig { fill: var(--silicon-soft); stroke: var(--silicon); stroke-width: 2; }
.c-blockr { fill: var(--card); stroke: var(--silicon); }
.c-board { fill: color-mix(in srgb, var(--ok) 22%, var(--card)); stroke: var(--ink-3); }
.c-pkg { fill: color-mix(in srgb, var(--ink) 88%, var(--card)); }
.c-diein { fill: none; stroke: var(--card); stroke-dasharray: 4 3; }
.c-phone { fill: var(--card); stroke: var(--ink-2); stroke-width: 3; }
.c-screen { fill: var(--paper); stroke: var(--rule); }
@media (prefers-reduced-motion: reduce) { .c-new > polygon, .c-run { animation: none; } }
`,
    figs,
    sims,
    steps
  });
})();
