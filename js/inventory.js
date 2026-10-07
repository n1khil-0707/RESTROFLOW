App.ready(function () {
  'use strict';
  const h = UI.h;
  const body = document.getElementById('inventory-body');
  const search = document.getElementById('search');
  const tabs = document.querySelectorAll('.tab');
  let items = [], tab = 'all';

  const fields = [
    { name: 'name', label: 'Item name', required: true, maxLength: 60 },
    { name: 'category', label: 'Category', type: 'select', options: ['Vegetables', 'Fruits', 'Meat', 'Dairy', 'Grains', 'Spices', 'Oil', 'Beverages', 'Other'] },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0 },
    { name: 'unit', label: 'Unit', type: 'select', options: ['kg', 'g', 'L', 'ml', 'pcs', 'packs'] },
    { name: 'price', label: 'Purchase price per unit (₹)', type: 'number', required: true, min: 0 },
    { name: 'minStock', label: 'Minimum stock', type: 'number', min: 0 },
    { name: 'supplier', label: 'Supplier', maxLength: 80, full: true }
  ];
  const round = (n) => Math.round(n * 1000) / 1000;

  function openForm(item) {
    UI.formModal({
      title: item ? 'Edit item' : 'Add item', fields, initial: item || { category: 'Vegetables', unit: 'kg' },
      submitLabel: item ? 'Save changes' : 'Add item',
      onSubmit: async (v) => {
        if (item) await RestoAPI.inventory.update(item.id, v); else await RestoAPI.inventory.create(v);
        UI.toast(item ? 'Item updated' : 'Item added');
        await refresh();
      }
    });
  }

  function adjust(item, direction) {
    const add = direction > 0;
    UI.formModal({
      title: `${add ? 'Add' : 'Reduce'} stock: ${item.name}`,
      fields: [{ name: 'amount', label: `Quantity to ${add ? 'add' : 'remove'} (${item.unit})`, type: 'number', required: true, min: 0.001 }],
      submitLabel: add ? 'Add stock' : 'Reduce stock',
      validate: (v) => (!add && v.amount > item.quantity ? `Only ${item.quantity} ${item.unit} in stock.` : null),
      onSubmit: async (v) => {
        await RestoAPI.inventory.update(item.id, { quantity: round(item.quantity + direction * v.amount) });
        UI.toast('Stock updated');
        await refresh();
      }
    });
  }

  async function refresh() { items = await RestoAPI.inventory.list(); render(); }

  function render() {
    const q = search.value.trim().toLowerCase();
    const rows = items.filter((i) => (tab === 'all' || RestoCalc.stockStatus(i).key === tab) &&
      (!q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || (i.supplier || '').toLowerCase().includes(q)));
    body.replaceChildren();
    if (!rows.length) {
      body.append(h('tr', {}, h('td', { colspan: 6, class: 'empty', text: items.length ? 'No items match.' : 'No inventory yet. Use “+ Add item”.' })));
      return;
    }
    const btn = (label, cls, fn, aria) => h('button', { class: `btn ${cls}`, type: 'button', 'aria-label': aria, onClick: fn }, label);
    rows.forEach((i) => {
      const st = RestoCalc.stockStatus(i);
      body.append(h('tr', {},
        h('td', {}, h('strong', { text: i.name }), h('small', { class: 'sub', text: `${i.supplier || 'No supplier'} · min ${i.minStock} ${i.unit}` })),
        h('td', { text: i.category }),
        h('td', { class: 'cell-center', text: `${i.quantity} ${i.unit}` }),
        h('td', { class: 'cell-center', text: UI.money(RestoCalc.stockValue(i)) }),
        h('td', { class: 'cell-center' }, h('span', { class: `status status--${st.key}`, text: st.label })),
        h('td', { class: 'cell-actions' },
          btn('+ Stock', 'btn-edit', () => adjust(i, 1), 'Add stock to ' + i.name),
          btn('− Stock', 'btn-edit', () => adjust(i, -1), 'Reduce stock of ' + i.name),
          btn('Edit', 'btn-edit', () => openForm(i), 'Edit ' + i.name),
          btn('Delete', 'btn-delete', async () => {
            if (await UI.confirm(`Delete “${i.name}”?`)) { await RestoAPI.inventory.remove(i.id); UI.toast('Item deleted'); refresh(); }
          }, 'Delete ' + i.name))));
    });
  }

  tabs.forEach((t) => t.addEventListener('click', () => {
    tab = t.dataset.tab;
    tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
    render();
  }));
  search.addEventListener('input', render);
  document.getElementById('add-btn').addEventListener('click', () => openForm(null));
  refresh();
});