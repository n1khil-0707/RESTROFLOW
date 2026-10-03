App.ready(async function () {
  'use strict';
  const h = UI.h;
  const host = document.getElementById('settings-host');
  const fields = [
    { name: 'restaurantName', label: 'Restaurant name', required: true, maxLength: 60, full: true },
    { name: 'openingCash', label: 'Opening cash balance (₹)', type: 'number', min: 0 },
    { name: 'openingBank', label: 'Opening bank balance (₹)', type: 'number', min: 0 },
    { name: 'receivables', label: 'Receivables (₹)', type: 'number', min: 0 },
    { name: 'payables', label: 'Payables / outstanding (₹)', type: 'number', min: 0 },
    { name: 'gstRate', label: 'Default GST rate (%)', type: 'number', min: 0, max: 100 }
  ];
  const { form, getValues } = UI.buildForm(fields, await RestoAPI.settings.get());
  form.append(h('div', { class: 'form-actions' },
    h('button', { type: 'button', class: 'btn btn-light', onClick: async () => {
      if (await UI.confirm('Reset ALL demo data (sales, expenses, menu, inventory, settings)?', 'Reset')) { await RestoAPI.resetDemo(); location.reload(); }
    } }, 'Reset demo data'),
    h('button', { type: 'submit', class: 'btn btn-dark' }, 'Save settings')));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = getValues();
    if (!r.ok) return;
    await RestoAPI.settings.update(r.values);
    UI.toast('Settings saved');
  });
  host.replaceChildren(form);
});