/* Sale and expense forms shared by Sales, Expenses and Reports (Quick add). */
const Forms = (function () {
  'use strict';
  const online = (v) => v.channel === 'Online orders';

  const saleFields = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'description', label: 'Description', required: true, maxLength: 80 },
    { name: 'channel', label: 'Order type', type: 'select', options: ['Dine-in', 'Takeaway', 'Delivery', 'Online orders'] },
    { name: 'payment', label: 'Payment method', type: 'select', options: ['Cash', 'UPI', 'Card', 'Online'] },
    { name: 'amount', label: 'Gross order value (₹)', type: 'number', required: true, min: 0.01 },
    // Only shown for online orders (keeps the form uncluttered):
    { name: 'platform', label: 'Platform', type: 'select', options: ['Zomato', 'Swiggy', 'Direct website/app', 'Other platforms'], showIf: online },
    { name: 'commission', label: 'Commission (₹)', type: 'number', min: 0, showIf: online },
    { name: 'taxes', label: 'Taxes (₹)', type: 'number', min: 0, showIf: online },
    { name: 'discount', label: 'Discounts (₹)', type: 'number', min: 0, showIf: online },
    { name: 'deliveryCharges', label: 'Delivery charges (₹)', type: 'number', min: 0, showIf: online }
  ];

  const expenseFields = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'description', label: 'Description', required: true, maxLength: 80 },
    { name: 'category', label: 'Category', type: 'select', options: RestoCalc.EXPENSE_CATEGORIES },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0.01 },
    { name: 'payment', label: 'Payment method', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank transfer'] },
    { name: 'vendor', label: 'Vendor', maxLength: 80 },
    { name: 'gst', label: 'Tax / GST (%)', type: 'number', min: 0, max: 100 },
    { name: 'recurring', label: 'Type', type: 'select', options: ['One-time', 'Recurring'] },
    { name: 'notes', label: 'Notes', type: 'textarea', full: true }
  ];

  // Permanent unique reference for every new sale. Unlike the numeric id it is never reused,
  // so later it can safely mark "inventory already deducted for this sale".
  function newSaleRef() {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
    return `SALE-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }

    async function openSale(existing, onSaved) {
    const menu = await RestoAPI.menu.list();
    const saleRef = newSaleRef();   // created once per form, so pressing "Add sale" twice can never record it twice
    // Menu item + quantity are only offered for NEW sales (editing keeps stock and expenses in sync).
    const menuField = { name: 'menuId', label: 'Menu item (optional)', type: 'select',
      options: [{ value: '', label: '— None (plain sale) —' }, ...menu.map((m) => ({ value: m.id, label: m.name }))] };
    const qtyField = { name: 'quantity', label: 'Quantity sold', type: 'number', min: 0, showIf: (r) => r.menuId !== '' };
    const fields = existing ? saleFields : [saleFields[0], saleFields[1], menuField, qtyField, ...saleFields.slice(2)];
    UI.formModal({
      title: existing ? 'Edit sale' : 'Add sale',
      fields,
      initial: existing || { date: UI.today(), channel: 'Dine-in', payment: 'Cash', menuId: '', quantity: 1 },
      submitLabel: existing ? 'Save changes' : 'Add sale',
      validate: (v) => {
        if (v.discount > v.amount) return 'Discount cannot be larger than the order value.';
        if (!existing && v.menuId !== '' && !(v.quantity > 0)) return 'Enter a quantity greater than zero.';
        return null;
      },
      onSubmit: async (v) => {
        if (existing) {
          await RestoAPI.sales.update(existing.id, v);
          UI.toast('Sale updated');
        } else {
          const { menuId, quantity, ...rest } = v;
          const sale = { ...rest, saleRef };
          const m = menuId !== '' ? menu.find((x) => x.id === Number(menuId)) : null;
          if (m) { sale.menuId = m.id; sale.menuName = m.name; sale.quantity = quantity; }
          const res = await RestoAPI.sales.createWithStock(sale);
          if (!res.ok) throw Object.assign(new Error(res.message), { userMessage: res.message });
          if (res.duplicate) UI.toast('This sale was already recorded');
          else if (res.noRecipe) UI.toast(`Sale added. “${m.name}” has no recipe, so stock was not deducted.`);
          else if (res.stockProcessed) UI.toast(`Sale added. Stock deducted, ingredient cost ${UI.money(res.ingredientCost)}.`);
          else UI.toast('Sale added');
        }
        if (onSaved) await onSaved();
      }
    });
  }

  function openExpense(existing, onSaved) {
    UI.formModal({
      title: existing ? 'Edit expense' : 'Add expense',
      fields: expenseFields,
      initial: existing || { date: UI.today(), category: 'Food & ingredients', payment: 'Cash', recurring: 'One-time' },
      submitLabel: existing ? 'Save changes' : 'Add expense',
      onSubmit: async (v) => {
        if (existing) await RestoAPI.expenses.update(existing.id, v); else await RestoAPI.expenses.create(v);
        UI.toast(existing ? 'Expense updated' : 'Expense added');
        if (onSaved) await onSaved();
      }
    });
  }

  return { openSale, openExpense };
})();