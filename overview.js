/* ClearPath Overview redesign: donuts, bars, and "pay at least" interest check.
   Loads after the main script; reads debts, budget and recurring and redraws on every update. */
(function () {
  const ov = $('overview');
  // Keep the old containers (hidden) so the existing render() code never hits a missing element.
  ov.innerHTML = '<div id="ov2"></div><div class="hidden"><div id="interestBox"></div><div id="overviewList"></div></div>';

  const st = document.createElement('style');
  st.textContent =
    '.ovt{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}' +
    '.tile{background:#fff;border:1px solid #e7e8ed;border-radius:16px;padding:14px}' +
    '.tile small{display:block;color:var(--muted);font-size:12px}.tile strong{display:block;font-size:21px;letter-spacing:-.03em;margin-top:3px}' +
    '.dn{position:relative;width:190px;max-width:70%;margin:6px auto 14px}.dn svg{width:100%;display:block;transform:rotate(0deg)}' +
    '.dc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}' +
    '.dc b{font-size:19px;letter-spacing:-.03em}.dc span{font-size:11px;color:var(--muted)}' +
    '.lg .row{padding:6px 0;font-size:14px}.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px}.lg small{color:var(--muted)}' +
    '.need{padding:12px 0;border-top:1px solid var(--line)}.need:first-of-type{border-top:0}';
  document.head.appendChild(st);

  const PAL = ['#19234f', '#00ad68', '#e9b949', '#4c6a96', '#7ee787', '#b83f4b', '#8a6fdf', '#e07a5f'];

  function donut(seg, top, sub) {
    const t = seg.reduce((a, s) => a + Math.max(0, s.v), 0);
    if (!t) return '';
    let off = 25;
    const rings = seg.filter(s => s.v > 0).map(s => {
      const p = s.v / t * 100;
      const r = '<circle cx="21" cy="21" r="15.915" fill="none" stroke="' + s.c + '" stroke-width="6" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + off + '"></circle>';
      off -= p;
      return r;
    }).join('');
    return '<div class="dn"><svg viewBox="0 0 42 42" role="img"><circle cx="21" cy="21" r="15.915" fill="none" stroke="#e8ebf0" stroke-width="6"></circle>' + rings + '</svg><div class="dc"><b>' + top + '</b><span>' + sub + '</span></div></div>' +
      '<div class="lg">' + seg.filter(s => s.v > 0).map(s => '<div class="row"><span><i style="background:' + s.c + '"></i>' + esc(s.n) + '</span><span><b>' + money(s.v) + '</b> <small>' + Math.round(s.v / t * 100) + '%</small></span></div>').join('') + '</div>';
  }

  function barRows(rows, color) {
    const max = Math.max(...rows.map(r => r.amt), 1);
    return rows.map(r => '<div class="chartrow"><span>' + esc(r.name) + '</span><div class="charttrack"><div class="chartfill" style="width:' + r.amt / max * 100 + '%;background:' + (color || 'var(--green)') + '"></div></div><strong>' + money(r.amt) + '</strong></div>').join('');
  }

  function draw() {
    const el = $('ov2');
    if (!el) return;

    // Monthly income from bi-weekly pay (26 paychecks / 12 months)
    const inc = (Number(budget.pay) || 0) * 26 / 12;

    // Bills = Budget-tab bills + recurring bills, matched by name so nothing is counted twice
    const map = new Map();
    budget.bills.forEach(b => map.set(String(b.name).trim().toLowerCase(), { name: b.name, amt: Number(b.amt) || 0 }));
    recurring.forEach(b => { const k = String(b.name).trim().toLowerCase(); if (!map.has(k)) map.set(k, { name: b.name, amt: Number(b.amt) || 0 }); });
    const bills = [...map.values()].filter(b => b.amt > 0).sort((a, b) => b.amt - a.amt);
    const billT = bills.reduce((s, b) => s + b.amt, 0);
    const debtP = total('payment');
    const left = inc - billT - debtP;

    let h = '<div class="ovt">' +
      '<div class="tile"><small>Monthly income</small><strong>' + money(inc) + '</strong></div>' +
      '<div class="tile"><small>Bills</small><strong>' + money(billT) + '</strong></div>' +
      '<div class="tile"><small>Debt payments</small><strong>' + money(debtP) + '</strong></div>' +
      '<div class="tile"><small>Left over</small><strong class="' + (left < 0 ? 'warning' : 'good') + '">' + money(left) + '</strong></div></div>';

    // 1. Where income goes
    h += '<div class="card"><h2>Where your income goes</h2>';
    if (inc > 0) {
      h += donut([{ n: 'Bills', v: billT, c: '#e9b949' }, { n: 'Debt payments', v: debtP, c: '#19234f' }, { n: 'Left over', v: Math.max(0, left), c: '#00ad68' }], money(inc), 'per month');
      if (left < 0) h += '<div class="msg bad">Bills and debt payments are ' + money(-left) + ' more than your monthly income.</div>';
    } else h += '<p class="muted">Enter your bi-weekly pay in the Budget tab to see this chart.</p>';
    h += '</div>';

    // 2. Monthly bills
    h += '<div class="card"><h2>Monthly bills</h2>' + (bills.length ? barRows(bills.slice(0, 8), '#e9b949') + (bills.length > 8 ? '<p class="muted">+ ' + (bills.length - 8) + ' more · total ' + money(billT) + '</p>' : '<p class="muted">Total ' + money(billT) + ' a month</p>') : '<p class="muted">Add bills in the Budget or Bills & reminders tab.</p>') + '</div>';

    // 3. Debts
    h += '<div class="card"><h2>Your debts</h2>';
    if (debts.length) {
      const sorted = [...debts].sort((a, b) => b.balance - a.balance);
      h += donut(sorted.map((d, i) => ({ n: d.name, v: d.balance, c: PAL[i % PAL.length] })), money(total('balance')), 'remaining');
      h += '<h3 style="margin:18px 0 4px">Paid vs left</h3>' + sorted.map(d => {
        const p = Math.max(0, orig(d) - d.balance);
        return '<div class="item"><div class="row"><strong>' + esc(d.name) + '</strong><span class="muted">' + Math.round(p / orig(d) * 100) + '% paid</span></div>' + bar([{ v: p, c: '#00ad68' }, { v: d.balance, c: '#c9d3e0' }], 'sm') + '<div class="leg"><span>Paid ' + money(p) + '</span><span>Left ' + money(d.balance) + '</span></div></div>';
      }).join('');
    } else h += '<p class="muted">No debts added yet. Open the Debts tab and tap “Add debt.”</p>';
    h += '</div>';

    // 4. Interest check: pay at least this to make the principal go down
    h += '<div class="card"><h2>Pay enough to cut the principal</h2>';
    if (debts.length) {
      const int = debts.reduce((s, d) => s + interest(d), 0);
      const short = debts.reduce((s, d) => s + Math.max(0, interest(d) - d.payment), 0);
      h += '<p class="muted" style="margin:0">Interest adds about <b style="color:var(--ink)">' + money(int) + '</b> a month. A payment has to be above a debt’s interest for its balance to go down.</p>' +
        '<div class="msg ' + (short > 0 ? 'bad' : '') + '">' + (short > 0 ? 'You are ' + money(short) + ' a month short across debts that aren’t covering their interest.' : 'Every debt’s payment covers its interest.') + '</div><div style="margin-top:6px">' +
        [...debts].sort((a, b) => b.apr - a.apr).map(d => {
          const i = interest(d), need = Math.ceil(i * 100) / 100 + 0.01;
          const base = d.minimum > 0 ? d.minimum : d.payment, label = d.minimum > 0 ? 'minimum' : 'current payment';
          const extra = Math.max(0, need - base), ok = d.payment > i;
          return '<div class="need"><div class="row"><strong>' + esc(d.name) + '</strong><span class="chip ' + (ok ? '' : 'bad') + '">' + (ok ? '+' + money(d.payment - i) + ' to principal' : 'short ' + money(i - d.payment)) + '</span></div>' +
            '<div class="muted">Interest ' + money(i) + '/mo · pay at least ' + money(need) + (extra > 0 ? ' (' + label + ' ' + money(base) + ' + ' + money(extra) + ' extra)' : '') + '</div>' +
            (ok ? '' : '<div class="muted warning">Payment doesn’t cover interest, so the balance is growing.</div>') + '</div>';
        }).join('') + '</div>';
    } else h += '<p class="muted">Add a debt to see this.</p>';
    h += '</div>';

    el.innerHTML = h;
  }

  // Redraw whenever the existing code updates the budget or calendar (render() calls renderBudget()).
  const rb = renderBudget; renderBudget = function () { rb(); draw(); };
  const rc = renderCalendar; renderCalendar = function () { rc(); draw(); };
  draw();
})();
