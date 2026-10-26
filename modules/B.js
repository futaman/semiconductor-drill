/* モジュールB「計算のしくみ」
   スイッチがスイッチを押す（S2）→ 0と1 → 判断（ゲート）→ NAND 1種類 → 足し算 → 記憶 → 合図で回る輪 */
(() => {
  /* ===== 小さな道具 ===== */
  const $ = (el, s) => el.querySelector(s);
  const $$ = (el, s) => Array.from(el.querySelectorAll(s));
  const press = (btn, on) => btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const later = (ctx, ms) => (ctx.reducedMotion ? 0 : ms);
  // 再現できる乱数（統計の数字が開くたびに変わらないように）
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };

  /* ===== SVG の部品 ===== */
  // 電気の通り道。流れているときは青く光り、白い点が流れる
  const wire = (d, on) => `<path d="${d}" class="b-w${on ? ' on' : ''}"/>${on ? `<path d="${d}" class="b-fl"/>` : ''}`;
  // 横向きのスイッチ（入力がオンで閉じる）
  const swH = (x, y, closed, lab) => `<line x1="${x - 18}" y1="${y}" x2="${closed ? x + 18 : x + 13}" y2="${closed ? y : y - 15}" class="b-lev"/>
    <circle cx="${x - 18}" cy="${y}" r="4" class="b-term"/><circle cx="${x + 18}" cy="${y}" r="4" class="b-term"/>${lab ? `<text x="${x}" y="${y + 25}" class="b-tx" text-anchor="middle">${lab}</text>` : ''}`;
  // 縦向きのスイッチ
  const swV = (x, y, closed, lab) => `<line x1="${x}" y1="${y + 18}" x2="${closed ? x : x + 15}" y2="${closed ? y - 18 : y - 13}" class="b-lev"/>
    <circle cx="${x}" cy="${y - 18}" r="4" class="b-term"/><circle cx="${x}" cy="${y + 18}" r="4" class="b-term"/>${lab ? `<text x="${x - 12}" y="${y + 6}" class="b-tx" text-anchor="end">${lab}</text>` : ''}`;
  const lamp = (x, y, on, r = 17) => `<circle cx="${x}" cy="${y}" r="${r}" class="b-lamp${on ? ' on' : ''}"/><path d="M ${x - r * .45} ${y - r * .45} L ${x + r * .45} ${y + r * .45} M ${x + r * .45} ${y - r * .45} L ${x - r * .45} ${y + r * .45}" class="b-fil"/>`;
  // NAND・NOR の形（四角＋半円＋反対を表す小さな丸）。入力は (x, y±9)、出力は (x+51, y)
  const gateBody = (x, y, lab) => `<line x1="${x - 8}" y1="${y - 9}" x2="${x}" y2="${y - 9}" class="b-pin"/><line x1="${x - 8}" y1="${y + 9}" x2="${x}" y2="${y + 9}" class="b-pin"/>
    <path d="M ${x} ${y - 18} H ${x + 24} A 18 18 0 0 1 ${x + 24} ${y + 18} H ${x} Z" class="b-gate"/><circle cx="${x + 47}" cy="${y}" r="4" class="b-gate"/>
    <text x="${x + 19}" y="${y + 4.5}" class="b-tm" text-anchor="middle">${lab}</text>`;
  const ttRow = (cells, cur) => `<tr class="${cur ? 'cur' : ''}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;

  /* ===== 回路（スイッチとランプ）：AND・OR・NOT・NAND ===== */
  const MODE = {
    AND: { lab: '金庫（AND）', two: true, out: (a, b) => a && b },
    OR: { lab: '玄関2つ（OR）', two: true, out: (a, b) => a || b },
    NOT: { lab: '反対（NOT）', two: false, out: a => !a },
    NAND: { lab: 'NAND', two: true, out: (a, b) => !(a && b) }
  };
  function circuitSVG(m, A, B) {
    let w = '', parts = '', extra = '';
    const lampOn = MODE[m].out(A, B);
    const bottom = 'M 350 152 V 200 H 40 V 126';
    if (m === 'AND') {
      const on = A && B;
      w = wire('M 40 116 V 70 H 122', on) + wire('M 158 70 H 222', on) + wire('M 258 70 H 350 V 118', on) + wire(bottom, on);
      parts = swH(140, 70, A, 'A') + swH(240, 70, B, 'B');
    } else if (m === 'OR') {
      const any = A || B;
      w = wire('M 40 116 V 70 H 130', any) + wire('M 130 70 V 40 H 182', A) + wire('M 218 40 H 270 V 70', A) +
        wire('M 130 70 V 100 H 182', B) + wire('M 218 100 H 270 V 70', B) + wire('M 270 70 H 350 V 118', any) + wire(bottom, any);
      parts = swH(200, 40, A, 'A') + swH(200, 100, B, 'B');
    } else {
      // NOT と NAND：抵抗のあとに「抜け道」があり、抜け道がつながるとランプに電気が行かない
      const by = m === 'NOT' ? A : (A && B);
      w = wire('M 40 116 V 70 H 100', true) + wire('M 100 70 l 5 -9 l 10 18 l 10 -18 l 10 18 l 10 -18 l 10 18 l 5 -9', true) + wire('M 160 70 H 250', true) +
        wire('M 250 70 H 350 V 118', !by) + wire('M 350 152 V 200 H 250', !by) + wire('M 250 200 H 40 V 126', true);
      if (m === 'NOT') {
        w += wire('M 250 70 V 112', by) + wire('M 250 148 V 200', by);
        parts = swV(250, 130, A, 'A');
      } else {
        w += wire('M 250 70 V 82', by) + wire('M 250 118 V 132', by) + wire('M 250 168 V 200', by);
        parts = swV(250, 100, A, 'A') + swV(250, 150, B, 'B');
      }
      extra = `<text x="130" y="50" class="b-ts" text-anchor="middle">抵抗</text><text x="${m === 'NOT' ? 222 : 214}" y="${m === 'NOT' ? 182 : 196}" class="b-te" text-anchor="end">${by ? '抜け道' : ''}</text>`;
    }
    return `<svg viewBox="0 0 400 236" role="img" aria-label="スイッチとランプの回路（${MODE[m].lab}）">${w}
      <line x1="25" y1="116" x2="55" y2="116" class="b-lev"/><line x1="32" y1="126" x2="48" y2="126" class="b-lev" style="stroke-width:6"/><text x="60" y="110" class="b-tm">＋</text>
      ${parts}${lamp(350, 135, lampOn)}${extra}
      <text x="40" y="228" class="b-ts" text-anchor="middle">電源</text><text x="350" y="228" class="b-ts" text-anchor="middle">ランプ</text></svg>`;
  }
  const NOTE = {
    AND: (a, b) => a && b ? 'AとBの両方が閉じて、道が1本につながった。ランプがつく。' : '直列のスイッチは、1つでも開いていれば道が切れる。ランプは消えたまま。',
    OR: (a, b) => a || b ? (a && b ? '両方の道が開いている。それでもランプの明るさ（出力）は1のまま。' : 'どちらか一方の道を通って、電気がランプに届く。') : '両方とも開いている。どちらの道も通れない。',
    NOT: a => a ? 'Aが閉じると、電気は抵抗のあと「抜け道」へ流れ、ランプには届かない。入力が1で、出力は0。' : 'Aが開いているので、電気は抵抗を通ってランプへ。入力が0で、出力は1。',
    NAND: (a, b) => a && b ? 'AとBがそろって、抜け道がつながった。ランプが消える。' : '抜け道はどこかで切れている。電気はランプへ届き、ランプはつく。'
  };
  function gateSim(modes, key) {
    return {
      html() {
        const seg = modes.length > 1 ? `<div class="seg" role="group" aria-label="つなぎ方">${modes.map((m, i) => `<button class="btn b-mode" data-m="${m}" aria-pressed="${i === 0}">${MODE[m].lab}</button>`).join('')}</div>` : '';
        return `<div class="b-sim">${seg}<div class="b-cv">${circuitSVG(modes[0], false, false)}</div>
          <div class="seg"><button class="btn b-in b-tog" data-in="A" aria-pressed="false">入力A：オフ</button><button class="btn b-in b-tog" data-in="B" aria-pressed="false">入力B：オフ</button></div>
          <div class="b-ttw"></div><p class="sim-note" id="b-${key}-note" aria-live="polite"></p></div>`;
      },
      mount(el) {
        let m = modes[0], A = false, B = false;
        const draw = () => {
          const two = MODE[m].two;
          $(el, '.b-cv').innerHTML = circuitSVG(m, A, B);
          $$(el, '.b-in').forEach(b => { const v = b.dataset.in === 'A' ? A : B; press(b, v); b.textContent = `入力${b.dataset.in}：${v ? 'オン' : 'オフ'}`; b.hidden = b.dataset.in === 'B' && !two; });
          $$(el, '.b-mode').forEach(b => press(b, b.dataset.m === m));
          const rows = two ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[0], [1]];
          $(el, '.b-ttw').innerHTML = `<table class="b-tt"><tr><th>A</th>${two ? '<th>B</th>' : ''}<th>ランプ（出力）</th></tr>${rows.map(r => ttRow([...r, MODE[m].out(!!r[0], !!r[1]) ? 1 : 0], r[0] === +A && (!two || r[1] === +B))).join('')}</table>`;
          $(el, `#b-${key}-note`).textContent = NOTE[m](A, B);
        };
        el.addEventListener('click', e => {
          const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
          if (t.dataset.m) { m = t.dataset.m; A = B = false; }
          else if (t.dataset.in === 'A') A = !A;
          else if (t.dataset.in === 'B') B = !B;
          else return;
          draw();
        });
        draw();
      }
    };
  }

  /* ===== 静止した図 ===== */
  const figs = {
    // B4 の伏線：金庫（AND）＝繰り上がり
    safe() {
      return `<svg viewBox="0 0 280 124" role="img" aria-label="鍵2本で開く金庫と同じ、直列のスイッチ">
        ${wire('M 16 54 H 70', true)}${wire('M 106 54 H 152', true)}${wire('M 188 54 H 230', true)}
        ${swH(88, 54, true, 'A')}${swH(170, 54, true, 'B')}${lamp(248, 54, true, 14)}
        <text x="140" y="112" class="b-ts" text-anchor="middle">両方そろったときだけ1 ＝ 繰り上がり</text></svg>`;
    },
    // B6 の伏線：B1 の「＋1」
    counter() {
      const row = (y, bits) => bits.map((b, i) => `<rect x="${70 + i * 40}" y="${y}" width="32" height="32" rx="5" class="b-bx${b ? ' on' : ''}"/><text x="${86 + i * 40}" y="${y + 22}" class="b-bt${b ? ' on' : ''}" text-anchor="middle">${b}</text>`).join('');
      return `<svg viewBox="0 0 280 124" role="img" aria-label="0111に1を足すと1000になる">
        <text x="56" y="30" class="b-tm" text-anchor="end">7</text>${row(8, [0, 1, 1, 1])}
        <text x="56" y="100" class="b-tm" text-anchor="end">8</text>${row(78, [1, 0, 0, 0])}
        <text x="252" y="64" class="b-te" text-anchor="middle">＋1</text><path d="M 236 44 V 72" class="ln-e"/><path d="M 231 66 L 236 74 L 241 66" class="ln-e"/></svg>`;
    },
    // B6：スイッチから計算機までのはしご
    ladder() {
      const st = [
        ['A5', 'トランジスタ', '電気で押せるスイッチ。出てきた電気で、次のスイッチを押せる'],
        ['B2・B3', 'ゲート（NAND）', 'スイッチ4個。これ1種類で、どんな判断も組み立てられる'],
        ['B4・B5', '足し算機と記憶', '全加算器はNAND 9個。1ビットの記憶はNOR 2個の輪'],
        ['B6', '合図で回る輪', '足し算の答えを、合図のたびに記憶へ書き戻す'],
        ['D', 'CPU（頭脳）', '「何を、どこから、どうするか」を読む回路を足したもの']
      ];
      return `<div class="b-lad">${st.map((s, i) => `<div class="st"><div class="k">${i + 1}　${s[0]}</div><div class="sh">${s[1]}</div><div class="sd">${s[2]}</div></div>`).join('')}</div>`;
    }
  };

  /* ===== シミュレータ ===== */
  const sims = {
    /* B1：2進数で数える（繰り上がりが伝わる） */
    count: {
      html() {
        const cell = (i, p) => `<div class="b-cell${i === 4 ? ' b-ovf' : ''}" data-i="${i}"><span class="v">0</span><span class="p">${p}</span></div>`;
        return `<div class="b-sim"><div class="b-cnt">${cell(4, 'あふれ')}${cell(3, 8)}${cell(2, 4)}${cell(1, 2)}${cell(0, 1)}</div>
          <div class="sim-read"><span>10進数で <b id="b-count-dec">0</b></span><span>2進数で <b id="b-count-bin" class="mono">0000</b></span></div>
          <div class="seg"><button class="btn primary" id="b-count-inc">＋1</button><button class="btn" id="b-count-reset">0に戻す</button></div>
          <p class="sim-note" id="b-count-note" aria-live="polite">「＋1」を押して、0から数えてみてください。</p></div>`;
      },
      mount(el, ctx) {
        const bits = [0, 0, 0, 0, 0]; let busy = false, timer = 0;
        const cell = i => $(el, `.b-cell[data-i="${i}"]`), note = $(el, '#b-count-note');
        const val = () => bits[0] + bits[1] * 2 + bits[2] * 4 + bits[3] * 8;
        const paint = () => {
          for (let i = 0; i < 5; i++) { const c = cell(i); c.classList.toggle('on', !!bits[i]); $(c, '.v').textContent = bits[i]; }
          $(el, '#b-count-dec').textContent = val(); $(el, '#b-count-bin').textContent = bits.slice(0, 4).reverse().join('');
        };
        const unmark = () => $$(el, '.b-cell').forEach(c => c.classList.remove('carry'));
        $(el, '#b-count-inc').addEventListener('click', () => {
          if (busy) return; busy = true; bits[4] = 0; unmark();
          let i = 0, carries = 0;
          const step = () => {
            unmark();
            if (i === 4) { bits[4] = 1; paint(); cell(4).classList.add('carry'); busy = false;
              note.textContent = '4桁では15が限界。繰り上がりが左端からあふれて、0000に戻った。桁を増やせば、もっと大きな数を表せる。'; return; }
            if (bits[i]) { bits[i] = 0; i++; carries++; paint(); cell(i).classList.add('carry'); timer = setTimeout(step, later(ctx, 300)); return; }
            bits[i] = 1; paint(); busy = false;
            note.textContent = carries ? `1の位がいっぱいで、繰り上がりが${carries}桁ぶん伝わった。いまの数は${val()}。` : `空いている1の位に1が入っただけ。繰り上がりなし。いまの数は${val()}。`;
          };
          step();
        });
        $(el, '#b-count-reset').addEventListener('click', () => { clearTimeout(timer); busy = false; bits.fill(0); unmark(); paint(); note.textContent = '0に戻した。'; });
        paint();
        return () => clearTimeout(timer);
      }
    },

    /* B1：伝言ゲーム（10段階 と 2段階、ゆらぎがたまるか） */
    relay: {
      html() {
        return `<div class="b-sim"><div class="seg" role="group" aria-label="送り方">
            <button class="btn b-mode" data-m="10" aria-pressed="true">10段階（0〜9）で送る</button><button class="btn b-mode" data-m="2" aria-pressed="false">2段階（0と1）で送る</button></div>
          <div class="b-cv" id="b-relay-cv"></div>
          <div class="sim-ctrl"><label for="b-relay-n">ゆらぎの大きさ</label><input type="range" id="b-relay-n" min="0" max="10" step="1" value="3"><output id="b-relay-n-out">3</output></div>
          <div class="sim-read"><span>正しく届いた割合　10段階 <b id="b-relay-r10">–</b>%</span><span>2段階 <b id="b-relay-r2">–</b>%</span></div>
          <p class="sim-note" id="b-relay-note" aria-live="polite"></p></div>`;
      },
      mount(el, ctx) {
        const SIG = [0, .006, .012, .02, .03, .045, .06, .08, .1, .13, .17];
        const HOPS = 8, X = s => 62 + s * 41, Y = v => 196 - Math.max(-.08, Math.min(1.08, v)) * 160;
        let L = 10, n = 3, trials = [], timer = 0, live = rng(7);
        const send = (lv, sig, r) => {
          const d = Math.floor(r() * lv); let v = d / (lv - 1); const pts = [[0, v, v]];
          for (let s = 1; s <= HOPS; s++) { const noisy = v + gauss(r) * sig; v = lv === 2 ? (noisy > .5 ? 1 : 0) : noisy; pts.push([s, noisy, v]); }
          const got = Math.max(0, Math.min(lv - 1, Math.round(v * (lv - 1))));
          return { d, got, pts, ok: d === got };
        };
        const rate = lv => { const r = rng(12345 + lv); let ok = 0; for (let i = 0; i < 4000; i++) if (send(lv, SIG[n], r).ok) ok++; return ok / 40; };
        const draw = () => {
          let g = '';
          if (L === 10) for (let k = 0; k < 10; k++) g += `<line x1="58" x2="${X(HOPS) + 4}" y1="${Y(k / 9)}" y2="${Y(k / 9)}" class="b-grid"/><text x="50" y="${Y(k / 9) + 4}" class="b-tm" text-anchor="end">${k}</text>`;
          else g = `<line x1="58" x2="${X(HOPS) + 4}" y1="${Y(1)}" y2="${Y(1)}" class="b-grid"/><line x1="58" x2="${X(HOPS) + 4}" y1="${Y(0)}" y2="${Y(0)}" class="b-grid"/>
            <line x1="58" x2="${X(HOPS) + 4}" y1="${Y(.5)}" y2="${Y(.5)}" class="b-grid" stroke-dasharray="4 4"/><text x="50" y="${Y(1) + 4}" class="b-tm" text-anchor="end">1</text><text x="50" y="${Y(0) + 4}" class="b-tm" text-anchor="end">0</text>
            <text x="${X(HOPS)}" y="${Y(.5) - 6}" class="b-tm" text-anchor="end">真ん中より上なら1と読む</text>`;
          let lines = '';
          trials.forEach((t, i) => {
            const newest = i === trials.length - 1, op = newest ? 1 : .18 + .5 * i / trials.length;
            let d = `M ${X(0)} ${Y(t.pts[0][2])}`;
            t.pts.slice(1).forEach(p => { d += ` L ${X(p[0])} ${Y(p[1])}`; if (L === 2) d += ` L ${X(p[0])} ${Y(p[2])}`; });
            lines += `<path d="${d}" fill="none" stroke="var(${t.ok ? '--ok' : '--ng'})" stroke-width="${newest ? 2.6 : 1.4}" stroke-opacity="${op}" stroke-linejoin="round"/>`;
            if (newest) lines += `<circle cx="${X(HOPS)}" cy="${Y(t.pts[HOPS][2])}" r="5" fill="var(${t.ok ? '--ok' : '--ng'})"/>`;
          });
          let ticks = '';
          for (let s = 1; s <= HOPS; s++) ticks += `<text x="${X(s)}" y="218" class="b-tm" text-anchor="middle">${s}</text>`;
          const t = trials[trials.length - 1];
          $(el, '#b-relay-cv').innerHTML = `<svg viewBox="0 0 420 252" role="img" aria-label="電気の高さが中継のたびにどう変わるかのグラフ">${g}${lines}
            <text x="${X(0)}" y="218" class="b-tm" text-anchor="middle">送</text>${ticks}
            <text x="${X(HOPS) + 4}" y="242" class="b-ts" text-anchor="end">中継の回数 →</text>
            ${t ? `<text x="60" y="20" class="b-tx">送った ${t.d} → 届いた ${t.got}</text><text x="${X(HOPS) + 4}" y="20" class="b-tx" text-anchor="end" style="fill:var(${t.ok ? '--ok' : '--ng'})">${t.ok ? '正しく届いた' : '化けた'}</text>` : ''}</svg>`;
        };
        const stats = () => {
          const r10 = rate(10), r2 = rate(2);
          $(el, '#b-relay-r10').textContent = r10.toFixed(0); $(el, '#b-relay-r2').textContent = r2.toFixed(0);
          $(el, '#b-relay-n-out').textContent = n;
          $(el, '#b-relay-note').textContent = n === 0 ? 'ゆらぎがなければ、どちらの送り方でも正しく届く。スライダーでゆらぎを大きくしてみてください。'
            : r2 >= 99.5 && r10 < 90 ? `10段階は、ゆらぎがたまって隣の数字に化けていく。2段階は、中継のたびに「1か0か」を決め直すので、ゆらぎが次へ持ち越されない。`
            : r2 < 99.5 ? 'ここまで大きいと、2段階でもまれに読み違える。本物のチップは、ゆらぎがこの手前に収まるよう余裕をとって設計する。'
            : '10段階でも、まだ多くは届いている。もう少しゆらぎを大きくしてみてください。';
        };
        const add = () => { trials.push(send(L, SIG[n], live)); if (trials.length > 14) trials.shift(); draw(); };
        const refill = () => { trials = []; for (let i = 0; i < 14; i++) trials.push(send(L, SIG[n], live)); draw(); };
        el.addEventListener('click', e => {
          const b = e.target.closest('.b-mode'); if (!b) return;
          L = +b.dataset.m; $$(el, '.b-mode').forEach(x => press(x, x === b)); refill();
        });
        $(el, '#b-relay-n').addEventListener('input', e => { n = +e.target.value; stats(); refill(); });
        stats(); refill();
        if (!ctx.reducedMotion) timer = setInterval(add, 650);
        return () => clearInterval(timer);
      }
    },

    /* B2：AND・OR・NOT の回路 */
    gates: gateSim(['AND', 'OR', 'NOT'], 'gates'),
    /* B3：NAND のしかけ */
    nandsw: gateSim(['NAND'], 'nandsw'),

    /* B3：NAND だけで組み立てるパズル */
    puzzle: {
      html() {
        return `<div class="b-sim"><div class="seg" role="group" aria-label="作るもの" id="b-pz-lv"></div>
          <p class="b-goal" id="b-pz-goal"></p>
          <div class="b-cv" id="b-pz-cv"></div>
          <div class="seg"><button class="btn b-in b-tog" data-in="A" aria-pressed="false">入力A：オフ</button><button class="btn b-in b-tog" data-in="B" aria-pressed="false">入力B：オフ</button></div>
          <div class="b-socks" id="b-pz-socks"></div>
          <div id="b-pz-tt"></div>
          <p class="sim-note" id="b-pz-note" aria-live="polite"></p>
          <div class="seg"><button class="btn" id="b-pz-hint">ヒント</button><button class="btn" id="b-pz-ans">答えを見る</button></div></div>`;
      },
      mount(el) {
        const LV = {
          NOT: { name: 'NOT（反対）', goal: 'NAND 1個で、Aの反対を出す', pos: [[180, 100]], init: [['1', '1']], f: a => !a, onlyA: true, sol: [['A', 'A']],
            hint: 'NANDの2つの入力に、同じものをつないでみましょう。「両方オン」か「両方オフ」しか起きなくなります。' },
          AND: { name: 'AND（金庫）', goal: 'NAND 2個で、AとBの両方がオンのときだけ1を出す', pos: [[135, 100], [262, 100]], init: [['A', 'B'], ['A', 'B']], f: (a, b) => a && b, sol: [['A', 'B'], ['G1', 'G1']],
            hint: 'NANDは「ANDの反対」。G1で作ったNANDの出力を、もう一度反対にすれば…。反対の作り方は、NOTのパズルで見つけました。' },
          OR: { name: 'OR（玄関2つ）', goal: 'NAND 3個で、AかBのどちらかがオンなら1を出す', pos: [[135, 55], [135, 145], [262, 100]], init: [['A', 'B'], ['A', 'B'], ['G1', 'G2']], f: (a, b) => a || b, sol: [['A', 'A'], ['B', 'B'], ['G1', 'G2']],
            hint: '「どちらかがオン」は「両方ともオフ、ではない」と同じこと。G1でAの反対、G2でBの反対を作ってから、G3に入れてみましょう。' },
          XOR: { name: '上級：どちらか一方だけ', goal: 'NAND 4個で、AとBのどちらか一方だけがオンのときに1を出す（B4の足し算で使います）', pos: [[112, 100], [205, 52], [205, 148], [300, 100]], init: [['A', 'B'], ['A', 'B'], ['A', 'B'], ['A', 'B']], f: (a, b) => a !== b, sol: [['A', 'B'], ['A', 'G1'], ['B', 'G1'], ['G2', 'G3']],
            hint: 'まず G1＝NAND(A, B)。次に、G2にはAとG1を、G3にはBとG1をつなぎ、最後にG4でG2とG3をまとめます。' }
        };
        const SRC = { A: [26, 40], B: [26, 100], 1: [26, 160] };
        const solved = {}; let lv = 'NOT', A = false, B = false, conn = {}, hintOn = false;
        Object.keys(LV).forEach(k => conn[k] = LV[k].init.map(p => p.slice()));
        const opts = (k, i) => LV[k].onlyA ? ['A', '1'] : ['A', 'B', '1', ...Array.from({ length: i }, (_, j) => 'G' + (j + 1))];
        const evalAll = (k, a, b) => {
          const g = [];
          const v = s => s === 'A' ? a : s === 'B' ? b : s === '1' ? true : g[+s.slice(1) - 1];
          conn[k].forEach((p, i) => { g[i] = !(v(p[0]) && v(p[1])); });
          return { g, v };
        };
        const draw = () => {
          const L = LV[lv], c = conn[lv], { g, v } = evalAll(lv, A, B);
          const outOf = s => s[0] === 'G' ? [L.pos[+s.slice(1) - 1][0] + 51, L.pos[+s.slice(1) - 1][1]] : [SRC[s][0] + 12, SRC[s][1]];
          let wires = '';
          c.forEach((p, i) => p.forEach((s, k) => {
            const [sx, sy] = outOf(s), ix = L.pos[i][0] - 8, iy = L.pos[i][1] + (k ? 9 : -9), mx = (sx + ix) / 2;
            wires += wire(`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${iy}, ${ix} ${iy}`, v(s));
          }));
          const last = L.pos.length - 1, out = g[last], [ox, oy] = [L.pos[last][0] + 51, L.pos[last][1]];
          wires += wire(`M ${ox} ${oy} H 384`, out);
          const src = ['A', 'B', '1'].filter(s => !(L.onlyA && s === 'B')).map(s => { const on = s === '1' || (s === 'A' ? A : B);
            return `<circle cx="${SRC[s][0]}" cy="${SRC[s][1]}" r="13" class="b-src${on ? ' on' : ''}"/><text x="${SRC[s][0]}" y="${SRC[s][1] + 5}" class="b-tx b-srct${on ? ' on' : ''}" text-anchor="middle">${s}</text>`; }).join('');
          const gates = L.pos.map((p, i) => gateBody(p[0], p[1], 'G' + (i + 1))).join('');
          $(el, '#b-pz-cv').innerHTML = `<svg viewBox="0 0 420 200" role="img" aria-label="NANDゲートの組み立て図">${wires}${src}${gates}${lamp(398, oy, out, 13)}</svg>`;
          $(el, '#b-pz-goal').innerHTML = `<b>目標</b>　${L.goal}`;
          $(el, '#b-pz-socks').innerHTML = c.map((p, i) => `<div class="b-sock"><span>G${i + 1} の入力</span>${p.map((s, k) => `<button class="btn b-pick" data-g="${i}" data-k="${k}" aria-label="G${i + 1}の入力${k + 1}：${s}（タップで切り替え）">${s}</button>`).join('')}</div>`).join('');
          $$(el, '.b-in').forEach(b => { const on = b.dataset.in === 'A' ? A : B; press(b, on); b.textContent = `入力${b.dataset.in}：${on ? 'オン' : 'オフ'}`; b.hidden = b.dataset.in === 'B' && L.onlyA; });
          // 表：入力の組み合わせをすべて試して、目標と比べる
          const rows = L.onlyA ? [[0, 0], [1, 0]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
          let allOk = true;
          const body = rows.map(r => {
            const res = evalAll(lv, !!r[0], !!r[1]).g[last] ? 1 : 0, want = L.f(!!r[0], !!r[1]) ? 1 : 0, ok = res === want; if (!ok) allOk = false;
            return ttRow([r[0], ...(L.onlyA ? [] : [r[1]]), want, res, ok ? '<span class="b-ok">✓</span>' : '<span class="b-ng">✗</span>'], r[0] === +A && (L.onlyA || r[1] === +B));
          }).join('');
          $(el, '#b-pz-tt').innerHTML = `<table class="b-tt"><tr><th>A</th>${L.onlyA ? '' : '<th>B</th>'}<th>目標</th><th>いまの回路</th><th></th></tr>${body}</table>`;
          if (allOk) solved[lv] = true;
          $(el, '#b-pz-note').innerHTML = allOk ? `<b class="b-ok">完成！</b>　NAND ${L.pos.length}個で${L.name.replace('上級：', '「') + (lv === 'XOR' ? '」' : '')}ができた。${lv === 'NOT' ? '次は「AND」へ。' : lv === 'AND' ? '次は「OR」へ。' : lv === 'OR' ? 'NOT・AND・ORが、すべてNANDだけでできた。' : ''}`
            : hintOn ? 'ヒント：' + L.hint : '入力のボタン（G1の入力など）をタップして、つなぐ先を変えてみてください。表の ✗ がすべて ✓ になれば完成。';
          $(el, '#b-pz-lv').innerHTML = Object.keys(LV).map(k => `<button class="btn b-lv" data-lv="${k}" aria-pressed="${k === lv}">${solved[k] ? '✓ ' : ''}${LV[k].name}</button>`).join('');
        };
        el.addEventListener('click', e => {
          const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
          if (t.dataset.lv) { lv = t.dataset.lv; hintOn = false; A = B = false; }
          else if (t.dataset.in === 'A') A = !A;
          else if (t.dataset.in === 'B') B = !B;
          else if (t.dataset.g !== undefined) { const i = +t.dataset.g, k = +t.dataset.k, o = opts(lv, i); conn[lv][i][k] = o[(o.indexOf(conn[lv][i][k]) + 1) % o.length]; }
          else if (t.id === 'b-pz-hint') hintOn = true;
          else if (t.id === 'b-pz-ans') conn[lv] = LV[lv].sol.map(p => p.slice());
          else return;
          draw();
        });
        draw();
      }
    },

    /* B4：1桁の足し算（半加算器） */
    half: {
      html() {
        return `<div class="b-sim"><div class="b-half">
            <div class="b-sum"><span></span><span></span><span id="b-half-a">0</span><span class="b-op">＋</span><span></span><span id="b-half-b">0</span><span class="b-bar"></span>
              <span></span><span class="b-r" id="b-half-c">0</span><span class="b-r" id="b-half-s">0</span><span></span><span class="b-cap">繰上</span><span class="b-cap">和</span></div>
            <div class="b-lamps"><div class="b-lp"><i id="b-half-lc"></i><span>繰り上がり</span></div><div class="b-lp"><i id="b-half-ls"></i><span>和</span></div></div></div>
          <div class="seg"><button class="btn b-in b-tog" data-in="A" aria-pressed="false">A：0</button><button class="btn b-in b-tog" data-in="B" aria-pressed="false">B：0</button></div>
          <div id="b-half-tt"></div><p class="sim-note" id="b-half-note" aria-live="polite"></p></div>`;
      },
      mount(el) {
        let A = 0, B = 0;
        const draw = () => {
          const s = A ^ B, c = A & B;
          $(el, '#b-half-a').textContent = A; $(el, '#b-half-b').textContent = B;
          $(el, '#b-half-s').textContent = s; $(el, '#b-half-c').textContent = c;
          $(el, '#b-half-c').classList.toggle('dim', !c);
          $(el, '#b-half-ls').classList.toggle('on', !!s); $(el, '#b-half-lc').classList.toggle('on', !!c);
          $$(el, '.b-in').forEach(b => { const v = b.dataset.in === 'A' ? A : B; press(b, v); b.textContent = `${b.dataset.in}：${v}`; });
          $(el, '#b-half-tt').innerHTML = `<table class="b-tt"><tr><th>A</th><th>B</th><th>繰り上がり</th><th>和</th></tr>${[[0, 0], [0, 1], [1, 0], [1, 1]].map(r => ttRow([r[0], r[1], r[0] & r[1], r[0] ^ r[1]], r[0] === A && r[1] === B)).join('')}</table>`;
          $(el, '#b-half-note').textContent = A && B ? '1＋1＝10（2進数）。この桁の和は0で、繰り上がりが1。'
            : A || B ? 'どちらか一方だけが1。和は1、繰り上がりはなし。' : '0＋0＝0。和も繰り上がりも0。';
        };
        el.addEventListener('click', e => { const t = e.target.closest('.b-in'); if (!t) return; if (t.dataset.in === 'A') A ^= 1; else B ^= 1; draw(); });
        draw();
      }
    },

    /* B4：8桁の足し算機（繰り上がりが右から左へ伝わる） */
    adder: {
      html() {
        let h = '<span class="b-rl"></span>';
        for (let i = 8; i >= 0; i--) h += `<span class="b-pv">${2 ** i}</span>`;
        ['a', 'b'].forEach(r => { h += `<span class="b-rl">${r.toUpperCase()}</span><span></span>`; for (let i = 7; i >= 0; i--) h += `<button class="b-bit" data-r="${r}" data-i="${i}" aria-label="${r.toUpperCase()}の${2 ** i}の位">0</button>`; });
        h += '<span class="b-rl b-sm-l">繰上</span>'; for (let i = 8; i >= 0; i--) h += `<span class="b-cy" data-i="${i}"></span>`;
        h += '<span class="b-rl">和</span>'; for (let i = 8; i >= 0; i--) h += `<span class="b-sbit" data-i="${i}">0</span>`;
        return `<div class="b-sim"><div class="b-add" role="group" aria-label="8桁の足し算機">${h}</div>
          <div class="sim-read"><span>A <b id="b-add-a">0</b></span><span>B <b id="b-add-b">0</b></span><span>A＋B <b id="b-add-s">0</b></span></div>
          <div class="seg"><button class="btn" data-p="1,1">1＋1</button><button class="btn" data-p="255,1">255＋1</button><button class="btn" data-p="170,85">170＋85</button><button class="btn" data-p="rand">ランダム</button></div>
          <div class="seg" role="group" aria-label="速さ"><button class="btn b-sp" data-sp="180" aria-pressed="true">ふつう</button><button class="btn b-sp" data-sp="520" aria-pressed="false">ゆっくり</button></div>
          <p class="sim-note" id="b-add-note" aria-live="polite"></p></div>`;
      },
      mount(el, ctx) {
        let a = 77, b = 45, sp = 180, timer = 0;
        const paintIn = () => $$(el, '.b-bit').forEach(x => { const v = ((x.dataset.r === 'a' ? a : b) >> +x.dataset.i) & 1; x.textContent = v; x.classList.toggle('on', !!v); });
        const run = () => {
          clearTimeout(timer); paintIn();
          $(el, '#b-add-a').textContent = a; $(el, '#b-add-b').textContent = b; $(el, '#b-add-s').textContent = '…';
          const sum = [], cin = [0]; for (let i = 0; i < 8; i++) { const t = ((a >> i) & 1) + ((b >> i) & 1) + cin[i]; sum[i] = t & 1; cin[i + 1] = t >> 1; } sum[8] = cin[8];
          let chain = 0, run_ = 0; for (let i = 1; i <= 8; i++) { run_ = cin[i] ? run_ + 1 : 0; chain = Math.max(chain, run_); }
          $$(el, '.b-sbit').forEach(x => { x.textContent = '·'; x.className = 'b-sbit pend'; });
          $$(el, '.b-cy').forEach(x => { x.textContent = ''; x.className = 'b-cy'; });
          $(el, '#b-add-note').textContent = '右の桁から順に計算中…';
          let k = 0;
          const step = () => {
            const s = $(el, `.b-sbit[data-i="${k}"]`); s.textContent = sum[k]; s.className = 'b-sbit' + (sum[k] ? ' on' : '');
            if (k < 8) { const c = $(el, `.b-cy[data-i="${k + 1}"]`); if (cin[k + 1]) { c.textContent = '1'; c.className = 'b-cy on'; } }
            if (k === 7) { const s8 = $(el, '.b-sbit[data-i="8"]'); s8.textContent = sum[8]; s8.className = 'b-sbit' + (sum[8] ? ' on' : ''); return done(); }
            k++; timer = setTimeout(step, later(ctx, sp));
          };
          const done = () => {
            $(el, '#b-add-s').textContent = a + b;
            $(el, '#b-add-note').textContent = chain === 0 ? '繰り上がりは一度も起きない。どの桁も、すぐに答えが決まった。'
              : chain === 8 ? '右端で生まれた繰り上がりが、ドミノ倒しのように左端まで8桁つづけて伝わった。最後の桁が決まるまで、答えは確定しない。'
              : `繰り上がりは、最長で${chain}桁つづけて伝わった。`;
          };
          if (ctx.reducedMotion) { for (k = 0; k < 8; k++) { const s = $(el, `.b-sbit[data-i="${k}"]`); s.textContent = sum[k]; s.className = 'b-sbit' + (sum[k] ? ' on' : ''); if (cin[k + 1]) { const c = $(el, `.b-cy[data-i="${k + 1}"]`); c.textContent = '1'; c.className = 'b-cy on'; } }
            const s8 = $(el, '.b-sbit[data-i="8"]'); s8.textContent = sum[8]; s8.className = 'b-sbit' + (sum[8] ? ' on' : ''); done(); }
          else timer = setTimeout(step, sp);
        };
        el.addEventListener('click', e => {
          const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
          if (t.dataset.r) { const m = 1 << +t.dataset.i; if (t.dataset.r === 'a') a ^= m; else b ^= m; }
          else if (t.dataset.p) { if (t.dataset.p === 'rand') { a = Math.floor(Math.random() * 256); b = Math.floor(Math.random() * 256); } else [a, b] = t.dataset.p.split(',').map(Number); }
          else if (t.dataset.sp) { sp = +t.dataset.sp; $$(el, '.b-sp').forEach(x => press(x, x === t)); }
          else return;
          run();
        });
        run();
        return () => clearTimeout(timer);
      }
    },

    /* B5：NOT の輪（2つなら落ち着き、3つなら落ち着かない） */
    loop: {
      html() {
        return `<div class="b-sim"><div class="seg" role="group" aria-label="輪の中のNOTの数"><button class="btn b-n" data-n="2" aria-pressed="true">NOTを2つ</button><button class="btn b-n" data-n="3" aria-pressed="false">NOTを3つ</button></div>
          <div class="b-cv" id="b-loop-cv"></div>
          <div class="seg"><button class="btn primary" id="b-loop-push">ひと押し（①を一瞬だけ反転）</button></div>
          <div class="sim-read"><span>切り替わった回数 <b id="b-loop-cnt">0</b></span></div>
          <p class="sim-note" id="b-loop-note" aria-live="polite"></p></div>`;
      },
      mount(el, ctx) {
        const C = [200, 120], R = 78, NUM = ['①', '②', '③'];
        let N = 2, v = [1, 0], hold = 0, ptr = 0, count = 0, timer = 0, pushed = false;
        const P = (deg, r = R) => [C[0] + r * Math.cos(deg * Math.PI / 180), C[1] + r * Math.sin(deg * Math.PI / 180)];
        const th = i => -90 + i * 360 / N;
        const draw = () => {
          let s = '';
          for (let i = 0; i < N; i++) { // 地点 i：ゲート i-1 の出口からゲート i の入口まで
            const a1 = (i === 0 ? th(N - 1) - 360 : th(i - 1)) + 17, a2 = th(i) - 15, p1 = P(a1), p2 = P(a2), mid = (a1 + a2) / 2;
            const d = `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A ${R} ${R} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
            s += wire(d, !!v[i]);
            const [bx, by] = P(mid), [lx, ly] = P(mid, R + 30);
            s += `<circle cx="${bx}" cy="${by}" r="13" class="b-badge${v[i] ? ' on' : ''}"/><text x="${bx}" y="${by + 5}" class="b-tx b-srct${v[i] ? ' on' : ''}" text-anchor="middle">${v[i]}</text>
              <text x="${lx}" y="${ly + 5}" class="b-ts" text-anchor="middle">${NUM[i]}</text>`;
          }
          for (let i = 0; i < N; i++) { const [x, y] = P(th(i));
            s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${th(i) + 90})"><path d="M -12 -13 L -12 13 L 10 0 Z" class="b-gate"/><circle cx="14" cy="0" r="4" class="b-gate"/></g>`; }
          $(el, '#b-loop-cv').innerHTML = `<svg viewBox="0 0 400 240" role="img" aria-label="NOTゲート${N}つの輪">${s}<text x="${C[0]}" y="${C[1] + 5}" class="b-tm" text-anchor="middle">NOT×${N}</text></svg>`;
          $(el, '#b-loop-cnt').textContent = count;
        };
        const ok = i => v[(i + 1) % N] === 1 - v[i];
        const note = t => { $(el, '#b-loop-note').textContent = t; };
        const tick = () => {
          let f = -1; const held = hold > 0;
          for (let k = 0; k < N; k++) { const i = (ptr + k) % N; if (held && i === N - 1) continue; if (!ok(i)) { f = i; break; } }
          if (held) hold--;
          if (f < 0 && held) return; // 押している間は、①を押し返すゲートが待たされている
          if (f < 0) { clearInterval(timer); timer = 0; draw();
            note(N === 2 ? (pushed ? `反転したまま、また落ち着いた（①＝${v[0]}、②＝${v[1]}）。ひと押しで書きかわり、押すのをやめても残る。これが「覚えている」状態。` : `落ち着いている（①＝${v[0]}、②＝${v[1]}）。①が②を押し、②が①を押して、互いを支えている。「ひと押し」してみてください。`) : '');
            return; }
          v[(f + 1) % N] = 1 - v[f]; ptr = (f + 1) % N; count++; draw();
          if (N === 3) note('落ち着く並びがない。どこかが必ず食い違い、切り替わりが輪を回り続ける。');
          else note('①の変化が②へ伝わっていく…');
        };
        const start = () => { if (!timer) timer = setInterval(tick, ctx.reducedMotion ? 1000 : 520); };
        el.addEventListener('click', e => {
          const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
          if (t.dataset.n) { N = +t.dataset.n; v = N === 2 ? [1, 0] : [1, 0, 1]; hold = 0; ptr = 0; count = 0; pushed = false; $$(el, '.b-n').forEach(x => press(x, x === t)); clearInterval(timer); timer = 0; draw(); tick(); if (N === 3) start(); }
          else if (t.id === 'b-loop-push') { v[0] = 1 - v[0]; hold = 2; ptr = 0; pushed = true; draw(); note('①を一瞬だけ押して反転させた。'); start(); }
        });
        draw(); tick();
        return () => clearInterval(timer);
      }
    },

    /* B5：NOR 2つのラッチ（1ビットの記憶） */
    latch: {
      html() {
        return `<div class="b-sim"><div class="b-cv" id="b-latch-cv"></div>
          <div class="seg"><button class="btn primary" id="b-latch-s">セット（1を書く）</button><button class="btn" id="b-latch-r">リセット（0を書く）</button><button class="btn" id="b-latch-p">電源を切る</button></div>
          <div class="sim-read"><span>Q（覚えている値） <b id="b-latch-q">0</b></span></div>
          <p class="sim-note" id="b-latch-note" aria-live="polite"></p></div>`;
      },
      mount(el, ctx) {
        let pw = true, s = 0, r = 0, q = 0, qb = 1, timer = 0, ps = 0, pr = 0, last = 'init', turn = 0;
        const draw = () => {
          $(el, '#b-latch-cv').innerHTML = `<svg viewBox="0 0 400 240" role="img" aria-label="NORゲート2つを互いにつないだ記憶の回路">
            ${wire('M 60 53 H 172', !!r)}${wire('M 60 187 H 172', !!s)}
            ${wire('M 231 62 H 344', !!q)}${wire('M 231 178 H 290', !!qb)}
            ${wire('M 256 62 V 96 L 140 144 V 169 H 172', !!q)}${wire('M 256 178 V 144 L 140 96 V 71 H 172', !!qb)}
            <circle cx="256" cy="62" r="4" class="b-dot"/><circle cx="256" cy="178" r="4" class="b-dot"/>
            ${gateBody(180, 62, 'NOR')}${gateBody(180, 178, 'NOR')}${lamp(362, 62, !!q, 16)}
            <text x="54" y="58" class="b-ts" text-anchor="end">リセット</text><text x="54" y="192" class="b-ts" text-anchor="end">セット</text>
            <text x="362" y="100" class="b-tx" text-anchor="middle">Q</text><text x="298" y="183" class="b-ts">Qの反対</text>
            ${pw ? '' : '<text x="200" y="124" class="b-tx" text-anchor="middle" style="fill:var(--ng)">電源オフ</text>'}</svg>`;
          $(el, '#b-latch-q').textContent = pw ? q : '–';
          $(el, '#b-latch-p').textContent = pw ? '電源を切る' : '電源を入れる';
          $(el, '#b-latch-s').disabled = !pw; $(el, '#b-latch-r').disabled = !pw;
        };
        const NOTES = {
          init: () => `いまQ＝${q}。「セット」を押してみてください。`,
          set: () => s ? 'セットの入力がオン。下のNORの出力が0になり、それを受けて上のNORの出力Q が1になる。' : `ボタンを離しても、Q＝${q}のまま。2つのNORが、互いを押し続けている。`,
          reset: () => r ? 'リセットの入力がオン。上のNORの出力Q が0になり、それを受けて下のNORの出力が1になる。' : `ボタンを離しても、Q＝${q}のまま。今度は「0」を覚えている。`,
          off: () => '電源が切れた。互いを押し続ける力がなくなり、すべて0になった。',
          on: () => `電源を入れ直すと、Q＝${q}で落ち着いた。前に何を覚えていたかとは関係なく、どちらかに転ぶ。覚えていた値は消えた。`
        };
        const note = () => { $(el, '#b-latch-note').textContent = NOTES[last](); };
        const tick = () => {
          const want1 = (r || qb) ? 0 : 1, want2 = (s || q) ? 0 : 1, bad1 = q !== want1, bad2 = qb !== want2;
          if (!bad1 && !bad2) { clearInterval(timer); timer = 0; draw(); note(); return; }
          if (bad1 && (!bad2 || turn === 0)) q = want1; else qb = want2;
          turn ^= 1; draw();
        };
        const settle = () => { if (!pw) return; if (ctx.reducedMotion) { for (let i = 0; i < 10; i++) { const before = q + ',' + qb; tick(); if (before === q + ',' + qb) break; } } else if (!timer) timer = setInterval(tick, 260); };
        const pulse = which => {
          if (!pw) return; last = which;
          if (which === 'set') { s = 1; clearTimeout(ps); ps = setTimeout(() => { s = 0; draw(); settle(); note(); }, 900); }
          else { r = 1; clearTimeout(pr); pr = setTimeout(() => { r = 0; draw(); settle(); note(); }, 900); }
          draw(); note(); settle();
        };
        el.addEventListener('click', e => {
          const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
          if (t.id === 'b-latch-s') pulse('set');
          else if (t.id === 'b-latch-r') pulse('reset');
          else if (t.id === 'b-latch-p') {
            clearInterval(timer); timer = 0; clearTimeout(ps); clearTimeout(pr); s = r = 0;
            if (pw) { pw = false; q = qb = 0; last = 'off'; } else { pw = true; q = Math.random() < .5 ? 1 : 0; qb = 1 - q; last = 'on'; }
            draw(); note();
          }
        });
        draw(); note();
        return () => { clearInterval(timer); clearTimeout(ps); clearTimeout(pr); };
      }
    },

    /* B6：足し算機と記憶の輪（合図で回る） */
    acc: {
      html() {
        let cells = ''; for (let i = 7; i >= 0; i--) cells += `<div class="b-cell" data-i="${i}"><span class="v">0</span><span class="p">${2 ** i}</span></div>`;
        return `<div class="b-sim"><div class="b-cv" id="b-acc-cv"></div>
          <p class="b-goal">記憶の中身（2進数）</p><div class="b-reg">${cells}</div>
          <div class="sim-ctrl"><label for="b-acc-b">足す数 B</label><input type="range" id="b-acc-b" min="1" max="15" step="1" value="1"><output id="b-acc-b-out">1</output></div>
          <div class="seg"><button class="btn primary" id="b-acc-clk">合図を送る</button><button class="btn" id="b-acc-auto" aria-pressed="false">自動で合図：オフ</button><button class="btn" id="b-acc-zero">0に戻す</button></div>
          <div class="sim-read"><span>合図の回数 <b id="b-acc-n">0</b></span></div>
          <p class="sim-note" id="b-acc-note" aria-live="polite">「合図を送る」を押すたびに、記憶の数にBが足されます。</p></div>`;
      },
      mount(el, ctx) {
        let reg = 0, b = 1, n = 0, auto = 0, flash = 0, flashT = 0;
        const draw = () => {
          const s = reg + b;
          $(el, '#b-acc-cv').innerHTML = `<svg viewBox="0 0 400 170" role="img" aria-label="記憶と足し算機をつないだ輪">
            <rect x="20" y="30" width="150" height="80" rx="10" class="b-box"/><text x="95" y="54" class="b-ts" text-anchor="middle">記憶（B5）</text><text x="95" y="92" class="b-big" text-anchor="middle">${reg}</text>
            <rect x="230" y="30" width="150" height="80" rx="10" class="b-box"/><text x="305" y="54" class="b-ts" text-anchor="middle">足し算機（B4）</text><text x="305" y="90" class="b-tx" text-anchor="middle" style="font-size:18px">${reg}＋${b}＝${s > 255 ? s + '→' + (s - 256) : s}</text>
            <path d="M 170 70 H 224" class="b-arw"/><path d="M 218 64 L 226 70 L 218 76" class="b-arw"/><text x="198" y="62" class="b-tm" text-anchor="middle">いまの数</text>
            <path d="M 305 110 V 140 H 95 V 116" class="b-arw${flash ? ' on' : ''}"/><path d="M 89 122 L 95 113 L 101 122" class="b-arw${flash ? ' on' : ''}"/>
            <text x="200" y="160" class="${flash ? 'b-te' : 'b-ts'}" text-anchor="middle">合図のときだけ、答えを記憶へ書き戻す</text></svg>`;
          $$(el, '.b-reg .b-cell').forEach(c => { const v = (reg >> +c.dataset.i) & 1; c.classList.toggle('on', !!v); $(c, '.v').textContent = v; });
          $(el, '#b-acc-n').textContent = n;
        };
        const clock = () => {
          const s = reg + b; reg = s % 256; n++;
          flash = 1; clearTimeout(flashT); flashT = setTimeout(() => { flash = 0; draw(); }, later(ctx, 320));
          $(el, '#b-acc-note').textContent = s > 255 ? `${s}は8桁に入りきらない。あふれて${reg}に戻った（B1の「あふれ」と同じ）。`
            : b === 1 ? `合図のたびに1ずつ増える。これがB1の「＋1」ボタンの中身。いま${reg}。` : `合図のたびに${b}ずつ増える。いま${reg}。`;
          draw();
        };
        $(el, '#b-acc-b').addEventListener('input', e => { b = +e.target.value; $(el, '#b-acc-b-out').textContent = b; draw(); });
        el.addEventListener('click', e => {
          const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
          if (t.id === 'b-acc-clk') clock();
          else if (t.id === 'b-acc-zero') { reg = 0; n = 0; draw(); $(el, '#b-acc-note').textContent = '記憶を0に戻した。'; }
          else if (t.id === 'b-acc-auto') {
            if (auto) { clearInterval(auto); auto = 0; } else auto = setInterval(clock, 650);
            press(t, !!auto); t.textContent = `自動で合図：${auto ? 'オン' : 'オフ'}`;
          }
        });
        draw();
        return () => { clearInterval(auto); clearTimeout(flashT); };
      }
    }
  };

  /* ===== 教材 ===== */
  const steps = [
    {
      id: 'b1', no: 1, title: '0と1',
      headline: '10本の指で数える人間が、なぜ機械には0と1しか使わせないのか。',
      predict: {
        q: 'スイッチの門にかける電気の強さを10段階に分ければ、スイッチ1つで0〜9を表せそうです。なのにコンピュータは「オン（1）」と「オフ（0）」の2段階しか使いません。なぜでしょう？',
        options: ['2段階のほうが、電気代が安く済むから', '2段階なら、電気が多少ぶれても読み間違えないから', '10段階を作れる部品が、まだ発明されていないから'],
        answer: 1,
        right: 'そのとおり。キーワードは「ぶれ」。③のシミュレータで確かめます。',
        wrong: '答えは「多少ぶれても読み間違えないから」。③のシミュレータで確かめます。'
      },
      explore: [
        { t: 'recall', from: 'S2', ttl: 'スイッチがスイッチを押す', fig: 'chain', to: 's2', h: 'スイッチを押すのは電気。スイッチから出てくるのも電気。だから、スイッチが次のスイッチを押せる。モジュールBは、この連鎖から始まります。' },
        { t: 'p', h: 'モジュールAで見たトランジスタは、門に電圧がかかると道が開くスイッチでした。このモジュールでは中身をいったん脇に置き、<b>電気で押せるスイッチ</b>として扱います。問いは一つ。スイッチをどうつなげば、計算ができるのか。' },
        { t: 'h', h: 'オンとオフだけで、数は足りるのか' },
        { t: 'p', h: 'スイッチ1つで表せるのは、オン（1）とオフ（0）だけ。10段階の目盛りに比べると、いかにも不便に見えます。けれど、私たちの数え方を思い出してください。0から9まで数えたら、次は桁を1つ増やして「10」と書きます。' },
        { t: 'p', h: '0と1しかないなら、もっと早く桁を増やせばいい。0、1、その次はもう「10」。これが<b>2進数</b>です。下の「＋1」を押して、数えてみてください。' },
        { t: 'sim', id: 'count', cap: 'スイッチ4つで数える。下の小さな数字は、その位置がオンのときに足される数。1の位がいっぱいになると、隣の桁へ「繰り上がり」が伝わる。' },
        { t: 'p', h: 'スイッチが1つ増えるごとに、表せる数は2倍になります。4つで0〜15、8つで0〜255。桁さえ増やせば、2段階でも数は足ります。もう一つ、いま見た<b>繰り上がり</b>を覚えておいてください。2進数では1＋1でもう繰り上がる。これが、のちに足し算機の主役になります。' },
        { t: 'h', h: 'では、なぜ10段階を使わないのか' },
        { t: 'p', h: 'チップの中では、スイッチからスイッチへ、電気のバトンが次々に渡されます。そのたびに電気はわずかに弱まり、となりの配線からも<b>ゆらぎ（ノイズ）</b>をもらいます。中継を重ねると、ゆらぎはどうなるのか。③で確かめます。' }
      ],
      discover: [
        { t: 'sim', id: 'relay', cap: '数字を8回中継して届ける。線1本が1回ぶんの伝言で、緑は正しく届いたもの、赤は別の数字に化けたもの。2段階では、中継のたびに「1か0か」を決め直して送り直す。' },
        { t: 'p', h: 'ゆらぎを少し大きくするだけで、10段階の伝言は隣の数字に化けていきます。2段階は、ほとんど崩れません。秘密は、<b>中継のたびに言い直す</b>ことにあります。' },
        { t: 'p', h: 'スイッチは、受け取った電気をそのまま渡すのではありません。「押されたか、押されていないか」だけを見て、電源から新しい、はっきりした電気を出し直します。S2で見た「小さな力で、大きな流れを操る」働きです。だから、ゆらぎは次の中継へ持ち越されません。' },
        { t: 'analogy', ttl: '伝言ゲーム', rows: [['伝言をつなぐ人', '中継するスイッチ'], ['聞き取る', '門が押されたかどうかを見分ける'], ['大きな声で言い直す', '電源の力で、はっきりした電気を出し直す'], ['「はい」か「いいえ」だけで伝える', '0と1の2段階']],
          breaks: '伝言ゲームの人は、聞き間違えても気づきません。スイッチも同じで、ゆらぎがあまりに大きいと読み違えます（シミュレータのゆらぎを最大にすると、2段階でもまれに化けます）。だから本物のチップは、0と1の電気の差に十分な余裕をとって設計します。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '10進数のコンピュータもあった', ps: [
          'S2に登場したENIAC（1946年）は、じつは10進数で計算していました。ただし1桁を表すのに、オン・オフの回路を10個輪につなぎ、<b>そのうちどれか1つだけがオン</b>になるしかけを使っていました。10段階の電気の強さを読み分けたのではありません。',
          '見分けるのは、オンかオフか。この原則は、真空管の時代から変わっていません。'
        ] }
      ],
      quiz: [
        { type: 'tf', q: '2進数では、1＋1の答えを「2」と書く。', answer: 1, ex: '2進数には0と1しかないので、1＋1で桁が上がって「10」と書きます（10進数の2のこと）。' },
        { type: 'choice', q: 'スイッチ5つで表せるパターンは何通り？', options: ['5通り', '10通り', '25通り', '32通り'], answer: 3, ex: '1つ増えるごとに2倍。2×2×2×2×2＝32通り（0〜31）です。5×5＝25と間違えやすいので注意。' },
        { type: 'fill', before: 'スイッチは受け取った電気をそのまま渡さず、「オンかオフか」だけを見て', after: '。だから、ゆらぎが次へ持ち越されない。', options: ['はっきりした電気を出し直す', '電気をためておく', '電気を半分に減らす', '10段階に分け直す'], answer: 0, ex: '中継のたびに電源の力で言い直すので、ゆらぎがたまりません。2段階だからこそ、「どちらか」を迷わず決め直せます。' },
        { type: 'choice', q: '伝言ゲームのたとえで「大きな声で言い直す」にあたるのは？', options: ['スイッチが電源の力で、はっきりした電気を出し直すこと', '電気を10段階に分けること', '配線を長くすること', 'スイッチの数を増やすこと'], answer: 0, ex: '受け取った弱い電気ではなく、電源から新しい電気を出す。これが、何十億回の中継でも0と1が崩れない理由です。' }
      ],
      summary: 'コンピュータが0と1だけを使うのは、オンとオフなら、中継のたびにはっきり言い直せるから。桁を増やせば、数はいくらでも表せる。',
      next: 'では、オンとオフしか知らないスイッチに、「判断」をさせることはできるのか。',
      deeper: [['A', 'しくみ：トランジスタ', 'a5']],
      sources: [
        '2進数：スイッチn個で2のn乗通り（4個で16通り＝0〜15、8個で256通り＝0〜255）。',
        'ENIAC：10進数で計算し、累算器は1桁を、10個のフリップフロップ（オン・オフの回路）を輪につないだ計数器で表した（Wikipedia「ENIAC」、Brian L. Stuart による ENIAC の技術解説〈Drexel大学〉）。',
        'シミュレータ：中継のたびに、正規分布のゆらぎを電気の高さに足す単純なモデル。ゆらぎの目盛りは相対的なもので、実際のチップの値ではない。「正しく届いた割合」は、それぞれ4,000回送った結果。'
      ]
    },
    {
      id: 'b2', no: 2, title: 'AND・OR・NOT',
      headline: 'スイッチを2つつなぐだけで、機械は「判断」ができるのか。',
      predict: {
        q: '鍵を2本とも回さないと開かない金庫。これと同じ働きを、スイッチ2つとランプで作るには、どうつなぎますか？',
        options: ['1本の道に、2つを続けて並べる（直列）', '道を2本に分けて、1つずつ置く（並列）', 'どちらでも同じになる'],
        answer: 0,
        right: '正解。道が1本なら、どちらか1つでも開いていれば電気は通りません。',
        wrong: '答えは「直列」。道が1本なら、どちらか1つでも開いていれば電気は通りません。'
      },
      explore: [
        { t: 'p', h: '判断とは、条件を見て、する・しないを決めることです。「雨が降っていて、<b>しかも</b>傘がない。<b>なら</b>タクシーに乗る」。条件はどれも「はい」か「いいえ」。つまり1か0です。' },
        { t: 'p', h: 'では、スイッチ2つをどうつなげば、判断になるのか。下の回路で、入力AとBを切り替えてみてください。入力がオンになると、そのスイッチの門が電気で押されて、閉じます（道がつながります）。' },
        { t: 'sim', id: 'gates', cap: 'スイッチのつなぎ方で、ランプがつく条件が変わる。青く光る線は、電気が流れている道。表の色のついた行が、いまの入力。' },
        { t: 'analogy', ttl: 'AND ＝ 鍵が2本ないと開かない金庫', rows: [['鍵A・鍵B', '入力A・入力B'], ['2本とも回すと開く', '両方オンのときだけ電気が通る（直列）'], ['扉が開く', 'ランプがつく（出力が1）']],
          breaks: '金庫は一度開けたら、鍵を抜いても開いたままです。ANDは、入力を戻した瞬間に出力も0に戻ります。いまの回路には「覚えておく」力がありません（B5で取り組みます）。' },
        { t: 'analogy', ttl: 'OR ＝ 玄関が2つある家', rows: [['表玄関・裏口', '入力A・入力B'], ['どちらから入っても家に入れる', 'どちらかがオンなら電気が通る（並列）'], ['両方開いていても、家に入れることは同じ', '両方オンでも、出力は1のまま']],
          breaks: '家なら、2つの玄関から2人入れば「2人」です。ORは、両方オンでも出力は1。数を数えません。だから、ORは足し算ではありません。足し算にはもうひと工夫が要ります（B4）。' },
        { t: 'h', h: '反対にする：NOT' },
        { t: 'p', h: '3つめは、入力と出力を反対にする<b>NOT</b>。スイッチを押すと、ランプが<b>消える</b>。しかけは「抜け道」です。スイッチが閉じると、電気はランプの手前で抜け道へ流れてしまい、ランプまで届きません。回路の「反対（NOT）」で確かめてください。' },
        { t: 'p', h: 'ここで大事なことがあります。ランプの代わりに次のスイッチの門をつなげば、この出力で<b>次のスイッチを押せる</b>。判断の結果が、次の判断の材料になる。S2の「スイッチがスイッチを押す」連鎖が、ここで意味を持ちます。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: 'いまのチップのNOTには、抵抗がない', ps: [
          'ここでは抵抗とスイッチ1つでNOTを作りました。1970年代のチップの多くは、これに近い形です。ただ、スイッチが閉じている間は抵抗にずっと電気が流れ、熱になってしまいます。',
          'いまのチップ（CMOS）は、抵抗の代わりに、反対の動きをするスイッチをもう1つ置きます。片方が閉じると、もう片方が開く。どちらの状態でも電源から抜け道までの通り道が切れているので、切り替えるとき以外は、ほとんど電気を使いません。'
        ] }
      ],
      discover: [
        { t: 'p', h: 'つなぎ方そのものが、判断になる。<b>直列はAND、並列はOR、抜け道はNOT</b>。スイッチの並べ方を変えるだけで、機械に条件を判断させられるのです。' },
        { t: 'num', big: '16', unit: '通り', b: '入力が2つのときの「判断の表」の種類', l: '入力の組み合わせは4通り。そのそれぞれに1か0を答えるので、表の作り方は2×2×2×2＝16通り。その16通りすべてが、AND・OR・NOTの組み合わせで作れます。' },
        { t: 'column', tag: '人物コラム', ttl: 'つなぎ方は、論理だった', ps: [
          'スイッチのつなぎ方と論理の対応に気づいたのは、電話の交換機を設計していた技術者たちでした。日本電気（NEC）の中嶋章は1934〜36年、同僚の榛澤正夫とともに、交換機の複雑な回路を整理する理論を発表します。調べてみると、それは19世紀の数学者ブールが考えた「論理の計算」と同じものでした。',
          '米国では1937年、マサチューセッツ工科大学の学生クロード・シャノンが、修士論文で同じ対応を示しました。電話のスイッチのための理論が、やがてコンピュータの設計図の言葉になります。'
        ] }
      ],
      quiz: [
        { type: 'tf', q: 'ORは、AとBの両方がオンのとき、出力が「2」になる。', answer: 1, ex: 'ORの出力は1か0だけ。両方オンでも1です。玄関が2つあっても、ORは入った人数を数えません。' },
        { type: 'choice', q: 'スイッチ2つを並列につなぐと、どの判断になる？', options: ['AND', 'OR', 'NOT', 'どれにもならない'], answer: 1, ex: '道が2本あるので、どちらか一方が閉じれば電気が通ります。これがOR（玄関が2つある家）です。' },
        { type: 'fill', before: 'NOTは、スイッチが閉じると電気がランプの手前の', after: 'へ流れるので、入力と出力が反対になる。', options: ['抜け道', '電池', '金庫', '門'], answer: 0, ex: '押すと消える。抜け道ができて、電気がランプに届かなくなるからです。' },
        { type: 'choice', q: '「暗い、かつ、人がいる」ときだけ点く玄関の照明。明るさのセンサーと人のセンサーのスイッチを、どうつなぐ？', options: ['直列（AND）', '並列（OR）', 'NOTだけ', 'NOTを2つ'], answer: 0, ex: '「かつ」は両方そろったときだけ。鍵2本の金庫と同じ、直列のANDです。' }
      ],
      summary: 'スイッチを直列につなぐとAND、並列でOR、抜け道を作るとNOT。つなぎ方そのものが「判断」になる。',
      next: 'AND・OR・NOTの3種類。では、もっと少ない種類で、すべての判断を作ることはできるのか。',
      deeper: [['A', 'しくみ：トランジスタ', 'a5'], ['E', '社会と産業']],
      sources: [
        '判断の表の数：入力2つの組み合わせ4通り × それぞれの出力2通り → 2の4乗＝16通り。AND・OR・NOTで任意の判断の表を作れることは、ブール代数の基本的な性質。',
        '中嶋章・榛澤正夫：1934〜1936年に、交換回路の理論（のちのスイッチング理論）を発表（電気学会の顕彰資料、情報処理学会 コンピュータ博物館「中嶋章」）。',
        'C. E. Shannon「A Symbolic Analysis of Relay and Switching Circuits」：1937年のMIT修士論文、1938年に AIEE Transactions に掲載。'
      ]
    },
    {
      id: 'b3', no: 3, title: 'NANDだけで',
      headline: 'たった1種類の部品で、すべての判断は組み立てられるのか。',
      predict: {
        q: 'AND・OR・NOTの3種類を組み合わせれば、どんな判断も作れました。では、部品を1種類だけに絞っても、すべての判断を作れると思いますか？',
        options: ['無理。少なくとも3種類は要る', '2種類までなら減らせる', 'うまく選べば、1種類で作れる'],
        answer: 2,
        right: '正解。しかもその1種類は、とても単純なものです。',
        wrong: '答えは「1種類で作れる」。しかもその1種類は、とても単純なものです。'
      },
      explore: [
        { t: 'p', h: 'その1種類が<b>NAND（ナンド）</b>です。名前は「NOT AND」、つまり<b>ANDの反対</b>。AとBの両方がオンのときだけ、出力が0になります。' },
        { t: 'p', h: 'しくみは、B2のNOTの「抜け道」に、スイッチを2つ直列に並べるだけ。AとBの両方が閉じたときだけ抜け道がつながり、ランプが消えます。' },
        { t: 'sim', id: 'nandsw', cap: 'NANDのしかけ。抜け道にスイッチを2つ直列に置くと、両方が閉じたときだけランプが消える。' },
        { t: 'analogy', ttl: '金庫の「施錠中」ランプ', rows: [['鍵が2本そろうまで点いている', '入力が両方オンになるまで、出力は1'], ['2本そろった瞬間に消える', '両方オンのときだけ、出力は0'], ['2つの鍵穴が順番に並んでいる', '抜け道に直列に並んだ2つのスイッチ']],
          breaks: '金庫のランプは、状態を知らせるだけで何も動かしません。NANDの出力は、それ自体が次のスイッチを押す電気になります。だから、NANDの後ろにNANDをつないで、組み上げていけるのです。' },
        { t: 'h', h: 'パズル：NANDだけで組み立てる' },
        { t: 'p', h: 'では、NANDだけでNOT・AND・ORを作れるか。実際に組んでみましょう。G1、G2…はそれぞれ1個のNANDです。「G1 の入力」のボタンをタップすると、つなぐ先が A → B → 1（いつもオン）→ ほかのNANDの出力、と切り替わります。表の ✗ がすべて ✓ になれば完成です。' },
        { t: 'sim', id: 'puzzle', cap: 'NANDだけでNOT・AND・ORを組み立てるパズル。「1」は電源に直結した、いつもオンの線。困ったら「ヒント」を。' }
      ],
      discover: [
        { t: 'p', h: '答え合わせです。NOTは、NANDの2つの入力に同じものをつなぐだけ。ANDは、NANDの後ろにNOTを付けた「反対の反対」。ORは、AとBをそれぞれ反対にしてからNANDに通す。' },
        { t: 'p', h: 'B2で見たとおり、どんな判断もAND・OR・NOTで作れます。そのAND・OR・NOTが、NANDだけで作れる。つまり<b>NAND 1種類で、どんな判断も作れる</b>のです。NANDから始めて、足し算機、記憶、そしてコンピュータ全体まで組み上げていく「Nandgame」というブラウザのパズルもあります。このモジュールの残りの章は、その道のりの入口をたどります。' },
        { t: 'h', h: '1種類で、月まで行った' },
        { t: 'p', h: 'これは頭の中だけの話ではありません。1969年、アポロ11号を月へ導いた誘導コンピュータは、ほとんどが1種類のチップで組まれていました。中身はNANDの兄弟分、<b>NOR（ノア）</b>。「どれか1つでもオンなら0」を出すゲートで、これも1種類ですべての判断を作れます。' },
        { t: 'num', big: '約2800', unit: '個', b: 'アポロ誘導コンピュータに入っていたチップの数', l: 'そのほとんどが同じ種類、入力3つのNORを2つ収めたチップでした。部品を1種類にそろえると、作り方も検査も1通りで済みます。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: 'NANDは、ANDより簡単', ps: [
          'いまのチップ（CMOS）では、NANDはスイッチ4個で作れます。ANDは、NANDの後ろにNOT（スイッチ2個）を付けて6個。チップの中では、<b>ANDのほうが「NANDの応用」</b>なのです。',
          'ただし、実際のチップがNANDだけで作られているわけではありません。設計ソフトが、よく使う組み合わせを専用の形にまとめて、速さと小ささを稼ぎます。それでも「1種類あれば足りる」ことが、設計の土台になっています。'
        ] }
      ],
      quiz: [
        { type: 'tf', q: 'NANDは、AとBの両方がオンのときだけ、出力が0になる。', answer: 0, ex: 'NANDは「ANDの反対」。ANDが1になるとき（両方オン）だけ0になり、それ以外は1です。' },
        { type: 'choice', q: 'NANDだけでNOTを作るには？', options: ['2つの入力に同じ信号をつなぐ', 'NANDを2つ並列にする', '出力をもう一方の入力に戻す', 'NANDだけでは作れない'], answer: 0, ex: '同じ信号を2本入れると、「両方オン」か「両方オフ」しか起きません。両方オンなら0、両方オフなら1。入力の反対になります。' },
        { type: 'fill', before: 'ANDは、NANDの後ろに', after: 'をつないで作れる（反対の反対）。', options: ['NOT', 'OR', 'もう1つのAND', 'ランプ'], answer: 0, ex: 'NANDはANDの反対なので、もう一度反対にすればANDに戻ります。NOT自体もNANDで作れるので、ANDはNAND 2個です。' },
        { type: 'choice', q: 'アポロ11号の誘導コンピュータについて、正しいのは？', options: ['ほとんどが1種類のゲート（NOR）のチップでできていた', 'AND・OR・NOTのチップを同じ数ずつ使っていた', '真空管だけでできていた', '判断の回路は使っていなかった'], answer: 0, ex: '約2800個のチップの多くが、入力3つのNORを2つ収めた同じ種類でした。1種類ですべてを作れることの、実物の証拠です。' }
      ],
      summary: 'NAND（ANDの反対）1種類があれば、NOT・AND・OR、つまりどんな判断も組み立てられる。',
      next: 'どんな判断も作れる。では、判断を組み合わせると、なぜ「足し算」になるのか。',
      deeper: [['E', '社会と産業']],
      sources: [
        'NANDの万能性：NOT A＝NAND(A, A)、A AND B＝NOT(NAND(A, B))、A OR B＝NAND(NOT A, NOT B)（ド・モルガンの法則）。',
        'Nandgame（nandgame.com）：NANDゲートから順にコンピュータを組み立てるブラウザのパズル。',
        'アポロ誘導コンピュータ（有人飛行で使われた Block II）：約2,800個のIC。ほとんどが入力3つのNORを2つ収めたチップ（Wikipedia「Apollo Guidance Computer」、スミソニアン国立航空宇宙博物館の収蔵品記録「Integrated Circuit, Dual 3 Input, Apollo Guidance Computer」）。',
        'CMOSのトランジスタ数：入力2つのNAND 4個、NOT 2個、AND 6個（標準的なCMOS回路）。'
      ]
    },
    {
      id: 'b4', no: 4, title: '足し算',
      headline: 'スイッチの組み合わせは、どうやって「1＋1」を解くのか。',
      predict: {
        q: '2進数1桁どうしの足し算は、0＋0、0＋1、1＋0、1＋1の4通りだけ。このうち「繰り上がり」を出す回路は、B2で見たどの判断と同じでしょう？',
        options: ['NOT（反対にする）', 'AND（両方そろったら）', 'OR（どちらかなら）'],
        answer: 1,
        right: '正解。繰り上がりが出るのは1＋1のときだけ。金庫と同じです。',
        wrong: '答えはAND。繰り上がりが出るのは1＋1のときだけ。金庫と同じです。'
      },
      explore: [
        { t: 'p', h: '小学校の筆算を思い出してください。7＋5をある桁で計算すると、出てくるものは2つ。<b>その桁の答え</b>の「2」と、<b>次の桁への繰り上がり</b>の「1」です。' },
        { t: 'p', h: '2進数でも同じです。1桁の足し算は、その桁の答え（<b>和</b>）と、繰り上がりの2つを出せばいい。しかも、入力の組み合わせはたった4通り。下のボタンで、全部試してみてください。' },
        { t: 'sim', id: 'half', cap: '2進数1桁の足し算機（半加算器）。和と繰り上がりは、それぞれ別の判断として、別の回路から出てくる。' },
        { t: 'p', h: '和は、AとBの<b>どちらか一方だけ</b>が1のときに1。両方1なら0になります（そのぶん繰り上がるから）。この判断はXOR（排他的OR）と呼ばれ、B3のパズル「上級」のとおり、NAND 4個で作れます。' },
        { t: 'h', h: '下の桁からの繰り上がりも足す' },
        { t: 'p', h: '2桁目から先は、足すものがもう1つあります。右隣の桁から来た繰り上がりです。A、B、繰り上がりの3つを足して、和と次の繰り上がりを出す回路を<b>全加算器</b>と呼びます。これを横に並べ、繰り上がりの線を左隣へつなげば、何桁の足し算でもできます。' },
        { t: 'sim', id: 'adder', cap: '8桁（0〜255）の足し算機。縦1列が全加算器1個。AとBの数字をタップすると0と1が切り替わる。答えは右の桁から順に決まっていく。' },
        { t: 'p', h: '「255＋1」を試してください。右端で生まれた繰り上がりが、隣へ、また隣へと伝わっていきます。左端まで届くまで、答えは確定しません。「170＋85」では、繰り上がりが一度も起きず、すべての桁が一度に決まります。' },
        { t: 'analogy', ttl: 'ドミノ倒し', rows: [['ドミノ1枚', '1桁ぶんの全加算器'], ['前のドミノに倒される', '右の桁から繰り上がりを受け取る'], ['最後の1枚が倒れるまで待つ', '左端の桁が決まるまで、答えが確定しない']],
          breaks: 'ドミノは一度押せば最後まで倒れますが、繰り上がりは途中で止まることがあります（0＋0の桁で消える）。また、本物のCPUは最後まで待つのを嫌って、繰り上がりを<b>先読み</b>する回路を足し、何十桁でも素早く答えを出します。' }
      ],
      discover: [
        { t: 'recall', from: 'B2', ttl: '鍵2本の金庫', fig: 'safe', to: 'b2', h: '繰り上がりの正体は、鍵が2本そろったときだけ開く金庫（AND）でした。和は「どちらか一方だけ」（XOR）。足し算は、判断2つの組み合わせにすぎないのです。' },
        { t: 'p', h: 'そして、全加算器1個はNAND 9個で組めます。8桁なら72個。<b>NAND 1種類を72個つなぐと、0〜255の足し算機ができあがる</b>のです。' },
        { t: 'num', big: '72', unit: '個', b: '8桁の足し算機に必要なNAND', l: '全加算器1個＝NAND 9個を、8桁ぶん並べた数。NAND 1個をスイッチ4個とすると、スイッチ288個。S3で見たスマホのチップの190億個から見れば、ほんのひとつまみです。' },
        { t: 'p', h: '引き算も、掛け算も、この足し算機の組み合わせで作れます。引き算は「マイナスの数を足す」工夫で、掛け算は「桁をずらして足す」のくり返しで。' }
      ],
      quiz: [
        { type: 'choice', q: '2進数の 1＋1 を、「和」と「繰り上がり」で表すと？', options: ['和1、繰り上がり0', '和0、繰り上がり1', '和1、繰り上がり1', '和0、繰り上がり0'], answer: 1, ex: '1＋1＝10（2進数）。その桁の和は0で、次の桁へ1が繰り上がります。' },
        { type: 'tf', q: '「和」を出す回路は、ORと同じ働きをする。', answer: 1, ex: 'ORなら、1＋1の和が1になってしまいます。和は「どちらか一方だけ」のときに1になるXORです。B2で見たとおり、ORは足し算ではありません。' },
        { type: 'fill', before: '全加算器は、AとBに加えて、右の桁からの', after: 'の3つを足す。', options: ['繰り上がり', '和', 'ランプ', 'NOT'], answer: 0, ex: '右隣から受け取った繰り上がりも足すので、何桁でもつなげられます。' },
        { type: 'order', q: '8桁の足し算機で「255＋1」を計算するとき、答えが決まる順に並べてください。', items: ['1の位（いちばん右）', '2の位', '4の位', '128の位（いちばん左）'], ex: '繰り上がりは右から左へ、ドミノ倒しのように伝わります。だから右の桁から順に決まります。' }
      ],
      summary: '足し算は、各桁の「和」と「繰り上がり」という2つの判断の組み合わせ。繰り上がりは金庫（AND）、和は「どちらか一方だけ」（XOR）。',
      next: 'でも、入力を変えれば答えも消えてしまう。計算の途中の数を、スイッチはどうやって覚えておくのか。',
      deeper: [['D', 'どこで使われてる？']],
      sources: [
        '全加算器をNANDだけで組むと9個（標準的な構成）。8桁で 9×8＝72個。CMOSのNANDをスイッチ4個として 72×4＝288個。',
        'A17 Pro のトランジスタ数 190億個（Apple、2023年9月発表）。',
        '引き算は2の補数を足す方法、掛け算は桁をずらして足すくり返し（シフト加算）で、足し算機から作れる。繰り上がりの先読み（キャリー・ルックアヘッド）は、足し算機を速くする一般的な方法。'
      ]
    },
    {
      id: 'b5', no: 5, title: '記憶',
      headline: '入力をやめても消えない。スイッチは、どうやって「覚える」のか。',
      predict: {
        q: 'ここまでの回路は、入力を変えると出力もすぐ変わってしまいました。ゲートだけで、値を覚えておく回路を作るには、どうしますか？',
        options: ['出力を、自分の入力に戻して輪にする', 'ゲートを、もっと速く切り替える', 'ゲートだけでは無理。別の部品が必ず要る'],
        answer: 0,
        right: '正解。スイッチが自分を押し続ける輪を作ります。',
        wrong: '答えは「輪にする」。ゲートだけで、スイッチが自分を押し続ける輪を作れます。'
      },
      explore: [
        { t: 'p', h: 'B4の足し算機は、入力を変えた瞬間に答えも変わりました。計算の途中の数を、取っておけません。B2の金庫のたとえが崩れたところを思い出してください。金庫は開けたら開いたままでも、ANDは鍵を戻した瞬間に閉じてしまう。' },
        { t: 'p', h: 'では、出力を<b>自分の入力に戻したら</b>どうなるか。NOTを2つ、輪につないでみます。1つめの出力が2つめを押し、2つめの出力が1つめを押す。' },
        { t: 'sim', id: 'loop', cap: 'NOTの輪。丸の中の数字は、輪の上の各地点①②（③）の値。「ひと押し」は、①を一瞬だけ外から反転させる。' },
        { t: 'p', h: 'NOTが2つの輪では、①が1なら②は0、②が0なら①は1……と、互いに支え合って<b>そのまま止まります</b>。ひと押しで反転させると、今度は反対の形で止まる。落ち着く形が2つあり、そのどちらかに留まる。これが、1つの値を覚えるということです。' },
        { t: 'p', h: 'NOTを3つにすると、落ち着く形がありません。どこかで必ず食い違い、切り替わりが輪を回り続けます。輪が覚えるためには、反対が偶数回で元に戻ることが必要なのです。' },
        { t: 'analogy', ttl: 'シーソー', rows: [['左が下がっている／右が下がっている', '輪が「1」で落ち着いている／「0」で落ち着いている'], ['反対側をぐっと押す', '外からひと押しして書き込む'], ['手を離しても、傾いたまま', '入力をやめても、値が残る']],
          breaks: 'シーソーは重力で傾いたまま止まっています。輪の値は、2つのスイッチが<b>電源の力で互いを押し続けて</b>、やっと保たれています。電源を切ると、何を覚えていたかは消えてしまいます。' },
        { t: 'h', h: '書き込み口をつける' },
        { t: 'p', h: 'NOTの輪には、外から値を書き込む口がありません。そこで、NOTを<b>NOR</b>（B3のアポロに登場したゲート）に置き換えます。NORは「どれか1つでもオンなら0」。もう一方の入力がオフの間は、NOTとまったく同じに働きます。空いた入力が、<b>書き込み口</b>になるのです。' },
        { t: 'sim', id: 'latch', cap: 'NOR 2つでできた1ビットの記憶（ラッチ）。セットとリセットは、一瞬だけ入力をオンにする。ランプQが、覚えている値。' },
        { t: 'p', h: 'セットを押すと、Qが1になる。ボタンを離しても、Qは1のまま。リセットで0に戻り、離しても0のまま。<b>スイッチが、自分を押し続ける</b>。これが記憶の正体です。' }
      ],
      discover: [
        { t: 'p', h: 'ゲートだけで、覚えることができました。NORもNANDから作れるので、<b>計算も記憶も、NAND 1種類で作れる</b>ことになります。' },
        { t: 'num', big: '6', unit: '個', b: '1ビットを覚えるのに使うスイッチの数', l: 'CPUの中で、すぐ使う数を置いておく高速な記憶（SRAM）は、この「互いを押し続ける輪」をスイッチ6個で作ります。' },
        { t: 'p', h: '「電源を切る」も試しましたか。輪は、電源の力で互いを押し続けているだけ。電源が切れれば、覚えていた値は消え、入れ直すと0か1のどちらかに転びます。では、スマホの写真は、なぜ電源を切っても消えないのでしょう。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '覚え方は1つではない', ps: [
          'スマホの大容量の作業用メモリ（DRAM）は、スイッチ1個と、電気をためる小さな部屋1つで1ビットを覚えます。6個より小さく作れる代わりに、部屋の電気が少しずつ漏れるので、絶えず書き直しています。',
          '電源を切っても消えない写真や音楽は、<b>フラッシュメモリ</b>に入っています。電気を閉じ込める特別なスイッチを使うしくみで、東芝（いまのキオクシア）の舛岡富士雄さんらが生み出しました。大容量化の決め手になった「NAND型」の名前は、記憶の部屋を直列につなぐ形が、NANDの直列のスイッチと同じであることから来ています。'
        ] },
        { t: 'p', h: '実際のCPUでは、このラッチに「<b>合図のときだけ</b>書き込む」しかけを足した<b>フリップフロップ</b>を使います。次の章で、その合図が活躍します。' }
      ],
      quiz: [
        { type: 'tf', q: 'NOTを2つ輪につなぐと、いつまでも0と1が切り替わり続ける。', answer: 1, ex: '2つなら、互いに支え合って落ち着きます。切り替わり続けるのは、3つ（奇数）のときです。' },
        { type: 'choice', q: 'NORのラッチで「セット」を押して離したあと、Qはどうなる？', options: ['1のまま残る', 'すぐ0に戻る', '0と1をくり返す', '電源が切れる'], answer: 0, ex: '離しても、2つのNORが互いを押し続けるので、1が残ります。これが記憶です。' },
        { type: 'fill', before: '記憶の回路は、2つのゲートが互いを', after: 'ことで値を保っている。だから電源を切ると消える。', options: ['押し続ける', '切り離す', '冷やす', '数える'], answer: 0, ex: 'スイッチが自分（相手）を押し続ける輪。押す力は電源から来るので、電源が切れると値も消えます。' },
        { type: 'choice', q: 'ラッチの電源を切って、入れ直すと？', options: ['覚えていた値は消え、0か1のどちらかに転ぶ', '前の値が必ず戻る', '必ず1になる', '回路が壊れる'], answer: 0, ex: 'シーソーと違って、輪は電源の力で形を保っています。電源を切ると、何を覚えていたかは失われます。' }
      ],
      summary: '出力を自分の入力に戻して輪にすると、スイッチが自分を押し続けて値を覚える。計算も記憶も、ゲートだけで作れる。',
      next: '計算する回路と、覚える回路。この2つをつなぐと、何が生まれるのか。',
      deeper: [['D', 'どこで使われてる？']],
      sources: [
        'SRAMの記憶セル：トランジスタ6個（一般的な6T構成）。',
        'DRAM：トランジスタ1個＋コンデンサ1個で1ビット。電荷が漏れるため、定期的に書き直す（リフレッシュ）。',
        'NAND型フラッシュメモリ：東芝の舛岡富士雄らが1987年の国際会議IEDMで発表（キオクシア「“記憶の技術”はどこから来て」）。',
        'シミュレータ：ゲートが1つずつ順に切り替わる単純なモデル。実際のゲートは、ほぼ同時に、とても速く切り替わる。'
      ]
    },
    {
      id: 'b6', no: 6, title: 'ふりかえり',
      headline: 'スイッチ1種類から、計算機の心臓まで。',
      lead: '計算する回路と、覚える回路。2つをつなぐと、B1で押した「＋1」ボタンの中身が見えてきます。最後に、5つの章をたどり直しましょう。',
      labels: { explore: '② つなげる', quiz: '③ 総合問題', after: '④ 余韻' },
      explore: [
        { t: 'recall', from: 'B1', ttl: '＋1ボタン', fig: 'counter', to: 'b1', h: 'B1で押した「＋1」。1の位がいっぱいになると、繰り上がりが隣へ伝わりました。あのボタンの中では、何が起きていたのでしょう。' },
        { t: 'p', h: '答えは、B4の足し算機とB5の記憶でできた<b>輪</b>です。記憶にある数に1を足し、その答えを記憶へ書き戻す。これを<b>合図（クロック）</b>のたびにくり返します。' },
        { t: 'sim', id: 'acc', cap: '足し算機（B4）と記憶（B5）をつないだ輪。「合図を送る」たびに、足し算の答えが記憶に書き込まれる。「自動で合図」で、合図を送り続ける。' },
        { t: 'p', h: '足す数Bを変えれば、2ずつ、5ずつ数えることもできます。これに「どの数を、どこから取ってきて、何をするか」を読み取る回路を足したものが、<b>CPU（コンピュータの頭脳）</b>です。合図のたびに、計算して、覚えて、次へ進む。' },
        { t: 'num', big: '38億', unit: '回', b: '1秒間に送られる合図の数', l: 'S2で見たスマホのチップ（A17 Pro）の、最大の合図の速さ。いま手で押した合図が、1秒に約38億回、休みなく送られています。' },
        { t: 'fig', html: 'ladder', cap: 'スイッチから計算機までのはしご。どの段も、1つ下の段の組み合わせでできている。' },
        { t: 'h', h: '5つの章をたどり直す' },
        { t: 'recap', ids: ['b1', 'b2', 'b3', 'b4', 'b5'] }
      ],
      quiz: [
        { type: 'choice', q: 'コンピュータが0と1の2段階を使う、いちばんの理由は？', options: ['中継のたびに、はっきり言い直せるので、ゆらぎがたまらないから', '2段階のほうが、数を短く書けるから', '電気代が安いから', '10段階の部品がないから'], answer: 0, ex: '伝言ゲームと同じです。「はい」か「いいえ」なら、何十億回中継しても崩れません（B1）。' },
        { type: 'order', q: 'スイッチから計算機へ、組み上がる順に並べてください。', items: ['トランジスタ（電気で押せるスイッチ）', 'NAND（スイッチ数個のゲート）', '全加算器とラッチ（NANDやNORの組み合わせ）', '足し算と記憶の輪（合図で回る）'], ex: 'どの段も、1つ下の段の組み合わせです。スイッチ → ゲート → 足し算機と記憶 → 合図で回る輪 → CPU。' },
        { type: 'tf', q: 'NANDだけでは、記憶の回路は作れない。', answer: 1, ex: '記憶は、ゲートの出力を入力に戻した輪でできます。NORもNANDから作れるので、計算も記憶もNAND 1種類で作れます（B3・B5）。' },
        { type: 'fill', before: '足し算機の答えを記憶に書き戻すタイミングを決めているのは、', after: 'である。', options: ['合図（クロック）', '電源', 'ランプ', 'NOT'], answer: 0, ex: '合図のたびに書き込むので、輪が1回ずつ確実に進みます。スマホでは1秒に約38億回です。' },
        { type: 'choice', q: '8桁の足し算機で「255＋1」を計算したとき、繰り上がりはどう伝わる？', options: ['右端から左端へ、1桁ずつ順に伝わる', '左端から右端へ伝わる', 'すべての桁で同時に決まる', '伝わらない'], answer: 0, ex: 'ドミノ倒しのように右から左へ。だから本物のCPUは、繰り上がりを先読みする回路を足して速くしています（B4）。' },
        { type: 'explain', q: 'スマホのチップの中のスイッチが、どうやって「計算」と「記憶」をしているのか。30秒で友人に説明するつもりで書いてみてください。', model: 'チップの中のスイッチ（トランジスタ）は電気で押せて、出てきた電気で次のスイッチを押せます。スイッチを直列・並列・抜け道につなぐと、AND・OR・NOTという「判断」ができ、NANDという1種類のゲートからどんな判断も組み立てられます。判断を組み合わせると、各桁の和と繰り上がりが出せて、足し算になります。さらに出力を自分の入力に戻して輪にすると、スイッチが互いを押し続けて値を覚えます。足し算と記憶を合図（クロック）で回せば、数えたり計算を積み重ねたりできる。それを1秒に何十億回くり返しているのが、スマホの頭脳です。' }
      ],
      summary: '0と1 → 判断（ゲート）→ NAND 1種類 → 足し算と記憶 → 合図で回る輪。スイッチの組み合わせだけで、計算機ができあがる。',
      next: 'スイッチを組み上げて、計算機ができた。では、そのチップは私たちの身のまわりのどこで、何をしているのか。',
      deeper: [['D', 'どこで使われてる？'], ['C', 'つくりかた'], ['E', '社会と産業']],
      sources: [
        'A17 Pro の最大クロック 約3.78GHz（Apple、2023年）→ 1秒に約38億回。',
        'CPUの説明は大きく単純化している。実際には、命令を読み取って解釈する回路、多くの記憶、先読みのしくみなどがある。'
      ]
    }
  ];

  registerModule({
    code: 'B',
    name: '計算のしくみ',
    ds: '0と1、AND/OR/NOT、NAND 1種類で組む、足し算、記憶。触って確かめるシミュレータつき',
    css: `
.b-sim svg { display: block; width: 100%; height: auto; min-width: 0; }
.fig .b-lad { min-width: 0; }
.b-cv { margin: 4px 0 0; }
.b-w { fill: none; stroke: var(--silicon); stroke-opacity: .5; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
.b-w.on { stroke: var(--electron); stroke-opacity: 1; }
.b-fl { fill: none; stroke: var(--card); stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 0 14; animation: b-flow .8s linear infinite; }
@keyframes b-flow { to { stroke-dashoffset: -14; } }
.b-term { fill: var(--card); stroke: var(--ink-2); stroke-width: 2; }
.b-lev { stroke: var(--ink); stroke-width: 3.5; stroke-linecap: round; }
.b-pin { stroke: var(--ink-2); stroke-width: 2; }
.b-dot { fill: var(--ink-2); }
.b-lamp { fill: var(--card); stroke: var(--ink-3); stroke-width: 2; transition: fill .25s; }
.b-lamp.on { fill: var(--cine-mark); stroke: var(--ink-2); filter: drop-shadow(0 0 7px var(--cine-mark)); }
.b-fil { stroke: var(--ink-3); stroke-width: 1.5; }
.b-gate { fill: var(--card); stroke: var(--ink-2); stroke-width: 2; }
.b-src { fill: var(--card); stroke: var(--ink-3); stroke-width: 2; }
.b-src.on, .b-badge.on { fill: var(--electron); stroke: var(--electron); }
.b-badge { fill: var(--card); stroke: var(--silicon); stroke-width: 2; }
.b-srct.on { fill: var(--card); }
.b-grid { stroke: var(--rule); stroke-width: 1; }
.b-box { fill: var(--card); stroke: var(--rule); stroke-width: 1.5; }
.b-arw { fill: none; stroke: var(--ink-3); stroke-width: 2; }
.b-arw.on { stroke: var(--mark); stroke-width: 3; }
.b-bx { fill: var(--paper); stroke: var(--rule); } .b-bx.on { fill: var(--mark); stroke: var(--mark); }
.b-bt { fill: var(--ink-3); font: 500 16px var(--f-mono); } .b-bt.on { fill: var(--card); }
.b-tx { fill: var(--ink); font: 700 15px var(--f-body); }
.b-ts { fill: var(--ink-2); font: 400 13px var(--f-body); }
.b-tm { fill: var(--ink-3); font: 500 12px var(--f-mono); }
.b-te { fill: var(--electron); font: 700 13px var(--f-body); }
.b-big { fill: var(--ink); font: 700 30px var(--f-display); }
.b-sim .seg .btn[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.b-sim .seg .btn.b-in[aria-pressed="true"] { background: var(--electron); color: var(--card); border-color: var(--electron); }
.b-sim .btn[disabled] { opacity: .45; cursor: default; }
.b-tog { min-width: 8em; }
.b-tt { border-collapse: collapse; font-family: var(--f-mono); font-size: 14px; margin-top: 14px; }
.b-tt th, .b-tt td { padding: 3px 12px; text-align: center; border-bottom: 1px solid var(--rule); }
.b-tt th { font-family: var(--f-body); font-weight: 500; color: var(--ink-3); font-size: 12.5px; }
.b-tt tr.cur td { background: var(--mark-soft); color: var(--ink); font-weight: 700; }
.b-ok { color: var(--ok); } .b-ng { color: var(--ng); }
.b-goal { font-size: 14px; color: var(--ink-2); margin: 12px 0 4px; }
.b-goal b { color: var(--mark); margin-right: 4px; }
.b-socks { display: grid; gap: 6px; margin-top: 12px; }
.b-sock { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px; color: var(--ink-2); }
.b-sock span { min-width: 6.5em; font-family: var(--f-mono); font-size: 13px; }
.b-pick { min-width: 3.6em; font-family: var(--f-mono); font-weight: 700; border-color: var(--mark); color: var(--mark); }
.b-cnt, .b-reg { display: grid; gap: 6px; }
.b-cnt { grid-template-columns: repeat(5, minmax(0, 1fr)); max-width: 380px; }
.b-reg { grid-template-columns: repeat(8, minmax(0, 1fr)); }
.b-cell { border: 1px solid var(--rule); background: var(--paper); border-radius: 8px; padding: 10px 0 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; transition: background .2s, box-shadow .2s; }
.b-cell .v { font-family: var(--f-mono); font-size: 22px; font-weight: 500; color: var(--ink-3); line-height: 1.3; }
.b-cell .p { font-family: var(--f-mono); font-size: 10.5px; color: var(--ink-3); }
.b-cell.on { background: var(--mark); border-color: var(--mark); } .b-cell.on .v, .b-cell.on .p { color: var(--card); }
.b-cell.carry { box-shadow: 0 0 0 3px var(--electron); }
.b-ovf { border-style: dashed; }
.b-reg .b-cell .v { font-size: 17px; }
.b-add { display: grid; grid-template-columns: 2.4em repeat(9, minmax(0, 1fr)); gap: 4px; align-items: center; }
.b-rl { font-size: 13px; color: var(--ink-2); font-weight: 700; }
.b-sm-l { font-weight: 400; font-size: 11.5px; }
.b-pv { font-family: var(--f-mono); font-size: 10px; color: var(--ink-3); text-align: center; }
.b-bit { font: 500 16px var(--f-mono); height: 36px; padding: 0; border: 1px solid var(--rule); border-radius: 6px; background: var(--paper); color: var(--ink-3); }
.b-bit.on { background: var(--mark); border-color: var(--mark); color: var(--card); }
.b-cy { height: 20px; display: grid; place-items: center; font: 700 11px var(--f-mono); color: var(--card); border-radius: 999px; }
.b-cy.on { background: var(--electron); }
.b-sbit { height: 36px; display: grid; place-items: center; font: 700 17px var(--f-mono); border-top: 2px solid var(--ink-2); color: var(--ink-3); }
.b-sbit.on { color: var(--mark); } .b-sbit.pend { color: var(--rule); }
.b-half { display: flex; flex-wrap: wrap; gap: 18px 36px; align-items: center; }
.b-sum { display: grid; grid-template-columns: 1.2em 1.6em 1.6em; font-family: var(--f-mono); font-size: 30px; line-height: 1.3; text-align: center; }
.b-sum .b-op { font-size: 22px; align-self: center; color: var(--ink-2); }
.b-sum .b-bar { grid-column: 1 / -1; border-top: 2px solid var(--ink-2); height: 6px; margin-top: 4px; }
.b-sum .b-r { color: var(--mark); font-weight: 700; } .b-sum .b-r.dim { color: var(--rule); }
.b-sum .b-cap { font-family: var(--f-body); font-size: 11px; color: var(--ink-3); line-height: 1.4; }
.b-lamps { display: flex; gap: 22px; }
.b-lp { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-2); }
.b-lp i { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--ink-3); background: var(--card); transition: background .25s; }
.b-lp i.on { background: var(--cine-mark); border-color: var(--ink-2); box-shadow: 0 0 12px var(--cine-mark); }
.b-lad { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.b-lad .st { background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; padding: 12px 10px; min-width: 0; }
.b-lad .k { font-family: var(--f-mono); font-size: 11px; color: var(--mark); }
.b-lad .sh { font-weight: 700; font-size: 14px; line-height: 1.5; margin: 2px 0 4px; }
.b-lad .sd { font-size: 12.5px; color: var(--ink-2); line-height: 1.6; }
@media (max-width: 720px) { .b-lad { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 480px) { .b-add { gap: 3px; grid-template-columns: 2.1em repeat(9, minmax(0, 1fr)); } .b-bit { font-size: 14px; } .b-pv { font-size: 8.5px; } .b-tt th, .b-tt td { padding: 3px 8px; } }
@media (prefers-reduced-motion: reduce) { .b-fl { animation: none; } .b-lamp, .b-cell, .b-lp i { transition: none; } }
`,
    figs,
    sims,
    steps
  });
})();
