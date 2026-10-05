/*
 * The Living Way PWA bootstrap: registers the service worker and drives any
 * [data-install-app] button from the browser's install flow.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt` once the page meets the install
 * criteria; we hold it and trigger it from our own button. iOS Safari never
 * fires it, so there the button reveals Share → Add to Home Screen steps
 * ([data-install-hint]). Buttons stay hidden when already installed.
 */
(function () {
  var INSTALLED_KEY = 'lw:pwaInstalled';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(function () { /* the site works without it */ });
    });
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)').matches ||
      navigator.standalone === true;
  }
  function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  }
  function markInstalled() {
    try { localStorage.setItem(INSTALLED_KEY, '1'); } catch (e) { /* private mode */ }
  }

  var deferred = null;

  function buttons() { return document.querySelectorAll('[data-install-app]'); }
  function hints() { return document.querySelectorAll('[data-install-hint]'); }
  function show(visible) {
    buttons().forEach(function (b) { b.hidden = !visible; });
  }

  if (isStandalone()) markInstalled();

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show(true);
  });

  window.addEventListener('appinstalled', function () {
    deferred = null;
    markInstalled();
    show(false);
    hints().forEach(function (h) { h.hidden = true; });
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (isStandalone()) return;
    if (isIos()) show(true);

    buttons().forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (deferred) {
          var prompt = deferred;
          deferred = null;
          prompt.prompt();
          prompt.userChoice.then(function (choice) {
            if (choice.outcome === 'accepted') { markInstalled(); show(false); }
          });
          return;
        }
        hints().forEach(function (h) {
          h.textContent = isIos()
            ? 'Tap the Share button, then “Add to Home Screen”.'
            : 'Use your browser menu and choose “Install app” or “Add to Home screen”.';
          h.hidden = false;
        });
      });
    });
  });
})();
