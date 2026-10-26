/* モジュールA「しくみ」── 電子から、トランジスタまで */
(() => {

/* ===== 共通の道具 ===== */
function setupCanvas(cv, W, H) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}
function loop(step) {
  let id = 0, last = 0, alive = true;
  const f = t => { if (!alive) return; const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t; step(dt); id = requestAnimationFrame(f); };
  id = requestAnimationFrame(f);
  return () => { alive = false; cancelAnimationFrame(id); };
}
function pal() {
  const cs = getComputedStyle(document.documentElement), c = n => cs.getPropertyValue('--' + n).trim();
  return { e: c('electron'), eS: c('electron-soft'), h: c('hole'), hS: c('hole-soft'), si: c('silicon'), siS: c('silicon-soft'),
    ink: c('ink'), ink2: c('ink-2'), ink3: c('ink-3'), paper: c('paper'), card: c('card'), rule: c('rule'), mark: c('mark'),
    lred: c('lred'), lblue: c('lblue') };
}
let FS = 1;
const fitText = g => { FS = Math.max(1, Math.min(1.7, 640 / (g.canvas.clientWidth || 640))); };
const FONT = (w, s) => `${w} ${(s * FS).toFixed(1)}px "Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif`;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (a, b) => a + Math.random() * (b - a);
const sig = x => Number(x.toPrecision(2)).toLocaleString();
const ja = n => n >= 1e8 ? sig(n / 1e8) + '億' : n >= 1e4 ? sig(n / 1e4) + '万' : sig(n);
const dot = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); };
const ring = (g, x, y, r, stroke) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.setLineDash([2.5, 2]); g.lineWidth = 1.6; g.strokeStyle = stroke; g.stroke(); g.setLineDash([]); };
const text = (g, s, x, y, font, fill, align = 'left') => { g.font = font; g.fillStyle = fill; g.textAlign = align; g.fillText(s, x, y); };

/* ===== 結晶の図（SVG） ===== */
function latticeG(ox, oy, cols, rows, sp, dop) {
  let bonds = '', dots = '', atoms = '', extra = '';
  const stub = sp * 0.42;
  const pair = (mx, my, horiz, holeIdx) => [-1, 1].map((k, i) => {
    const dx = horiz ? 0 : 5 * k, dy = horiz ? 5 * k : 0;
    return i === holeIdx ? `<circle cx="${mx + dx}" cy="${my + dy}" r="4.5" class="e-empty"/>` : `<circle cx="${mx + dx}" cy="${my + dy}" r="3.8" class="e"/>`;
  }).join('');
  const bond = (x1, y1, x2, y2, holeIdx = -1) => {
    bonds += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="a-bd"/>`;
    dots += pair((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(y2 - y1) < 1, holeIdx);
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ox + c * sp, y = oy + r * sp, isD = dop && dop.c === c && dop.r === r;
    if (c < cols - 1) bond(x, y, x + sp, y, isD && dop.kind === 'p' ? 1 : -1); else bond(x, y, x + stub, y);
    if (r < rows - 1) bond(x, y, x, y + sp); else bond(x, y, x, y + stub);
    if (c === 0) bond(x - stub, y, x, y);
    if (r === 0) bond(x, y - stub, x, y);
    atoms += `<circle cx="${x}" cy="${y}" r="${sp * 0.2}" class="${isD ? 'a-atd' : 'a-at'}"/><text x="${x}" y="${y + 4}" class="a-tat" text-anchor="middle">${isD ? (dop.kind === 'n' ? 'P' : 'B') : 'Si'}</text>`;
    if (isD && dop.kind === 'n') extra = `<circle cx="${x + sp * 0.36}" cy="${y - sp * 0.36}" r="9" class="ln-e" stroke-dasharray="2 2"/><circle cx="${x + sp * 0.36}" cy="${y - sp * 0.36}" r="4.2" class="e"/>`;
  }
  return bonds + dots + atoms + extra;
}

const figs = {
  lattice() {
    return `<svg viewBox="0 0 600 340" role="img" aria-label="シリコンの結晶。どの原子も4本の手をつないでいる">
      <text x="150" y="22" class="t-s" text-anchor="middle">つないだ手 ＝ 電子2個</text><line x1="150" y1="28" x2="150" y2="68" class="ln"/>
      ${latticeG(100, 80, 5, 3, 100)}</svg>`;
  },
  dopants() {
    return `<svg viewBox="0 0 640 330" role="img" aria-label="リンを混ぜたn型と、ホウ素を混ぜたp型">
      <text x="150" y="22" class="t-h" text-anchor="middle">n型：リン（手が5本）</text><text x="150" y="42" class="t-e" text-anchor="middle">電子が1個余る</text>
      <text x="490" y="22" class="t-h" text-anchor="middle">p型：ホウ素（手が3本）</text><text x="490" y="42" class="t-o" text-anchor="middle">席が1つ空く</text>
      ${latticeG(60, 90, 3, 3, 90, { c: 1, r: 1, kind: 'n' })}${latticeG(400, 90, 3, 3, 90, { c: 1, r: 1, kind: 'p' })}</svg>`;
  },
  grip() {
    const panel = (x, name, sub, gap, lbl) => {
      const lowY = 214, h = 30, upY = lowY - gap - h;
      let s = `<text x="${x + 110}" y="22" class="t-h" text-anchor="middle">${name}</text><text x="${x + 110}" y="42" class="t-s" text-anchor="middle">${sub}</text>
        <rect x="${x + 20}" y="${upY}" width="180" height="${h}" rx="3" class="b-up"/><rect x="${x + 20}" y="${lowY}" width="180" height="${h}" rx="3" class="b-low"/>`;
      for (let i = 0; i < 9; i++) s += `<circle cx="${x + 36 + i * 18.5}" cy="${lowY + h / 2}" r="6" class="e"/>`;
      return s + `<line x1="${x + 212}" y1="${upY + h}" x2="${x + 212}" y2="${lowY}" class="ln-k"/><text x="${x + 222}" y="${(upY + h + lowY) / 2 + 5}" class="t-k">${lbl}</text>`;
    };
    return `<svg viewBox="0 0 640 260" role="img" aria-label="シリコンとダイヤモンドの段差の高さ">${panel(40, 'シリコン', '握りがゆるい', 26, '1')}${panel(340, 'ダイヤモンド（炭素）', '握りが固い', 125, '約5')}</svg>`;
  },
  led() {
    const P = (x, gap, col, name, sub) => {
      const lowY = 196, h = 28, upY = lowY - gap - h, my = (upY + h + lowY) / 2;
      let s = `<text x="${x + 90}" y="22" class="t-s" text-anchor="middle">${sub}</text>
        <rect x="${x + 10}" y="${upY}" width="160" height="${h}" rx="3" class="b-up"/><rect x="${x + 10}" y="${lowY}" width="160" height="${h}" rx="3" class="b-low"/>`;
      for (let i = 0; i < 8; i++) s += `<circle cx="${x + 26 + i * 18.5}" cy="${lowY + h / 2}" r="5.5" class="${i === 1 ? 'e-empty' : 'e'}"/>`;
      s += `<circle cx="${x + 44.5}" cy="${upY + h / 2}" r="5.5" class="e"/><path d="M ${x + 44.5} ${upY + h + 4} L ${x + 44.5} ${lowY - 6}" class="ln-e"/><path d="M ${x + 39.5} ${lowY - 12} L ${x + 44.5} ${lowY - 5} L ${x + 49.5} ${lowY - 12}" class="ln-e"/>`;
      s += `<path d="M ${x + 62} ${my} q 6 -8 12 0 t 12 0 t 12 0 t 12 0" fill="none" style="stroke:var(${col})" stroke-width="3"/><path d="M ${x + 106} ${my - 6} L ${x + 114} ${my} L ${x + 106} ${my + 6}" fill="none" style="stroke:var(${col})" stroke-width="3"/>`;
      return s + `<text x="${x + 90}" y="254" text-anchor="middle" style="fill:var(${col});font:700 15px var(--f-body)">${name}</text>`;
    };
    return `<svg viewBox="0 0 640 266" role="img" aria-label="段差の高さと光の色">${P(20, 60, '--lred', '赤い光', '低い段差')}${P(230, 73, '--lgreen', '緑の光', '中くらいの段差')}${P(440, 85, '--lblue', '青い光', '高い段差')}</svg>`;
  }
};

/* ===== シミュレータ ===== */
const MAT = {
  si: { name: 'シリコン', von: 0.6 },
  red: { name: '赤色LED', von: 1.8, light: 'lred', color: '赤い光' },
  blue: { name: '青色LED', von: 2.7, light: 'lblue', color: '青い光' }
};

function diodeSim(mats, def) {
  return {
    html() {
      return `<canvas class="sim-cv" width="640" height="240" data-cv aria-label="n型とp型の境目の様子"></canvas>
        ${mats.length > 1 ? `<div class="seg">${mats.map(k => `<button class="btn ${k === def ? 'primary' : ''}" data-mat="${k}">${MAT[k].name}</button>`).join('')}</div>` : ''}
        <div class="sim-ctrl"><label for="a-di-${def}">電池の電圧</label><input type="range" id="a-di-${def}" min="-2" max="${mats.length > 1 ? 3.5 : 1.2}" step="0.05" value="0"><output data-out>0.00 V</output></div>
        <div class="sim-read"><span>電流 <b data-i>ほぼ0</b></span><span data-dir>電池なし</span></div>
        <p class="sim-note" data-note aria-live="polite"></p>`;
    },
    mount(el, ctx) {
      const g = setupCanvas(el.querySelector('[data-cv]'), 640, 240), sl = el.querySelector('input[type=range]');
      const out = el.querySelector('[data-out]'), iEl = el.querySelector('[data-i]'), dir = el.querySelector('[data-dir]'), note = el.querySelector('[data-note]');
      let mat = def, V = 0;
      const es = Array.from({ length: 34 }, () => ({ x: rnd(30, 250), y: rnd(48, 182) }));
      const hs = Array.from({ length: 34 }, () => ({ x: rnd(390, 610), y: rnd(48, 182) }));
      const fl = [];
      const cur = () => V <= 0 ? 0 : Math.min(500, Math.exp((V - MAT[mat].von) / 0.06));
      const width = () => { const b = MAT[mat].von + 0.1; return clamp(70 * Math.sqrt(Math.max(0.01, b - V) / b), 8, 170); };
      const read = () => {
        const I = cur(), m = MAT[mat];
        out.textContent = (V < 0 ? '−' : '') + Math.abs(V).toFixed(2) + ' V';
        iEl.textContent = I < 0.001 ? 'ほぼ0' : I < 1 ? I.toFixed(3) + ' mA' : I < 100 ? I.toFixed(1) + ' mA' : Math.round(I) + ' mA';
        dir.textContent = Math.abs(V) < 0.05 ? '電池なし' : V > 0 ? '順向き（n側に−、p側に＋）' : '逆向き（n側に＋、p側に−）';
        note.textContent = Math.abs(V) < 0.05 ? '境目に、動ける電子も空席もない「緩衝地帯」がある。'
          : V < 0 ? '逆向き：電子も空席も境目から引き離され、緩衝地帯が広がる。電気はほとんど流れない。'
          : I < 0.05 ? `順向き：緩衝地帯は縮んできたが、まだ坂を越えられない。流れ始める目安は約${m.von}V。`
          : m.light ? `電子が空席に落ちるたびに、段差の高さぶんのエネルギーが${m.color}になって出てくる。`
          : '境目で電子と空席が出会い続け、電気が流れる。シリコンでは、出会ったときのエネルギーは熱になる。';
      };
      const draw = dt => {
        fitText(g); const p = pal(), w = width(), I = cur(), s = I < 0.01 ? 0 : clamp(Math.log10(I / 0.01) / 4.5, 0, 1), m = MAT[mat];
        const L = 320 - w / 2 - 6, R = 320 + w / 2 + 6;
        g.clearRect(0, 0, 640, 240);
        g.fillStyle = p.eS; g.fillRect(20, 40, 300, 150); g.fillStyle = p.hS; g.fillRect(320, 40, 300, 150);
        g.fillStyle = p.card; g.fillRect(320 - w / 2, 40, w, 150);
        g.setLineDash([4, 3]); g.strokeStyle = p.ink3; g.lineWidth = 1; g.strokeRect(320 - w / 2, 40, w, 150); g.setLineDash([]);
        if (m.light && s > 0) {
          const gr = g.createRadialGradient(320, 115, 4, 320, 115, 30 + 80 * s);
          gr.addColorStop(0, p[m.light]); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.globalAlpha = 0.45 * s; g.fillStyle = gr; g.fillRect(200, 20, 240, 190); g.globalAlpha = 1;
        }
        es.forEach(e => {
          e.x += (s * 150 + rnd(-25, 25)) * dt; e.y = clamp(e.y + rnd(-25, 25) * dt, 48, 182);
          if (e.x < 26) e.x = 26;
          if (e.x > L) { if (s > 0.02) { fl.push({ x: 320 + rnd(-w / 2, w / 2), y: e.y, t: 0 }); e.x = 26; } else e.x = L - rnd(0, 6); }
          dot(g, e.x, e.y, 5, p.e);
        });
        hs.forEach(h => {
          h.x -= (s * 150 + rnd(-25, 25)) * dt; h.y = clamp(h.y + rnd(-25, 25) * dt, 48, 182);
          if (h.x > 614) h.x = 614;
          if (h.x < R) { if (s > 0.02) h.x = 614; else h.x = R + rnd(0, 6); }
          ring(g, h.x, h.y, 5.5, p.h);
        });
        for (let k = fl.length - 1; k >= 0; k--) {
          const f = fl[k]; f.t += dt * 2.2;
          if (f.t >= 1) { fl.splice(k, 1); continue; }
          g.globalAlpha = 1 - f.t; g.beginPath(); g.arc(f.x, f.y, 3 + 14 * f.t, 0, Math.PI * 2);
          g.strokeStyle = m.light ? p[m.light] : p.ink3; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1;
        }
        text(g, 'n型', 28, 30, FONT(700, 14), p.e); text(g, 'p型', 612, 30, FONT(700, 14), p.h, 'right');
        text(g, '緩衝地帯', 320, 210, FONT(500, 12.5), p.ink2, 'center');
        if (s > 0 && fl.length) text(g, m.light ? m.color : '熱', 320, 30, FONT(700, 13), m.light ? p[m.light] : p.ink3, 'center');
      };
      let stop = () => {};
      if (ctx.reducedMotion) draw(0); else stop = loop(draw);
      sl.addEventListener('input', () => { V = +sl.value; read(); if (ctx.reducedMotion) draw(0); });
      el.querySelectorAll('[data-mat]').forEach(b => b.addEventListener('click', () => {
        mat = b.dataset.mat; el.querySelectorAll('[data-mat]').forEach(x => x.classList.toggle('primary', x === b)); read(); if (ctx.reducedMotion) draw(0);
      }));
      read();
      return () => stop();
    }
  };
}

const sims = {
  wire: {
    html() {
      let es = '';
      for (let i = -1; i < 27; i++) es += `<circle cx="${80 + i * 19}" cy="90" r="6" class="e"/>`;
      return `<div class="a-wire" data-wire><svg viewBox="0 0 640 200" role="img" aria-label="電池と銅線と電球の回路">
        <defs><clipPath id="a-wire-clip"><rect x="72" y="78" width="482" height="24" rx="12"/></clipPath></defs>
        <rect x="28" y="64" width="40" height="84" rx="4" class="f-si"/><text x="48" y="56" class="t-h" text-anchor="middle">−</text><text x="48" y="170" class="t-h" text-anchor="middle">＋</text>
        <rect x="70" y="76" width="486" height="28" rx="14" class="a-tube"/>
        <g clip-path="url(#a-wire-clip)"><g data-es>${es}</g><rect x="70" y="76" width="486" height="28" class="a-pulse"/></g>
        <circle cx="590" cy="90" r="22" class="a-bulb"/><rect x="580" y="112" width="20" height="14" class="f-g"/>
        <path d="M 590 126 L 590 182 L 48 182 L 48 148" class="ln"/>
        <text x="313" y="62" class="t-k a-push" text-anchor="middle">押す力は、一瞬で端まで届く</text>
        <text x="313" y="134" class="t-s" text-anchor="middle">銅線の中は、最初から電子で満タン</text>
      </svg>
      <div class="row" style="justify-content:space-between"><button class="btn primary" data-sw aria-pressed="false">スイッチを入れる</button><span class="gstate" data-st>明かりは消えている</span></div>
      <div class="sim-ctrl"><label for="a-wire-i">電流の大きさ</label><input type="range" id="a-wire-i" min="0.5" max="10" step="0.5" value="1"><output data-iout>1.0 A</output></div>
      <div class="sim-read"><span>電子1個の速さ <b data-v>0.073</b> mm/秒</span><span>1分で <b data-m>4.4</b> mm</span><span>カタツムリ（1mm/秒）の <b data-r>約14</b> 分の1</span></div>
      <p class="sim-note">太さ1mm²の銅線として計算しています。図の電子は、見えるように大きく描いています。</p></div>`;
    },
    mount(el, ctx) {
      const box = el.querySelector('[data-wire]'), btn = el.querySelector('[data-sw]'), st = el.querySelector('[data-st]'), sl = el.querySelector('#a-wire-i'), es = el.querySelector('[data-es]');
      let on = false, off = 0, stop = () => {};
      const v = () => +sl.value / (8.5e28 * 1e-6 * 1.602e-19) * 1000;
      const read = () => {
        const s = v(), inv = 1 / s;
        el.querySelector('[data-iout]').textContent = (+sl.value).toFixed(1) + ' A';
        el.querySelector('[data-v]').textContent = s < 0.1 ? s.toFixed(3) : s.toFixed(2);
        el.querySelector('[data-m]').textContent = (s * 60).toFixed(1);
        el.querySelector('[data-r]').textContent = '約' + inv.toFixed(inv >= 10 ? 0 : 1);
      };
      const run = () => {
        stop(); stop = () => {};
        if (!on || ctx.reducedMotion) return;
        stop = loop(dt => { off = (off + v() * 40 * dt) % 19; es.setAttribute('transform', `translate(${off.toFixed(2)} 0)`); });
      };
      btn.addEventListener('click', () => {
        on = !on;
        box.classList.remove('on'); void box.getBoundingClientRect(); box.classList.toggle('on', on);
        btn.textContent = on ? 'スイッチを切る' : 'スイッチを入れる'; btn.setAttribute('aria-pressed', on);
        st.textContent = on ? '明かりがついた（一瞬で）' : '明かりは消えている'; st.style.color = on ? 'var(--mark)' : '';
        run();
      });
      sl.addEventListener('input', read); read();
      return () => stop();
    }
  },

  thermal: {
    html() {
      return `<canvas class="sim-cv" width="640" height="290" data-cv aria-label="結晶の中で手がほどける様子"></canvas>
        <div class="seg"><button class="btn primary" data-mat="si">シリコン</button><button class="btn" data-mat="c">ダイヤモンド</button></div>
        <div class="sim-ctrl"><label for="a-th-t">温度</label><input type="range" id="a-th-t" min="-50" max="250" step="5" value="25"><output data-tout>25 ℃</output></div>
        <div class="sim-read"><span>自由に動ける電子 <b data-n>0</b> 個</span><span>手がほどける頻度：室温のシリコンの <b data-r>1.00倍</b></span></div>
        <p class="sim-note" data-note aria-live="polite"></p>
        <p class="sim-note">ほどける頻度は、見やすいように大きく誇張しています。実際の室温のシリコンでほどけている手は、原子約3兆個に1つほどです。</p>`;
    },
    mount(el, ctx) {
      const g = setupCanvas(el.querySelector('[data-cv]'), 640, 290), sl = el.querySelector('#a-th-t');
      const EG = { si: 6499, c: 31740 }; let mat = 'si';
      const cols = 9, rows = 4, sp = 62, ox = 72, oy = 60, bonds = [], atoms = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = ox + c * sp, y = oy + r * sp; atoms.push([x, y]);
        if (c < cols - 1) bonds.push([x, y, x + sp, y]);
        if (r < rows - 1) bonds.push([x, y, x, y + sp]);
      }
      const broken = new Set(), free = [];
      const T = () => +sl.value + 273.15;
      const ratio = () => Math.exp(-EG[mat] / T()) / Math.exp(-EG.si / 298.15);
      const rate = () => { const R = ratio(); return R < 1e-12 ? 0 : Math.min(14, 0.8 * Math.pow(R, 0.3)); };
      const spawn = () => {
        const cand = bonds.map((b, i) => i).filter(i => !broken.has(i));
        if (!cand.length || free.length >= 24) return;
        const i = cand[Math.floor(Math.random() * cand.length)], [x1, y1, x2, y2] = bonds[i], a = rnd(0, Math.PI * 2);
        broken.add(i); free.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, vx: Math.cos(a) * 45, vy: Math.sin(a) * 45, life: rnd(2.5, 4.5), bond: i });
      };
      const nEl = el.querySelector('[data-n]'), rEl = el.querySelector('[data-r]'), note = el.querySelector('[data-note]');
      const read = () => {
        const R = ratio(), t = +sl.value;
        el.querySelector('[data-tout]').textContent = (t < 0 ? '−' : '') + Math.abs(t) + ' ℃';
        rEl.innerHTML = R >= 10 ? '約' + sig(R) + '倍' : R >= 0.01 ? R.toFixed(2) + '倍' : `10<sup>−${Math.round(-Math.log10(R))}</sup>倍（ほぼゼロ）`;
        note.textContent = mat === 'c' ? 'ダイヤモンドは握りが固い。熱くしても、手はほとんどほどけない。'
          : t < 0 ? '冷やすと、手はほとんどほどけない。'
          : t <= 60 ? 'ときどき手がほどけて、電子が自由に動き出す。ほどけた跡には空席（オレンジの点線）が残る。'
          : '温めるほど、手は頻繁にほどける。だから半導体は、温めると電気を通しやすくなる。';
      };
      let shown = -1;
      const draw = () => {
        fitText(g); const p = pal();
        g.clearRect(0, 0, 640, 290);
        bonds.forEach(([x1, y1, x2, y2], i) => {
          g.globalAlpha = 0.45; g.strokeStyle = p.si; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.globalAlpha = 1;
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, h = Math.abs(y2 - y1) < 1;
          [[h ? 0 : -5, h ? -5 : 0], [h ? 0 : 5, h ? 5 : 0]].forEach((o, j) => broken.has(i) && j === 1 ? ring(g, mx + o[0], my + o[1], 4.5, p.h) : dot(g, mx + o[0], my + o[1], 3.6, p.e));
        });
        atoms.forEach(([x, y]) => {
          g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fillStyle = p.siS; g.fill(); g.strokeStyle = p.si; g.lineWidth = 1.5; g.stroke();
          text(g, mat === 'si' ? 'Si' : 'C', x, y + 4, '700 11px "IBM Plex Mono", monospace', p.ink2, 'center');
        });
        free.forEach(f => { g.globalAlpha = 0.25; dot(g, f.x, f.y, 10, p.e); g.globalAlpha = 1; dot(g, f.x, f.y, 5.5, p.e); });
        text(g, `${mat === 'si' ? 'シリコン' : 'ダイヤモンド'}　${sl.value}℃`, 16, 22, FONT(500, 13), p.ink2);
        if (free.length !== shown) { shown = free.length; nEl.textContent = shown; }
      };
      const step = dt => {
        if (Math.random() < rate() * dt) spawn();
        for (let k = free.length - 1; k >= 0; k--) {
          const f = free[k]; f.life -= dt;
          f.vx += rnd(-80, 80) * dt; f.vy += rnd(-80, 80) * dt;
          const v = Math.hypot(f.vx, f.vy); if (v > 60) { f.vx *= 60 / v; f.vy *= 60 / v; }
          f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.x < 40 || f.x > 600) f.vx *= -1; if (f.y < 36 || f.y > 272) f.vy *= -1;
          f.x = clamp(f.x, 40, 600); f.y = clamp(f.y, 36, 272);
          if (f.life <= 0) { broken.delete(f.bond); free.splice(k, 1); }
        }
        draw();
      };
      const still = () => { broken.clear(); free.length = 0; const n = Math.round(rate() * 2); for (let i = 0; i < n; i++) spawn(); draw(); };
      let stop = () => {};
      if (ctx.reducedMotion) still(); else stop = loop(step);
      sl.addEventListener('input', () => { read(); if (ctx.reducedMotion) still(); });
      el.querySelectorAll('[data-mat]').forEach(b => b.addEventListener('click', () => {
        mat = b.dataset.mat; el.querySelectorAll('[data-mat]').forEach(x => x.classList.toggle('primary', x === b));
        broken.clear(); free.length = 0; read(); if (ctx.reducedMotion) still();
      }));
      read();
      return () => stop();
    }
  },

  puzzle: {
    html() {
      const X = i => 80 + i * 68;
      let slots = '', es = '';
      for (let i = 0; i < 8; i++) slots += `<circle cx="${X(i)}" cy="86" r="17" class="a-slot"/>`;
      for (let k = 0; k < 7; k++) es += `<circle cx="0" cy="86" r="12" class="e a-pz" data-e="${k}" style="transform:translateX(${X(k + 1)}px)"/>`;
      return `<svg viewBox="0 0 640 170" role="img" aria-label="電子と空席の動き">
        <text x="320" y="30" class="t-s" text-anchor="middle">結晶の中の手の列（1列だけ取り出したもの）</text>
        <text x="32" y="91" class="t-h" text-anchor="middle">＋側</text><text x="610" y="91" class="t-h" text-anchor="middle">−側</text>
        ${slots}${es}<circle cx="0" cy="86" r="13" class="e-empty a-pz" data-hole style="transform:translateX(${X(0)}px)"/>
        <text x="80" y="140" class="t-e">← 電子は＋側へ、1個ずつ動く</text>
        <text x="556" y="162" class="t-o" text-anchor="end">空席は逆向きに進む →</text>
      </svg>
      <div class="row" style="justify-content:space-between"><button class="btn primary" data-step>電圧をかける（1歩すすめる）</button><span class="gstate" data-st>空席は左端</span></div>`;
    },
    mount(el) {
      const X = i => 80 + i * 68;
      let hole = 0, slot = [1, 2, 3, 4, 5, 6, 7];
      const btn = el.querySelector('[data-step]'), st = el.querySelector('[data-st]'), hEl = el.querySelector('[data-hole]'), eEls = [...el.querySelectorAll('[data-e]')];
      const paint = () => {
        eEls.forEach((c, k) => { c.style.transform = `translateX(${X(slot[k])}px)`; });
        hEl.style.transform = `translateX(${X(hole)}px)`;
        st.textContent = hole === 0 ? '空席は左端' : hole === 7 ? '空席が右端まで進んだ' : `空席は左から${hole + 1}番目`;
        btn.textContent = hole === 7 ? '最初に戻す' : '電圧をかける（1歩すすめる）';
      };
      btn.addEventListener('click', () => {
        if (hole === 7) { hole = 0; slot = [1, 2, 3, 4, 5, 6, 7]; }
        else { slot[slot.indexOf(hole + 1)] = hole; hole++; }
        paint();
      });
      paint();
    }
  },

  doping: {
    html() {
      return `<svg viewBox="0 0 640 140" role="img" aria-label="電気の通しやすさのものさし" data-svg></svg>
        <div class="sim-ctrl"><label for="a-dp-x">混ぜる量</label><input type="range" id="a-dp-x" min="0" max="90" step="1" value="0"><output data-out style="min-width:9em"></output></div>
        <div class="seg"><button class="btn" data-r="0">純粋</button><button class="btn" data-r="1e-11">1000億個に1個</button><button class="btn" data-r="2e-7">500万個に1個</button><button class="btn" data-r="1e-4">1万個に1個</button></div>
        <div class="sim-read"><span>電気の通しやすさ：純粋なシリコンの <b data-f></b></span></div>
        <p class="sim-note" data-note aria-live="polite"></p>`;
    },
    mount(el) {
      const sl = el.querySelector('#a-dp-x'), svg = el.querySelector('[data-svg]');
      const toR = k => k === 0 ? 0 : Math.pow(10, -12 + (k - 1) * 9 / 89);
      const toK = r => r <= 0 ? 0 : Math.round(1 + (Math.log10(r) + 12) * 89 / 9);
      const F = r => { if (r <= 0) return 1; const N = 5e22 * r, mu = 68.5 + 1345.5 / (1 + Math.pow(N / 9.2e16, 0.711)); return 1 + N * 1.602e-19 * mu * 2.3e5; };
      const lab = ['1', '10', '100', '1000', '1万', '10万', '100万', '1000万', '1億', '10億'];
      let r = 2e-7;
      const paint = () => {
        const f = F(r), X = e => 40 + e * (560 / 9);
        let t = '';
        for (let e = 0; e <= 9; e++) t += `<line x1="${X(e)}" y1="70" x2="${X(e)}" y2="80" class="ln"/><text x="${X(e)}" y="98" class="t-m" text-anchor="middle">${lab[e]}</text>`;
        svg.innerHTML = `<text x="40" y="26" class="t-s">電気の通しやすさ（純粋なシリコン＝1、目盛1つで10倍）</text>
          <rect x="40" y="44" width="560" height="24" rx="4" class="f-si"/><rect x="40" y="44" width="${Math.max(3, X(Math.log10(f)) - 40).toFixed(1)}" height="24" rx="4" class="f-k"/>${t}
          <text x="600" y="128" class="t-s" text-anchor="end">銅は、右端（10億）のさらに100倍以上先</text>`;
        el.querySelector('[data-out]').textContent = r <= 0 ? '純粋' : `シリコン ${ja(1 / r)}個に1個`;
        el.querySelector('[data-f]').textContent = f < 10 ? f.toFixed(1) + '倍' : '約' + ja(f) + '倍';
        el.querySelector('[data-note]').textContent = r <= 0 ? '純粋なシリコン。自由に動ける電子は、ほとんどいない。'
          : r < 3e-11 ? 'もし1000億個に1個のリンが混ざっただけでも、通しやすさは数十倍。意図しない原子は、それほど効いてしまう。'
          : r >= 1e-4 ? '混ぜすぎると電子どうしがぶつかり合い、伸びはゆるやかになる。'
          : '混ぜる量を10倍にすると、通しやすさもほぼ10倍。ゼロに近いところから足すので、ほんの少しでも桁違いに効く。';
      };
      sl.addEventListener('input', () => { r = toR(+sl.value); paint(); });
      el.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { r = +b.dataset.r; sl.value = toK(r); paint(); }));
      sl.value = toK(r); paint();
    }
  },

  diode: diodeSim(['si'], 'si'),
  led: diodeSim(['si', 'red', 'blue'], 'red'),

  mos: {
    html() {
      return `<canvas class="sim-cv" width="640" height="300" data-cv aria-label="トランジスタの断面と、電子から見た壁の高さ"></canvas>
        <div class="sim-ctrl"><label for="a-mos-v">門の電圧</label><input type="range" id="a-mos-v" min="0" max="1.5" step="0.05" value="0"><output data-out>0.00 V</output></div>
        <div class="sim-read"><span>入口→出口の電流 <b data-i>ほぼ0</b></span><span>門そのものに流れる電流 <b>0</b></span></div>
        <p class="sim-note" data-note aria-live="polite"></p>`;
    },
    mount(el, ctx) {
      const g = setupCanvas(el.querySelector('[data-cv]'), 640, 300), sl = el.querySelector('#a-mos-v'), Vt = 0.4;
      const sd = [];
      for (let x = 46; x <= 154; x += 27) for (let y = 160; y <= 214; y += 27) { sd.push({ x, y, j: rnd(0, 6) }); sd.push({ x: x + 440, y, j: rnd(0, 6) }); }
      const holes = [];
      for (let x = 196; x <= 444; x += 31) { holes.push({ x, y: 168, top: true }); holes.push({ x: x + 15, y: 200, top: false }); }
      let V = 0, off = 0, time = 0;
      const read = () => {
        const on = V - Vt;
        el.querySelector('[data-out]').textContent = V.toFixed(2) + ' V';
        el.querySelector('[data-i]').textContent = on <= 0 ? 'ほぼ0' : (500 * on * on).toFixed(on < 0.2 ? 1 : 0) + ' µA';
        el.querySelector('[data-note]').textContent = V < 0.15 ? '門に電圧がない。p型の壁にはばまれ、入口から出口へ電気は流れない。'
          : V < Vt ? '電圧をかけ始めた。壁の表面から正孔が追い払われるが、まだ道はできていない。'
          : V < Vt + 0.3 ? '電子が門の真下に集まり、薄い道が現れた。電気が流れ始める。'
          : '道の電子が増え、電流も増える。門そのものには電流が流れない（膜がさえぎる）。';
      };
      const draw = dt => {
        fitText(g); const p = pal(), k = V / 1.5, on = clamp((V - Vt) / 1.0, 0, 1);
        time += dt;
        g.clearRect(0, 0, 640, 300);
        g.fillStyle = p.eS; g.fillRect(30, 140, 140, 90); g.fillRect(470, 140, 140, 90);
        g.fillStyle = p.hS; g.fillRect(170, 140, 300, 90);
        g.fillStyle = p.si; g.fillRect(190, 130, 260, 8);
        g.fillStyle = p.card; g.fillRect(190, 88, 260, 40); g.globalAlpha = k; g.fillStyle = p.ink; g.fillRect(190, 88, 260, 40); g.globalAlpha = 1;
        g.strokeStyle = p.ink3; g.lineWidth = 1; g.strokeRect(190, 88, 260, 40);
        text(g, '門（ゲート）', 320, 113, FONT(700, 14), k > 0.5 ? p.paper : p.ink2, 'center');
        const plus = Math.round(k * 10);
        for (let i = 0; i < plus; i++) text(g, '＋', 206 + i * 25, 80, FONT(700, 13), p.mark, 'center');
        sd.forEach(d => dot(g, d.x + Math.sin(time * 2 + d.j) * 2, d.y + Math.cos(time * 1.7 + d.j) * 2, 5, p.e));
        holes.forEach(h => {
          const a = h.top ? 1 - clamp(V / Vt, 0, 1) : 1;
          if (a <= 0.02) return;
          g.globalAlpha = a; ring(g, h.x + Math.sin(time * 1.5 + h.x) * 2, h.y + (h.top ? (1 - a) * 18 : 0), 5.5, p.h); g.globalAlpha = 1;
        });
        const n = Math.round(24 * on);
        if (n > 0) {
          off = (off + 70 * on * dt) % 288;
          for (let i = 0; i < n; i++) dot(g, 176 + ((i * 288 / n + off) % 288), 147, 4.5, p.e);
        }
        text(g, '入口（n型）', 100, 250, FONT(500, 12.5), p.ink2, 'center');
        text(g, '壁（p型）', 320, 250, FONT(500, 12.5), p.ink2, 'center');
        text(g, '出口（n型）', 540, 250, FONT(500, 12.5), p.ink2, 'center');
        const top = 290 - 30 * (1 - 0.85 * clamp(V / (Vt + 0.4), 0, 1));
        text(g, '電子から見た壁の高さ', 30, 272, FONT(500, 12), p.ink3);
        g.strokeStyle = p.ink2; g.lineWidth = 2.5; g.beginPath();
        g.moveTo(30, 290); g.lineTo(170, 290); g.lineTo(196, top); g.lineTo(444, top); g.lineTo(470, 290); g.lineTo(610, 290); g.stroke();
        dot(g, 140, 285, 4.5, p.e);
      };
      let stop = () => {};
      if (ctx.reducedMotion) draw(0); else stop = loop(draw);
      sl.addEventListener('input', () => { V = +sl.value; read(); if (ctx.reducedMotion) draw(0); });
      read();
      return () => stop();
    }
  }
};

const css = `
.a-bd { stroke: var(--silicon); stroke-width: 2.5; stroke-opacity: .5; }
.a-at { fill: var(--silicon-soft); stroke: var(--silicon); stroke-width: 1.5; }
.a-atd { fill: var(--card); stroke: var(--ink); stroke-width: 2; }
.a-tat { fill: var(--ink-2); font: 700 12px var(--f-mono); }
.a-tube { fill: var(--silicon-soft); stroke: var(--silicon); stroke-opacity: .6; }
.a-pulse { fill: var(--mark); opacity: 0; transform-box: fill-box; transform-origin: left center; }
.a-wire.on .a-pulse { animation: a-sweep .5s ease-out forwards; }
@keyframes a-sweep { 0% { opacity: .5; transform: scaleX(0); } 70% { opacity: .5; transform: scaleX(1); } 100% { opacity: 0; transform: scaleX(1); } }
.a-bulb { fill: var(--card); stroke: var(--ink-3); stroke-width: 1.5; transition: fill .2s .25s, stroke .2s .25s; }
.a-wire.on .a-bulb { fill: var(--lamp); stroke: var(--lamp); }
.a-push { opacity: 0; transition: opacity .3s .1s; } .a-wire.on .a-push { opacity: 1; }
.a-slot { fill: none; stroke: var(--rule); stroke-width: 1.5; }
.a-pz { transition: transform .45s ease; }
@media (prefers-reduced-motion: reduce) { .a-pz { transition: none; } .a-wire.on .a-pulse { animation: none; } }
`;


/* ===== 教材 ===== */
const steps = [
{
  id: 'a1', no: 1, title: '電気が流れるとは',
  headline: 'スイッチを入れた瞬間、電線の中で何が起きているのか。',
  predict: {
    q: '壁のスイッチを入れると、天井の明かりは一瞬でつきます。このとき電線の中の電子は、どれくらいの速さで進んでいると思いますか？',
    options: ['光と同じくらい（1秒に30万km）', '新幹線くらい', '人が歩くくらい', 'カタツムリよりも遅い'],
    answer: 3,
    right: '正解。電子そのものは、驚くほどゆっくりです。',
    wrong: '答えは「カタツムリよりも遅い」。電子そのものは、驚くほどゆっくりです。'
  },
  explore: [
    { t: 'p', h: 'サマリで見たとおり、電気が流れるとは電子が動くことです。では、その電子はどれくらいの速さで動いているのでしょうか。' },
    { t: 'p', h: '家庭の電線（銅線）に電流が流れているとき、電子1個が進む速さは<b>1秒に0.1mmもありません</b>。1分かけても、数ミリしか進まないのです。' },
    { t: 'p', h: 'それなのに、スイッチを入れると明かりは一瞬でつく。下の図で確かめてみてください。' },
    { t: 'sim', id: 'wire', cap: '銅線の中は、最初から電子でぎっしり満タン。スイッチを入れると、行列全体が一斉に押される。電子一つひとつはほとんど進まないが、押す力は一瞬で電球まで届く。' },
    { t: 'analogy', ttl: '水が満タンのホース', rows: [['ホースの中の水', '電線の中の電子'], ['蛇口をひねる', 'スイッチを入れる'], ['先端からすぐ水が出る', '電球がすぐにつく'], ['水の粒そのものはゆっくり', '電子そのものはゆっくり']],
      breaks: 'ホースの水を押す力は、水の中を音の速さ（1秒に約1500m）で伝わります。電気の押す力はそれよりはるかに速く、光に近い速さで伝わります。押す力を運んでいるのは、電子どうしの押し合いだけではなく、電線のまわりの空間に広がる「電気の力の場」だからです。' },
    { t: 'h', h: '動ける電子と、動けない電子' },
    { t: 'p', h: '銅の中には、自由に動ける電子がぎっしりいます。だから押せばすぐ流れる。けれど、どの物質でもそうなわけではありません。サマリS1で見たように、電子が原子に縛られて動けない物質もあります。その違いは、原子どうしの<b>つながり方</b>にあります。' },
    { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '電流の向きと、電子の向きは逆', ps: [
      '理科では、電流は電池のプラスからマイナスへ流れると習います。ところが電子は、マイナスからプラスへ動いています。',
      '電流の向きが決められたのは、電子が見つかる（1897年）よりずっと前のこと。あとから中身を調べたら、実際に動いていたのは逆向きのマイナスの粒だった、というわけです。このドリルでは、電子の動きで説明していきます。'
    ] }
  ],
  discover: [
    { t: 'num', big: '0.07', unit: 'mm/秒', b: '電線の中の電子が進む速さ', l: '太さ1mm²の銅線に1Aの電流を流したときの計算です。1分で約4mm。カタツムリ（1秒に約1mm）より、ずっと遅いのです。' }
  ],
  quiz: [
    { type: 'tf', q: '電線の中の電子は、光に近い速さで走っている。', answer: 1, ex: '電子そのものは1秒に0.1mmもないほどゆっくりです。光に近い速さで伝わるのは、電子を押す力のほうです。' },
    { type: 'choice', q: 'スイッチを入れた瞬間に明かりがつくのは、なぜ？', options: ['電子がとても速く走るから', '電線が最初から電子で満タンで、押す力が一瞬で伝わるから', '電球が電気をためておくから', 'スイッチが光を出すから'], answer: 1, ex: '満タンのホースと同じです。行列全体が一斉に押されるので、端の電球まで一瞬で届きます。' },
    { type: 'choice', q: 'ホースのたとえで「水」にあたるのは？', options: ['電子', '電池', '電球', 'スイッチ'], answer: 0, ex: 'ホースを満たす水が、電線を満たす電子です。' },
    { type: 'fill', before: '電流の正体は、マイナスの電気をもつ', after: 'の流れである。', options: ['電子', '原子', '光', '熱'], answer: 0, ex: '電子は原子の中にある、マイナスの電気をもった小さな粒です。' }
  ],
  summary: '電子そのものはゆっくり。電線が最初から電子で満タンだから、押す力が一瞬で伝わる。',
  next: 'では、なぜ銅の電子は自由に動けて、シリコンの電子は動けないのか。',
  deeper: [],
  sources: ['電子の速さ：銅の自由電子 約8.5×10²⁸個/m³、断面積1mm²、電流1Aとして計算（1 ÷ (8.5×10²⁸ × 10⁻⁶ × 1.6×10⁻¹⁹) ≒ 7×10⁻⁵ m/秒）。', 'カタツムリの速さ 約1mm/秒は一般的な目安。', '電子の発見：1897年（J.J.トムソン）。']
},
{
  id: 'a2', no: 2, title: 'シリコンの結晶',
  headline: 'なぜ純粋なシリコンは、電気をほとんど通さないのか。',
  predict: {
    q: 'ダイヤモンドは電気を通しません。シリコンは半導体です。では、この2つの原子の並び方は、どれくらい似ていると思いますか？',
    options: ['まったく違う', '少し似ている', 'まったく同じ'],
    answer: 2,
    right: '正解。並び方はまったく同じなのです。',
    wrong: '答えは「まったく同じ」。ダイヤモンドとシリコンは、原子の並び方が同じなのです。'
  },
  explore: [
    { t: 'p', h: 'シリコン原子は、いちばん外側に電子を4個もっています。この4個が、隣の原子とつながる<b>4本の手</b>の役目をします。' },
    { t: 'p', h: 'シリコンの結晶では、すべての原子が隣の4つの原子と1本ずつ手をつなぎます。手をつなぐとは、2つの原子が電子を1個ずつ出し合い、2個の電子を共有することです。' },
    { t: 'fig', svg: 'lattice', cap: 'シリコンの結晶（平面に描いたもの）。どの原子も4本の手をすべてつないでいる。手の上の青い点が電子。余っている電子も、空いている手もない。' },
    { t: 'p', h: '全員が、すべての手をつないでいる。余った電子もいなければ、空いた席もない。電子はみな手をつなぐ役目に使われていて、<b>自由に動ける電子がほとんどいない</b>。だから純粋なシリコンは、電気をほとんど通しません。' },
    { t: 'analogy', ttl: 'フォークダンスの輪', rows: [['踊り手', 'シリコン原子'], ['4本の手', '外側の4個の電子'], ['つないだ手', '2個の電子を共有する結びつき'], ['輪から抜け出して歩き回る', '自由に動いて電気を運ぶ']],
      breaks: '本物の結晶は平面ではなく立体で、4本の手はピラミッドの頂点の方向（正四面体の向き）に伸びています。また、つないだ手を作っているのは原子そのものではなく2個の電子で、手を振りほどいて歩き回るのも、原子ではなく電子のほうです。' },
    { t: 'recall', from: 'S1', ttl: '段差', fig: 'step', to: 's1', h: '電子が手を振りほどいて自由になること。それが、S1の「段差を登る」ことの正体です。<b>段差の高さ＝手を振りほどくのに必要なエネルギー</b>。手の握りが固いほど、段差は高くなります。' },
    { t: 'h', h: '同じ並び方なのに、なぜ違うのか' },
    { t: 'p', h: 'ダイヤモンドは炭素の結晶です。炭素も手を4本もち、シリコンとまったく同じ形に並んでいます。違うのは<b>手の握りの強さ</b>。炭素は原子が小さく、電子をがっちりつかんで離しません。' },
    { t: 'p', h: 'シリコンの握りは、それよりずっとゆるい。熱や光でときどき手がほどけ、ほんの少しだけ電気が流れます。並び方が同じでも、握りの強さしだいで、宝石にも半導体にもなるのです。' },
    { t: 'sim', id: 'thermal', cap: '材料と温度を変えてみてください。シリコンは温めるほど手がほどけ、自由に動ける電子が増える。ダイヤモンドは、熱くしてもほとんどほどけない。' }
  ],
  discover: [
    { t: 'fig', svg: 'grip', cap: '手を振りほどくのに必要なエネルギー（段差の高さ）。並び方は同じでも、ダイヤモンドの段差はシリコンの約5倍。' },
    { t: 'num', big: '5', unit: '倍', b: 'ダイヤモンドの段差は、シリコンの約5倍の高さ', l: 'この差が、電気を通さない宝石と、切り替えのきく半導体を分けています。' }
  ],
  quiz: [
    { type: 'tf', q: '純粋なシリコンの中では、たくさんの電子が自由に動き回っている。', answer: 1, ex: '全員が手をつなぐのに電子を使っているので、自由に動ける電子はほとんどいません。だから電気をほとんど通しません。' },
    { type: 'choice', q: 'シリコン原子が隣とつながる「手」は何本？', options: ['2本', '3本', '4本', '5本'], answer: 2, ex: 'いちばん外側の電子4個が、4本の手の役目をします。' },
    { type: 'choice', q: 'ダイヤモンドが電気を通さず、シリコンが半導体なのはなぜ？', options: ['原子の並び方が違うから', '手の握りの強さ（段差の高さ）が違うから', 'ダイヤモンドのほうが硬いから', 'ダイヤモンドは透明だから'], answer: 1, ex: '並び方は同じです。炭素は電子をがっちりつかむので段差が高く、シリコンは握りがゆるいので段差が低いのです。' },
    { type: 'fill', before: '純粋なシリコンでは、すべての手が', after: 'いるため、自由に動ける電子がほとんどいない。', options: ['ふさがって', '空いて', '切れて', '光って'], answer: 0, ex: '余った電子も空いた席もない「満席」の状態です。次の章では、この満席をわざと崩します。' }
  ],
  summary: '純粋なシリコンは、全員が4本の手をつなぎ合った満席の状態。だから電気をほとんど通さない。',
  next: 'では、自由に動ける電子を、どうやって用意するのか。',
  deeper: [['C', 'つくりかた：結晶を育てる']],
  sources: ['ダイヤモンドとシリコンは同じ結晶構造（ダイヤモンド構造）。', '段差の高さ（バンドギャップ）：シリコン 約1.1eV、ダイヤモンド 約5.5eV。']
},
{
  id: 'a3', no: 3, title: '不純物を混ぜる',
  headline: 'ほんの少し混ぜるだけで、なぜ性質がガラリと変わるのか。',
  predict: {
    q: 'シリコンに、手が5本のリン原子を混ぜます。電気の通しやすさを数十万倍にするには、どれくらいの割合で混ぜればいいと思いますか？',
    options: ['シリコン2個に1個', 'シリコン100個に1個', 'シリコン1万個に1個', 'シリコン500万個に1個'],
    answer: 3,
    right: '正解。驚くほどわずかで、性質が一変します。',
    wrong: '答えは「500万個に1個」。驚くほどわずかで、性質が一変します。'
  },
  explore: [
    { t: 'p', h: '満席のシリコンに、別の元素をわざと混ぜます。これを<b>ドーピング</b>と呼びます。混ぜる相手は2種類です。' },
    { t: 'h', h: 'n型：手が1本余る' },
    { t: 'p', h: '1つめは、手が5本あるリン。リンがシリコンの席に座ると、4本は隣と手をつなぎますが、<b>1本が余ります</b>。余った手の電子は誰ともつながっておらず、輪からはぐれて結晶の中を自由に動き回ります。マイナス（negative）の電子が電気を運ぶので、n型と呼びます。' },
    { t: 'fig', svg: 'dopants', cap: 'リン（P）を混ぜると電子が1個余り（左）、ホウ素（B）を混ぜると席が1つ空く（右）。オレンジの点線が空席＝正孔。' },
    { t: 'h', h: 'p型：手が1本足りない' },
    { t: 'p', h: '2つめは、手が3本しかないホウ素。ホウ素が座ると、隣と手をつなぐのに1本足りず、<b>席が1つ空きます</b>。この空席を<b>正孔</b>（せいこう）と呼びます。' },
    { t: 'p', h: '空席が、なぜ電気を運ぶのか。隣の電子が空席に移ると、今度は元の場所が空席になる。電子が1歩動くたびに、空席は逆向きに1歩進みます。ボタンを押して試してみてください。' },
    { t: 'sim', id: 'puzzle', cap: '電子が1個ずつ＋側へ移るたびに、空席は−側へ進む。空席はプラス（positive）の電気をもった粒のようにふるまうので、p型と呼ぶ。' },
    { t: 'analogy', ttl: '15パズル', rows: [['ピース', '電子'], ['空白', '正孔（空席）'], ['ピースを左へずらす', '電子が左へ動く'], ['空白が右へ進んで見える', '正孔が右へ動く']],
      breaks: '15パズルの空白は、ただの「何もない場所」です。半導体の正孔は、プラスの電気をもつ粒のようにふるまい、その動きやすさや、粒としての重さまで測ることができます。空席が本物の粒のように扱えてしまう。ここが、たとえを超えた半導体の不思議です。' },
    { t: 'h', h: 'なぜ、ほんの少しで効くのか' },
    { t: 'p', h: '純粋なシリコンは、動ける電子がほとんどゼロでした（A2）。<b>ゼロに近いところに足す</b>から、ほんの少しでも劇的に変わるのです。' }
  ],
  discover: [
    { t: 'num', big: '500万', unit: '個に1個', b: 'この割合でリンを混ぜるだけで', l: '電気の通しやすさは約44万倍になります。' },
    { t: 'p', h: 'ここで、作る側の立場に立ってみます。500万個に1個でこれほど効くなら、<b>混ぜたくない原子</b>が紛れ込んでも、同じように効いてしまうはずです。' },
    { t: 'sim', id: 'doping', cap: 'リンを混ぜる量を変えてみてください。左端が純粋なシリコン。ボタンで代表的な量に飛べる。' },
    { t: 'num', big: '1000億', unit: '個に1個', b: '原料のシリコンに許される、混ぜたくない原子の割合', l: '99.999999999％（イレブンナイン）の純度です。500万個に1個の、さらに2万分の1。地球の全人口（約80億人）を12回集めて、やっと1人だけ違う人が混じる。それくらいの純度が求められます。' }
  ],
  quiz: [
    { type: 'choice', q: 'シリコンに、手が5本のリンを混ぜると何が起きる？', options: ['手が1本余り、電子が自由に動けるようになる（n型）', '手が1本足りず、席が空く（p型）', '手がすべてほどけて、結晶が崩れる', '何も変わらない'], answer: 0, ex: 'リンの5本の手のうち4本が隣とつながり、1本ぶんの電子が自由になります。' },
    { type: 'choice', q: '15パズルのたとえで「空白」にあたるのは？', options: ['電子', '正孔（空席）', 'リン', 'シリコン'], answer: 1, ex: '空白（空席）が動いて見えるのは、まわりのピース（電子）が逆向きに動くからです。' },
    { type: 'tf', q: '正孔が右へ進むとき、電子は左へ動いている。', answer: 0, ex: '電子が空席に移るたびに、空席は逆向きに進みます。' },
    { type: 'fill', before: '原料のシリコンに極めて高い純度が求められるのは、混ぜたくない原子も', after: '効いてしまうから。', options: ['ほんの少しで', 'たくさん混ざったときだけ', '熱を加えたときだけ', '光を当てたときだけ'], answer: 0, ex: '500万個に1個で性質が変わるのだから、意図しない原子は1000億個に1個以下に抑える必要があります。' }
  ],
  summary: '手が5本のリンを混ぜると電子が余り（n型）、手が3本のホウ素を混ぜると空席ができる（p型）。ほんの少しで劇的に効く。',
  next: 'では、n型とp型をくっつけると、何が起きるのか。',
  deeper: [['C', 'つくりかた：純度']],
  sources: ['シリコン原子は約5×10²²個/cm³。純粋なシリコンの抵抗率 約2.3×10⁵ Ω·cm。リン 1×10¹⁶個/cm³（500万個に1個）では、電子の動きやすさを Caughey–Thomas の式（約1180 cm²/V·s）で見積もると抵抗率 約0.53 Ω·cm、通しやすさは約44万倍。シミュレータも同じ式で計算している。', 'イレブンナイン：混ぜたくない原子は1000億個に1個。1000億 ÷ 500万 ＝ 2万。1000億 ÷ 80億人 ≒ 12.5。', '正孔の動きやすさや有効質量（粒としての重さ）は、測定で求められている。']
},
{
  id: 'a4', no: 4, title: 'pn接合とダイオード',
  headline: 'n型とp型をくっつけると、何が起きるのか。',
  predict: {
    q: 'n型とp型をくっつけて、電池につなぎます。電池の向きを逆にすると、どうなると思いますか？',
    options: ['どちらの向きでも、同じように流れる', '片方の向きにしか流れない', 'どちらの向きでも流れない'],
    answer: 1,
    right: '正解。電気の一方通行ができあがります。',
    wrong: '答えは「片方の向きにしか流れない」。電気の一方通行ができあがります。'
  },
  explore: [
    { t: 'p', h: 'n型には、はぐれた電子がたくさん。p型には、空席がたくさん。この2つをくっつけると、境目で何が起きるでしょう。' },
    { t: 'p', h: '境目の近くでは、n側のはぐれ電子が、p側の空席に座ってしまいます。埋まり合った結果、境目には<b>動ける電子も空席もない「緩衝地帯」</b>ができます。' },
    { t: 'sim', id: 'diode', cap: 'スライダーで電池の電圧を変えてみてください。プラスが順向き、マイナスが逆向き。緩衝地帯の幅と、流れる電流が変わる。' },
    { t: 'p', h: '順向き（n側にマイナス、p側にプラス）につなぐと、電池がn側に電子を、p側に空席を押し込みます。緩衝地帯が縮み、境目で電子と空席が出会い続けて、電気が流れます。' },
    { t: 'p', h: '逆向きにつなぐと、電子も空席も境目から引き離されます。緩衝地帯が広がり、電気はほとんど流れません。こうして<b>一方通行</b>ができる。これがダイオードです。' },
    { t: 'analogy', ttl: 'ダンスホールの境目', rows: [['はぐれた踊り手', 'n型の電子'], ['空いた席', 'p型の正孔'], ['境目で座ってしまった人たち', '緩衝地帯'], ['両側から押し込む', '順向きの電圧']],
      breaks: '本物の緩衝地帯には、電子を押し返す電気的な「坂」ができています。順向きの電圧がこの坂を乗り越えるほど強くなって、初めて電気が流れ出します。シリコンの場合、その目安は約0.6Vです。' },
    { t: 'recall', from: 'S1', ttl: '段差', fig: 'step', to: 's1', h: 'はぐれ電子が空席に座ること。それは、電子が<b>上の階から下の階へ落ちる</b>ことです。落ちるとき、段差の高さぶんのエネルギーが外に出ます。' },
    { t: 'h', h: '段差の高さが、光の色になる' },
    { t: 'p', h: 'シリコンでは、このエネルギーはほとんど熱になります。ところが材料を選ぶと、エネルギーが<b>光</b>として出てくる。これが<b>LED</b>（発光ダイオード）です。' },
    { t: 'p', h: '段差が低いと赤い光、高くなるにつれて緑、青へ。<b>段差の高さが、そのまま光の色</b>を決めます。' },
    { t: 'fig', svg: 'led', cap: '段差が高いほど、落ちるときに出るエネルギーが大きく、光は赤 → 緑 → 青へと変わる。青い光の段差は、赤い光の約1.4倍。' },
    { t: 'sim', id: 'led', cap: '材料を切り替えて、電圧を上げてみてください。段差の高い材料ほど、流れ始める電圧も高く、出てくる光は青に近づく。' },
    { t: 'column', tag: '人物コラム', ttl: '青だけが、30年できなかった', ps: [
      '赤いLEDは1962年に生まれ、緑もまもなく続きました。ところが青だけは、30年たっても明るいものができません。青に必要な「高い段差」をもつ材料、窒化ガリウムのきれいな結晶が作れなかったのです。',
      '1989年ごろ、赤崎勇さんと天野浩さんが質の高い結晶と、p型の窒化ガリウムを実現。1993年には中村修二さんが明るい青色LEDを製品にしました。光の三原色がそろい、白いLED照明やフルカラーの画面が可能になります。3人は2014年、ノーベル物理学賞を受けました。'
    ] },
    { t: 'p', h: '逆に、光を当てて電子を段差の上に押し上げ、境目の坂で電子と空席を左右に分けたらどうなるか。電気が生まれます。これが<b>太陽電池</b>。LEDの逆再生です。' }
  ],
  discover: [
    { t: 'num', big: '0.6', unit: 'V', b: 'シリコンのダイオードが流れ始める電圧の目安', l: 'これより弱い押し方では、緩衝地帯の坂を越えられません。乾電池1本（1.5V）なら、十分に越えられます。' }
  ],
  quiz: [
    { type: 'choice', q: 'n型とp型の境目に「緩衝地帯」ができるのはなぜ？', options: ['はぐれ電子が空席に座って、埋まり合うから', '境目が熱くなるから', '境目にリンが集まるから', '光が当たらないから'], answer: 0, ex: '境目で電子と空席が埋まり合い、動けるものが何もない地帯ができます。' },
    { type: 'choice', q: '順向きの電圧をかけると、緩衝地帯はどうなる？', options: ['縮む', '広がる', '変わらない', '消えて、二度とできない'], answer: 0, ex: '電子と空席が押し込まれて地帯が縮み、境目で出会い続けることで電気が流れます。電圧をやめれば、地帯は元に戻ります。' },
    { type: 'tf', q: 'LEDの光の色は、段差の高さで決まる。', answer: 0, ex: '段差が低いと赤、高いと青。落ちるときに出るエネルギーの大きさが、光の色になります。' },
    { type: 'choice', q: '青色LEDが長いあいだ作れなかった理由は？', options: ['高い段差をもつ材料の、きれいな結晶が作れなかったから', '青い光は目に見えないから', '電気代がかかりすぎたから', '法律で禁止されていたから'], answer: 0, ex: '窒化ガリウムの質の高い結晶づくりが壁でした。それを乗り越えた3人が、2014年にノーベル賞を受けています。' }
  ],
  summary: 'n型とp型をくっつけると、境目に緩衝地帯ができて一方通行になる。電子が段差を落ちるエネルギーは、材料によって光になる。',
  next: 'では、この境目を、電気で開けたり閉めたりできないか。',
  deeper: [['D', 'どこで使われてる？：LEDと太陽電池']],
  sources: ['シリコンダイオードの順方向電圧 約0.6〜0.7V。', '光のエネルギーの目安：赤 約1.9eV、緑 約2.3eV、青 約2.7eV（2.7 ÷ 1.9 ≒ 1.4）。LEDが光り始める電圧も、ほぼこの値（シミュレータでは赤 約1.8V、青 約2.7V としている）。', '赤色LED：1962年。青色LED：赤崎勇・天野浩（1989年ごろ p型窒化ガリウム）、中村修二（1993年 高輝度青色LED）。2014年 ノーベル物理学賞。']
},
{
  id: 'a5', no: 5, title: 'トランジスタ',
  headline: '動く部品のないスイッチは、どうやって開け閉めしているのか。',
  predict: {
    q: 'トランジスタは、n型・p型・n型の順に並べたものです。このまま両端に電池をつなぐと、電気は流れると思いますか？',
    options: ['流れる', '流れない', '半分だけ流れる'],
    answer: 1,
    right: '正解。真ん中のp型が、電子にとっての「壁」になります。',
    wrong: '答えは「流れない」。真ん中のp型が、電子にとっての「壁」になります。'
  },
  explore: [
    { t: 'p', h: '入口（n型）・壁（p型）・出口（n型）。境目が2つあります。電池をどちら向きにつないでも、どちらかの境目が必ず逆向きになる（A4）。だから、このままでは電気は流れません。' },
    { t: 'p', h: 'そこで、壁の上に<b>門（ゲート）</b>をのせます。門は金属の板で、壁とのあいだには、電気を通さないごく薄い膜をはさみます。' },
    { t: 'p', h: '門にプラスの電圧をかけると、マイナスの電子が門の真下に引き寄せられます。壁の表面に電子がずらりと並び、<b>入口から出口へつながる薄い「道」</b>が現れる。電気が流れます。' },
    { t: 'sim', id: 'mos', cap: 'トランジスタの断面（上）と、電子から見た壁の高さ（下）。門の電圧で、壁の表面に電子の道が現れ、壁が低くなる。' },
    { t: 'analogy', ttl: '潮が引くと現れる道', rows: [['海', 'p型の壁'], ['潮が引く', '門にプラスの電圧をかける'], ['現れる砂の道', '引き寄せられた電子の層'], ['歩いて渡れる', '電気が流れる']],
      breaks: '潮は何時間もかけて満ち引きしますが、トランジスタの道は10億分の1秒より短い時間で現れ、消えます。そして道の厚さは、わずか数nm。シリコン原子十数個分の薄さです。' },
    { t: 'h', h: 'S2の「門」の正体' },
    { t: 'p', h: 'サマリS2で、門に電圧をかけると電気が流れる図を見ました。その中身がこれです。門と道のあいだには電気を通さない膜があるので、<b>門そのものにはほとんど電流が流れません</b>。わずかな電気で道を出し入れできるから、トランジスタの出力で次のトランジスタの門を押せる。だから連鎖して計算ができるのです。' },
    { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: 'いまの道は、門に囲まれている', ps: [
      '道が細くなるほど、上からの門1枚では道を開け閉めしきれなくなります。そこで最先端のトランジスタは、道をひれのように立てて3方向から門で囲んだり（FinFET）、道を4方向すべてから門で包んだり（GAA）しています。',
      '地図画面のズームで見た「トランジスタの列」の縞模様は、この立てた道と門が交差する様子をイメージしたものです。'
    ] }
  ],
  discover: [
    { t: 'num', big: '数', unit: 'nm', b: '電圧が作る「道」の厚さ', l: 'シリコン原子にして十数個分。スマホのチップの中では、190億個のスイッチの一つひとつで、この薄い道が現れては消えています。' }
  ],
  quiz: [
    { type: 'choice', q: 'n型・p型・n型を並べただけでは電気が流れないのはなぜ？', options: ['どちら向きに押しても、どちらかの境目が逆向きになるから', '電子が1個もないから', '長すぎるから', '光が当たっていないから'], answer: 0, ex: '境目が2つあるので、片方は必ず逆向きのダイオードになり、流れを止めます。' },
    { type: 'choice', q: '門にプラスの電圧をかけると、p型の表面に何が集まる？', options: ['電子', '正孔', 'リン原子', '光'], answer: 0, ex: 'プラスの電圧にマイナスの電子が引き寄せられ、表面に薄い道ができます。' },
    { type: 'tf', q: '門と道のあいだには電流がほとんど流れないので、門はわずかな電気で開け閉めできる。', answer: 0, ex: 'あいだに電気を通さない膜があるからです。だから、出てきた電気で次の門を押す連鎖ができます。' },
    { type: 'choice', q: '潮のたとえで「潮が引く」にあたるのは？', options: ['門にプラスの電圧をかける', '電池を外す', 'シリコンを温める', 'リンを混ぜる'], answer: 0, ex: '潮が引くと砂の道が現れるように、電圧をかけると電子の道が現れます。' }
  ],
  summary: 'トランジスタは、p型の壁の上に門をのせたもの。門の電圧で電子の道が現れ、電気が流れる。',
  next: 'このスイッチを、どう組み合わせれば計算になるのか。その前に、ここまでを一本の線でつなぎ直します。',
  deeper: [['B', '計算のしくみ'], ['C', 'つくりかた']],
  sources: ['電圧で現れる電子の層（反転層）の厚さは数nm程度。', 'シミュレータは、道ができ始める電圧を0.4V、電流を 500µA/V² ×（電圧 − 0.4V）² とした単純なモデル。', 'FinFET は2010年代から、GAA は2020年代から量産に使われている。']
},
{
  id: 'a6', no: 6, title: 'ふりかえり',
  headline: '電子1個から、スイッチまで。一本の線でつなぐ。',
  lead: '5つの章で見てきたことは、すべてつながっています。順番にたどり直してから、総合問題と「説明してみよう」に挑戦しましょう。',
  labels: { explore: '② たどり直す', quiz: '③ 総合問題', after: '④ 余韻' },
  explore: [
    { t: 'recap', ids: ['a1', 'a2', 'a3', 'a4', 'a5'] },
    { t: 'p', h: '電子は、ゆっくり動く小さな粒（A1）。シリコンの結晶では、全員が4本の手をつなぎ合っていて動けない（A2）。リンやホウ素を混ぜると、はぐれ電子や空席が生まれる（A3）。n型とp型をくっつけると、境目が一方通行になる（A4）。そして、壁の上の門の電圧で道を出し入れすれば、スイッチになる（A5）。' },
    { t: 'p', h: 'そのあいだずっと、サマリS1の<b>段差</b>が背後にありました。手を振りほどく力が段差の高さを決め（A2）、段差を落ちるエネルギーがLEDの色になり（A4）、門の電圧が電子にとっての壁を低くする（A5）。「中途半端な段差」こそが、半導体のすべての出発点です。' }
  ],
  quiz: [
    { type: 'order', q: 'トランジスタができるまでの話を、順に並べてください。', items: ['シリコンは手をつなぎ合っていて、電子が動けない', 'リンを混ぜると、はぐれ電子ができる', 'n型とp型をくっつけると、一方通行になる', '門の電圧で道が現れ、スイッチになる'], ex: '満席 → 混ぜ物 → 境目 → 門。一つひとつが、次の章の前提になっています。' },
    { type: 'choice', q: '正孔の正体は？', options: ['手が足りずにできた空席', '小さな穴の開いた原子', 'プラスの電気をもつ電子', '光の粒'], answer: 0, ex: '手が3本のホウ素を混ぜると、席が1つ空きます。電子が空席に移るたびに、空席は逆向きに動きます。' },
    { type: 'choice', q: 'サマリS1の「段差」が、光の色として回収されたのはどの章？', options: ['A1 電気が流れるとは', 'A2 シリコンの結晶', 'A4 pn接合とダイオード', 'A5 トランジスタ'], answer: 2, ex: '電子が段差を落ちるとき、段差の高さぶんのエネルギーが光になる。それがLEDでした。' },
    { type: 'tf', q: '電線の中の電子が速く走っているから、明かりは一瞬でつく。', answer: 1, ex: '電子そのものはカタツムリより遅い。電線が電子で満タンで、押す力が一瞬で伝わるからです。' },
    { type: 'choice', q: 'トランジスタの門が、わずかな電気で開け閉めできるのはなぜ？', options: ['門と道のあいだに電気を通さない膜があり、電流がほとんど流れないから', '門がとても小さいから', '門が冷やされているから', '門の中にリンが入っているから'], answer: 0, ex: '門は電圧で電子を引き寄せるだけで、電流はほとんど使いません。だから次のトランジスタの門を押す連鎖ができます。' },
    { type: 'explain', q: 'トランジスタが「電気で開け閉めできるスイッチ」になるしくみを、「壁」「電子」「道」という言葉を使って説明してください。', model: 'トランジスタは、n型・p型・n型を並べたもの。真ん中のp型が電子にとっての壁になっていて、そのままでは電気は流れない。門にプラスの電圧をかけると、壁の表面に電子が引き寄せられて薄い道ができ、入口から出口へ電気が流れる。電圧をやめると道は消える。動く部品がないので、一瞬で、すり減らずに切り替えられる。' }
  ],
  summary: '満席の結晶、混ぜ物、境目、門。4つがつながって、半導体はスイッチになる。',
  next: 'このスイッチを組み合わせると、なぜ計算ができるのか。それが、次のモジュールBです。',
  deeper: [['B', '計算のしくみ'], ['C', 'つくりかた'], ['D', 'どこで使われてる？']],
  sources: ['数字と出典は、A1〜A5の各章の最後を参照。']
}
];

registerModule({
  code: 'A',
  name: 'しくみ',
  ds: '電子、シリコンの結晶、n型とp型、ダイオードとLED、トランジスタ',
  css, figs, sims, steps
});
})();
