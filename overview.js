/* ClearPath Overview: one animated segmented ring with two views (Monthly / Debts).
   Loads after the main script; reads debts, budget and recurring, and redraws on every update. */
(function () {
  // Use safe DOM lookup in case $ isn't globally declared
  const $ = id => document.getElementById(id);
  const ov = $('overview');
  if (!ov) return; // Guard clause in case overview container isn't in DOM yet

  // Hidden copies of the old containers keep the original render() code from hitting missing elements.
  ov.innerHTML = '<div id="ov2"></div><div class="hidden"><div id="interestBox"></div><div id="overviewList"></div></div>';

  const st = document.createElement('style');
  st.textContent =
    '@keyframes pop{from{opacity:0;transform:scale(.55) rotate(-25deg)}}@keyframes fade{from{opacity:0}}@keyframes up{from{opacity:0;transform:translateY(10px)}}' +
    '.tog{display:flex;gap:4px;background:#e7e9f0;padding:4px;border-radius:13px;margin-bottom:6px}.tog button{flex:1;background:none;color:var(--muted);padding:9px}.tog button.on{background:#fff;color:var(--ink);box-shadow:0 2px 8px #19234f14}' +
    '.rwrap{position:relative;max-width:340px;margin:6px auto 10px}.rg{display:block;width:100%;overflow:visible}' +
    '.seg{cursor:pointer;transform-box:view-box;transform-origin:50% 50%;transition:transform .25s,filter .25s,opacity .25s;animation:pop .85s cubic-bezier(.2,.9,.3,1.15) backwards}' +
    '.seg.on{transform:translate(var(--dx),var(--dy));filter:drop-shadow(0 6px 8px #0003)}.rg.dim .seg:not(.on){opacity:.4}' +
    '.pl{fill:#fff;font:800 14px -apple-system,sans-serif;text-anchor:middle;dominant-baseline:middle;pointer-events:none;animation:fade .6s .8s backwards}' +
    '.ctr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;padding:0 21%}' +
    '.ctr small{font-size:12px;color:var(--muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ctr b{font-size:25px;letter-spacing:-.04em;line-height:1.2}.ctr em{font-style:normal;font-size:12px;color:var(--muted)}' +
    '.lgd .row{padding:10px 8px;border-radius:12px;cursor:pointer;transition:background .2s;animation:up .5s backwards}.lgd .row.on{background:#f1f3f8}' +
    '.dot{width:12px;height:12px;border-radius:4px;flex:none;margin-right:10px}.lgd .nm{display:flex;align-items:center;min-width:0}.lgd .nm div{min-width:0}.lgd .nm strong{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.lgd .nm span{font-size:12px}.lgd .am{text-align:right;font-size:14px;white-space:nowrap}.lgd .am small{display:block;color:var(--muted);font-size:12px}' +
    '.det{margin-top:8px;padding:12px 14px;border-radius:14px;background:#f6f7fa;animation:up .3s}.det .row{padding:4px 0;font-size:13px}' +
    '.wi{margin-top:12px;padding:14px;border-radius:14px;background:#f6f7fa}.wi input[type=range]{width:100%;accent-color:#00ad68;margin:10px 0 4px}.wi .res{font-size:14px}' +
    '@media(prefers-reduced-motion:reduce){#ov2 *{animation:none!important;transition:none!important}}';
  document.head.appendChild(st);

  const PAIRS = [['#7ee787', '#00ad68'], ['#ffd86b', '#e9b949'], ['#ffb36b', '#f08a3c'], ['#ff8a7a', '#d9534f'], ['#6ec1ff', '#4c8dff'], ['#7fd6d0', '#2a9d8f'], ['#a99bff', '#6c5ce7'], ['#b5c2d3', '#6f819b']];
  const R = 146, r = 99, C = 160;
  let view = 'month', sel = -1, S = [], ctrDefault = '';

  const rad = x => x * Math.PI / 180;
  const pt = (rr, a) => [(C + rr * Math.sin(rad(a))).toFixed(2), (C - rr * Math.cos(rad(a))).toFixed(2)];
  function arc(a0, a1) {
    const [x1, y1] = pt(R, a0), [x2, y2] = pt(R, a1), [x3, y3] = pt(r, a1), [x4, y4] = pt(r, a0), L = (a1 - a0) > 180 ? 1 : 0;
    return 'M' + x1 + ' ' + y1 + 'A' + R + ' ' + R + ' 0 ' + L + ' 1 ' + x2 + ' ' + y2 + 'L' + x3 + ' ' + y3 + 'A' + r + ' ' + r + ' 0 ' + L + ' 0 ' + x4 + ' ' + y4 + 'Z';
  }

  function build() {
    const inc = (Number(typeof budget !== 'undefined' ? budget.pay : 0) || 0) * 26 / 12;
    const map = new Map();
    if (typeof budget !== 'undefined' && budget.bills) {
      budget.bills.forEach(b => map.set(String(b.name).trim().toLowerCase(), { name: b.name, amt: Number(b.amt) || 0 }));
    }
    if (typeof recurring !== 'undefined') {
      recurring.forEach(b => { const k = String(b.name).trim().toLowerCase(); if (!map.has(k)) map.set(k, { name: b.name, amt: Number(b.amt) || 0 }); });
    }
    const bills = [...map.values()].filter(b => b.amt > 0).sort((a, b) => b.amt - a.amt);
    const billT = bills.reduce((s, b) => s + b.amt, 0);
    const debtP = typeof total === 'function' ? total('payment') : 0;
    const left = inc - billT - debtP;
    const warm = [PAIRS[1], PAIRS[2], PAIRS[3], PAIRS[1], PAIRS[2]];
    const m = bills.slice(0, 5).map((b, i) => ({ n: b.name, v: b.amt, p: warm[i], kind: 'bill' }));
    if (bills.length > 5) m.push({ n: 'Other bills (' + (bills.length - 5) + ')', v: bills.slice(5).reduce((s, b) => s + b.amt, 0), p: PAIRS[7], kind: 'bill' });
    if (debtP > 0) m.push({ n: 'Debt payments', v: debtP, p: ['#4c6a96', '#19234f'], kind: 'debt' });
    if (left > 0) m.push({ n: 'Left over', v: left, p: PAIRS[0], kind: 'left' });
    const order = [4, 5, 6, 2, 1, 3, 0, 7];
    const dList = typeof debts !== 'undefined' ? debts : [];
    const d = [...dList].sort((a, b) => b.balance - a.balance).map((x, i) => {
      const iv = typeof interest === 'function' ? interest(x) : 0, ok = x.payment > iv;
      return { id: x.id, n: x.name, v: x.balance, p: PAIRS[order[i % 8]], apr: x.apr, ok, sub: ok ? x.apr + '% APR' : 'Pay at least ' + (typeof money === 'function' ? money(Math.ceil(iv * 100) / 100 + 0.01) : iv), short: ok ? 0 : iv - x.payment };
    });
    return { inc, billT, debtP, left, m, d };
  }

  function setCenter(html) { const c = document.querySelector('#ov2 .ctr'); if (c) c.innerHTML = html; }

  function setSel(i) {
    sel = sel === i ? -1 : i;
    document.querySelectorAll('#ov2 [data-i]').forEach(n => n.classList.toggle('on', +n.dataset.i === sel));
    const g = document.querySelector('#ov2 .rg'); if (g) g.classList.toggle('dim', sel >= 0);
    if (sel < 0) { setCenter(ctrDefault); const dt0 = $('detail'); if (dt0) dt0.innerHTML = ''; return; }
    const t = S.reduce((a, s) => a + s.v, 0), s = S[sel];
    setCenter('<small>' + esc(s.n) + '</small><b>' + money(s.v) + '</b><em>' + Math.round(s.v / t * 100) + '% of ' + (view === 'month' ? 'monthly total' : 'total debt') + '</em>');
    const dt = $('detail'); if (dt) dt.innerHTML = detailHtml(s);
  }

  function countUp(node) {
    const txt = node.textContent, to = parseFloat(txt.replace(/[^0-9.-]/g, ''));
    if (!isFinite(to) || to === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    (function tick(now) {
      const k = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - k, 3);
      node.textContent = money(to * e);
      if (k < 1) requestAnimationFrame(tick); else node.textContent = txt;
    })(t0);
  }

  function detailHtml(s) {
    const rows = a => a.map(x => '<div class="row"><span class="muted">' + x[0] + '</span><strong>' + x[1] + '</strong></div>').join('');
    if (view === 'debts') {
      const d = (typeof debts !== 'undefined' ? debts : []).find(x => x.id === s.id); if (!d) return '';
      const i = typeof interest === 'function' ? interest(d) : 0;
      return '<div class="det">' + rows([['Balance', money(d.balance)], ['APR', d.apr + '%'], ['Your payment', money(d.payment) + '/mo'], ['Interest', money(i) + '/mo'], ['Goes to principal', d.payment > i ? money(d.payment - i) : 'nothing'], ['Paid off in', typeof fm === 'function' && typeof months === 'function' ? fm(months(d.balance, d.apr, d.payment)) : '']]) +
        '<div class="actions"><button class="smallbtn" onclick="recordPayment(\'' + d.id + '\')">Record payment</button><button class="smallbtn secondary" onclick="switchTab(\'debts\');editDebt(\'' + d.id + '\')">Edit</button></div></div>';
    }
    const t = S.reduce((a, x) => a + x.v, 0);
    return '<div class="det">' + rows([['Per month', money(s.v)], ['Per paycheck', money(s.v * 12 / 26)], ['Share of total', Math.round(s.v / t * 100) + '%']]) +
      (s.kind === 'bill' ? '<div class="actions"><button class="smallbtn secondary" onclick="switchTab(\'budget\')">Edit bills</button></div>' : s.kind === 'debt' ? '<div class="actions"><button class="smallbtn secondary" onclick="switchTab(\'debts\')">Edit debts</button></div>' : '') + '</div>';
  }

  let extra = 0;
  function sim(ex) {
    const dList = typeof debts !== 'undefined' ? debts : [];
    const B = dList.map(d => ({ b: d.balance, r: d.apr / 1200, p: d.payment, apr: d.apr }));
    const pool = B.reduce((s, x) => s + x.p, 0) + ex;
    let n = 0, intr = 0;
    while (B.some(x => x.b > 0.005) && n < 720) {
      n++;
      B.forEach(x => { if (x.b > 0) { const i = x.b * x.r; x.b += i; intr += i; } });
      const act = B.filter(x => x.b > 0).sort((a, b) => b.apr - a.apr);
      let rem = pool;
      act.forEach(x => { const pay = Math.min(x.b, x.p, rem); x.b -= pay; rem -= pay; });
      for (const x of act) { if (rem <= 0) break; const pay = Math.min(x.b, rem); x.b -= pay; rem -= pay; }
    }
    return { n, intr, done: !B.some(x => x.b > 0.005) };
  }
  const ym = n => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
  const dur = n => (n >= 12 ? Math.floor(n / 12) + 'y ' : '') + (n % 12) + 'm';
  function drawWhatIf() {
    const out = $('wires'); if (!out) return;
    const a = sim(extra), b = sim(0);
    let h;
    if (!a.done) h = '<span class="warning">Not paid off within 60 years at this rate. Try a larger extra amount.</span>';
    else {
      h = 'Debt-free in <b>' + dur(a.n) + '</b> (' + ym(a.n) + ') · interest paid <b>' + money(a.intr) + '</b>';
      if (extra > 0) h += b.done ? '<br><span class="good">Saves ' + money(b.intr - a.intr) + ' in interest and ' + dur(b.n - a.n) + ' sooner than with no extra.</span>' : '<br><span class="good">Without the extra, your current payments never clear the debt.</span>';
    }
    out.innerHTML = h;
    const lab = $('exl'); if (lab) lab.textContent = money(extra);
  }

  function draw() {
    const el = $('ov2'); if (!el) return;
    const M = build();
    S = view === 'month' ? M.m : M.d; sel = -1;
    const t = S.reduce((a, s) => a + s.v, 0);

    let h = '<div class="card"><div class="tog"><button data-view="month" class="' + (view === 'month' ? 'on' : '') + '">Monthly money</button><button data-view="debts" class="' + (view === 'debts' ? 'on' : '') + '">Debts</button></div>';

    if (!t) {
      h += '<p class="empty">' + (view === 'month' ? 'Enter your bi-weekly pay and bills in the Budget tab to see where your money goes.' : 'No debts added yet. Open the Debts tab and tap “Add debt.”') + '</p></div>';
      el.innerHTML = h; return;
    }

    if (view === 'month') {
      ctrDefault = '<small>Monthly income</small><b>' + money(M.inc) + '</b><em>' + (M.left >= 0 ? money(M.left) + ' left over' : '<span class="warning">' + money(-M.left) + ' over budget</span>') + '</em>';
    } else {
      const bal = typeof total === 'function' ? total('balance') : 0;
      const dList = typeof debts !== 'undefined' ? debts : [];
      const o = dList.reduce((s, x) => s + (typeof orig === 'function' ? orig(x) : 0), 0), pct = o ? Math.round(Math.max(0, o - bal) / o * 100) : 0;
      ctrDefault = '<small>Total remaining</small><b>' + money(bal) + '</b><em>' + pct + '% paid off</em>';
    }

    let a = 0, defs = '', paths = '', labels = '';
    const gap = S.length > 1 ? 7 : 0;
    S.forEach((s, i) => {
      const sweep = s.v / t * 360, a0 = a + gap / 2; let a1 = a + sweep - gap / 2; a += sweep;
      if (a1 < a0 + 1) a1 = a0 + 1; if (a1 - a0 > 359.9) a1 = a0 + 359.9;
      const am = (a0 + a1) / 2, dx = (9 * Math.sin(rad(am))).toFixed(1), dy = (-9 * Math.cos(rad(am))).toFixed(1);
      defs += '<linearGradient id="rg' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + s.p[0] + '"/><stop offset="1" stop-color="' + s.p[1] + '"/></linearGradient>';
      paths += '<path class="seg" data-i="' + i + '" d="' + arc(a0, a1) + '" fill="url(#rg' + i + ')" stroke="url(#rg' + i + ')" stroke-width="8" stroke-linejoin="round" style="--dx:' + dx + 'px;--dy:' + dy + 'px;animation-delay:' + (i * 0.09).toFixed(2) + 's"/>';
      if (sweep >= 26) { const [lx, ly] = pt((R + r) / 2, am); labels += '<text class="pl" x="' + lx + '" y="' + ly + '">' + Math.round(s.v / t * 100) + '%</text>'; }
    });
    h += '<div class="rwrap"><svg class="rg" viewBox="0 0 320 320" role="img" aria-label="Chart"><defs>' + defs + '</defs>' + paths + labels + '</svg><div class="ctr">' + ctrDefault + '</div></div>';

    if (view === 'month') {
      h += M.left >= 0
        ? '<div class="msg">After bills and debt payments you keep ' + money(M.left) + ' a month (' + (M.inc ? Math.round(M.left / M.inc * 100) : 0) + '% of income).</div>'
        : '<div class="msg bad">Bills and debt payments are ' + money(-M.left) + ' more than your monthly income.</div>';
    } else {
      const short = M.d.reduce((s, x) => s + x.short, 0), n = M.d.filter(x => !x.ok).length;
      h += short > 0
        ? '<div class="msg bad">' + n + (n === 1 ? ' debt isn’t' : ' debts aren’t') + ' covering interest. You’re ' + money(short) + '/mo short, so the balance is growing.</div>'
        : '<div class="msg">Every payment covers its interest, so every balance is going down.</div>';
    }

    h += '<div id="detail"></div>';
    if (view === 'debts') h += '<div class="wi"><div class="row"><strong>What if I pay extra?</strong><strong id="exl">' + money(extra) + '</strong></div><input type="range" id="ex" min="0" max="1000" step="25" value="' + extra + '"><div class="muted">Extra per month, sent to your highest-APR debt. Freed-up payments roll to the next debt.</div><div class="res" id="wires" style="margin-top:8px"></div></div>';

    h += '<div class="lgd" style="margin-top:8px">' + S.map((s, i) =>
      '<div class="row" data-i="' + i + '" style="animation-delay:' + (0.3 + i * 0.06).toFixed(2) + 's"><div class="nm"><i class="dot" style="background:linear-gradient(135deg,' + s.p[0] + ',' + s.p[1] + ')"></i><div><strong>' + (typeof esc === 'function' ? esc(s.n) : s.n) + '</strong>' +
      (view === 'debts' ? '<span class="' + (s.ok ? 'muted' : 'warning') + '">' + (typeof esc === 'function' ? esc(s.sub) : s.sub) + '</span>' : '') + '</div></div><div class="am"><b>' + money(s.v) + '</b><small>' + Math.round(s.v / t * 100) + '%</small></div></div>').join('') + '</div></div>';

    el.innerHTML = h;
    drawWhatIf();
    const cb = el.querySelector('.ctr b'); if (cb) countUp(cb);
  }

  $('ov2').addEventListener('click', e => {
    const v = e.target.closest('[data-view]');
    if (v) { view = v.dataset.view; return draw(); }
    const i = e.target.closest('[data-i]');
    if (i) setSel(+i.dataset.i);
  });

  $('ov2').addEventListener('input', e => { if (e.target.id === 'ex') { extra = +e.target.value; drawWhatIf(); } });
  let sx = null;
  $('ov2').addEventListener('touchstart', e => { sx = e.target.closest('.rwrap') ? e.touches[0].clientX : null; }, { passive: true });
  $('ov2').addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60) { view = view === 'month' ? 'debts' : 'month'; draw(); } }, { passive: true });

  // Safely hook function overrides if they exist globally
  if (typeof renderBudget === 'function') {
    const rb = renderBudget; 
    renderBudget = function () { rb(); draw(); };
  }
  if (typeof renderCalendar === 'function') {
    const rc = renderCalendar; 
    renderCalendar = function () { rc(); draw(); };
  }

  const tabBtn = document.querySelector('.nav button[data-tab="overview"]');
  if (tabBtn) tabBtn.addEventListener('click', draw);

  console.log('ClearPath overview.js loaded');
  draw();
})();
