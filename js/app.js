/* Boot file. Page scripts call App.ready(fn); fn runs after the header/footer exist. */
const App = (function () {
  'use strict';
  const queue = [];
  let booted = false;

  function boot() {
    Navigation.render();
    // If an image file is missing, hide the broken icon and show the grey block instead.
    document.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => img.classList.add('img-missing'));
      if (img.complete && img.naturalWidth === 0) img.classList.add('img-missing');
    });
    booted = true;
    queue.splice(0).forEach((fn) => fn());
  }
  document.addEventListener('DOMContentLoaded', boot);
  // Back/forward cache: reload so numbers are never stale.
  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

  return { ready(fn) { booted ? fn() : queue.push(fn); } };
})();