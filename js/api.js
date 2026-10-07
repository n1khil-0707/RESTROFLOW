/* DATA LAYER. The only file that knows where data lives.
   Today: browser localStorage (demo data, nothing sensitive).
   Later: replace each function body with fetch('/api/...'). Signatures stay the same. */
const RestoAPI = (function () {
  'use strict';
  const KEY = 'restoflow_demo_v1';
  let db = null;
  const clone = (v) => JSON.parse(JSON.stringify(v));

   function load() {
    if (db) return db;
    try { const raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) { db = null; }
    if (!db || typeof db !== 'object') { db = clone(RestoDemo); }
    ensureShape();
    save();
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage blocked: demo still works per page */ } }
    // Makes sure newer collections exist, even in data saved by an older version of the app.
  function ensureShape() {
    ['recipes', 'stockMovements'].forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; });
  }const nextId = (list) => list.reduce((m, r) => Math.max(m, r.id), 0) + 1;

  function collection(name, { append = false } = {}) {
    return {
      async list() { return clone(load()[name]); },
      async create(item) {
        const data = load();
        const record = { ...item, id: nextId(data[name]) };
        append ? data[name].push(record) : data[name].unshift(record);
        save();
        return clone(record);
      },
      async update(id, patch) {
        const data = load();
        const i = data[name].findIndex((r) => r.id === id);
        if (i < 0) throw new Error('Record not found');
        data[name][i] = { ...data[name][i], ...patch, id };
        save();
        return clone(data[name][i]);
      },
      async remove(id) {
        const data = load();
        data[name] = data[name].filter((r) => r.id !== id);
        save();
        return true;
      }
    };
  }

  const round6 = (n) => Math.round(n * 1e6) / 1e6;

  /* Records a sale AND (if a menu item with a recipe was sold) deducts stock, writes the stock ledger and
     creates the ingredient-cost expense. Everything happens in ONE step and is saved ONCE, so it cannot end up half-done.
     Safe to call twice with the same saleRef: the second call changes nothing. */
  async function createSaleWithStock(sale) {
    // Re-read the latest saved data first (another browser tab may have changed stock).
    try { const raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) { /* keep the in-memory copy */ }
    const data = load();

    // Already processed? The saleRef in the sales list or the stock ledger is the permanent proof.
    if (sale.saleRef) {
      const prior = data.sales.find((s) => s.saleRef === sale.saleRef);
      if (prior || data.stockMovements.some((m) => m.saleRef === sale.saleRef)) return { ok: true, duplicate: true, sale: prior ? clone(prior) : null };
    }

    let plan = null;
    if (sale.menuId != null) {
      const recipe = data.recipes.find((r) => r.menuId === sale.menuId);
      plan = RestoCalc.planSaleConsumption({ quantity: sale.quantity }, recipe, data.inventory);
      if (plan.problem) return { ok: false, message: plan.problem };   // nothing has been changed
    }

    // From here nothing can fail: apply every change, then save once.
    const record = { ...sale, id: nextId(data.sales) };
    const deduct = !!(plan && !plan.noRecipe);
    if (deduct) {
      record.stockProcessed = true;
      record.ingredientCost = plan.totalCost;
      plan.lines.forEach((l) => {
        const item = data.inventory.find((i) => i.id === l.inventoryId);
        item.quantity = round6(item.quantity - l.need);
        data.stockMovements.push({
          id: nextId(data.stockMovements), type: 'sale-deduction', saleRef: sale.saleRef, saleId: record.id, date: sale.date,
          menuId: sale.menuId, menuName: sale.menuName, saleQuantity: sale.quantity,
          inventoryId: l.inventoryId, ingredient: l.name, quantity: l.need, unit: l.unit, unitPrice: l.unitPrice, cost: l.cost
        });
      });
      if (plan.totalCost > 0) {
        data.expenses.unshift({
          id: nextId(data.expenses), date: sale.date, description: `Ingredient cost: ${sale.quantity} × ${sale.menuName}`,
          category: 'Food & ingredients', amount: plan.totalCost, payment: 'Stock', vendor: '', gst: 0, recurring: 'One-time',
          notes: `Auto-created from sale ${sale.saleRef}`, autoCost: true, saleRef: sale.saleRef
        });
      }
    }
    data.sales.unshift(record);
    save();
    return { ok: true, duplicate: false, sale: clone(record), noRecipe: !!(plan && plan.noRecipe), stockProcessed: deduct, ingredientCost: deduct ? plan.totalCost : 0 };
  }
  return {
    sales: { ...collection('sales'), createWithStock: createSaleWithStock },
    expenses: collection('expenses'),
    menu: collection('menu', { append: true }),
    inventory: collection('inventory', { append: true }),
    recipes: collection('recipes', { append: true }),
    stockMovements: collection('stockMovements', { append: true }),
    history: { async list() { return clone(load().history); } },
    settings: {
      async get() { return clone(load().settings); },
      async update(patch) { const d = load(); d.settings = { ...d.settings, ...patch }; save(); return clone(d.settings); }
    },
    async resetDemo() { db = clone(RestoDemo); ensureShape(); save(); }
  };
})();