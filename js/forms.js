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

  function openSale(existing, onSaved) {
    UI.formModal({
      title: existing ? 'Edit sale' : 'Add sale',
      fields: saleFields,
      initial: existing || { date: UI.today(), channel: 'Dine-in', payment: 'Cash' },
      submitLabel: existing ? 'Save changes' : 'Add sale',
      validate: (v) => (v.discount > v.amount ? 'Discount cannot be larger than the order value.' : null),
      onSubmit: async (v) => {
        if (existing) await RestoAPI.sales.update(existing.id, v); else await RestoAPI.sales.create(v);
        UI.toast(existing ? 'Sale updated' : 'Sale added');
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