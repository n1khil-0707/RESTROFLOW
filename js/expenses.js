App.ready(function () {
  'use strict';
  const h = UI.h;
  const body = document.getElementById('expense-body');
  const search = document.getElementById('search');
  const filter = document.getElementById('filter');
  let expenses = [];

  filter.append(...RestoCalc.EXPENSE_CATEGORIES.map((c) => h('option', { value: c }, c)));

  async function refresh() { expenses = await RestoAPI.expenses.list(); render(); }

  function render() {
    const q = search.value.trim().toLowerCase();
    const rows = expenses
      .filter((e) => (filter.value === 'all' || e.category === filter.value) && (!q || e.description.toLowerCase().includes(q) || (e.vendor || '').toLowerCase().includes(q) || e.date.includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    body.replaceChildren();
    if (!rows.length) {
      body.append(h('tr', {}, h('td', { colspan: 5, class: 'empty', text: expenses.length ? 'No expenses match your search.' : 'No expenses yet. Use “+ Add expenses” to add one.' })));
      return;
    }
      rows.forEach((e) => body.append(h('tr', {},
      h('td', { text: e.date }),
      h('td', {}, e.description, e.autoCost ? h('small', { class: 'sub', text: 'Auto-created from a sale' }) : null),
      h('td', { class: 'cell-center', text: e.category }),
      h('td', { class: 'cell-center', text: UI.money(e.amount) }),
      h('td', { class: 'cell-actions' }, e.autoCost
        ? h('small', { class: 'sub', text: 'Automatic' })
        : [
          h('button', { class: 'btn btn-edit', type: 'button', 'aria-label': 'Edit ' + e.description, onClick: () => Forms.openExpense(e, refresh) }, 'Edit'),
          h('button', { class: 'btn btn-delete', type: 'button', 'aria-label': 'Delete ' + e.description, onClick: async () => {
            if (await UI.confirm(`Delete “${e.description}”?`)) { await RestoAPI.expenses.remove(e.id); UI.toast('Expense deleted'); refresh(); }
          } }, 'Delete')
        ]))));
  }

  document.getElementById('add-btn').addEventListener('click', () => Forms.openExpense(null, refresh));
  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  refresh();
});