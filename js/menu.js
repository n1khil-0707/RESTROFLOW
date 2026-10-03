App.ready(function () {
  'use strict';
  const h = UI.h;
  const grid = document.getElementById('menu-grid');

  const fields = [
    { name: 'name', label: 'Item name', required: true, maxLength: 60 },
    { name: 'price', label: 'Selling price (₹)', type: 'number', required: true, min: 0.01 },
    { name: 'foodCost', label: 'Ingredient cost per portion (₹)', type: 'number', required: true, min: 0 }
  ];

  function openForm(item) {
    UI.formModal({
      title: item ? 'Edit menu item' : 'Add menu item',
      fields, initial: item || {}, submitLabel: item ? 'Save changes' : 'Add item',
      validate: (v) => (v.foodCost > v.price ? 'Food cost cannot be higher than the price.' : null),
      onSubmit: async (v) => {
        if (item) await RestoAPI.menu.update(item.id, v); else await RestoAPI.menu.create(v);
        UI.toast(item ? 'Menu item updated' : 'Menu item added');
        await refresh();
      }
    });
  }

  async function refresh() {
    const items = await RestoAPI.menu.list();
    grid.replaceChildren();
    if (!items.length) { grid.append(h('p', { class: 'empty', text: 'No menu items yet. Use “Add menu item”.' })); return; }
    items.forEach((m) => {
      const pct = m.price > 0 ? (m.foodCost / m.price) * 100 : 0;
      grid.append(h('article', { class: 'menu-card' },
        h('header', { class: 'menu-card__head' },
          h('h2', { text: m.name }),
          h('div', { class: 'icon-actions' },
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Edit ' + m.name, onClick: () => openForm(m) }, UI.icon('edit')),
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Delete ' + m.name, onClick: async () => {
              if (await UI.confirm(`Delete “${m.name}”?`)) { await RestoAPI.menu.remove(m.id); UI.toast('Menu item deleted'); refresh(); }
            } }, UI.icon('delete')))),
        h('dl', { class: 'kv' },
          h('div', {}, h('dt', 'Price'), h('dd', UI.money(m.price))),
          h('div', {}, h('dt', 'Food cost'), h('dd', `${UI.money(m.foodCost)} · ${UI.percent(pct)}`)))));
    });
  }

  document.getElementById('add-btn').addEventListener('click', () => openForm(null));
  refresh();
});