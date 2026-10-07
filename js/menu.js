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

  /* ---------- Recipe editor ---------- */
  // Natural default unit for a recipe line: kg -> g, L -> ml, anything else stays the same.
  const defaultUnit = (stockUnit) => ({ kg: 'g', L: 'ml' }[stockUnit] || stockUnit);

  function openRecipe(menuItem, inventory, existing) {
    const rowsHost = h('div', { class: 'recipe-rows' });
    const totalEl = h('p', { class: 'recipe-total' });
    const errEl = h('p', { class: 'field-error form-error', role: 'alert' });
    let modal;

    const readRows = () => [...rowsHost.children].map((row) => ({
      inventoryId: Number(row.querySelector('[data-f="item"]').value),
      quantity: Number(row.querySelector('[data-f="qty"]').value),
      unit: row.querySelector('[data-f="unit"]').value
    }));

    function updateTotal() {
      const c = RestoCalc.recipeCost({ ingredients: readRows() }, inventory);
      totalEl.textContent = `Ingredient cost per serving: ${UI.money(c.total)}`;
    }

    function fillUnits(unitSel, item, wanted) {
      const opts = item ? RestoCalc.compatibleUnits(item.unit) : [wanted];
      const pick = opts.includes(wanted) ? wanted : defaultUnit(item.unit);
      unitSel.replaceChildren(...opts.map((u) => h('option', { value: u, selected: u === pick }, u)));
    }

    function addRow(line) {
      const known = inventory.some((i) => i.id === line.inventoryId);
      const itemSel = h('select', { 'data-f': 'item', 'aria-label': 'Ingredient' },
        !known ? h('option', { value: line.inventoryId, selected: true }, '⚠ Removed from Inventory') : null,
        inventory.map((i) => h('option', { value: i.id, selected: i.id === line.inventoryId }, `${i.name} (${i.unit})`)));
      const qty = h('input', { 'data-f': 'qty', type: 'number', step: 'any', min: '0', value: line.quantity || '', placeholder: 'Qty', 'aria-label': 'Quantity' });
      const unitSel = h('select', { 'data-f': 'unit', 'aria-label': 'Unit' });
      fillUnits(unitSel, inventory.find((i) => i.id === line.inventoryId), line.unit);
      const row = h('div', { class: 'recipe-row' }, itemSel, qty, unitSel,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Remove ingredient', onClick: () => { row.remove(); updateTotal(); } }, UI.icon('delete')));
      itemSel.addEventListener('change', () => {
        const item = inventory.find((i) => i.id === Number(itemSel.value));
        fillUnits(unitSel, item, defaultUnit(item.unit));
        updateTotal();
      });
      row.addEventListener('input', updateTotal);
      row.addEventListener('change', updateTotal);
      rowsHost.append(row);
      updateTotal();
    }

    function newLine() {
      const used = readRows().map((r) => r.inventoryId);
      const item = inventory.find((i) => !used.includes(i.id)) || inventory[0];
      return { inventoryId: item.id, quantity: '', unit: defaultUnit(item.unit) };
    }

    function validate(lines) {
      if (!lines.length) return 'Add at least one ingredient.';
      const seen = new Set();
      for (const l of lines) {
        const item = inventory.find((i) => i.id === l.inventoryId);
        if (!item) return 'An ingredient was removed from Inventory. Pick another one or remove that line.';
        if (!(l.quantity > 0)) return `Enter a quantity greater than zero for ${item.name}.`;
        if (seen.has(l.inventoryId)) return `${item.name} is listed twice. Combine it into one line.`;
        seen.add(l.inventoryId);
      }
      return null;
    }

    (existing ? existing.ingredients : [newLine()]).forEach(addRow);

    const saveBtn = h('button', { type: 'button', class: 'btn btn-dark' }, 'Save recipe');
    saveBtn.addEventListener('click', async () => {
      errEl.textContent = '';
      const lines = readRows();
      const problem = validate(lines);
      if (problem) { errEl.textContent = problem; return; }
      saveBtn.disabled = true;
      try {
        const payload = { menuId: menuItem.id, ingredients: lines };
        if (existing) await RestoAPI.recipes.update(existing.id, payload); else await RestoAPI.recipes.create(payload);
        UI.toast('Recipe saved');
        modal.close();
        await refresh();
      } catch (err) { console.error(err); errEl.textContent = 'Something went wrong. Please try again.'; saveBtn.disabled = false; }
    });

    const removeBtn = existing ? h('button', { type: 'button', class: 'btn btn-delete', onClick: async () => {
      if (await UI.confirm(`Remove the recipe for “${menuItem.name}”?`, 'Remove')) {
        await RestoAPI.recipes.remove(existing.id);
        UI.toast('Recipe removed');
        modal.close();
        await refresh();
      }
    } }, 'Remove recipe') : null;

    modal = UI.openModal(`Recipe: ${menuItem.name}`, h('div', {},
      h('p', { class: 'recipe-hint', text: 'Quantities are for ONE serving. Ingredients come from your Inventory.' }),
      rowsHost,
      h('button', { type: 'button', class: 'btn btn-light', onClick: () => addRow(newLine()) }, '+ Add ingredient'),
      totalEl, errEl,
      h('div', { class: 'form-actions' },
        h('button', { type: 'button', class: 'btn btn-light', onClick: () => modal.close() }, 'Cancel'),
        removeBtn, saveBtn)));
  }

  async function refresh() {
    const [items, inventory, recipes] = await Promise.all([RestoAPI.menu.list(), RestoAPI.inventory.list(), RestoAPI.recipes.list()]);
    grid.replaceChildren();
    if (!items.length) { grid.append(h('p', { class: 'empty', text: 'No menu items yet. Use “Add menu item”.' })); return; }
    items.forEach((m) => {
      const pct = m.price > 0 ? (m.foodCost / m.price) * 100 : 0;
      const recipe = recipes.find((r) => r.menuId === m.id);
      let recipeText = 'No recipe';
      if (recipe) {
        const c = RestoCalc.recipeCost(recipe, inventory);
        recipeText = c.complete ? UI.money(c.total) : `${UI.money(c.total)} · check recipe`;
      }
      grid.append(h('article', { class: 'menu-card' },
        h('header', { class: 'menu-card__head' },
          h('h2', { text: m.name }),
          h('div', { class: 'icon-actions' },
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Edit ' + m.name, onClick: () => openForm(m) }, UI.icon('edit')),
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Delete ' + m.name, onClick: async () => {
              if (await UI.confirm(`Delete “${m.name}”?`)) {
                await RestoAPI.menu.remove(m.id);
                if (recipe) await RestoAPI.recipes.remove(recipe.id);
                UI.toast('Menu item deleted'); refresh();
              }
            } }, UI.icon('delete')))),
        h('dl', { class: 'kv' },
          h('div', {}, h('dt', 'Price'), h('dd', UI.money(m.price))),
          h('div', {}, h('dt', 'Food cost'), h('dd', `${UI.money(m.foodCost)} · ${UI.percent(pct)}`)),
          h('div', {}, h('dt', 'Recipe cost'), h('dd', recipeText))),
        h('button', {
          class: 'btn btn-light btn-recipe', type: 'button', 'aria-label': (recipe ? 'Edit recipe for ' : 'Add recipe for ') + m.name,
          onClick: () => {
            if (!inventory.length) { UI.toast('Add Inventory items first'); return; }
            openRecipe(m, inventory, recipe);
          }
        }, recipe ? 'Edit recipe' : 'Add recipe')));
    });
  }

  document.getElementById('add-btn').addEventListener('click', () => openForm(null));
  refresh();
});