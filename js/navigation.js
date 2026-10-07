/* Renders the shared header and footer so you edit navigation in ONE place. */
const Navigation = (function () {
  'use strict';
  const h = UI.h;
  // Inventory is second-last, directly above Setting.
  const ITEMS = [
    { key: 'dashboard', label: 'Dashboard',        file: 'dashboard.html' },
    { key: 'sales',     label: 'Sales',            file: 'sales.html' },
    { key: 'expenses',  label: 'Expenses',         file: 'expenses.html' },
    { key: 'reports',   label: 'Reports',          file: 'reports.html' },
    { key: 'menu',      label: 'Menu & Food Cost', file: 'menu-food-cost.html' },
    { key: 'inventory', label: 'Inventory',        file: 'inventory.html' },
    { key: 'settings',  label: 'Setting',          file: 'settings.html' }
  ];
  const root = () => document.body.dataset.root || '';
  const href = (file) => (root() === '' ? 'pages/' + file : file);

  function renderHeader(host) {
    const current = document.body.dataset.page;
    const toggle = h('button', { class: 'nav-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'site-nav', 'aria-label': 'Toggle navigation' },
      h('span', { class: 'nav-toggle__line' }), h('span', { class: 'nav-toggle__line' }), h('span', { class: 'nav-toggle__line' }));
    toggle.addEventListener('click', () => {
      const open = host.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    const nav = h('nav', { class: 'site-nav', id: 'site-nav', 'aria-label': 'Main' },
      h('ul', {}, ITEMS.map((i) => h('li', {}, h('a', { href: href(i.file), 'aria-current': i.key === current ? 'page' : null }, i.label)))));
    host.classList.toggle('is-overlay', document.body.dataset.header === 'overlay');
    host.append(h('div', { class: 'site-header__inner' },
      h(
  'a',
  {
    class: 'brand',
    href: root() + 'index.html',
    'aria-label': 'RestroFlow home'
  },
  h('img', {
    src: root() + 'assets/images/restroflow-logo.jpg',
    alt: 'RestroFlow',
    class: 'brand__logo'
  })
),
      nav,
      h(
  'a',
  {
    class: 'btn btn-dark site-header__cta',
    href: href('dashboard.html')
  },
  'Get Started'
),
      toggle));
  }

  function renderFooter(host) {
  host.append(
    h(
      'div',
      { class: 'site-footer__inner' },

      h(
        'a',
        {
          class: 'footer-brand display',
          href: root() + 'index.html',
          'aria-label': 'RestroFlow home'
        },
        h('img', {
          src: root() + 'assets/images/restroflow-logo.jpg',
          alt: 'RestroFlow',
          class: 'footer-brand__logo'
        })
      )
    )
  );
}

  function render() {
    const header = document.getElementById('site-header');
    const footer = document.getElementById('site-footer');
    if (header) renderHeader(header);
    if (footer) renderFooter(footer);
  }
  return { render, ITEMS };
})();