/* モジュールD「どこで使われてる？」
   通し線：S1の「段差」と「後押し（光・熱・電圧）」の使い方で、半導体の使い道を整理する。
   d1 部屋とスマホ → d2 目と温度計 → d3 頭脳・作業机・保管庫 → d4 LED → d5 太陽電池 → d6 パワー半導体 */
(() => {
  /* ===== 共通の小道具 ===== */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FONT = (C, px, wt = 400) => `${wt} ${px}px ${C.color('f-body') || 'sans-serif'}`;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pois = mu => {
    if (mu <= 0) return 0;
    if (mu < 30) { const L = Math.exp(-mu); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
    return Math.max(0, Math.round(mu + Math.sqrt(mu) * gauss()));
  };
  // 光の波長（nm）→ 見た目の色。光の色そのものなので直接の色指定を使う
  function wl2rgb(l) {
    let r = 0, g = 0, b = 0;
    if (l < 440) { r = -(l - 440) / 60; b = 1; }
    else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = -(l - 510) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = -(l - 645) / 65; }
    else r = 1;
    const f = l < 420 ? .3 + .7 * (l - 380) / 40 : l > 700 ? .3 + .7 * (780 - l) / 80 : 1;
    const c = v => Math.round(255 * Math.pow(clamp(v * f, 0, 1), .8));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }
  // 光の粒のエネルギー（eV）を線の色と線種に
  const photonStyle = (C, E) => {
    const l = 1240 / E;
    if (l > 780) return { c: C.color('ink-3'), dash: [3, 3] };
    if (l < 380) return { c: C.color('uv'), dash: [3, 3] };
    return { c: wl2rgb(l), dash: [] };
  };
  // canvas を親の幅に合わせ、高DPIにも対応する。draw は大きさが変わるたびに呼ぶ
  // （最初の描画は、kit が返ったあとに各 mount が自分で呼ぶ）
  function kit(cv, heightOf, draw) {
    const g = cv.getContext('2d'), k = { g, w: 0, h: 0, vis: true };
    let ready = false;
    const size = () => {
      const w = Math.round(cv.clientWidth || (cv.parentNode && cv.parentNode.clientWidth) || 0);
      if (w < 50 || w === k.w) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2), h = Math.round(heightOf(w));
      k.w = w; k.h = h; cv.style.height = h + 'px';
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); if (ready) draw();
    };
    size(); ready = true;
    let ro = null, io = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(size); ro.observe(cv); } else window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => es.forEach(e => { k.vis = e.isIntersecting; })); io.observe(cv); }
    const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
    const redraw = () => { if (k.w) draw(); };
    if (mq && mq.addEventListener) mq.addEventListener('change', redraw);
    const mo = 'MutationObserver' in window ? new MutationObserver(redraw) : null;
    if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    k.dispose = () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', size); if (io) io.disconnect(); if (mo) mo.disconnect(); if (mq && mq.removeEventListener) mq.removeEventListener('change', redraw); };
    return k;
  }
  // 画面に見えている間だけ fn(dt) を回す
  function loop(k, fn) {
    let id = 0, last = 0, alive = true;
    const tick = t => {
      if (!alive) return;
      const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
      if (k.vis) fn(dt);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(id); };
  }
  // ボタンの並び（.seg）を1つだけ選べる切り替えにする
  function segs(el, sel, on) {
    const bs = [...el.querySelectorAll(sel)];
    bs.forEach(b => b.addEventListener('click', () => { if (b.disabled) return; bs.forEach(x => x.setAttribute('aria-pressed', String(x === b))); on(b.dataset.v, b); }));
  }
  const tap = (node, fn) => {
    node.addEventListener('click', fn);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
  };

  /* ===== 静止した図 ===== */
  const figs = {
    // 使い道の地図（D1 の発見）
    pushmap() {
      const bands = `<rect x="40" y="8" width="74" height="12" rx="2" class="b-up"/><rect x="40" y="46" width="74" height="12" rx="2" class="b-low"/>`;
      const up = x => `<path d="M ${x} 44 V 24" class="ln-e" stroke-dasharray="3 2"/><path d="M ${x - 4} 28 L ${x} 22 L ${x + 4} 28" class="ln-e"/><circle cx="${x}" cy="14" r="4" class="e"/>`;
      const ic = {
        light: bands + `<path d="M 4 30 q 4 -6 8 0 t 8 0 t 8 0" class="ln-uv"/><path d="M 28 26 L 34 30 L 28 34" class="ln-uv"/>` + up(77),
        heat: bands + `<path d="M 10 54 q -4 -6 0 -12 t 0 -12 t 0 -12 M 20 54 q -4 -6 0 -12 t 0 -12 t 0 -12 M 30 54 q -4 -6 0 -12 t 0 -12 t 0 -12" class="d-heat"/>` + up(77),
        volt: `<rect x="6" y="40" width="108" height="12" rx="2" class="f-si"/><rect x="34" y="14" width="52" height="16" rx="3" class="f-es"/><text x="60" y="27" class="t-m" text-anchor="middle">門</text><text x="96" y="27" class="t-k">＋</text><circle cx="22" cy="46" r="3.5" class="e"/><circle cx="58" cy="46" r="3.5" class="e"/><circle cx="96" cy="46" r="3.5" class="e"/>`,
        emit: bands + `<circle cx="60" cy="14" r="4" class="e"/><path d="M 60 22 V 42" class="ln-e" stroke-dasharray="3 2"/><path d="M 56 38 L 60 44 L 64 38" class="ln-e"/><path d="M 72 52 q 4 -6 8 0 t 8 0 t 8 0 t 8 0" class="ln-uv"/><path d="M 102 48 L 108 52 L 102 56" class="ln-uv"/>`
      };
      const card = (svg, h, d, u) => `<div class="d-pm"><svg viewBox="0 0 120 62" aria-hidden="true">${svg}</svg><p class="d-pm-h">${h}</p><p class="d-pm-d">${d}</p><p class="d-pm-u">${u}</p></div>`;
      return `<div class="d-pmap">
        ${card(ic.light, '光で登らせる', '光の粒が、電子を段差の上へ押し上げる', '目（カメラ）→ D2<br>太陽電池 → D5')}
        ${card(ic.heat, '熱で登らせる', '温かいほど、登る電子が増える', '温度計 → D2')}
        ${card(ic.volt, '電圧で開け閉めする', '門の電圧で、通り道を開け閉めする（S2のスイッチ）', '頭脳・作業机・保管庫 → D3<br>パワー半導体 → D6')}
        ${card(ic.emit, '落として光らせる', '段差を落ちた電子が、光になる', 'LED → D4')}
      </div>`;
    },
    // 段差を落ちると光（D4・D5 の伏線の呼び出し）
    drop() {
      return `<svg viewBox="0 0 280 150" role="img" aria-label="電子が段差を落ちると、その高さぶんが光になる">
        <rect x="16" y="26" width="200" height="22" rx="3" class="b-up"/><rect x="16" y="98" width="200" height="22" rx="3" class="b-low"/>
        <circle cx="96" cy="37" r="7" class="e"/><circle cx="112" cy="109" r="7" class="e-empty"/>
        <path d="M 98 46 C 100 66, 108 80, 111 96" class="ln-e" stroke-dasharray="4 3"/><path d="M 106 90 L 111 98 L 115 89" class="ln-e"/>
        <path d="M 126 78 q 6 -9 12 0 t 12 0 t 12 0 t 12 0 t 12 0" class="ln-uv"/><path d="M 184 72 L 192 78 L 184 84" class="ln-uv"/>
        <text x="198" y="83" class="t-h">光</text>
        <path d="M 236 48 V 98 M 230 48 H 242 M 230 98 H 242" class="ln"/>
        <text x="246" y="70" class="t-s">段差</text><text x="246" y="88" class="t-s">の高さ</text>
        <text x="16" y="18" class="t-s">電子が落ちると</text><text x="16" y="142" class="t-s">高さ＝光の色</text>
      </svg>`;
    }
  };

  /* ===== 動かせる図 ===== */
  const ROOM = [
    { id: 'light', name: '天井の照明（LED）', semi: true, h: '<b>光る係</b>が入っています。電子が段差を落ちるとき、その高さぶんが光になる。白い光の秘密は D4 で。', tags: ['D4 光る'],
      svg: `<rect class="hit" x="136" y="0" width="88" height="40"/><rect class="ol f-card" x="146" y="6" width="68" height="12" rx="6"/><path class="d-ray" d="M 160 24 L 150 40 M 180 24 V 44 M 200 24 L 210 40"/>`, b: [216, 8] },
    { id: 'ac', name: 'エアコン', semi: true, h: '部屋の温度を<b>測る係</b>と、モーターの強さをむだなく<b>整える係</b>。判断する小さな頭脳もいます。', tags: ['D2 測る', 'D6 整える'],
      svg: `<rect class="hit" x="10" y="18" width="112" height="48"/><rect class="ol f-card" x="16" y="24" width="98" height="34" rx="6"/><path class="ln" d="M 24 47 H 106 M 24 52 H 106"/><circle cx="104" cy="32" r="2.5" class="f-k"/>`, b: [112, 26] },
    { id: 'book', name: '本棚', semi: false, h: '紙とインクと木。半導体は入っていません。',
      svg: `<rect class="hit" x="12" y="90" width="82" height="112"/><rect class="ol f-card" x="16" y="96" width="70" height="104" rx="2"/><path class="ln" d="M 16 130 H 86 M 16 165 H 86"/>
        <rect x="22" y="106" width="7" height="24" class="f-si"/><rect x="31" y="110" width="7" height="20" class="f-g"/><rect x="40" y="104" width="7" height="26" class="f-si"/><rect x="58" y="112" width="7" height="18" class="f-g"/>
        <rect x="22" y="142" width="7" height="23" class="f-g"/><rect x="31" y="140" width="7" height="25" class="f-si"/><rect x="49" y="146" width="7" height="19" class="f-si"/><rect x="58" y="141" width="7" height="24" class="f-g"/><rect x="67" y="144" width="7" height="21" class="f-si"/>
        <rect x="24" y="176" width="7" height="24" class="f-si"/><rect x="33" y="180" width="7" height="20" class="f-g"/><rect x="62" y="178" width="7" height="22" class="f-si"/>`, b: [86, 96] },
    { id: 'tv', name: 'テレビ', semi: true, h: '画面を<b>光らせる係</b>と、映像を整える<b>頭脳</b>、整える途中を広げておく<b>作業机</b>。', tags: ['D4 光る', 'D3 頭脳と記憶'],
      svg: `<rect class="hit" x="164" y="84" width="132" height="90"/><rect class="ol f-ink" x="172" y="92" width="116" height="70" rx="4"/><rect x="226" y="162" width="8" height="10" class="f-g"/>`, b: [288, 92] },
    { id: 'plant', name: '観葉植物', semi: false, h: '半導体は入っていません。',
      svg: `<rect class="hit" x="304" y="100" width="54" height="102"/><ellipse cx="324" cy="142" rx="8" ry="22" class="d-leaf" transform="rotate(-20 324 142)"/><ellipse cx="341" cy="140" rx="8" ry="24" class="d-leaf" transform="rotate(18 341 140)"/><ellipse cx="332" cy="130" rx="7" ry="27" class="d-leaf"/><rect class="ol f-card" x="318" y="168" width="28" height="32" rx="3"/>`, b: [348, 108] },
    { id: 'charger', name: 'スマホの充電器', semi: true, h: 'コンセントの電気を、スマホ用に<b>整える係</b>。大きな電気をすばやく切り替えるパワー半導体です。', tags: ['D6 整える'],
      svg: `<rect class="hit" x="116" y="158" width="44" height="46"/><rect class="f-card" x="122" y="164" width="16" height="24" rx="2"/><rect class="ol f-card" x="126" y="170" width="24" height="17" rx="3"/><path class="ln" d="M 150 180 C 166 188, 162 198, 152 204"/>`, b: [152, 168] },
    { id: 'remote', name: 'リモコン', semi: true, h: '先端から、目に見えない光（赤外線）を出す<b>光る係</b>。押したボタンを信号に変える、小さな頭脳もいます。', tags: ['D4 光る'],
      svg: `<rect class="hit" x="44" y="198" width="56" height="30"/><rect class="ol f-ink" x="52" y="210" width="42" height="11" rx="5"/><circle cx="58" cy="215.5" r="2" class="f-k"/>`, b: [94, 206] },
    { id: 'phone', name: 'スマホ', semi: true, h: '見る・考える・覚える・光る・電気を配る。<b>ほぼ全部の係</b>がそろっています。このあと開けてみます。', tags: ['D1 このあと'],
      svg: `<rect class="hit" x="102" y="194" width="48" height="34"/><rect class="ol f-ink" x="110" y="203" width="34" height="18" rx="4"/>`, b: [144, 200] },
    { id: 'calc', name: 'ソーラー電卓', semi: true, h: '光から電気を<b>作る係</b>（太陽電池）と、計算する<b>頭脳</b>。', tags: ['D5 作る'],
      svg: `<rect class="hit" x="152" y="190" width="46" height="38"/><rect class="ol f-card" x="160" y="199" width="30" height="23" rx="3"/><rect x="164" y="202" width="22" height="5" class="f-uv"/><path class="ln" d="M 165 212 h 4 m 4 0 h 4 m 4 0 h 4 M 165 217 h 4 m 4 0 h 4 m 4 0 h 4"/>`, b: [190, 200] },
    { id: 'thermo', name: '電子体温計', semi: true, h: '先端に、温めると電気を通しやすくなる半導体が入っています。<b>測る係</b>です。', tags: ['D2 測る'],
      svg: `<rect class="hit" x="200" y="200" width="68" height="28"/><rect class="ol f-card" x="208" y="213" width="50" height="7" rx="3.5"/><rect x="250" y="214" width="8" height="5" rx="2.5" class="f-g"/>`, b: [258, 210] }
  ];
  const SEMIS = ROOM.filter(x => x.semi).length;

  const CHIPS = [
    { id: 'eye', role: '目', part: 'イメージセンサー', does: '光を取り込んで、明るさを数字にする', hint: 'レンズの真下にいます。', x: 22, y: 22, w: 70, h: 70, c: [57, 57], lx: 57, ly: 86 },
    { id: 'brain', role: '頭脳', part: 'プロセッサ', does: '数字を計算して、写真を整える', hint: 'いちばん大きなチップ。休まず計算するので、いちばん熱くなります。', x: 104, y: 60, w: 80, h: 80, c: [144, 100], lx: 144, ly: 105 },
    { id: 'desk', role: '作業机', part: 'DRAM', does: '計算の途中のものを広げておく', hint: '頭脳とひっきりなしにやりとりするので、頭脳にぴったりくっついています。', x: 104, y: 144, w: 80, h: 38, c: [144, 163], lx: 144, ly: 168 },
    { id: 'store', role: '保管庫', part: 'フラッシュメモリ', does: '写真やアプリをしまっておく', hint: '写真を何千枚もしまえる、大きめのチップ。頭脳から少し離れていてもかまいません。', x: 22, y: 112, w: 70, h: 70, c: [57, 147], lx: 57, ly: 152 },
    { id: 'power', role: '電気の配り役', part: '電源IC', does: '電池の電気を、みんなに配る', hint: '電池から来た電気を、最初に受け取ります。電池のそばにいます。', x: 120, y: 204, w: 96, h: 44, c: [168, 226], lx: 168, ly: 231 }
  ];

  const sims = {
    /* --- D1：部屋の中から探す --- */
    room: {
      html() {
        return `<div class="d-svgw"><svg viewBox="0 0 360 270" class="d-room" role="group" aria-label="部屋のイラスト。タップして半導体を探す">
          <rect x="0" y="200" width="360" height="70" class="d-floor"/><path d="M 0 200 H 360" class="ln"/>
          <rect class="f-card" x="160" y="172" width="140" height="28" rx="2"/>
          <rect class="f-card" x="40" y="224" width="280" height="9" rx="3"/><path class="ln" d="M 56 233 V 262 M 304 233 V 262"/>
          ${ROOM.map(it => `<g class="d-item" data-id="${it.id}" tabindex="0" role="button" aria-label="${it.name}">${it.svg}
            <g class="d-badge" transform="translate(${it.b[0]} ${it.b[1]})"><circle r="7"/><path class="ck" d="M -3.5 0 L -1 2.8 L 3.6 -2.8"/><path class="no" d="M -3.5 0 H 3.5"/></g></g>`).join('')}
        </svg></div>
        <div class="d-info" id="d-room-info" aria-live="polite"><b class="t">半導体が入っていそうなものを、タップしてください。</b>見つけた半導体　0 / ${SEMIS}</div>`;
      },
      mount(el) {
        const info = el.querySelector('#d-room-info'), found = new Set();
        el.querySelectorAll('.d-item').forEach(g => tap(g, () => {
          const it = ROOM.find(x => x.id === g.dataset.id);
          g.classList.add(it.semi ? 'found' : 'none');
          if (it.semi) found.add(it.id);
          const all = found.size === SEMIS ? '　全部見つけました。光る・測る・作る・整える・考える。仕事はばらばらです。' : '';
          info.innerHTML = `<b class="t">${it.name}　${it.semi ? '─ 入っている' : '─ 入っていない'}</b>${it.h}
            ${it.tags ? `<span class="d-tags">${it.tags.map(t => `<span class="d-tag">${t}</span>`).join('')}</span>` : ''}
            <span class="d-cnt">見つけた半導体　${found.size} / ${SEMIS}${all}</span>`;
        }));
      }
    },

    /* --- D1：スマホを開けて、役割とチップを結ぶ --- */
    phone: {
      html() {
        const chip = c => `<g class="d-chip" data-id="${c.id}" tabindex="0" role="button" aria-label="まだ役割の分からないチップ">
          <rect class="body" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="5"/>
          ${c.id === 'eye' ? `<circle cx="57" cy="50" r="19" class="d-lens"/><circle cx="57" cy="50" r="7" class="d-lens-in"/>` : ''}
          <text class="d-cl" x="${c.lx}" y="${c.ly}" text-anchor="middle">？</text></g>`;
        return `<div class="d-svgw"><svg viewBox="0 0 360 272" role="group" aria-label="スマホの中の基板。役割を選んでからチップをタップする">
          <rect x="4" y="4" width="352" height="264" rx="28" class="d-body"/>
          <rect x="14" y="14" width="212" height="244" rx="10" class="d-board"/>
          <path class="d-trace" d="M 92 70 H 104 M 92 150 H 104 M 144 182 V 204 M 92 170 C 100 190, 110 210, 120 220 M 184 100 H 204 V 204"/>
          <rect x="196" y="40" width="12" height="7" class="f-g"/><rect x="198" y="58" width="8" height="12" class="f-g"/><rect x="30" y="200" width="12" height="7" class="f-g"/><rect x="50" y="198" width="8" height="12" class="f-g"/><rect x="30" y="226" width="22" height="14" class="f-g"/>
          <g class="d-batt" tabindex="0" role="button" aria-label="電池"><rect x="234" y="16" width="112" height="240" rx="12" class="d-bat"/><text x="290" y="134" class="t-h" text-anchor="middle">電池</text><rect x="222" y="221" width="14" height="12" class="f-g"/></g>
          ${CHIPS.map(chip).join('')}
          <g id="d-ph-ov" aria-hidden="true"></g>
        </svg></div>
        <div class="d-roles" role="group" aria-label="役割">${CHIPS.map(c => `<button class="d-role" data-r="${c.id}" aria-pressed="false"><b>${c.role}</b><span>${c.does}</span></button>`).join('')}</div>
        <div class="row"><button class="btn primary" id="d-ph-go" disabled>シャッターを押す（写真を1枚撮る）</button></div>
        <p class="sim-note" id="d-ph-note" aria-live="polite">まず下の役割を1つ選び、それらしいチップをタップしてください。</p>`;
      },
      mount(el, C) {
        const note = el.querySelector('#d-ph-note'), go = el.querySelector('#d-ph-go'), ov = el.querySelector('#d-ph-ov');
        const roles = [...el.querySelectorAll('.d-role')], done = new Set();
        let sel = null, raf = 0;
        const chipEl = id => el.querySelector(`.d-chip[data-id="${id}"]`);
        roles.forEach(b => b.addEventListener('click', () => {
          if (done.has(b.dataset.r)) return;
          sel = b.dataset.r; roles.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          note.textContent = `「${CHIPS.find(c => c.id === sel).role}」は、どのチップでしょう。基板の上をタップしてください。`;
        }));
        el.querySelectorAll('.d-chip').forEach(g => tap(g, () => {
          const id = g.dataset.id, c = CHIPS.find(x => x.id === id);
          if (done.has(id)) { note.textContent = `${c.role}＝${c.part}。${c.does}係です。`; return; }
          if (!sel) { note.textContent = '先に、下の役割を1つ選んでください。'; return; }
          const s = CHIPS.find(x => x.id === sel);
          if (sel !== id) { note.textContent = `そこは「${s.role}」ではなさそうです。ヒント：${s.hint}`; return; }
          done.add(id); g.classList.add('done'); g.setAttribute('aria-label', `${c.role}（${c.part}）`);
          g.querySelector('.d-cl').textContent = c.role;
          const b = roles.find(x => x.dataset.r === id); b.classList.add('done'); b.setAttribute('aria-pressed', 'false');
          b.innerHTML = `<b>✓ ${c.role}</b><span>＝ ${c.part}</span>`; sel = null;
          if (done.size === CHIPS.length) { go.disabled = false; note.textContent = '5つの役割がそろいました。「シャッターを押す」で、写真1枚ぶんのバトンを見てみましょう。'; }
          else note.textContent = `正解。${c.role}の正体は「${c.part}」。次の役割を選んでください。`;
        }));
        tap(el.querySelector('.d-batt'), () => { note.textContent = '電池は半導体ではありません。化学反応で電気をためておく部品です。その電気を配るのは「電気の配り役」。'; });

        const D = [57, 57], Bc = [144, 100], K = [144, 163], S = [57, 147];
        const TL = [
          { a: [57, 18], b: D, hl: 'eye', n: '① 目（イメージセンサー）：レンズから入った光を受け、1000万以上の点の明るさを数字にする。' },
          { a: D, b: Bc, hl: 'brain', n: '② 頭脳（プロセッサ）：数字の山を受け取り、色や明るさを整える計算を始める。' },
          { a: Bc, b: K, hl: 'desk', n: '③ 作業机（DRAM）：整えている途中の写真を広げておく。頭脳と何度も行き来する。' },
          { a: K, b: Bc, hl: 'brain' }, { a: Bc, b: K, hl: 'desk' }, { a: K, b: Bc, hl: 'brain' },
          { a: Bc, b: S, hl: 'store', n: '④ 保管庫（フラッシュメモリ）：できあがった写真をしまう。電源を切っても消えない。' },
          { a: S, b: S, hl: 'power', n: '⑤ この間ずっと、電気の配り役（電源IC）が、全員に電気を届けていた。4つの役割がバトンをつなぎ、1つが支えた。' }
        ];
        const hl = id => el.querySelectorAll('.d-chip').forEach(g => g.classList.toggle('act', g.dataset.id === id));
        go.addEventListener('click', () => {
          cancelAnimationFrame(raf); go.disabled = true;
          if (C.reducedMotion) {
            note.innerHTML = TL.filter(s => s.n).map(s => s.n).join('<br>'); go.disabled = false; return;
          }
          let i = 0, t0 = 0;
          const step = t => {
            if (!t0) { t0 = t; const s = TL[i]; hl(s.hl); if (s.n) note.textContent = s.n; }
            const s = TL[i], p = Math.min(1, (t - t0) / (s.n ? 950 : 450));
            const x = s.a[0] + (s.b[0] - s.a[0]) * p, y = s.a[1] + (s.b[1] - s.a[1]) * p;
            ov.innerHTML = s.hl === 'power'
              ? `<circle cx="168" cy="226" r="${14 + p * 40}" class="d-pulse" style="opacity:${1 - p}"/>`
              : (i === 0 ? `<path d="M 45 ${2 + p * 8} q 3 -4 6 0 t 6 0 M 57 ${p * 10} q 3 -4 6 0 t 6 0" class="ln-uv"/>` : '') + `<rect x="${x - 7}" y="${y - 6}" width="14" height="12" rx="2" class="d-photo"/>`;
            if (p >= 1) {
              i++; t0 = 0;
              if (i >= TL.length) { ov.innerHTML = ''; hl(null); go.disabled = false; go.textContent = 'もう一度撮る'; return; }
            }
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });
        return () => cancelAnimationFrame(raf);
      }
    },

    /* --- D2：イメージセンサー（画素に電子がたまる） --- */
    sensor: {
      html() {
        return `<canvas class="sim-cv" id="d-sen-cv" aria-label="24×16の画素。撮影すると、区画ごとに電子がたまり、数えると白黒の写真になる"></canvas>
          <div class="seg" id="d-sen-l"><span class="d-lbl">光の量</span><button class="btn d-tg" data-v="8" aria-pressed="false">晴れた屋外</button><button class="btn d-tg" data-v="1" aria-pressed="true">室内</button><button class="btn d-tg" data-v="0.125" aria-pressed="false">夜の部屋</button></div>
          <div class="sim-ctrl"><label for="d-sen-x">シャッターを開ける時間（目盛1つで2倍）</label><input type="range" id="d-sen-x" min="0" max="6" step="1" value="0"><output id="d-sen-xo" for="d-sen-x">×1</output></div>
          <div class="seg" id="d-sen-t"><span class="d-lbl">センサーの温度</span><button class="btn d-tg" data-v="0" aria-pressed="true">ふつう</button><button class="btn d-tg" data-v="1" aria-pressed="false">熱い</button></div>
          <div class="row"><button class="btn primary" id="d-sen-go">撮影する</button><button class="btn" id="d-sen-v" hidden>電子の数で見る</button></div>
          <div class="sim-read" id="d-sen-read" aria-live="polite"></div>
          <p class="sim-note" id="d-sen-note" aria-live="polite">光の量とシャッターの時間を選んで、「撮影する」を押してください。いまは室内で、いちばん短い時間（×1）です。</p>`;
      },
      mount(el, C) {
        const COLS = 24, ROWS = 16, N = COLS * ROWS, CAP = 100;
        const cv = el.querySelector('#d-sen-cv'), xs = el.querySelector('#d-sen-x'), xo = el.querySelector('#d-sen-xo');
        const goB = el.querySelector('#d-sen-go'), vB = el.querySelector('#d-sen-v'), read = el.querySelector('#d-sen-read'), note = el.querySelector('#d-sen-note');
        // 写す景色：空・太陽・山・地面（明るさ 0〜1）
        const B = [], kind = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const x = (c + .5) / COLS, y = (r + .5) / ROWS;
          const ridge = .56 - .3 * Math.exp(-(((x - .3) / .15) ** 2)) - .14 * Math.exp(-(((x - .62) / .09) ** 2));
          if (Math.hypot(x - .78, (y - .24) * ROWS / COLS) < .075) { B.push(1); kind.push('sun'); }
          else if (y > .84) { B.push(.3); kind.push('gnd'); }
          else if (y > ridge) { B.push(.13); kind.push('mtn'); }
          else { B.push(.5 + .22 * (1 - y)); kind.push('sky'); }
        }
        let L = 1, xi = 0, hot = false, phase = 'idle', p = 0, rr = 0, view = 'photo', dur = 1, darkMean = 0;
        const e = new Array(N).fill(0);
        const k = kit(cv, w => Math.floor(w / COLS) * ROWS + 30, draw);
        function draw() {
          if (!k.w) return;
          const g = k.g, w = k.w, cs = Math.floor(w / COLS), ox = Math.floor((w - cs * COLS) / 2), oy = 26;
          const sil = C.color('silicon-soft'), el_ = C.color('electron'), ink = C.color('ink');
          g.clearRect(0, 0, w, k.h);
          g.fillStyle = C.color('ink-3'); g.font = FONT(C, 12); g.textAlign = 'left';
          const lab = phase === 'idle' ? '画素24×16（本物は1000万以上）' : phase === 'expose' ? 'シャッターを開けています…' : phase === 'read' ? '1行ずつ、電子の数を数えています' : view === 'photo' ? '写真：電子が多い区画ほど白い' : '区画ごとの電子の数（青い水位）';
          g.fillText(lab, ox, 17);
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c, x = ox + c * cs, y = oy + r * cs;
            const photo = phase === 'done' ? view === 'photo' : phase === 'read' && r < Math.floor(rr);
            if (photo) {
              const gv = Math.round(255 * Math.pow(Math.min(e[i], CAP) / CAP, 1 / 1.8));
              g.fillStyle = `rgb(${gv},${gv},${gv})`; g.fillRect(x, y, cs, cs);
            } else {
              g.fillStyle = sil; g.fillRect(x + .5, y + .5, cs - 1, cs - 1);
              const amt = phase === 'idle' ? 0 : phase === 'expose' ? e[i] * p : e[i], lv = Math.min(amt, CAP) / CAP;
              if (lv > 0) { g.globalAlpha = .85; g.fillStyle = el_; g.fillRect(x + .5, y + .5 + (cs - 1) * (1 - lv), cs - 1, (cs - 1) * lv); g.globalAlpha = 1; }
              if (amt >= CAP) { g.fillStyle = ink; g.fillRect(x + 1, y + 1, cs - 2, 2); }
            }
          }
          if (phase === 'read') { g.strokeStyle = C.color('mark'); g.lineWidth = 2; g.strokeRect(ox, oy + Math.floor(rr) * cs, cs * COLS, cs); }
        }
        const mean = kd => { let s = 0, n = 0; e.forEach((v, i) => { if (kind[i] === kd) { s += Math.min(v, CAP); n++; } }); return s / n; };
        const fmt = v => v >= CAP - .5 ? `<b>100</b>個（満杯）` : `<b>${Math.round(v)}</b>個`;
        function report() {
          const sky = mean('sky'), mtn = mean('mtn'), sun = mean('sun');
          let satSky = 0, nSky = 0; e.forEach((v, i) => { if (kind[i] === 'sky') { nSky++; if (v >= CAP) satSky++; } });
          read.innerHTML = `<span>空 ${fmt(sky)}</span><span>山 ${fmt(mtn)}</span><span>太陽 ${fmt(sun)}</span>`;
          let n;
          if (hot && darkMean > 8) n = '熱いセンサー：光の当たらない山まで白っぽく、ざらざらに。光とは別の何かが、電子を登らせています（③で）。';
          else if (satSky / nSky > .5) n = '白飛び：区画が電子で満杯になり、空も太陽も同じ白に。あふれた電子のぶん、明るさの違いが消えました。時間を短くしてみましょう。';
          else if (sky < 14) n = '暗すぎ：電子が少なく、ざらざら。光の粒は雨粒のようにばらばらに降るので、数が少ないとむらが目立ちます。時間を長くしてみましょう。';
          else n = '撮れました。空・山・太陽の明るさの違いが、電子の数の違いとして記録されています。' + (sun >= CAP - .5 ? '太陽だけ満杯なのは、ふつうの写真でも同じです。' : '');
          note.textContent = n;
          vB.hidden = false; vB.textContent = '電子の数で見る'; view = 'photo';
        }
        function shoot() {
          const X = 2 ** xi, dk = hot ? 1.6 : .05;
          darkMean = dk * X;
          for (let i = 0; i < N; i++) e[i] = pois(B[i] * L * X * 12.5) + pois(dk * X);
          vB.hidden = true; read.innerHTML = '';
          if (C.reducedMotion) { phase = 'done'; draw(); report(); return; }
          phase = 'expose'; p = 0; rr = 0; dur = .5 + .3 * xi; goB.disabled = true;
          note.textContent = 'シャッターが開いています。光の粒が電子を段差の上へ押し上げ、区画にたまっていきます。';
        }
        segs(el.querySelector('#d-sen-l'), '.d-tg', v => { L = +v; });
        segs(el.querySelector('#d-sen-t'), '.d-tg', v => { hot = v === '1'; });
        xs.addEventListener('input', () => { xi = +xs.value; xo.textContent = '×' + 2 ** xi; });
        goB.addEventListener('click', shoot);
        draw();
        vB.addEventListener('click', () => { view = view === 'photo' ? 'count' : 'photo'; vB.textContent = view === 'photo' ? '電子の数で見る' : '写真で見る'; draw(); });
        const stop = loop(k, dt => {
          if (phase === 'expose') { p += dt / dur; if (p >= 1) { p = 1; phase = 'read'; rr = 0; note.textContent = 'シャッターを閉じました。1行ずつ、区画の電子を数えて数字にします。'; } draw(); }
          else if (phase === 'read') { rr += dt / .9 * ROWS; if (rr >= ROWS) { phase = 'done'; goB.disabled = false; report(); } draw(); }
        });
        return () => { stop(); k.dispose(); };
      }
    },

    /* --- D2：温度計（半導体と銅を温める） --- */
    thermo: {
      html() {
        return `<canvas class="sim-cv" id="d-th-cv" aria-label="温度を変えると、半導体では段差を登る電子の数が変わる。右は比べるための銅"></canvas>
          <div class="sim-ctrl"><label for="d-th-t">温度</label><input type="range" id="d-th-t" min="-10" max="60" step="1" value="25"><output id="d-th-to" for="d-th-t">25°C</output></div>
          <div class="sim-read" id="d-th-read"></div>
          <p class="sim-note" id="d-th-note" aria-live="polite">25°Cのときの電流を1倍としています。温度を変えてみてください。</p>`;
      },
      mount(el, C) {
        const cv = el.querySelector('#d-th-cv'), sl = el.querySelector('#d-th-t'), out = el.querySelector('#d-th-to');
        const read = el.querySelector('#d-th-read'), note = el.querySelector('#d-th-note');
        const semi = T => Math.exp(3435 * (1 / 298.15 - 1 / (T + 273.15)));
        const cu = T => 1 / (1 + .0039 * (T - 25));
        let T = 25, tm = 0;
        const S = [], Cu = [];
        for (let i = 0; i < 14; i++) Cu.push({ f: Math.random(), st: 'run' });
        const k = kit(cv, w => clamp(Math.round(w * .6), 250, 300), draw);
        const geo = () => { const pw = (k.w - 14) / 2; return { pw, x0: [0, pw + 14], uy: 40, bh: 20, ly: 104 }; };
        const target = () => clamp(Math.round(4 * semi(T)), 0, 24);
        function seed() { const n = target(); S.length = 0; for (let i = 0; i < n; i++) S.push({ f: Math.random(), st: 'run', t: 1, sx: Math.random() }); }
        seed();
        function draw() {
          if (!k.w) return;
          const g = k.g, w = k.w, h = k.h, { pw, x0, uy, bh, ly } = geo();
          const elc = C.color('electron'), ink = C.color('ink'), ink3 = C.color('ink-3'), mark = C.color('mark');
          g.clearRect(0, 0, w, h);
          [0, 1].forEach(side => {
            const X = x0[side], semiSide = side === 0, L2 = semiSide ? ly : uy + bh;
            g.fillStyle = ink; g.font = FONT(C, 13, 700); g.textAlign = 'left';
            g.fillText(semiSide ? '半導体（サーミスタ）' : '銅（比べるため）', X + 2, 16);
            g.fillStyle = C.color('electron-soft'); g.fillRect(X + 2, uy, pw - 4, bh);
            g.fillStyle = C.color('silicon-soft'); g.fillRect(X + 2, L2, pw - 4, bh);
            g.strokeStyle = ink3; g.lineWidth = 1; g.strokeRect(X + 2.5, uy + .5, pw - 5, bh - 1); g.strokeRect(X + 2.5, L2 + .5, pw - 5, bh - 1);
            g.font = FONT(C, 11); g.fillStyle = ink3;
            g.fillText(semiSide ? '段差あり' : '段差なし', X + 4, L2 + bh + 14);
            // 下の階：縛られた電子（銅は熱で揺れる原子として描く）
            const amp = semiSide ? 0 : (T + 15) / 75 * 2.2;
            for (let i = 0; i < 9; i++) {
              const cx = X + 12 + i * (pw - 24) / 8, cy = L2 + bh / 2 + (amp ? Math.sin(tm * 9 + i * 1.7) * amp : 0);
              g.globalAlpha = .35; g.fillStyle = elc; g.beginPath(); g.arc(cx + (amp ? Math.cos(tm * 7 + i) * amp : 0), cy, 4.5, 0, 7); g.fill(); g.globalAlpha = 1;
            }
            const dots = semiSide ? S : Cu;
            dots.forEach(d => {
              const xx = X + 8 + d.f * (pw - 16);
              let yy = uy + bh / 2;
              if (d.st === 'jump') yy = L2 + bh / 2 + (uy + bh / 2 - (L2 + bh / 2)) * d.t;
              if (d.st === 'fall') yy = uy + bh / 2 + (L2 + bh / 2 - (uy + bh / 2)) * d.t;
              g.fillStyle = elc; g.beginPath(); g.arc(d.st === 'run' ? xx : X + 8 + d.sx * (pw - 16), yy, 4.5, 0, 7); g.fill();
            });
            // 電流のメーター（25°Cを1倍、幅いっぱいを3.5倍）
            const ratio = semiSide ? semi(T) : cu(T), my = h - 52, mw = pw - 4;
            g.fillStyle = ink3; g.font = FONT(C, 12); g.fillText('流れる電流', X + 2, my - 6);
            g.fillStyle = C.color('silicon-soft'); g.fillRect(X + 2, my, mw, 14);
            g.fillStyle = mark; g.fillRect(X + 2, my, mw * Math.min(1, ratio / 3.5), 14);
            g.strokeStyle = ink; g.beginPath(); g.moveTo(X + 2 + mw / 3.5, my - 3); g.lineTo(X + 2 + mw / 3.5, my + 17); g.stroke();
            g.fillStyle = ink; g.font = FONT(C, 13, 700);
            g.fillText(`25°Cの ${ratio.toFixed(semiSide ? 1 : 2)} 倍`, X + 2, my + 34);
          });
        }
        function update() {
          T = +sl.value; out.textContent = T + '°C';
          read.innerHTML = `<span>半導体 <b>${semi(T).toFixed(1)}</b>倍</span><span>銅 <b>${cu(T).toFixed(2)}</b>倍</span>${T >= 35 && T <= 38 ? '<span>体温くらい</span>' : ''}`;
          note.textContent = T > 27 ? '温めると、半導体は電気を通しやすく、銅はわずかに通しにくくなる。向きが逆です。'
            : T < 23 ? '冷やすと、半導体は段差を登れる電子が減って、通しにくくなります。銅はわずかに通しやすくなる。'
              : '25°Cのときの電流を1倍としています。温度を変えてみてください。';
          if (C.reducedMotion) { seed(); draw(); }
        }
        sl.addEventListener('input', update); update(); draw();
        let acc = 0;
        const stop = C.reducedMotion ? () => {} : loop(k, dt => {
          tm += dt; acc += dt;
          const n = target(), live = S.filter(d => d.st !== 'fall').length;
          if (acc > .18) { acc = 0; if (live < n) S.push({ f: 0, st: 'jump', t: 0, sx: Math.random() }); else if (live > n) { const d = S.find(x => x.st === 'run'); if (d) { d.st = 'fall'; d.t = 0; d.sx = d.f; } } }
          for (let i = S.length - 1; i >= 0; i--) {
            const d = S[i];
            if (d.st === 'run') d.f = (d.f + dt * .22) % 1;
            else { d.t += dt / .45; if (d.t >= 1) { if (d.st === 'fall') S.splice(i, 1); else { d.st = 'run'; d.f = d.sx; } } }
          }
          Cu.forEach(d => { d.f = (d.f + dt * .22 * cu(T)) % 1; });
          draw();
        });
        return () => { stop(); k.dispose(); };
      }
    },

    /* --- D3：作業机（DRAM）と保管庫（フラッシュ） --- */
    memory: {
      html() {
        const grid = id => `<div class="d-grid" id="${id}">${Array.from({ length: 64 }, () => '<span class="d-c"><i></i></span>').join('')}</div>`;
        return `<div class="d-mem">
            <div><p class="d-mem-h">作業机<small>DRAM</small></p>${grid('d-mem-d')}<p class="d-mem-r" id="d-mem-dr"></p></div>
            <div><p class="d-mem-h">保管庫<small>フラッシュメモリ</small></p>${grid('d-mem-f')}<p class="d-mem-r" id="d-mem-fr"></p></div>
          </div>
          <div class="seg"><button class="btn primary" id="d-mem-w">絵を書き込む</button><button class="btn d-tg" id="d-mem-ref" aria-pressed="true">書き直し：オン</button><button class="btn d-tg" id="d-mem-pw" aria-pressed="true">電源：オン</button></div>
          <div class="sim-read"><span>書き込んでから <b id="d-mem-t">0</b> ミリ秒</span><span>（実際の20分の1の速さで再生）</span></div>
          <p class="sim-note" id="d-mem-note" aria-live="polite"></p>`;
      },
      mount(el, C) {
        const HEART = '00000000011001101111111111111111011111100011110000011000' + '00000000';
        const pat = [...HEART].map(Number);
        const dC = [...el.querySelectorAll('#d-mem-d .d-c')], fC = [...el.querySelectorAll('#d-mem-f .d-c')];
        const dI = dC.map(c => c.firstChild), fI = fC.map(c => c.firstChild);
        const note = el.querySelector('#d-mem-note'), tOut = el.querySelector('#d-mem-t'), dr = el.querySelector('#d-mem-dr'), fr = el.querySelector('#d-mem-fr');
        const wB = el.querySelector('#d-mem-w'), refB = el.querySelector('#d-mem-ref'), pwB = el.querySelector('#d-mem-pw');
        const tau = pat.map(() => 100 + Math.random() * 420);
        const q = pat.slice(), fq = pat.slice();
        let ref = true, pw = true, t = 0, fWrite = -1, next = [...Array(8)].map((_, r) => r * 8), flash = [], vis = true, acc = 0, goneSaid = false;
        const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { vis = x.isIntersecting; })) : null;
        if (io) io.observe(el);
        function paint() {
          let ok = 0;
          for (let i = 0; i < 64; i++) {
            dI[i].style.height = (q[i] * 100).toFixed(0) + '%';
            const one = q[i] > .5; dC[i].classList.toggle('one', one); if (+one === pat[i]) ok++;
            fI[i].style.height = (fq[i] * 100).toFixed(0) + '%'; fC[i].classList.toggle('one', fq[i] > .5);
          }
          let fok = 0; for (let i = 0; i < 64; i++) if (+(fq[i] > .5) === pat[i]) fok++;
          dr.innerHTML = `絵のとおりの区画 <b>${ok}</b> / 64`; fr.innerHTML = `絵のとおりの区画 <b>${fok}</b> / 64`;
          tOut.textContent = Math.round(t).toLocaleString();
          return ok;
        }
        function say() {
          const ones = q.filter(v => v > .5).length;
          if (fWrite >= 0) note.textContent = '保管庫に書き込み中。強い電圧で、電子に崖の壁をすり抜けさせて押し込むので、作業机より時間がかかります。';
          else if (!pw) note.textContent = '電源を切りました。作業机は書き直しが止まり、絵が消えていきます。保管庫は、崖に囲まれた電子がそのまま残ります。' + (ones === 0 ? '作業机の絵は、すっかり消えました。' : '');
          else if (!ref) note.textContent = '書き直しを止めました。漏れたコップが半分を切ると、0と読まれます。絵が欠けていくのを見てください。' + (ones === 0 ? '作業机の絵は、すっかり消えました。' : '');
          else note.textContent = '作業机のコップは、少しずつ漏れています。64ミリ秒ごとに1行ずつ読み、半分より多ければ満杯に注ぎ直しています（線で囲まれる行）。';
        }
        function write() {
          if (!pw) return;
          for (let i = 0; i < 64; i++) q[i] = pat[i];
          fq.fill(0); fWrite = 0; t = 0; next = [...Array(8)].map((_, r) => r * 8);
          if (C.reducedMotion) { for (let i = 0; i < 64; i++) fq[i] = pat[i]; fWrite = -1; }
          paint(); say();
        }
        wB.addEventListener('click', write);
        refB.addEventListener('click', () => { ref = !ref; refB.setAttribute('aria-pressed', String(ref)); refB.textContent = '書き直し：' + (ref ? 'オン' : 'オフ'); say(); });
        pwB.addEventListener('click', () => {
          pw = !pw; pwB.setAttribute('aria-pressed', String(pw)); pwB.textContent = '電源：' + (pw ? 'オン' : 'オフ'); wB.disabled = !pw;
          if (pw) { next = [...Array(8)].map((_, r) => t + r * 8); }
          if (!pw && fWrite >= 0) { fWrite = -1; }
          say();
        });
        paint(); say();
        let id = 0, last = 0;
        const tick = now => {
          const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
          if (vis) {
            const dms = dt * 50; t += dms;
            for (let i = 0; i < 64; i++) q[i] *= Math.exp(-dms / tau[i]);
            if (pw && ref) for (let r = 0; r < 8; r++) while (t >= next[r]) {
              for (let c = 0; c < 8; c++) { const i = r * 8 + c; q[i] = q[i] > .5 ? 1 : 0; }
              next[r] += 64; flash.push([r, now]);
            }
            if (fWrite >= 0) {
              fWrite += dt / 1.6 * 8;
              const rows = Math.min(8, Math.floor(fWrite));
              for (let i = 0; i < rows * 8; i++) fq[i] = pat[i];
              if (fWrite >= 8) { fWrite = -1; say(); }
            }
            flash = flash.filter(f => now - f[1] < 220);
            dC.forEach((c, i) => c.classList.toggle('ref', flash.some(f => f[0] === Math.floor(i / 8))));
            acc += dt;
            if (!C.reducedMotion || acc > .5) {
              acc = 0; paint();
              const gone = (!ref || !pw) && !q.some(v => v > .5);
              if (gone !== goneSaid) { goneSaid = gone; say(); }
            }
          }
          id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(id); if (io) io.disconnect(); };
      }
    },

    /* --- D4：段差の高さと光の色 --- */
    ledcolor: {
      html() {
        return `<canvas class="sim-cv" id="d-led-cv" aria-label="電子が段差を落ちて光になる。段差の高さで光の色が変わる"></canvas>
          <div class="sim-ctrl"><label for="d-led-e">段差の高さ</label><input type="range" id="d-led-e" min="1.1" max="3.5" step="0.05" value="1.9"><output id="d-led-eo" for="d-led-e">1.90 eV</output></div>
          <label class="d-chk"><input type="checkbox" id="d-led-ph"> 黄色く光る粉（蛍光体）をかぶせる</label>
          <div class="sim-read" id="d-led-read"></div>
          <p class="sim-note" id="d-led-note" aria-live="polite"></p>`;
      },
      mount(el, C) {
        const cv = el.querySelector('#d-led-cv'), sl = el.querySelector('#d-led-e'), out = el.querySelector('#d-led-eo'), ph = el.querySelector('#d-led-ph');
        const read = el.querySelector('#d-led-read'), note = el.querySelector('#d-led-note');
        let E = 1.9, P = [], spawn = 0, glow = .6;
        const kindOf = E => E < 1.25 ? ['赤外線', 'シリコンの段差（約1.1）はこのあたり。目に見えない赤外線です。ただし、シリコンは光を出すのがとても苦手です。']
          : E < 1.59 ? ['赤外線', 'リモコンのLED（ヒ化ガリウムなどの化合物）。人の目には見えません。']
            : E < 2.0 ? ['赤', '赤のLED（ガリウムとリンなどの化合物）。']
              : E < 2.17 ? ['オレンジ〜黄', '黄色やオレンジのLED（赤と同じ仲間の化合物）。']
                : E < 2.5 ? ['緑', '緑のLED（窒化ガリウムにインジウムを混ぜたもの）。']
                  : E < 2.76 ? ['青', '青のLED（窒化ガリウム系）。高い段差の材料は、きれいな結晶にするのがとても難しく、最後にできた色です。']
                    : E < 3.26 ? ['紫', '紫のLED（窒化ガリウム系）。']
                      : ['紫外線', '紫外線のLED（窒化ガリウム、段差は約3.4）。目には見えません。'];
        const white = () => ph.checked && E >= 2.55;
        const k = kit(cv, w => clamp(Math.round(w * .5), 210, 280), draw);
        function geo() {
          const w = k.w, h = k.h, x0 = 12, x1 = Math.round(w * .58), top = 30, bh = 16;
          const gap = (h - top - bh * 2 - 30) * E / 3.6;
          return { w, h, x0, x1, top, bh, yL: top + bh + gap, fx: x0 + (x1 - x0) * .62, gx: Math.round(w * .82), gy: Math.round(h * .45), gr: Math.min(w * .13, 52) };
        }
        function draw() {
          if (!k.w) return;
          const g = k.g, G = geo(), { w, h, x0, x1, top, bh, yL, fx, gx, gy, gr } = G;
          const st = photonStyle(C, E), ink3 = C.color('ink-3');
          g.clearRect(0, 0, w, h);
          g.fillStyle = C.color('electron-soft'); g.fillRect(x0, top, x1 - x0, bh);
          g.fillStyle = C.color('silicon-soft'); g.fillRect(x0, yL, x1 - x0, bh);
          g.strokeStyle = ink3; g.lineWidth = 1; g.strokeRect(x0 + .5, top + .5, x1 - x0 - 1, bh - 1); g.strokeRect(x0 + .5, yL + .5, x1 - x0 - 1, bh - 1);
          g.fillStyle = ink3; g.font = FONT(C, 11); g.textAlign = 'left';
          g.fillText('電子が流れてくる →', x0 + 2, top - 8);
          g.fillText('空席（正孔）', x0 + 2, yL + bh + 14);
          // 段差の寸法線
          const bx = x1 + 10;
          g.strokeStyle = C.color('ink'); g.beginPath(); g.moveTo(bx, top + bh); g.lineTo(bx, yL); g.moveTo(bx - 4, top + bh); g.lineTo(bx + 4, top + bh); g.moveTo(bx - 4, yL); g.lineTo(bx + 4, yL); g.stroke();
          g.fillStyle = C.color('ink'); g.font = FONT(C, 12, 700); g.fillText(`段差 ${E.toFixed(2)}`, x0 + 4, (top + bh + yL) / 2 + 4);
          // 空席
          g.strokeStyle = C.color('hole'); g.lineWidth = 1.6; g.setLineDash([2.5, 2]); g.beginPath(); g.arc(fx, yL + bh / 2, 5.5, 0, 7); g.stroke(); g.setLineDash([]);
          // 暗い部屋の中の光
          const px = gx - gr - 14, pw2 = Math.min(w - px - 6, gr * 2 + 28);
          g.fillStyle = C.color('cine'); g.beginPath(); g.roundRect ? g.roundRect(px, 8, pw2, h - 16, 10) : g.rect(px, 8, pw2, h - 16); g.fill();
          const visible = 1240 / E <= 780 && 1240 / E >= 380;
          if (visible || white()) {
            const col = white() ? 'rgb(255,250,236)' : st.c;
            const rg = g.createRadialGradient(gx, gy, 2, gx, gy, gr);
            rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
            g.globalAlpha = .55 + .45 * glow; g.fillStyle = rg; g.beginPath(); g.arc(gx, gy, gr, 0, 7); g.fill(); g.globalAlpha = 1;
            if (white()) { g.fillStyle = 'rgb(255,214,60)'; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; g.beginPath(); g.arc(gx + Math.cos(a) * gr * .55, gy + Math.sin(a) * gr * .55, 2.2, 0, 7); g.fill(); } }
          }
          g.fillStyle = C.color('cine-ink'); g.font = FONT(C, 12, 700); g.textAlign = 'center';
          g.fillText(white() ? '白に見える' : visible ? kindOf(E)[0] : '見えない', gx, h - 22);
          g.textAlign = 'left';
          // 粒
          P.forEach(q => {
            if (q.k === 'e') { g.fillStyle = C.color('electron'); g.beginPath(); g.arc(q.x, q.y, 5, 0, 7); g.fill(); }
            else {
              const s = photonStyle(C, E), ang = Math.atan2(gy - q.sy, gx - q.sx), L = 34;
              g.save(); g.translate(q.x, q.y); g.rotate(ang); g.strokeStyle = s.c; g.lineWidth = 2.2; g.setLineDash(s.dash); g.beginPath();
              for (let i = 0; i <= L; i += 2) { const yy = Math.sin(i / L * Math.PI * 4) * 4; i ? g.lineTo(i - L, yy) : g.moveTo(-L, yy); }
              g.stroke(); g.setLineDash([]); g.restore();
            }
          });
        }
        function update() {
          E = +sl.value; out.textContent = E.toFixed(2) + ' eV';
          const kd = kindOf(E), lam = Math.round(1240 / E / 5) * 5;
          read.innerHTML = `<span>光の波長 約<b>${lam}</b>nm</span><span>色 <b>${white() ? '白（青＋黄）' : kd[0]}</b></span>`;
          note.textContent = kd[1] + (ph.checked ? (white() ? '　粉が青い光の一部を黄色い光に変え、混ざって白く見えます。' : '　粉は、青い光を受けて黄色く光ります。段差を青のところ（約2.7）にしてみてください。') : '');
          P = []; draw();
        }
        sl.addEventListener('input', update); ph.addEventListener('change', update); update();
        const stop = C.reducedMotion ? () => {} : loop(k, dt => {
          const G = geo(); spawn -= dt; glow = Math.max(.25, glow - dt * .8);
          if (spawn <= 0) { spawn = .55; P.push({ k: 'e', x: G.x0 + 4, y: G.top + G.bh / 2, ph: 'run' }); }
          for (let i = P.length - 1; i >= 0; i--) {
            const q = P[i];
            if (q.k === 'e') {
              if (q.ph === 'run') { q.x += dt * 90; if (q.x >= G.fx) { q.x = G.fx; q.ph = 'fall'; } }
              else { q.y += dt * 260; if (q.y >= G.yL + G.bh / 2) { P.splice(i, 1); P.push({ k: 'p', x: G.fx + 6, y: G.yL - 4, sx: G.fx + 6, sy: G.yL - 4 }); } }
            } else {
              const dx = G.gx - q.sx, dy = G.gy - q.sy, d = Math.hypot(dx, dy);
              q.x += dx / d * dt * 220; q.y += dy / d * dt * 220;
              if (Math.hypot(q.x - q.sx, q.y - q.sy) >= d - 6) { P.splice(i, 1); glow = 1; }
            }
          }
          draw();
        });
        return () => { stop(); k.dispose(); };
      }
    },

    /* --- D5：段差の高さと、太陽の光の取り分 --- */
    solarband: {
      html() {
        return `<canvas class="sim-cv" id="d-sb-cv" aria-label="太陽の光の粒が段差に飛び込む。段差より低いエネルギーの粒は素通りし、高すぎる粒は余りが熱になる"></canvas>
          <div class="sim-ctrl"><label for="d-sb-e">段差の高さ</label><input type="range" id="d-sb-e" min="0.5" max="3.5" step="0.05" value="2.7"><output id="d-sb-eo" for="d-sb-e">2.70 eV</output></div>
          <div class="sim-read" id="d-sb-read"></div>
          <p class="sim-note" id="d-sb-note" aria-live="polite"></p>`;
      },
      mount(el, C) {
        const cv = el.querySelector('#d-sb-cv'), sl = el.querySelector('#d-sb-e'), out = el.querySelector('#d-sb-eo');
        const read = el.querySelector('#d-sb-read'), note = el.querySelector('#d-sb-note');
        // 太陽を 6000K の黒体とみなした光の粒の分布
        const kT = 8.617e-5 * 6000, dE = .01, Es = [], n = [];
        for (let x = dE; x <= 6; x += dE) { Es.push(x); n.push(x * x / (Math.exp(x / kT) - 1)); }
        const cdf = []; let acc = 0; n.forEach(v => { acc += v * dE; cdf.push(acc); }); const tot = acc;
        const powTot = Es.reduce((s, x, i) => s + x * n[i] * dE, 0);
        const below = Eg => { const i = Math.min(Es.length - 1, Math.max(0, Math.round(Eg / dE) - 1)); return cdf[i] / tot; };
        const share = Eg => Eg * (1 - below(Eg)) * tot / powTot;
        const sample = () => { const u = Math.random() * tot; let lo = 0, hi = cdf.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m + 1; else hi = m; } return Es[lo]; };
        let Eg = 2.7, P = [], spawn = 0;
        const k = kit(cv, w => clamp(Math.round(w * .82), 300, 380), draw);
        function geo() {
          const w = k.w, h = k.h, hTop = Math.round(h * .52), x0 = 14, x1 = w - 14, uy = 38, bh = 14;
          return { w, h, hTop, x0, x1, uy, bh, yL: uy + bh + (hTop - uy - bh * 2 - 26) * Eg / 3.6 };
        }
        function draw() {
          if (!k.w) return;
          const g = k.g, G = geo(), { w, h, hTop, x0, x1, uy, bh, yL } = G, ink3 = C.color('ink-3'), ink = C.color('ink');
          g.clearRect(0, 0, w, h);
          g.fillStyle = C.color('electron-soft'); g.fillRect(x0, uy, x1 - x0, bh);
          g.fillStyle = C.color('silicon-soft'); g.fillRect(x0, yL, x1 - x0, bh);
          g.strokeStyle = ink3; g.lineWidth = 1; g.strokeRect(x0 + .5, uy + .5, x1 - x0 - 1, bh - 1); g.strokeRect(x0 + .5, yL + .5, x1 - x0 - 1, bh - 1);
          g.fillStyle = ink3; g.font = FONT(C, 11); g.textAlign = 'left'; g.fillText('← 電子はn型の側へ', x0, uy - 8);
          g.textAlign = 'right'; g.fillText('空席はp型の側へ →', x1, yL + bh + 14); g.textAlign = 'left';
          g.fillStyle = ink; g.font = FONT(C, 12, 700); g.fillText(`段差 ${Eg.toFixed(2)}`, x0 + 4, (uy + bh + yL) / 2 + 4);
          P.forEach(q => {
            if (q.k === 'p') {
              const s = photonStyle(C, q.E);
              g.globalAlpha = q.a == null ? 1 : q.a; g.strokeStyle = s.c; g.lineWidth = 2; g.setLineDash(s.dash); g.beginPath();
              for (let i = 0; i <= 16; i += 2) { const xx = q.x + Math.sin(i / 16 * Math.PI * 3) * 3; i ? g.lineTo(xx, q.y - 16 + i) : g.moveTo(xx, q.y - 16); }
              g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
            } else if (q.k === 'e') { g.fillStyle = C.color('electron'); g.beginPath(); g.arc(q.x, q.y, 4.5, 0, 7); g.fill(); }
            else if (q.k === 'h') { g.strokeStyle = C.color('hole'); g.lineWidth = 1.5; g.setLineDash([2.5, 2]); g.beginPath(); g.arc(q.x, q.y, 4.5, 0, 7); g.stroke(); g.setLineDash([]); }
            else if (q.k === 'heat') {
              g.globalAlpha = Math.max(0, 1 - q.t); g.strokeStyle = C.color('ng'); g.lineWidth = 1.6; g.beginPath();
              for (let j = -1; j <= 1; j++) { g.moveTo(q.x + j * 6, q.y + 4); g.quadraticCurveTo(q.x + j * 6 - 3, q.y - 2, q.x + j * 6, q.y - 8); }
              g.stroke(); g.globalAlpha = 1;
            }
          });
          // 取り分の上限のグラフ
          const cx0 = 40, cx1 = w - 14, cy0 = hTop + 30, cy1 = h - 26, X = e => cx0 + (e - .5) / 3 * (cx1 - cx0), Y = v => cy1 - v / .5 * (cy1 - cy0);
          g.fillStyle = ink; g.font = FONT(C, 12, 700); g.fillText('段差の高さ（eV）ごとの、取り分の上限', 4, hTop + 14);
          g.strokeStyle = ink3; g.lineWidth = 1; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx0, cy1); g.lineTo(cx1, cy1); g.stroke();
          g.fillStyle = ink3; g.font = FONT(C, 11);
          [[0, '0%'], [.25, '25%'], [.5, '50%']].forEach(([v, s]) => { g.textAlign = 'right'; g.fillText(s, cx0 - 4, Y(v) + 4); });
          g.textAlign = 'center'; [1, 2, 3].forEach(v => g.fillText(String(v), X(v), cy1 + 14));
          g.strokeStyle = C.color('mark'); g.lineWidth = 2; g.beginPath();
          for (let e = .5; e <= 3.5001; e += .02) { const yy = Y(share(e)); e === .5 ? g.moveTo(X(e), yy) : g.lineTo(X(e), yy); }
          g.stroke();
          g.strokeStyle = ink3; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(1.12), cy0); g.lineTo(X(1.12), cy1); g.stroke(); g.setLineDash([]);
          g.fillStyle = ink3; g.textAlign = 'left'; g.fillText('シリコン', X(1.12) + 4, cy0 + 2);
          g.fillStyle = C.color('mark'); g.beginPath(); g.arc(X(Eg), Y(share(Eg)), 6, 0, 7); g.fill();
          g.textAlign = 'left';
        }
        function update() {
          Eg = +sl.value; out.textContent = Eg.toFixed(2) + ' eV';
          const pass = below(Eg), s = share(Eg);
          read.innerHTML = `<span>素通りする光の粒 <b>${Math.round(pass * 100)}</b>%</span><span>取り分の上限 <b>${Math.round(s * 100)}</b>%</span>`;
          note.textContent = Math.abs(Eg - 1.12) <= .15 ? 'ここが山の頂上付近。シリコンの段差（約1.1）は、太陽の光を電気にするのに、ちょうどいい高さです。'
            : Eg < 1.12 ? '段差が低すぎ。ほとんどの粒が電子を登らせますが、1粒から取り出せるのは段差の高さぶんだけ。余りは熱になって捨てられます（赤い波）。'
              : Math.abs(Eg - 2.7) < .08 ? 'いまは青色LEDと同じ高さの段差。段差に届かない光の粒が、たくさん素通りしています。段差を動かして、取り分がいちばん大きくなる高さを探してください。'
                : '段差が高すぎ。1粒の取り分は大きいものの、段差に届かない光の粒（灰色の点線は赤外線）が素通りしていきます。';
          P = []; draw();
        }
        sl.addEventListener('input', update); update();
        const stop = C.reducedMotion ? () => {} : loop(k, dt => {
          const G = geo(); spawn -= dt;
          if (spawn <= 0) { spawn = .16; const E = sample(); P.push({ k: 'p', E, x: G.x0 + 20 + Math.random() * (G.x1 - G.x0 - 40), y: 0 }); }
          for (let i = P.length - 1; i >= 0; i--) {
            const q = P[i];
            if (q.k === 'p') {
              q.y += dt * 170;
              if (q.E >= Eg && q.y >= G.yL + G.bh / 2) {
                P.splice(i, 1);
                const over = Math.min(28, (q.E - Eg) / 3.6 * (G.yL - G.uy) * 1.2);
                P.push({ k: 'e', x: q.x, y: G.yL + G.bh / 2, ty: G.uy + G.bh / 2, over, st: 0 }, { k: 'h', x: q.x, y: G.yL + G.bh / 2 });
              } else if (q.E < Eg && q.y > G.yL + 4) { q.a = Math.max(0, 1 - (q.y - G.yL) / (G.hTop - G.yL)); if (q.y > G.hTop) P.splice(i, 1); }
            } else if (q.k === 'e') {
              if (q.st === 0) { q.y -= dt * 260; if (q.y <= q.ty - q.over) { q.y = q.ty - q.over; q.st = 1; if (q.over > 3) P.push({ k: 'heat', x: q.x + 10, y: q.y, t: 0 }); } }
              else if (q.st === 1) { q.y = Math.min(q.ty, q.y + dt * 90); if (q.y >= q.ty) q.st = 2; }
              else { q.x -= dt * 120; if (q.x < G.x0) P.splice(i, 1); }
            } else if (q.k === 'h') { q.x += dt * 90; if (q.x > G.x1) P.splice(i, 1); }
            else { q.t += dt * 1.4; if (q.t >= 1) P.splice(i, 1); }
          }
          draw();
        });
        return () => { stop(); k.dispose(); };
      }
    },

    /* --- D5：パネルの傾きと太陽の高さ --- */
    angle: {
      html() {
        return `<canvas class="sim-cv" id="d-an-cv" aria-label="横から見た太陽電池のパネル。平行な光の筋のうち、パネルが受け止める本数が変わる"></canvas>
          <div class="seg" id="d-an-s"><span class="d-lbl">東京の正午の太陽</span><button class="btn d-tg" data-v="78" aria-pressed="false">夏至（78°）</button><button class="btn d-tg" data-v="54" aria-pressed="true">春分（54°）</button><button class="btn d-tg" data-v="31" aria-pressed="false">冬至（31°）</button></div>
          <div class="sim-ctrl"><label for="d-an-t">パネルの傾き</label><input type="range" id="d-an-t" min="0" max="90" step="1" value="0"><output id="d-an-to" for="d-an-t">0°</output></div>
          <div class="sim-read" id="d-an-read"></div>
          <p class="sim-note" id="d-an-note" aria-live="polite"></p>`;
      },
      mount(el, C) {
        const cv = el.querySelector('#d-an-cv'), sl = el.querySelector('#d-an-t'), out = el.querySelector('#d-an-to');
        const read = el.querySelector('#d-an-read'), note = el.querySelector('#d-an-note');
        let elev = 54, tilt = 0, hits = 0;
        const rad = d => d * Math.PI / 180;
        const k = kit(cv, w => clamp(Math.round(w * .6), 230, 320), draw);
        function draw() {
          if (!k.w) return;
          const g = k.g, w = k.w, h = k.h, gy = h - 30, cx = w * .56, cy = gy - 46, Lp = Math.min(w * .36, 160);
          const t = rad(tilt), s = rad(elev), dx = Math.cos(t), dy = -Math.sin(t);
          const P1 = [cx - dx * Lp / 2, cy - dy * Lp / 2], P2 = [cx + dx * Lp / 2, cy + dy * Lp / 2];
          const r = [Math.cos(s), Math.sin(s)], pp = [Math.sin(s), -Math.cos(s)], sp = 13;
          g.clearRect(0, 0, w, h);
          g.fillStyle = C.color('silicon-soft'); g.fillRect(0, gy, w, h - gy);
          g.strokeStyle = C.color('ink-3'); g.lineWidth = 1; g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke();
          g.fillStyle = C.color('ink-3'); g.font = FONT(C, 11); g.textAlign = 'left'; g.fillText('← 南', 6, gy + 16); g.textAlign = 'right'; g.fillText('北 →', w - 6, gy + 16);
          hits = 0;
          const uv = C.color('uv');
          for (let i = -60; i <= 60; i++) {
            const q = [cx + pp[0] * i * sp, cy + pp[1] * i * sp];
            // 光の筋とパネルの交点
            const ex = P2[0] - P1[0], ey = P2[1] - P1[1], den = r[0] * ey - r[1] * ex;
            let end = null;
            if (Math.abs(den) > 1e-6) {
              const tt = ((P1[0] - q[0]) * ey - (P1[1] - q[1]) * ex) / den, u = ((P1[0] - q[0]) * r[1] - (P1[1] - q[1]) * r[0]) / den;
              if (u >= 0 && u <= 1) end = [q[0] + r[0] * tt, q[1] + r[1] * tt];
            }
            const gt = (gy - q[1]) / r[1], gEnd = [q[0] + r[0] * gt, gy];
            const st = [q[0] - r[0] * 2000, q[1] - r[1] * 2000];
            if (end) {
              hits++;
              g.strokeStyle = uv; g.globalAlpha = 1; g.lineWidth = 1.6; g.beginPath(); g.moveTo(st[0], st[1]); g.lineTo(end[0], end[1]); g.stroke();
            } else {
              if (gEnd[0] < -50 || gEnd[0] > w + 50) continue;
              g.strokeStyle = uv; g.globalAlpha = .22; g.lineWidth = 1; g.beginPath(); g.moveTo(st[0], st[1]); g.lineTo(gEnd[0], gEnd[1]); g.stroke(); g.globalAlpha = 1;
            }
          }
          // 太陽
          const Rs = Math.min((cx - 24) / Math.max(.05, r[0]), (cy - 22) / Math.max(.05, r[1]));
          g.fillStyle = C.color('cine-mark'); g.beginPath(); g.arc(cx - r[0] * Rs, cy - r[1] * Rs, 13, 0, 7); g.fill();
          // パネルと支柱
          g.strokeStyle = C.color('ink-3'); g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, gy); g.stroke();
          g.strokeStyle = C.color('ink'); g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(P1[0], P1[1]); g.lineTo(P2[0], P2[1]); g.stroke();
          g.strokeStyle = C.color('silicon'); g.lineWidth = 3; g.beginPath(); g.moveTo(P1[0], P1[1]); g.lineTo(P2[0], P2[1]); g.stroke(); g.lineCap = 'butt';
          g.fillStyle = C.color('ink'); g.font = FONT(C, 12, 700); g.textAlign = 'right';
          g.fillText(`受け止めた光の筋 ${hits}本`, w - 6, 16); g.textAlign = 'left';
        }
        function update() {
          tilt = +sl.value; out.textContent = tilt + '°';
          draw();
          const inc = 90 - tilt - elev, f = Math.max(0, Math.cos(rad(inc)));
          read.innerHTML = `<span>受け取る光 <b>${Math.round(f * 100)}</b>%（真正面を100%）</span><span>発電の目安 <b>${Math.round(200 * f)}</b>W</span>`;
          note.textContent = Math.abs(inc) <= 3 ? '真正面です。光の筋を、いちばん多く受け止めています。季節を変えると、ちょうどいい傾きも変わります。'
            : inc > 0 ? 'パネルを、もう少し太陽のほうへ傾けると、受け止める光の筋が増えます。'
              : '傾けすぎ。光がななめに当たり、筋がパネルの面をすべって、受け止める本数が減っています。';
        }
        segs(el.querySelector('#d-an-s'), '.d-tg', v => { elev = +v; update(); });
        sl.addEventListener('input', update); update();
        return () => k.dispose();
      }
    },

    /* --- D6：絞る vs すばやくオンオフ --- */
    power: {
      html() {
        return `<canvas class="sim-cv" id="d-pw-cv" aria-label="モーターにかかる電気の形と、電池から出た電気の行き先"></canvas>
          <div class="seg" id="d-pw-m"><span class="d-lbl">方式</span><button class="btn d-tg" data-v="lin" aria-pressed="true">半開きで絞る</button><button class="btn d-tg" data-v="pwm" aria-pressed="false">すばやくオンオフ</button></div>
          <div class="sim-ctrl"><label for="d-pw-d">モーターの強さ</label><input type="range" id="d-pw-d" min="0" max="100" step="5" value="50"><output id="d-pw-do" for="d-pw-d">50%</output></div>
          <div class="seg" id="d-pw-s"><span class="d-lbl">スイッチの材料</span><button class="btn d-tg" data-v="si" aria-pressed="true">シリコン</button><button class="btn d-tg" data-v="sic" aria-pressed="false">SiC（炭化ケイ素）</button></div>
          <div class="sim-read" id="d-pw-read"></div>
          <p class="sim-note" id="d-pw-note" aria-live="polite"></p>`;
      },
      mount(el, C) {
        const cv = el.querySelector('#d-pw-cv'), sl = el.querySelector('#d-pw-d'), out = el.querySelector('#d-pw-do');
        const read = el.querySelector('#d-pw-read'), note = el.querySelector('#d-pw-note'), matBtns = [...el.querySelectorAll('#d-pw-s .d-tg')];
        let mode = 'lin', mat = 'si', d = .5, ph = 0, rot = 0;
        // 損失の値は、しくみを見るための目安
        const LOSS = { si: { r: .01, s: .012 }, sic: { r: .004, s: .003 } };
        const calc = () => {
          if (d < .01) return { out: 0, loss: 0 };
          if (mode === 'lin') return { out: d, loss: 1 - d };
          const m = LOSS[mat], cond = m.r * d, sw = d >= .995 ? 0 : m.s;
          return { out: d - cond, loss: cond + sw };
        };
        const k = kit(cv, w => clamp(Math.round(w * .6), 250, 320), draw);
        function draw() {
          if (!k.w) return;
          const g = k.g, w = k.w, h = k.h, ink = C.color('ink'), ink3 = C.color('ink-3'), mark = C.color('mark');
          const wx0 = 34, wx1 = Math.round(w * .66), wy0 = 34, wy1 = 118;
          const Y = v => wy1 - v * (wy1 - wy0 - 8);
          g.clearRect(0, 0, w, h);
          g.fillStyle = ink; g.font = FONT(C, 12, 700); g.textAlign = 'left'; g.fillText('モーターにかかる電気', 8, 18);
          g.strokeStyle = ink3; g.lineWidth = 1; g.beginPath(); g.moveTo(wx0, wy0); g.lineTo(wx0, wy1); g.lineTo(wx1, wy1); g.stroke();
          g.fillStyle = ink3; g.font = FONT(C, 10.5); g.textAlign = 'right'; g.fillText('全開', wx0 - 4, Y(1) + 4); g.fillText('0', wx0 - 4, Y(0) + 4); g.textAlign = 'left';
          g.strokeStyle = mark; g.lineWidth = 2.4; g.beginPath();
          if (mode === 'lin') { g.moveTo(wx0, Y(d)); g.lineTo(wx1, Y(d)); }
          else {
            const per = 52; let first = true;
            for (let x = wx0; x <= wx1; x += 1) {
              const pos = ((x - wx0 + ph) % per + per) % per / per, v = pos < d ? 1 : 0;
              first ? g.moveTo(x, Y(v)) : g.lineTo(x, Y(v)); first = false;
            }
          }
          g.stroke();
          if (mode === 'pwm' && d > .01 && d < .995) {
            g.strokeStyle = ink; g.lineWidth = 1.2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(wx0, Y(d)); g.lineTo(wx1, Y(d)); g.stroke(); g.setLineDash([]);
            g.fillStyle = ink; g.font = FONT(C, 11); g.textAlign = 'right'; g.fillText('ならすと', wx1, Y(d) - 5); g.textAlign = 'left';
          }
          // モーター
          const mx = Math.round(w * .84), my = 76, mr = Math.min(34, w * .1);
          g.strokeStyle = ink3; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.stroke();
          g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(mx - Math.cos(rot) * mr * .75, my - Math.sin(rot) * mr * .75); g.lineTo(mx + Math.cos(rot) * mr * .75, my + Math.sin(rot) * mr * .75); g.stroke();
          g.fillStyle = ink3; g.font = FONT(C, 11); g.textAlign = 'center'; g.fillText('モーター', mx, my + mr + 16); g.textAlign = 'left';
          // 電気の行き先
          const { out: o, loss } = calc(), inp = o + loss, by = 160, bx0 = 8, bx1 = w - 8, bw = bx1 - bx0;
          g.fillStyle = ink; g.font = FONT(C, 12, 700); g.fillText('電池から出た電気の行き先', bx0, by - 10);
          g.fillStyle = C.color('silicon-soft'); g.fillRect(bx0, by, bw, 26);
          if (inp > 0) {
            const fo = o / inp;
            g.fillStyle = mark; g.fillRect(bx0, by, bw * fo, 26);
            g.fillStyle = C.color('ng'); g.fillRect(bx0 + bw * fo, by, bw * (1 - fo), 26);
            g.font = FONT(C, 13, 700); g.fillStyle = mark; g.fillText(`モーターへ ${(fo * 100).toFixed(fo > .9 ? 1 : 0)}%`, bx0, by + 46);
            g.fillStyle = C.color('ng'); g.textAlign = 'right'; g.fillText(`熱 ${((1 - fo) * 100).toFixed(fo > .9 ? 1 : 0)}%`, bx1, by + 46); g.textAlign = 'left';
          } else { g.fillStyle = ink3; g.font = FONT(C, 12); g.fillText('モーターは止まっています', bx0 + 6, by + 18); }
          if (mode === 'pwm') { g.fillStyle = ink3; g.font = FONT(C, 11); g.fillText('本物は1秒に約1万回。ここではゆっくり描いています', bx0, h - 8); }
        }
        function update() {
          d = +sl.value / 100; out.textContent = Math.round(d * 100) + '%';
          matBtns.forEach(b => { b.disabled = mode === 'lin'; });
          const { out: o, loss } = calc(), inp = o + loss, eff = inp > 0 ? o / inp : 0;
          read.innerHTML = inp > 0 ? `<span>使えた割合 <b>${(eff * 100).toFixed(eff > .9 ? 1 : 0)}</b>%</span><span>熱になったむだ <b>${((1 - eff) * 100).toFixed(eff > .9 ? 1 : 0)}</b>%</span>` : '';
          note.textContent = d < .01 ? 'モーターは止まっています。強さを上げてみてください。'
            : mode === 'lin' ? `強さ${Math.round(d * 100)}%なのに、電池から出た電気の${Math.round((1 - d) * 100)}%が熱に。絞っているスイッチが、ブレーキのように熱くなります。`
              : (d >= .995 ? '全開のまま。切り替えがないので、むだはオンのときのわずかな抵抗だけです。' : '全開のときはスイッチに電圧がほとんどかからず、全閉のときは電流が流れない。むだは、切り替わる一瞬と、オンのときのわずかな抵抗だけ。')
              + (mat === 'sic' ? '　SiCにすると、そのむだがさらに減ります。' : '');
          draw();
        }
        segs(el.querySelector('#d-pw-m'), '.d-tg', v => { mode = v; update(); });
        segs(el.querySelector('#d-pw-s'), '.d-tg', v => { mat = v; update(); });
        sl.addEventListener('input', update); update();
        const stop = C.reducedMotion ? () => {} : loop(k, dt => { ph += dt * 26; rot += dt * d * 7; draw(); });
        return () => { stop(); k.dispose(); };
      }
    }
  };

  /* ===== 章 ===== */
  const steps = [
    {
      id: 'd1', no: 1, title: '部屋の中の半導体',
      headline: '電卓にも、照明にも、体温計にも。半導体は、なぜこんなに違う仕事ができるのか。',
      predict: {
        q: '次のうち、半導体が入っていないものはどれだと思いますか？',
        options: ['ソーラー電卓', 'LEDの照明', '電子体温計', 'どれにも入っている'],
        answer: 3,
        right: 'そのとおり。3つとも半導体なしには動きません。しかも、仕事はまるで違います。',
        wrong: '答えは「どれにも入っている」。3つとも半導体なしには動きません。しかも、仕事はまるで違います。'
      },
      explore: [
        { t: 'p', h: 'サマリでは、半導体を「電気を通す・通さないを、外から切り替えられる物質」として見てきました。では、それは身の回りのどこにあるのか。まずは部屋の中を探してみましょう。' },
        { t: 'sim', id: 'room', cap: 'タップすると、中で半導体がどんな仕事をしているかが分かる。半導体が入っているものは8つ。製品の中身は代表的な例。' },
        { t: 'p', h: '光る、測る、電気を作る、整える。見つかった半導体の仕事は、ばらばらでした。では、1台の機械の中ではどうでしょう。いちばん身近なスマホを開けてみます。' },
        { t: 'p', h: 'スマホの裏ぶたを開けると、基板の上に黒い四角がいくつも並んでいます。黒い四角は、チップを包んだ<b>パッケージ</b>。チップ本体は、その中の小さなかけらです。ここでは部品の名前より先に、<b>役割</b>で呼ぶことにします。' },
        { t: 'sim', id: 'phone', cap: '役割を選んでから、それらしいチップをタップする。5つそろったら、写真を1枚撮って、バトンの順を見てみよう。チップの配置は説明のための模式図。' },
        { t: 'p', h: '写真を1枚撮るだけで、目・頭脳・作業机・保管庫の4つがバトンをつなぎ、電気の配り役が全員を支えます。半導体は1種類の部品ではなく、<b>役割の違うチップが分業するチーム</b>なのです。' }
      ],
      discover: [
        { t: 'p', h: '答えは「どれにも入っている」。電卓は光で電気を作り、照明は電気で光り、体温計は熱を測る。向きも中身もばらばらに見える仕事を、どれも半導体がこなしています。なぜでしょう。' },
        { t: 'recall', from: 'S1', ttl: '段差', fig: 'step', to: 's1', h: '半導体の電子は、ちょっとした「後押し」で段差を登れる。後押しは、光・熱・混ぜ物・電圧でした。' },
        { t: 'p', h: 'じつは、半導体の使い道は、この<b>段差と後押しの使い方</b>で整理できます。光で登らせる。熱で登らせる。電圧で通り道を開け閉めする。そして逆に、段差を落として光らせる。混ぜ物は、どの使い道でも土台として使われています。' },
        { t: 'fig', html: 'pushmap', cap: '半導体の使い道の地図。同じ「段差」を、どの後押しで、どちら向きに使うかが違うだけ。このモジュールでは、この地図を1つずつたどる。' },
        { t: 'p', h: '電卓と照明は、同じ段差を<b>逆向き</b>に使っている。体温計とカメラは、後押しが<b>熱か光か</b>の違い。仕事の違いは、段差の使い方の違いだったのです。' }
      ],
      quiz: [
        { type: 'tf', q: 'スマホの中の半導体チップは、どれも同じ「計算」の仕事をしている。', answer: 1, ex: '目・頭脳・作業机・保管庫・電気の配り役と、役割の違うチップが分業しています。計算するのは頭脳の仕事です。' },
        { type: 'choice', q: '作業机のチップ（DRAM）が、頭脳のチップにぴったりくっついて置かれるのはなぜ？', options: ['頭脳とひっきりなしにやりとりするので、近いほど速いから', '作業机は熱に弱く、頭脳が温めてあげるから', 'スマホの重さのバランスをとるため', '見た目をそろえるため'], answer: 0, ex: '頭脳は計算のたびに作業机と行き来します。距離が短いほど速く、むだな電気も減ります。多くのスマホでは、頭脳の真上に重ねて載せています。' },
        { type: 'order', q: '写真を1枚撮るときの、バトンの順に並べてください。', items: ['目が光を受け、明るさを数字にする', '頭脳が、作業机を使いながら色や明るさを整える', '保管庫に写真をしまう'], ex: '目 → 頭脳（と作業机）→ 保管庫。どのチップも、電気の配り役から電気をもらって働いています。' },
        { type: 'fill', before: '電卓・照明・体温計の仕事の違いは、同じ「段差」を越えさせる', after: 'の使い方の違い。', options: ['後押し', '材料の値段', 'チップの大きさ', '電線の太さ'], answer: 0, ex: '光で登らせるか、熱で登らせるか、電圧で開け閉めするか、落として光らせるか。この地図を、D2から1つずつたどります。' }
      ],
      summary: '半導体は、役割の違うチップのチームで働く。仕事の違いは、段差を越えさせる「後押し」の使い方の違い。',
      next: 'では、光で電子を登らせると、なぜ写真が撮れるのか。',
      deeper: [['B', '計算のしくみ：頭脳の中身']],
      sources: [
        'スマホの分解図で「役割 → 部品名」の順に対応させる見せ方は、東京エレクトロン「半導体を知る」を、部屋の中から探す形は同「半導体を探そう！」を参考にした。',
        '多くのスマートフォンでは、DRAMのパッケージをプロセッサのパッケージの上に重ねて実装する（パッケージ・オン・パッケージ）。機種によっては隣に置く。図のチップの配置は模式図。',
        'スマホのメインカメラの画素数は1200万〜数千万画素が多い（例：iPhone 15 のメインカメラは4800万画素、Apple 2023年）。',
        '部屋の中の製品の中身は代表的な構成。機種により異なる。'
      ]
    },

    {
      id: 'd2', no: 2, title: '目と温度計',
      headline: 'スマホのカメラは、光をどうやって数字にしているのか。',
      predict: {
        q: 'スマホのカメラの「目」になる半導体。光が当たったとき、中で何が起きていると思いますか？',
        options: ['光の色ごとに、小さな電球が光り返す', '光が当たった場所で電子が生まれ、その数を数える', '光の熱で温まった場所を測る'],
        answer: 1,
        right: 'そのとおり。写真とは、電子の数の地図です。',
        wrong: '答えは「光が当たった場所で電子が生まれ、その数を数える」。写真とは、電子の数の地図です。'
      },
      explore: [
        { t: 'p', h: 'D1の地図の「光で登らせる」です。半導体の電子は、光の後押しで段差を登れます。光の粒が1つ飛び込むと、電子が1つ、上の階へ跳び上がる。跳び上がった電子は、自由に動ける電子です。' },
        { t: 'p', h: 'カメラの目（<b>イメージセンサー</b>）は、跳び上がった電子を逃がさず、小さな区画ごとにためておきます。区画の1つが、写真の1点。<b>画素</b>と呼びます。シャッターを開けている間に電子がたまり、閉じたら区画ごとに数を数える。しくみは、それだけです。' },
        { t: 'sim', id: 'sensor', cap: '24×16の画素で、山と太陽を撮る。青い水位は、区画にたまった電子の数（この図では1区画100個で満杯）。シャッターを閉じると、1行ずつ数を数えて白黒の写真にする。光の量は図のための目安。' },
        { t: 'analogy', ttl: '校庭に並べたバケツで、雨を測る', rows: [['ずらりと並べたバケツ', '画素（区画）'], ['降ってくる雨粒', '光の粒'], ['たまった水の量', 'たまった電子の数'], ['ふたを開けている時間', 'シャッターを開けている時間'], ['水があふれる', '白飛び']],
          breaks: '雨粒はバケツに入っても雨水のままですが、光の粒は電子を跳び上がらせると消えてしまいます。たまるのは光ではなく、光が後押しした電子です。また、バケツが雨の色を区別できないのと同じで、画素も色を見ていません。' },
        { t: 'p', h: '光の量とシャッターの時間を、いろいろ変えてみてください。短すぎると、ざらざら。長すぎると、真っ白。写真の失敗の多くは、バケツの水が「少なすぎる」か「あふれた」かのどちらかです。そして最後に、「センサーの温度」を熱くして、夜の部屋を長い時間で撮ってみてください。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '色は、どこから来るのか', ps: [
          '画素は電子の数しか数えられないので、色を見分けられません。カラー写真のセンサーでは、画素の1つずつに、赤・緑・青のどれか1色だけを通す小さなフィルターをかぶせています。隣どうしの画素の数を組み合わせて、色を計算で復元しているのです。',
          'また、本物の区画は、この図よりずっと小さく、ずっと多くの電子をためられます。'
        ] }
      ],
      discover: [
        { t: 'p', h: '答えは「光が当たった場所で電子が生まれ、その数を数える」。写真とは、<b>画素ごとの電子の数の地図</b>です。' },
        { t: 'p', h: 'では、センサーを熱くすると、なぜ写真が白っぽく、ざらざらになったのか。段差を登らせる後押しは、光だけではありませんでした。<b>熱</b>でも、電子は登ります。光の当たらない区画にも、熱で登った電子がたまってしまうのです。' },
        { t: 'p', h: 'だから、星を撮る天体用のカメラは、センサーを冷やして使います。カメラにとって熱はじゃまもの。けれど見方を変えると、<b>流れた電気の量から、温度が分かる</b>ということです。' },
        { t: 'sim', id: 'thermo', cap: '温度を変えると、半導体では段差を登る電子の数が変わる。右は比べるための銅で、熱で原子が揺れる。電流は25°Cのときを1倍とした。半導体は代表的なサーミスタ、銅は代表的な温度係数で計算。' },
        { t: 'p', h: '銅は温めると、原子の揺れが大きくなって電子がぶつかりやすくなり、わずかに通しにくくなります。半導体は逆に、段差を登る電子が増えて、ぐんと通しやすくなる。電子体温計の先端には、この性質をもつ半導体（<b>サーミスタ</b>）が入っています。' },
        { t: 'num', big: '約4', unit: '%', b: '体温計の半導体が、1°Cで変わる電気の通しやすさ', l: '銅は1°Cで約0.4%。しかも向きが逆です。同じ「1°Cあたりの変化」で比べて、およそ10倍。わずかな体温の違いを、はっきりした電気の違いとして読み取れます。' }
      ],
      quiz: [
        { type: 'tf', q: 'カメラの画素は、光の色を見分けて記録している。', answer: 1, ex: '画素が数えているのは、電子の数だけです。色は、画素の上にかぶせた赤・緑・青のフィルターと計算で復元しています。' },
        { type: 'choice', q: 'シャッターを開けている時間が長すぎると、写真はどうなる？', options: ['区画が電子で満杯になり、白く飛ぶ', '真っ暗になる', '色が反転する', '何も変わらない'], answer: 0, ex: 'バケツがあふれるのと同じです。満杯になると、それ以上の明るさの違いを記録できません。' },
        { type: 'choice', q: '温めると、半導体と銅の電気の通しやすさはどう変わる？', options: ['どちらも通しやすくなる', '半導体は通しやすく、銅はわずかに通しにくくなる', '半導体は通しにくく、銅は通しやすくなる', 'どちらも変わらない'], answer: 1, ex: '半導体は熱の後押しで段差を登る電子が増えます。銅は段差がなく、熱で揺れる原子に電子がぶつかりやすくなります。向きが逆なのがポイントです。' },
        { type: 'fill', before: '天体用のカメラがセンサーを冷やすのは、熱の後押しで勝手に段差を登る', after: 'を減らすため。', options: ['電子', '光', '色', '画素'], answer: 0, ex: '熱で登った電子は、光が来ていないのにたまり、写真を白っぽく、ざらざらにします。温度計にとっては、これが測りたい信号です。' }
      ],
      summary: 'カメラの目は、光が段差を登らせた電子を、画素ごとに数えている。熱も同じ後押しになるので、流れる電気を測れば温度計になる。',
      next: '数えた何千万もの数字は、次にどこへ行き、どこにしまわれるのか。',
      deeper: [['A', 'しくみ：純粋なシリコンの中の電子', 'a2']],
      sources: [
        'サーミスタの変化率：B定数3435K（10kΩ品でよく使われる値）として、25°C付近で 3435 ÷ 298² ≒ 3.9%/°C。図の電流の倍率は exp(3435 ×（1/298.15 − 1/絶対温度））。',
        '銅の電気抵抗の温度係数：約0.0039/°C（20°C付近の代表値）。図の電流は 1 ÷（1 + 0.0039 ×（温度 − 25））。',
        'カラーフィルターを赤・緑・青のモザイクに並べる方式は、コダックのブライス・バイエルが考案した（米国特許 3,971,065、1976年）。',
        'センサーの図の光の量・電子の数・熱で登る電子の量は、しくみを見るための目安。'
      ]
    },

    {
      id: 'd3', no: 3, title: '頭脳・作業机・保管庫',
      headline: '作業机の記憶は消え、保管庫の記憶は残る。その違いはどこにあるのか。',
      predict: {
        q: 'スマホの作業机（DRAM）は、電源を入れたままでも、放っておくと中身が消えていきます。消えないように、どれくらいの頻度で全体を書き直していると思いますか？',
        options: ['1日に1回', '1分に1回', '1秒に十数回'],
        answer: 2,
        right: '正解。休まず、1秒に十数回も書き直しています。',
        wrong: '答えは「1秒に十数回」。休まず書き直し続けています。'
      },
      explore: [
        { t: 'p', h: 'D2の目が数えた数字は、まず<b>頭脳</b>（プロセッサ）に渡ります。頭脳は、数百億個のスイッチで計算する係（S3）。けれど頭脳は、計算の材料も途中の結果も、手元にはほんの少ししか置けません。' },
        { t: 'p', h: 'そこで、すぐそばに<b>作業机</b>（DRAM）があります。開いているアプリ、加工中の写真。いま使うものを広げておく場所です。そして、撮り終えた写真やアプリそのものは、<b>保管庫</b>（フラッシュメモリ）にしまいます。' },
        { t: 'h', h: '作業机は、漏れるコップ' },
        { t: 'p', h: '作業机の1区画は、電子をためる小さなコップ（コンデンサ）と、その出入り口のスイッチ（トランジスタ）が1つずつ。電子が入っていれば1、空なら0です。しくみが単純なので、小さく、速く、たくさん並べられます。弱点は、コップの電子が少しずつ漏れ出すこと。' },
        { t: 'analogy', ttl: '小さな穴のあいたコップ', rows: [['穴のあいたコップ', '作業机の1区画'], ['水が入っている／空', '1／0'], ['水がじわじわ漏れる', '電子が少しずつ逃げる'], ['半分を切る前に注ぎ足す', '決まった間隔での書き直し（リフレッシュ）']],
          breaks: '本物の区画は、漏れる速さが1つずつばらばらです。多くはかなり長くもちますが、書き直しの間隔は、いちばん漏れやすい区画に合わせて決めてあります。また、注ぎ足すときは1つずつではなく、1行まとめて読んで書き戻します。' },
        { t: 'h', h: '保管庫は、崖に囲まれた小部屋' },
        { t: 'p', h: '保管庫は、電子を<b>絶縁体の壁で囲んだ小部屋</b>に閉じ込めます。S1で見た「崖のように高い段差」です。崖に囲まれた電子は、電源を切っても逃げ出せません。書き込むときは強い電圧をかけて、電子に壁をすり抜けさせて押し込みます。だから、書き込みには作業机より時間がかかります。' },
        { t: 'sim', id: 'memory', cap: '同じハートの絵を、作業机と保管庫に書き込む。コップの水位は、たまっている電子の量。半分より多ければ1と読む。漏れる速さは、しくみを見るための目安。' },
        { t: 'p', h: '書き直しを止めたり、電源を切ったりしてみてください。もう一度「絵を書き込む」と、最初からやり直せます。' }
      ],
      discover: [
        { t: 'p', h: '答えは「1秒に十数回」。作業机は、どんなに漏れやすい区画でも消えないように、すべての区画を<b>64ミリ秒ごとに</b>読んで書き戻すと決められています。' },
        { t: 'num', big: '64', unit: 'ミリ秒', b: '作業机（DRAM）が、すべての区画を書き直す間隔', l: '1秒間に約16回。スマホを机に置いて眺めている間も、作業机は休まず書き直し続けています。電源を切ると書き直しが止まり、中身は消えます。' },
        { t: 'p', h: '速いけれど漏れる作業机と、遅いけれど残る保管庫。頭脳は、両方を使い分けています。写真を撮るときは、保管庫からカメラのアプリを作業机に広げ、作業机の上で写真を整え、できあがったら保管庫へしまう。D1で見たバトンの正体です。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '保管庫は、何百階建て', ps: [
          'いまの保管庫の多くは、電子を閉じ込める部屋を上へ上へと積み重ねた立体構造（3D NAND）です。200階を超えるものも量産されています。部屋の作り方も、絶縁体の膜に電子をとらえる方式が主流になっています。',
          '崖の壁も、書き込みのたびに少しずつ傷みます。だから保管庫には、書き込める回数に限りがあります。'
        ] }
      ],
      quiz: [
        { type: 'tf', q: 'DRAMは、電源を入れている間は、何もしなくても中身を保ち続ける。', answer: 1, ex: 'コップの電子は少しずつ漏れます。64ミリ秒ごとに書き直し続けることで、中身を保っています。' },
        { type: 'choice', q: 'フラッシュメモリが、電源を切っても中身を保てるのはなぜ？', options: ['電子を絶縁体の壁で囲んだ小部屋に閉じ込めているから', '小さな電池が内蔵されているから', '磁石で記録しているから', '光で記録しているから'], answer: 0, ex: '絶縁体は「崖のように高い段差」。電源がなくても、電子は壁を越えて逃げ出せません。' },
        { type: 'fill', before: 'DRAMは、電子が漏れて消える前に、約', after: 'ミリ秒ごとにすべての区画を書き直している。', options: ['64', '1', '1000', '10万'], answer: 0, ex: '64ミリ秒、つまり1秒に約16回です。' },
        { type: 'choice', q: '頭脳のすぐそばに置くべきなのは、作業机と保管庫のどちら？', options: ['作業机。何度もすばやく出し入れするから', '保管庫。たくさんしまえるから', '保管庫。電源を切っても残るから', 'どちらでもよい'], answer: 0, ex: '頭脳は計算のたびに作業机と行き来します。保管庫とのやりとりは、アプリを開くときや写真をしまうときだけです。' }
      ],
      summary: '作業机（DRAM）は漏れるコップで、64ミリ秒ごとに書き直して記憶を保つ。保管庫（フラッシュ）は電子を崖の壁に閉じ込めるので、電源を切っても残る。',
      next: 'しまった写真を、画面に映す。その画面を光らせているのも半導体です。電子は、どうやって光になるのか。',
      deeper: [['B', '計算のしくみ：メモリ']],
      sources: [
        'DRAMの書き直し（リフレッシュ）の間隔：JEDEC の DDR4 規格（JESD79-4）で、85°C以下では64ミリ秒（8192回のリフレッシュ命令で全体を一巡）。1000 ÷ 64 ≒ 15.6回/秒。',
        '3D NANDの積層数：200層を超える製品が量産されている（例：Micron 232層、2022年）。',
        'シミュレータの漏れる速さ・書き込みの時間は、しくみを見るための目安。'
      ]
    },

    {
      id: 'd4', no: 4, title: '光る半導体',
      headline: '白いLEDは、どうやって白く光っているのか。',
      predict: {
        q: '部屋の照明の白いLED。白い光は、どうやって出していると思いますか？',
        options: ['白く光る材料がある', '赤・緑・青の3つのLEDを並べている', '青いLEDの光の一部を、黄色い光に変えて混ぜている'],
        answer: 2,
        right: '正解。主役は青いLEDです。',
        wrong: '答えは「青いLEDの光の一部を、黄色い光に変えて混ぜている」。主役は青いLEDです。'
      },
      explore: [
        { t: 'recall', from: 'A4', ttl: '段差を落ちると光になる', fig: 'drop', to: 'a4', h: 'n型から流れてきた電子が、p型の空席（正孔）に落ちる。そのとき、段差の高さぶんのエネルギーが、光の粒になって飛び出す。これがLEDでした。' },
        { t: 'p', h: '光の色は、光の粒1つがもつエネルギーで決まります。エネルギーが小さい順に、赤外線 → 赤 → 緑 → 青 → 紫 → 紫外線。つまり、<b>段差の高さが、光の色を決める</b>。段差の高さは材料で決まるので、色を変えたければ材料を変えます。' },
        { t: 'sim', id: 'ledcolor', cap: '段差の高さを変えると、飛び出す光の色が変わる。段差の高さは eV（電子ボルト）というエネルギーの単位で表す。右は暗い部屋で見たLEDの光。' },
        { t: 'p', h: 'リモコンの先の光は、段差の低いLEDが出す赤外線で、人の目には見えません。けれど、シリコンの段差（約1.1eV）はそれよりさらに低いので、スマホのカメラの目（D2）は赤外線でも電子を登らせられます。リモコンをスマホのカメラに向けてボタンを押すと、先端が光って見えることがあります（赤外線をさえぎるフィルターがあり、見えにくい機種もあります）。' },
        { t: 'h', h: '1つの段差からは、1つの色' },
        { t: 'p', h: 'ここで困ったことがあります。段差1つから出るのは、1つの色だけ。けれど白は、いろいろな色が混ざった光です。白い照明は、どうやって作ればよいのでしょう。' }
      ],
      discover: [
        { t: 'p', h: '答えは、青いLEDに<b>黄色く光る粉（蛍光体）</b>をかぶせること。青い光の一部が粉に当たると、粉が黄色く光る。残った青と、生まれた黄色が混ざって、人の目には白く見えます。上の図で、段差を青（約2.7）にして、粉をかぶせてみてください。' },
        { t: 'p', h: 'だから、白い照明には青いLEDが欠かせませんでした。赤や緑のLEDは早くからありました。けれど青を出す「高い段差」の材料は、きれいな結晶にするのがとても難しかった。1990年代にそれを成し遂げた、日本出身の3人の研究者は、2014年のノーベル物理学賞を受けています。授賞理由は、青色LEDが「明るく省エネな白い光源を可能にした」ことでした。' },
        { t: 'num', big: '86', unit: '%', b: '白熱電球をLED電球に替えると減る電気', l: '54Wの白熱電球を、同じくらいの明るさの7.5WのLED電球に替えた場合。白熱電球は、フィラメントを熱して光らせるので、電気の大半が熱になります。LEDは、段差を落ちた電子が直接、光になります。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '白の作り方は、1つではない', ps: [
          '赤・緑・青の3つのLEDを並べて白を作る方法もあり、色を細かく変えたい照明や画面で使われます。テレビやスマホの画面には、有機物でできた半導体が光る「有機EL」もあります。どれも「段差を落ちると光る」は同じです。'
        ] }
      ],
      quiz: [
        { type: 'choice', q: 'LEDの光の色を決めているのは？', options: ['段差の高さ（材料）', '流す電気の強さ', 'LEDの大きさ', '外側のプラスチックの色'], answer: 0, ex: '段差の高さが、光の粒1つのエネルギー、つまり色を決めます。外側のプラスチックに色がついていても、中のLEDの色は材料で決まっています。' },
        { type: 'tf', q: '白いLEDの照明の多くは、青いLEDに、黄色く光る蛍光体を組み合わせて白く見せている。', answer: 0, ex: '青い光の一部を、粉が黄色い光に変えます。残った青と黄色が混ざって、白く見えます。' },
        { type: 'order', q: '段差が低い順に、出る光を並べてください。', items: ['赤外線（リモコン）', '赤', '緑', '青'], ex: '段差が高いほど、光の粒1つのエネルギーが大きく、赤外線 → 赤 → 緑 → 青と変わります。' },
        { type: 'choice', q: '青色LEDの実現が、照明を大きく変えたのはなぜ？', options: ['青があれば、蛍光体と組み合わせて白い光が作れるから', '青い光がいちばん明るいから', '青いLEDは電気を使わないから', '赤や緑のLEDがまだなかったから'], answer: 0, ex: '赤や緑のLEDは早くからありました。最後に足りなかった青がそろって、白い照明への道が開けました。' }
      ],
      summary: 'LEDの色は、段差の高さで決まる。白い照明は、青いLEDの光の一部を粉で黄色に変えて混ぜたもの。',
      next: '電子が段差を落ちると、光になる。では逆に、光を当てたら？',
      deeper: [['A', 'しくみ：pn接合とLED', 'a4']],
      sources: [
        '光の粒のエネルギーと波長：波長（nm）≒ 1240 ÷ エネルギー（eV）。色の境目は、赤外線 約780nm（1.59eV）、紫外線 約380nm（3.26eV）。',
        '材料の段差の高さ（室温の代表値）：シリコン 約1.12eV、ヒ化ガリウム 約1.42eV、窒化ガリウム 約3.4eV。',
        '2014年ノーベル物理学賞：赤﨑勇、天野浩、中村修二。授賞理由 “for the invention of efficient blue light-emitting diodes which has enabled bright and energy-saving white light sources”（nobelprize.org）。',
        '白熱電球54W → 電球形LED 7.5W（年間2000時間使用）で、年間93.00kWhの省エネ（資源エネルギー庁 省エネポータルサイト「照明」）。(54 − 7.5) ÷ 54 ≒ 86%。',
        '白色LEDの多くは、窒化ガリウム系の青色LEDと黄色の蛍光体の組み合わせ（日亜化学工業が1996年に製品化）。'
      ]
    },

    {
      id: 'd5', no: 5, title: '逆再生：太陽電池',
      headline: '光る半導体に、逆から光を当てたら何が起きるのか。',
      predict: {
        q: 'LEDに電気を流すと光ります。では、電気を流さずに、LEDに強い光を当てるとどうなると思いますか？',
        options: ['何も起きない', 'わずかに電気が生まれる', 'LEDの色が暗く変わる'],
        answer: 1,
        right: 'そのとおり。LEDは、小さな太陽電池にもなります。',
        wrong: '答えは「わずかに電気が生まれる」。LEDは、小さな太陽電池にもなります。'
      },
      explore: [
        { t: 'recall', from: 'D4', ttl: '段差を落ちると光になる', fig: 'drop', to: 'd4', h: 'LEDでは、電子が段差を落ちて、その高さぶんが光になりました。では、動画を逆再生するように、光のほうから飛び込ませたら？' },
        { t: 'p', h: '光の粒が、下の階の電子を上の階へ押し上げます。ここまでは、D2のカメラの目と同じ。違うのはその先です。pn接合の境目には坂があり、登った電子はn型の側へ、空いた席（正孔）はp型の側へと転がり分かれます。両側にたまった電子と空席が、電池のマイナスとプラスになる。これが<b>太陽電池</b>です。' },
        { t: 'analogy', ttl: '動画の逆再生', rows: [['再生：電子が段差を落ちる → 光が出る', 'LED'], ['逆再生：光が飛び込む → 電子が段差を登る', '太陽電池'], ['どちら向きにも映っている、同じ段差', '同じしくみの pn 接合']],
          breaks: '動画は逆に流すだけですが、本物はどちらの向きにも「得意な形」があります。LEDは光を外へ出しやすく、太陽電池は光をたくさん受け止められるように、面を広く作ります。LEDに光を当てても、生まれる電気はほんのわずかです。' },
        { t: 'h', h: '段差は、高ければよいのか' },
        { t: 'p', h: '太陽の光には、赤外線から紫外線まで、いろいろなエネルギーの粒が混ざっています。段差に届かない粒は、電子を登らせられずに<b>素通り</b>します。段差を超える粒は電子を登らせますが、取り出せるのは<b>段差の高さぶんだけ</b>。余りは熱になって捨てられます。' },
        { t: 'sim', id: 'solarband', cap: '太陽の光の粒が段差に飛び込む（灰色の点線は赤外線、赤い波は熱になった余り）。下のグラフは、段差の高さごとに、太陽の光のエネルギーのうち取り出せる割合の上限（段差の高さだけで決まる分）。太陽を表面温度6000Kの光として計算。' },
        { t: 'h', h: '光の粒を、たくさん受け止める' },
        { t: 'p', h: '1粒からの取り分は、段差で決まりました。あとは、受け止める粒の数です。粒の数は、光の強さと、パネルの向きで変わります。' },
        { t: 'sim', id: 'angle', cap: '横から見たパネル。正午の太陽の高さは季節で変わる。傾きを変えて、受け止める光の筋の数を比べよう。発電の目安は、1m²・変換効率20%のパネルに、真正面から1m²あたり1000Wの日差しが当たるとしたもの。' }
      ],
      discover: [
        { t: 'p', h: '答えは「わずかに電気が生まれる」。LEDと太陽電池は、同じ pn 接合を逆向きに使っています。' },
        { t: 'p', h: 'そして、グラフの山の頂上は段差およそ1.1。<b>シリコンの段差は、太陽の光を電気にするのに、ちょうどいい高さ</b>なのです。S4で見た、地球でありふれた材料が、太陽電池にもよく向いていました。' },
        { t: 'num', big: '29', unit: '%', b: 'シリコンの太陽電池が、理論上、光を電気に変えられる上限', l: 'グラフの山は、段差の高さだけで決まる上限でした。実際には、登った電子が途中で落ちて戻るなどのむだもあり、シリコンでは約29%が上限です。市販のパネルは、高いもので約24%。' },
        { t: 'column', tag: 'ほんとうはもう少し複雑', ttl: '段差を重ねる、太陽の高さ', ps: [
          '1つの段差では、どうしても取りこぼしが出ます。そこで、段差の違う太陽電池を何層も重ね、上の層で青い光、下の層で赤い光というように分担させる方法があります。人工衛星などで使われています。',
          'また、太陽が低いと、光が空気の中を長い距離通って弱まります。角度の図では、この弱まりを省いています。'
        ] }
      ],
      quiz: [
        { type: 'tf', q: 'LEDに光を当てても、電気は一切生まれない。', answer: 1, ex: 'わずかに生まれます。LEDと太陽電池は、同じ pn 接合を逆向きに使っているからです。' },
        { type: 'choice', q: '段差が高すぎる太陽電池で起きることは？', options: ['段差に届かない光の粒が、素通りしてしまう', '1粒からの取り分が小さくなる', '光の色が変わる', '電気が逆向きに流れる'], answer: 0, ex: '1粒の取り分は大きくなりますが、使えない粒が増えます。逆に低すぎると、使える粒は多くても、1粒の取り分が小さくなります。' },
        { type: 'choice', q: 'パネルがいちばん多く発電するのは？', options: ['光が真正面から当たる向き', '光と平行な向き', 'いつでも地面と水平な向き', 'いつでも真上を向いた向き'], answer: 0, ex: '真正面から当たると、受け止める光の筋（光の粒）がいちばん多くなります。太陽の高さは季節で変わるので、ちょうどいい傾きも変わります。' },
        { type: 'explain', q: '太陽電池が「LEDの逆再生」と呼ばれるのはなぜか。「段差」という言葉を使って説明してみよう。', model: 'LEDは、電子が段差を落ちて、その高さぶんのエネルギーが光になる。太陽電池はその逆で、光の粒が電子を段差の上へ押し上げ、pn接合の坂で電子と空席を両側に分けて、電気として取り出す。同じしくみを、反対の向きに使っているから。' }
      ],
      summary: '太陽電池は、光で電子を段差の上へ押し上げて電気にする、LEDの逆再生。シリコンの段差は、太陽の光にちょうどいい高さ。',
      next: '太陽の電気で、車を走らせる。そのとき、数百ボルトの流れを操っているのも半導体です。',
      deeper: [['A', 'しくみ：pn接合', 'a4'], ['C', 'つくりかた']],
      sources: [
        '取り分の上限のグラフ：太陽を6000Kの黒体とみなし、段差以上のエネルギーをもつ光の粒が、1粒につき段差の高さぶんだけエネルギーを渡すとして計算（Shockley・Queisser 1961 の「究極効率」の考え方。計算すると最大は段差約1.1eVで約44%）。',
        'シリコンの太陽電池の理論上の上限 29.4%（Richter・Hermle・Glunz、IEEE Journal of Photovoltaics、2013年）。',
        '市販のパネルの効率：高いもので約24%（Fraunhofer ISE、2026年の発表）。',
        '東京（北緯35.7°）の正午の太陽の高さ：夏至 90 − 35.7 + 23.4 ≒ 78°、春分・秋分 ≒ 54°、冬至 90 − 35.7 − 23.4 ≒ 31°。',
        '1m²あたり1000Wは、太陽電池の性能を測るときの標準の日差し（IEC 60904-3）。変換効率20%は図のための仮定。'
      ]
    },

    {
      id: 'd6', no: 6, title: 'EVを動かす',
      headline: 'EVのモーターを、どうやって「ちょうどいい強さ」で回すのか。',
      predict: {
        q: 'EVのモーターを「半分の強さ」で回したい。電気の流れをどう調整するのが、いちばんむだが少ないと思いますか？',
        options: ['通り道を半分だけ開けて、流れを絞る', '全開と全閉を、目にもとまらぬ速さでくり返す', '電池の電気を一度ためて、少しずつ流す'],
        answer: 1,
        right: '正解。直感とは逆に、「半分開け」がいちばんむだが多いのです。',
        wrong: '答えは「全開と全閉を、目にもとまらぬ速さでくり返す」。直感とは逆に、「半分開け」がいちばんむだが多いのです。'
      },
      explore: [
        { t: 'p', h: 'S2の「電気で電気を切り替えるスイッチ」を思い出してください。スマホの頭脳では、ごく小さな電気を切り替えていました。EVでは、同じしくみのスイッチが、<b>数百ボルト・数百アンペア</b>の流れを切り替えます。大きな電気を扱う半導体を、<b>パワー半導体</b>と呼びます。' },
        { t: 'p', h: '仕事は、電池の電気を、モーターが欲しい強さに整えること。アクセルを少し踏めば少し、深く踏めばたくさん。では「少し」は、どうやって作るのか。2つのやり方を比べてみます。' },
        { t: 'sim', id: 'power', cap: '強さ50%のまま、2つの方式を比べよう。上はモーターにかかる電気、下は電池から出た電気の行き先。損失の値は、しくみを見るための目安。' },
        { t: 'analogy', ttl: 'ゆっくり走る自転車', rows: [['ブレーキを握ったまま、全力でこぐ', '流れを半開きで絞る'], ['ブレーキが熱くなる', '絞ったスイッチで、電気が熱になる'], ['こぐ・休むを、短い間隔でくり返す', '全開・全閉を、すばやく切り替える'], ['車体の重さで、速さがならされる', 'モーターのコイルが、流れをならす']],
          breaks: '自転車でも、こぐ・休むの間隔が長いと速さが波打ちます。モーターも同じなので、1秒に数千〜数万回という速さで切り替えます。ただし、切り替えの一瞬ごとに少しずつむだが出るので、速くすればするほどよいわけではありません。' },
        { t: 'p', h: '半開きで絞ると、スイッチに電圧がかかったまま電流が流れます。電圧と電流が同時にあるところでは、電気は熱に変わる。オンオフなら、全開のときはスイッチに電圧がほとんどかからず、全閉のときは電流が流れない。<b>どちらの瞬間も、むだはほぼゼロ</b>です。' }
      ],
      discover: [
        { t: 'p', h: '答えは「全開と全閉を、すばやくくり返す」。EVだけではありません。D1の部屋のエアコンの「インバーター」も、スマホの充電器も、同じしくみで電気をむだなく整えています。' },
        { t: 'p', h: 'それでも、切り替わる一瞬と、オンのときのわずかな抵抗には、むだが残ります。それを減らす切り札が、<b>材料</b>です。' },
        { t: 'p', h: 'シリコンの代わりに使われ始めたのが、<b>SiC（炭化ケイ素）</b>。段差の高さは約3.3eVで、シリコン（約1.1eV）のおよそ3倍です。段差が高いと、強い電圧をかけても、電子が勝手に段差を越えて流れ出しにくい。そしてD2で見たとおり、熱でも登りにくい。熱くなっても、スイッチをしっかり閉じきれます。' },
        { t: 'num', big: '約10', unit: '倍', b: 'SiCがシリコンより耐えられる電圧の強さ（同じ厚みあたり）', l: '同じ電圧に、約10分の1の薄さで耐えられる。薄いほど電流の通り道が短くなり、オンのときのむだが減ります。上の図で「すばやくオンオフ」にして、材料を切り替えてみてください。' },
        { t: 'p', h: 'D4の青色LEDの材料、窒化ガリウム（GaN）も段差が高く、いまは小さなスマホの充電器に使われています。むだが少ないから熱が少なく、熱が少ないから小さくできる。<b>段差の高さは、光の色だけでなく、大きな電気を扱う力も決める</b>のです。' }
      ],
      quiz: [
        { type: 'tf', q: '半分の強さを出すには、スイッチを半分だけ開けておくのが、いちばんむだが少ない。', answer: 1, ex: '半開きでは、スイッチに電圧がかかったまま電流が流れ、そのぶんが熱になります。全開と全閉をすばやくくり返すほうが、むだはずっと少なくなります。' },
        { type: 'choice', q: 'オンオフ方式で、むだ（熱）が出るのはおもにいつ？', options: ['切り替わる一瞬と、オンのときのわずかな抵抗', 'オフの間ずっと', 'オンの間ずっと大量に', 'むだは一切出ない'], answer: 0, ex: 'オフの間は電流が流れないので、むだはありません。残るのは、切り替えの一瞬と、オンのときのわずかな抵抗です。' },
        { type: 'choice', q: 'SiC（炭化ケイ素）が、パワー半導体に向いている理由は？', options: ['段差が高く、高い電圧や熱に耐えられるから', '金属なので電気をよく通すから', '光を出すから', 'シリコンより柔らかいから'], answer: 0, ex: '段差がシリコンの約3倍高いので、強い電圧や熱でも電子が勝手に流れ出しにくい。だから薄く作れて、むだも減ります。' },
        { type: 'fill', before: 'EVのパワー半導体は、電池の電気を、全開と全閉の', after: 'で、モーターの欲しい強さに整える。', options: ['すばやいくり返し', '半開き', 'ため込み', '温度'], answer: 0, ex: 'モーターのコイルが流れをならすので、モーターには平均の強さだけが伝わります。' }
      ],
      summary: 'パワー半導体は、全開と全閉をすばやくくり返して、大きな電気をむだなく「ちょうどいい強さ」にする。段差の高い材料ほど、むだが少ない。',
      next: 'スマホから車まで、半導体は社会のあらゆる場所で働いています。では、それを作る国や会社は、世界をどう分け合っているのか。',
      deeper: [['A', 'しくみ：トランジスタ', 'a5'], ['E', '社会と産業']],
      sources: [
        'EVの電池の電圧は約400Vが多く、約800Vの車種もある（例：現代自動車グループの E-GMP は800V）。',
        'EVのインバーターの切り替えの速さ：シリコンのIGBTでは8〜20kHzほど（1秒に8000〜2万回）が一般的。SiCではさらに速くできる。',
        '段差の高さ（室温）：シリコン 約1.12eV、SiC（4H-SiC）約3.26eV、窒化ガリウム 約3.4eV。耐えられる電圧の強さ（絶縁破壊電界）：シリコン 約0.3MV/cm、4H-SiC 約2.8MV/cm（Kimoto・Cooper『Fundamentals of Silicon Carbide Technology』2014年）。',
        'シミュレータの損失の値は、しくみを見るための目安。'
      ]
    }
  ];

  registerModule({
    code: 'D',
    name: 'どこで使われてる？',
    ds: '部屋とスマホの中の半導体、カメラと温度計、メモリ、LED、太陽電池、EV',
    css: `
      .frame.sim .d-svgw { max-width: 540px; margin: 0 auto; }
      .frame.sim .d-svgw svg, .fig .d-pm svg { min-width: 0; width: 100%; height: auto; display: block; }
      .d-floor { fill: var(--silicon-soft); }
      .d-ray { stroke: var(--ink-3); stroke-width: 1.2; stroke-dasharray: 3 3; fill: none; }
      .d-leaf { fill: var(--mark-soft); stroke: var(--mark); stroke-width: 1; }
      .d-heat { stroke: var(--ng); stroke-width: 1.8; fill: none; }
      .d-item, .d-chip, .d-batt { cursor: pointer; outline: none; }
      .d-item .hit { fill: transparent; stroke: none; }
      .d-item .ol { stroke: var(--ink-3); stroke-width: 1.3; }
      .d-item:hover .ol, .d-item:focus-visible .ol, .d-item.found .ol { stroke: var(--mark); stroke-width: 2.4; }
      .d-badge { display: none; }
      .d-item.found .d-badge, .d-item.none .d-badge { display: inline; }
      .d-badge circle { fill: var(--mark); } .d-item.none .d-badge circle { fill: var(--ink-3); }
      .d-badge path { stroke: var(--card); stroke-width: 1.8; fill: none; }
      .d-badge .no, .d-item.none .d-badge .ck { display: none; } .d-item.none .d-badge .no { display: inline; }
      .d-info { background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; padding: 12px 14px; margin-top: 12px; font-size: 14px; line-height: 1.75; min-height: 6.4em; }
      .d-info .t { display: block; font-family: var(--f-display); font-size: 16px; margin-bottom: 2px; }
      .d-tags { display: block; margin-top: 4px; }
      .d-tag { display: inline-block; font-family: var(--f-mono); font-size: 11.5px; color: var(--mark); border: 1px solid var(--mark); border-radius: 999px; padding: 0 9px; margin: 2px 6px 0 0; }
      .d-cnt { display: block; margin-top: 6px; font-size: 13px; color: var(--ink-3); }
      .d-body { fill: var(--card); stroke: var(--ink-3); stroke-width: 1.5; }
      .d-board { fill: var(--silicon-soft); stroke: var(--silicon); stroke-opacity: .6; }
      .d-trace { stroke: var(--silicon); stroke-width: 2; fill: none; opacity: .7; }
      .d-bat { fill: var(--paper); stroke: var(--ink-3); stroke-width: 1.2; }
      .d-batt:hover .d-bat, .d-batt:focus-visible .d-bat { stroke: var(--mark); }
      .d-chip .body { fill: var(--card); stroke: var(--ink-3); stroke-width: 1.4; transition: fill .3s, stroke .3s; }
      .d-chip:hover .body, .d-chip:focus-visible .body { stroke: var(--mark); stroke-width: 2.4; }
      .d-chip.done .body { fill: var(--mark-soft); stroke: var(--mark); }
      .d-chip.act .body { stroke: var(--mark); stroke-width: 3.5; }
      .d-cl { fill: var(--ink); font: 700 14px var(--f-body); }
      .d-chip:not(.done) .d-cl { fill: var(--ink-3); font-size: 18px; }
      .d-lens { fill: var(--ink-2); } .d-lens-in { fill: var(--card); opacity: .5; }
      .d-photo { fill: var(--mark); stroke: var(--card); stroke-width: 1.5; }
      .d-pulse { fill: none; stroke: var(--mark); stroke-width: 3; }
      .d-roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; margin-top: 14px; }
      .d-role { text-align: left; background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; padding: 8px 12px; font-size: 13px; line-height: 1.5; color: var(--ink-2); }
      .d-role b { display: block; font-size: 15px; color: var(--ink); }
      .d-role[aria-pressed="true"] { border-color: var(--mark); box-shadow: inset 0 0 0 1px var(--mark); }
      .d-role.done { background: var(--mark-soft); border-color: var(--mark); cursor: default; }
      .d-tg[aria-pressed="true"] { background: var(--mark); color: var(--card); border-color: var(--mark); }
      .d-tg[disabled] { opacity: .45; cursor: default; }
      .d-lbl { font-size: 13px; color: var(--ink-2); align-self: center; margin-right: 2px; }
      .d-chk { display: flex; gap: 8px; align-items: center; margin-top: 12px; font-size: 14px; color: var(--ink-2); }
      .d-chk input { accent-color: var(--mark); width: 18px; height: 18px; }
      .d-mem { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .d-mem-h { font-weight: 700; font-size: 14px; margin: 0 0 8px; line-height: 1.5; }
      .d-mem-h small { display: block; font-weight: 400; font-size: 12px; color: var(--ink-3); }
      .d-mem-r { font-size: 13px; color: var(--ink-2); margin: 6px 0 0; }
      .d-mem-r b { font-family: var(--f-display); font-size: 18px; color: var(--ink); }
      .d-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 3px; max-width: 240px; }
      .d-c { position: relative; aspect-ratio: 1; background: var(--silicon-soft); border: 1px solid var(--rule); border-radius: 0 0 4px 4px; overflow: hidden; }
      .d-c i { position: absolute; left: 0; right: 0; bottom: 0; height: 0; background: var(--electron); opacity: .45; }
      .d-c.one i { opacity: .95; }
      .d-c.ref { border-color: var(--mark); box-shadow: 0 0 0 1px var(--mark); }
      #d-mem-f .d-c { border: 3px solid var(--silicon); border-radius: 3px; }
      .d-pmap { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
      .d-pm { background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; padding: 12px; min-width: 0; }
      .fig .d-pm svg { max-width: 190px; }
      .d-pm-h { font-weight: 700; font-size: 15px; line-height: 1.5; margin: 8px 0 0; }
      .d-pm-d { font-size: 13px; color: var(--ink-2); line-height: 1.6; margin: 2px 0 6px; }
      .d-pm-u { font-family: var(--f-mono); font-size: 12px; color: var(--mark); line-height: 1.7; margin: 0; }
    `,
    figs, sims, steps
  });
})();
