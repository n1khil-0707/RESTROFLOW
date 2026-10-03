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
    if (!db || typeof db !== 'object') { db = clone(RestoDemo); save(); }
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage blocked: demo still works per page */ } }
  const nextId = (list) => list.reduce((m, r) => Math.max(m, r.id), 0) + 1;

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

  return {
    sales: collection('sales'),
    expenses: collection('expenses'),
    menu: collection('menu', { append: true }),
    inventory: collection('inventory', { append: true }),
    history: { async list() { return clone(load().history); } },
    settings: {
      async get() { return clone(load().settings); },
      async update(patch) { const d = load(); d.settings = { ...d.settings, ...patch }; save(); return clone(d.settings); }
    },
    async resetDemo() { db = clone(RestoDemo); save(); }
  };
})();