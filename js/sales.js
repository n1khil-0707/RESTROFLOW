
App.ready(function () {
  'use strict';
  const h = UI.h;
  const body = document.getElementById('sales-body');
  const search = document.getElementById('search');
  const filter = document.getElementById('filter');
  let sales = [];


  async function refresh() { sales = await RestoAPI.sales.list(); render(); }


  function render() {
    const q = search.value.trim().toLowerCase();
    const rows = sales
      .filter((s) => (filter.value === 'all' || s.payment === filter.value) && (!q || s.description.toLowerCase().includes(q) || s.date.includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    body.replaceChildren();
    if (!rows.length) {
      body.append(h('tr', {}, h('td', { colspan: 5, class: 'empty', text: sales.length ? 'No sales match your search.' : 'No sales yet. Use “+ Add sales” to add one.' })));
      return;
    }
    rows.forEach((s) => body.append(h('tr', {},
      h('td', { text: s.date }),
      h('td', {}, s.description, s.menuName ? h('small', { class: 'sub', text: `${s.quantity} × ${s.menuName}` }) : null),
      h('td', { class: 'cell-center', text: s.payment }),
      h('td', { class: 'cell-center', text: UI.money(s.amount) }),
      h('td', { class: 'cell-actions' },
        h('button', { class: 'btn btn-edit', type: 'button', 'aria-label': 'Edit ' + s.description, onClick: () => Forms.openSale(s, refresh) }, 'Edit'),
        h('button', { class: 'btn btn-delete', type: 'button', 'aria-label': 'Delete ' + s.description, onClick: async () => {
          if (await UI.confirm(`Delete “${s.description}”?`)) { await RestoAPI.sales.remove(s.id); UI.toast('Sale deleted'); refresh(); }
        } }, 'Delete')))));
  }


  document.getElementById('add-btn').addEventListener('click', () => Forms.openSale(null, refresh));
  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  refresh();
});
