/* Shared UI helpers.
   SECURITY: we never use innerHTML. All text is inserted with textContent / text nodes,
   so user-typed values cannot inject HTML or scripts.
   NOTE: frontend validation is only for usability. The real backend must re-validate everything. */
const UI = (function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const PROPS = new Set(['value', 'checked', 'disabled', 'selected']);

  /** h('div', {class:'x', onClick: fn}, child, 'text') builds a DOM element safely. */
  function h(tag, props, ...kids) {
    if (props == null || typeof props !== 'object' || props.nodeType || Array.isArray(props)) { kids.unshift(props); props = {}; }
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.length > 2 && k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (PROPS.has(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const fmtInt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const fmtDec = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => (Number.isInteger(n) ? fmtInt : fmtDec).format(n);
  const percent = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const ICONS = {
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    delete: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
  };
  function icon(name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '1em'); s.setAttribute('height', '1em'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', ICONS[name]); p.setAttribute('fill', 'currentColor');
    s.append(p);
    return s;
  }

  /* ---------- Modal ---------- */
  function openModal(title, content, opts = {}) {
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      backdrop.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        backdrop.remove();
        if (!document.querySelector('.modal-backdrop')) { document.body.classList.remove('modal-open'); if (previous && previous.focus) previous.focus(); }
      }, 190);
      if (opts.onClose) opts.onClose();
    }
    const dialog = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'modal-head' },
        h('h2', { class: 'display', text: title }),
        h('button', { class: 'modal-close', type: 'button', 'aria-label': 'Close', onClick: close }, '×')),
      h('div', { class: 'modal-body' }, content));
    const backdrop = h('div', { class: 'modal-backdrop', onMousedown: (e) => { if (e.target === backdrop) close(); } }, dialog);
    document.body.append(backdrop);
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      const first = dialog.querySelector('input, select, textarea, .btn');
      if (first) first.focus();
    });
    return { close };
  }

  function confirm(message, confirmLabel = 'Delete') {
    return new Promise((resolve) => {
      let modal;
      const body = h('div', {},
        h('p', { class: 'confirm-text', text: message }),
        h('div', { class: 'form-actions' },
          h('button', { type: 'button', class: 'btn btn-light', onClick: () => modal.close() }, 'Cancel'),
          h('button', { type: 'button', class: 'btn btn-dark', onClick: () => { resolve(true); modal.close(); } }, confirmLabel)));
      modal = openModal('Please confirm', body, { onClose: () => resolve(false) });
    });
  }

  function toast(message) {
    let host = document.getElementById('toasts');
    if (!host) { host = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(host); }
    const t = h('div', { class: 'toast', text: message });
    host.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2400);
  }

  /* ---------- Form builder ----------
     fields: [{name,label,type:'text|number|date|select|textarea',options,required,min,max,maxLength,full,showIf(raw)}] */
  function buildForm(fields, initial = {}) {
    const form = h('form', { class: 'form', novalidate: true });
    const refs = {};
    fields.forEach((f) => {
      const id = `f-${f.name}-${Math.random().toString(36).slice(2, 7)}`;
      const start = initial[f.name] ?? '';
      let control;
      if (f.type === 'select') {
        control = h('select', { id, name: f.name }, f.options.map((o) => h('option', { value: o, selected: o === start }, o)));
      } else if (f.type === 'textarea') {
        control = h('textarea', { id, name: f.name, rows: 3, maxlength: f.maxLength || 300, value: start });
      } else {
        control = h('input', {
          id, name: f.name, type: f.type || 'text', value: start, autocomplete: 'off',
          step: f.type === 'number' ? 'any' : null, min: f.min, max: f.max,
          maxlength: f.type === 'number' || f.type === 'date' ? null : (f.maxLength || 100)
        });
      }
      const err = h('p', { class: 'field-error', role: 'alert' });
      const wrap = h('div', { class: 'field' + (f.full ? ' field-full' : '') }, h('label', { for: id }, f.label + (f.required ? ' *' : '')), control, err);
      refs[f.name] = { control, err, wrap };
      form.append(wrap);
    });

    const raw = () => Object.fromEntries(fields.map((f) => [f.name, refs[f.name].control.value]));
    const syncVisibility = () => { const r = raw(); fields.forEach((f) => { if (f.showIf) refs[f.name].wrap.hidden = !f.showIf(r); }); };
    form.addEventListener('input', syncVisibility);
    form.addEventListener('change', syncVisibility);
    syncVisibility();

    function getValues() {
      let ok = true, firstBad = null;
      const values = {};
      fields.forEach((f) => {
        const { control, err, wrap } = refs[f.name];
        err.textContent = '';
        if (wrap.hidden) { values[f.name] = f.type === 'number' ? 0 : ''; return; }
        const text = control.value.trim();
        const fail = (msg) => { ok = false; err.textContent = msg; firstBad = firstBad || control; };
        if (f.type === 'number') {
          if (text === '') { if (f.required) fail('This field is required.'); values[f.name] = 0; return; }
          const n = Number(text);
          if (!Number.isFinite(n)) return fail('Enter a valid number.');
          if (f.min != null && n < f.min) return fail(`Must be at least ${f.min}.`);
          if (f.max != null && n > f.max) return fail(`Must be at most ${f.max}.`);
          values[f.name] = n;
          return;
        }
        if (f.required && !text) fail('This field is required.');
        if (f.type === 'date' && text && Number.isNaN(Date.parse(text))) fail('Enter a valid date.');
        values[f.name] = text;
      });
      if (firstBad) firstBad.focus();
      return { ok, values };
    }
    return { form, getValues };
  }

  function formModal({ title, fields, initial, submitLabel = 'Save', validate, onSubmit }) {
    const { form, getValues } = buildForm(fields, initial);
    const formError = h('p', { class: 'field-error form-error', role: 'alert' });
    const submit = h('button', { type: 'submit', class: 'btn btn-dark' }, submitLabel);
    let modal;
    form.append(formError, h('div', { class: 'form-actions' },
      h('button', { type: 'button', class: 'btn btn-light', onClick: () => modal.close() }, 'Cancel'), submit));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      formError.textContent = '';
      const r = getValues();
      if (!r.ok) return;
      const problem = validate ? validate(r.values) : null;
      if (problem) { formError.textContent = problem; return; }
      submit.disabled = true;
      try { await onSubmit(r.values); modal.close(); }
      catch (err) { console.error(err); formError.textContent = 'Something went wrong. Please try again.'; submit.disabled = false; }
    });
    modal = openModal(title, form);
    return modal;
  }

  /* ---------- CSV export (guards against spreadsheet formula injection) ---------- */
  function csvCell(v) {
    let s = String(v ?? '');
    if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function downloadCSV(filename, rows) {
    const text = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = h('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { h, money, percent, today, icon, openModal, confirm, toast, buildForm, formModal, downloadCSV };
})();