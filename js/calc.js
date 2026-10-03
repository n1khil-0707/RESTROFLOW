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
    const cashOut = sum(expenses.filter((e) => e.payment === 'Cash'), (e) => e.amount);
    const bankIn = sum(sales.filter((s) => s.payment !== 'Cash'), netReceived);
    const bankOut = sum(expenses.filter((e) => e.payment !== 'Cash'), (e) => e.amount);
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

  return { FOOD_CATEGORIES, EXPENSE_CATEGORIES, LABOR_CATEGORY, netReceived, summarize, categoryTotals, monthlySeries, quarterlySeries, stockValue, stockStatus };
})();