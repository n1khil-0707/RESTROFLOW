/* All business calculations live here: pure functions, no DOM.
   The backend can later return the same numbers; the UI would not change. */
const RestoCalc = (function () {
  'use strict';
  const FOOD_CATEGORIES = ['Food & ingredients', 'Vegetables', 'Fruits', 'Meat', 'Dairy', 'Grains', 'Spices', 'Oil', 'Beverages'];
  const LABOR_CATEGORY = 'Salaries & labor';
  const EXPENSE_CATEGORIES = [...FOOD_CATEGORIES, 'Utilities', 'Operations', LABOR_CATEGORY, 'Other'];
  const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

  const sum = (list, fn) => list.reduce((t, x) => t + (Number(fn(x)) || 0), 0);

  // Money actually received for a sale (platform commission, taxes and discounts deducted).
  const netReceived = (s) => s.amount - (s.discount || 0) - (s.commission || 0) - (s.taxes || 0) + (s.deliveryCharges || 0);

  function summarize({ sales, expenses, settings }) {
    const revenue = sum(sales, (s) => s.amount);
    const totalExpenses = sum(expenses, (e) => e.amount);
    const foodCost = sum(expenses.filter((e) => FOOD_CATEGORIES.includes(e.category)), (e) => e.amount);
    const laborCost = sum(expenses.filter((e) => e.category === LABOR_CATEGORY), (e) => e.amount);
    const profit = revenue - totalExpenses;
    const cashIn = sum(sales.filter((s) => s.payment === 'Cash'), netReceived);
    const cashOut = sum(expenses.filter((e) => !e.autoCost && e.payment === 'Cash'), (e) => e.amount);
    const bankIn = sum(sales.filter((s) => s.payment !== 'Cash'), netReceived);
    const bankOut = sum(expenses.filter((e) => !e.autoCost && e.payment !== 'Cash'), (e) => e.amount);
    return {
      revenue, totalExpenses, foodCost, laborCost,
      operating: totalExpenses - foodCost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      cashBalance: settings.openingCash + cashIn - cashOut,
      bankBalance: settings.openingBank + bankIn - bankOut,
      receivables: settings.receivables,
      payables: settings.payables
    };
  }

  function categoryTotals(expenses) {
    const map = new Map();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return [...map].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  }

  // History rows + live transactions grouped by month.
  function monthlySeries(history, sales, expenses) {
    const map = new Map();
    const bucket = (k) => { if (!map.has(k)) map.set(k, { month: k, revenue: 0, expenses: 0 }); return map.get(k); };
    history.forEach((h) => { const b = bucket(h.month); b.revenue += h.revenue; b.expenses += h.expenses; });
    sales.forEach((s) => { bucket(s.date.slice(0, 7)).revenue += s.amount; });
    expenses.forEach((e) => { bucket(e.date.slice(0, 7)).expenses += e.amount; });
    return [...map.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ ...m, profit: m.revenue - m.expenses, label: MONTHS[Number(m.month.slice(5, 7)) - 1] }));
  }

  function quarterlySeries(monthly) {
    const map = new Map();
    monthly.forEach((m) => {
      const q = Math.floor((Number(m.month.slice(5, 7)) - 1) / 3) + 1;
      const key = `${m.month.slice(0, 4)}-Q${q}`;
      if (!map.has(key)) map.set(key, { month: key, revenue: 0, expenses: 0, label: `Q${q} ${m.month.slice(0, 4)}` });
      const b = map.get(key); b.revenue += m.revenue; b.expenses += m.expenses;
    });
    return [...map.values()].map((b) => ({ ...b, profit: b.revenue - b.expenses }));
  }

  const stockValue = (i) => i.quantity * i.price;
  function stockStatus(i) {
    if (i.quantity <= 0) return { key: 'out', label: 'Out of stock' };
    if (i.quantity <= i.minStock) return { key: 'low', label: 'Low stock' };
    return { key: 'in', label: 'In stock' };
  }

  /* ---------- Recipe units & ingredient cost ---------- */
  // Units are only convertible within the same kind (weight, volume, count). packs and pcs never convert to each other.
  const UNIT_INFO = {
    g:     { kind: 'weight', factor: 1 },
    kg:    { kind: 'weight', factor: 1000 },
    ml:    { kind: 'volume', factor: 1 },
    L:     { kind: 'volume', factor: 1000 },
    pcs:   { kind: 'count',  factor: 1 },
    packs: { kind: 'packs',  factor: 1 }
  };
  const round4 = (n) => Math.round(n * 10000) / 10000;

  // Convert a quantity between units, e.g. convertQty(200, 'g', 'kg') = 0.2. Returns null if the units are incompatible.
  function convertQty(qty, from, to) {
    const a = UNIT_INFO[from], b = UNIT_INFO[to];
    if (!a || !b || a.kind !== b.kind) return null;
    return Math.round(((qty * a.factor) / b.factor) * 1e6) / 1e6;
  }

  // Units a recipe may use for an inventory item (same kind as the item's stock unit).
  function compatibleUnits(stockUnit) {
    const info = UNIT_INFO[stockUnit];
    if (!info) return [stockUnit];
    return Object.keys(UNIT_INFO).filter((u) => UNIT_INFO[u].kind === info.kind);
  }

  // Cost of one recipe line = quantity (converted to the stock unit) x the inventory item's current price per stock unit.
  function recipeLineCost(line, item) {
    const qty = convertQty(Number(line.quantity), line.unit, item.unit);
    if (qty === null) return null;
    return round4(qty * (Number(item.price) || 0));
  }

  // Ingredient cost to make ONE serving. Never throws: problems are reported per line.
  // recipe = { ingredients: [{ inventoryId, quantity, unit }] }, inventory = list from RestoAPI.inventory.list()
  function recipeCost(recipe, inventory) {
    const lines = ((recipe && recipe.ingredients) || []).map((line) => {
      const item = inventory.find((i) => i.id === line.inventoryId);
      const base = { inventoryId: line.inventoryId, quantity: line.quantity, unit: line.unit, name: item ? item.name : 'Unknown ingredient', cost: 0, problem: null };
      if (!item) return { ...base, problem: 'Ingredient no longer exists in Inventory' };
      if (!(Number(line.quantity) > 0)) return { ...base, problem: 'Quantity must be greater than zero' };
      const cost = recipeLineCost(line, item);
      if (cost === null) return { ...base, problem: `Cannot convert ${line.unit} to ${item.unit}` };
      return { ...base, cost };
    });
    return { lines, total: round4(sum(lines, (l) => l.cost)), complete: lines.length > 0 && lines.every((l) => !l.problem) };
  }
  
  const round6 = (n) => Math.round(n * 1e6) / 1e6;

  // Works out what ONE sale uses from Inventory. Pure: it changes nothing, it only calculates.
  // sale = { quantity }, recipe = a record from the recipes collection (or undefined), inventory = the inventory list.
  // Returns { noRecipe, problem, lines: [{ inventoryId, name, need, unit, available, unitPrice, cost }], totalCost }
  function planSaleConsumption(sale, recipe, inventory) {
    const out = { noRecipe: false, problem: null, lines: [], totalCost: 0 };
    const qty = Number(sale.quantity);
    if (!(qty > 0)) { out.problem = 'Quantity sold must be greater than zero.'; return out; }
    if (!recipe || !recipe.ingredients || !recipe.ingredients.length) { out.noRecipe = true; return out; }
    const rc = recipeCost(recipe, inventory);
    const bad = rc.lines.find((l) => l.problem);
    if (bad) { out.problem = `The recipe has a problem (${bad.name}: ${bad.problem}). Fix it on the Menu page, or add the sale without a menu item.`; return out; }
    // Total needed per inventory item, converted to the item's stock unit.
    const needs = new Map();
    recipe.ingredients.forEach((line) => {
      const item = inventory.find((i) => i.id === line.inventoryId);
      needs.set(item.id, (needs.get(item.id) || 0) + convertQty(Number(line.quantity) * qty, line.unit, item.unit));
    });
    const shortages = [];
    out.lines = [...needs].map(([id, rawNeed]) => {
      const item = inventory.find((i) => i.id === id);
      const need = round6(rawNeed);
      if (item.quantity + 1e-9 < need) shortages.push(`Not enough ${item.name}: need ${need} ${item.unit}, only ${item.quantity} ${item.unit} in stock.`);
      const unitPrice = Number(item.price) || 0;
      return { inventoryId: item.id, name: item.name, need, unit: item.unit, available: item.quantity, unitPrice, cost: round4(need * unitPrice) };
    });
    if (shortages.length) { out.problem = shortages.join(' '); return out; }
    out.totalCost = round4(sum(out.lines, (l) => l.cost));
    return out;
  }
     return { FOOD_CATEGORIES, EXPENSE_CATEGORIES, LABOR_CATEGORY, netReceived, summarize, categoryTotals, monthlySeries, quarterlySeries, stockValue, stockStatus, UNIT_INFO, convertQty, compatibleUnits, recipeCost, planSaleConsumption };
})();