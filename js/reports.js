App.ready(async function () {
  'use strict';
  const h = UI.h;
  let sales = [], expenses = [];

  async function refresh() {
    [sales, expenses] = await Promise.all([RestoAPI.sales.list(), RestoAPI.expenses.list()]);
    const s = RestoCalc.summarize({ sales, expenses, settings: await RestoAPI.settings.get() });
    const rows = [
      ['Revenue', UI.money(s.revenue)],
      ['Food cost', UI.money(s.foodCost)],
      ['Operating expenses', UI.money(s.operating)],
      ['Net profit', UI.money(s.profit)],
      ['Profit margin', UI.percent(s.margin)]
    ];
    document.getElementById('pl-list').replaceChildren(...rows.map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))));
  }

  document.getElementById('export-sales').addEventListener('click', () => {
    UI.downloadCSV('sales.csv', [
      ['Date', 'Description', 'Order type', 'Payment', 'Gross order value', 'Platform', 'Commission', 'Taxes', 'Discount', 'Delivery charges', 'Net received'],
      ...sales.map((s) => [s.date, s.description, s.channel, s.payment, s.amount, s.platform, s.commission, s.taxes, s.discount, s.deliveryCharges, RestoCalc.netReceived(s)])
    ]);
  });
  document.getElementById('export-expenses').addEventListener('click', () => {
    UI.downloadCSV('expenses.csv', [
      ['Date', 'Description', 'Category', 'Amount', 'Payment', 'Vendor', 'GST %', 'Type', 'Notes'],
      ...expenses.map((e) => [e.date, e.description, e.category, e.amount, e.payment, e.vendor, e.gst, e.recurring, e.notes])
    ]);
  });

  document.getElementById('quick-add').addEventListener('click', () => {
    let modal;
    const pick = (fn) => () => { modal.close(); fn(null, refresh); };
    modal = UI.openModal('Quick add', h('div', { class: 'form-actions form-actions--split' },
      h('button', { class: 'btn btn-dark', type: 'button', onClick: pick(Forms.openSale) }, '+ Sale'),
      h('button', { class: 'btn btn-dark', type: 'button', onClick: pick(Forms.openExpense) }, '+ Expense')));
  });

  refresh();
});