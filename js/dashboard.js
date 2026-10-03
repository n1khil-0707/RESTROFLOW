App.ready(async function () {
  'use strict';
  const h = UI.h;
  const [sales, expenses, settings, history] = await Promise.all([
    RestoAPI.sales.list(), RestoAPI.expenses.list(), RestoAPI.settings.get(), RestoAPI.history.list()
  ]);
  const s = RestoCalc.summarize({ sales, expenses, settings });

  const card = (label, value, note) => h('article', { class: 'stat-card' },
    h('h2', { class: 'display', text: label }), h('p', { class: 'stat-value display', text: value }), h('p', { class: 'stat-note', text: note }));
  const derived = '↗ Derived from stored data';

  const main = document.getElementById('kpi-main');
  main.replaceChildren(
    card('Sales', UI.money(s.revenue), derived),
    card('Expenses', UI.money(s.totalExpenses), derived),
    card('Profit', UI.money(s.profit), derived),
    card('Profit margin', UI.percent(s.margin), derived));

  document.getElementById('kpi-more').replaceChildren(
    card('Food cost', UI.money(s.foodCost), derived),
    card('Labor cost', UI.money(s.laborCost), derived),
    card('Cash balance', UI.money(s.cashBalance), derived),
    card('Bank balance', UI.money(s.bankBalance), derived),
    card('Receivables', UI.money(s.receivables), '↗ From settings'),
    card('Payables', UI.money(s.payables), '↗ From settings'));

  /* Expense breakdown */
  const list = document.getElementById('breakdown-list');
  const totals = RestoCalc.categoryTotals(expenses);
  list.replaceChildren(...(totals.length
    ? totals.map((t) => h('li', {}, h('span', { text: '↗ ' + t.category }), h('span', { text: UI.money(t.total) })))
    : [h('li', { class: 'empty', text: 'No expenses recorded yet.' })]));

  /* Recent transactions: sales + expenses merged, newest first */
  const byNewest = (a, b) => b.date.localeCompare(a.date);
  const txns = [
    ...[...sales].sort((a, b) => b.id - a.id).map((x) => ({ ...x, kind: 'Sale' })),
    ...[...expenses].sort((a, b) => b.id - a.id).map((x) => ({ ...x, kind: 'Expense' }))
  ].sort(byNewest).slice(0, 8);
  document.getElementById('txn-list').replaceChildren(...(txns.length
    ? txns.map((t) => h('li', { class: 'txn' },
        h('div', {}, h('p', { class: 'txn-name', text: t.description }), h('p', { text: `${t.kind} · ${t.date}` })),
        h('p', { class: 'txn-amount', text: UI.money(t.amount) })))
    : [h('li', { class: 'empty', text: 'No transactions yet.' })]));

  /* Chart (hand-built SVG, no library) */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, text) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text != null) el.textContent = text;
    return el;
  };
  function niceScale(max) {
    const raw = max / 5, pow = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / pow;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
    return { step, top: Math.ceil(max / step) * step };
  }
  const tick = (v) => (v >= 1000 ? v / 1000 + 'k' : String(v));

  function drawChart(host, data) {
    host.replaceChildren();
    if (!data.length) { host.append(h('p', { class: 'empty', text: 'No data yet.' })); return; }
    const W = 1040, H = 560, m = { l: 70, r: 16, t: 16, b: 56 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const { step, top } = niceScale(Math.max(1, ...data.flatMap((d) => [d.revenue, d.expenses])));
    const y = (v) => m.t + ph - (v / top) * ph;
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg' });
    for (let i = 0; i <= Math.round(top / step); i++) {
      const v = i * step;
      root.append(svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid' }),
                  svg('text', { x: m.l - 14, y: y(v) + 8, 'text-anchor': 'end', class: 'axis' }, tick(v)));
    }
    const gw = pw / data.length, bw = Math.min(gw * 0.36, 90);
    data.forEach((d, i) => {
      const cx = m.l + gw * i + gw / 2;
      [['revenue', -bw], ['expenses', 0]].forEach(([key, dx], j) => {
        const bar = svg('rect', { x: cx + dx, y: y(d[key]), width: bw, height: Math.max((d[key] / top) * ph, 0), class: `bar bar-${key}`, style: `animation-delay:${i * 70 + j * 35}ms` });
        bar.append(svg('title', {}, `${d.label}: Revenue ${UI.money(d.revenue)} · Expenses ${UI.money(d.expenses)} · Profit ${UI.money(d.profit)}`));
        root.append(bar);
      });
      root.append(svg('text', { x: cx, y: H - m.b + 36, 'text-anchor': 'middle', class: 'axis axis-x' }, d.label));
    });
    host.append(root);
  }

  const monthly = RestoCalc.monthlySeries(history, sales, expenses);
  const host = document.getElementById('chart');
  const period = document.getElementById('period');
  const redraw = () => drawChart(host, period.value === 'quarterly' ? RestoCalc.quarterlySeries(monthly) : monthly);
  period.addEventListener('change', redraw);
  redraw();
});