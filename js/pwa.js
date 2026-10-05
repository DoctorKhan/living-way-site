/*
 * The Living Way PWA bootstrap: registers the service worker, drives any
 * [data-install-app] button, and shows a gentle one-time install invitation
 * on reading pages.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt` once the page meets the install
 * criteria; we hold it and trigger it from our own button or banner. iOS Safari
 * never fires it, so there we show Share → Add to Home Screen steps instead.
 *
 * The invitation appears only after real reading (three page views, or 35% of
 * a long page), once per session, never in the installed app, and stays away
 * for 30 days after "Not now".
 */
(function () {
  var INSTALLED_KEY = 'lw:pwaInstalled';
  var DISMISSED_KEY = 'lw:installDismissedAt';
  var VIEWS_KEY = 'lw:views';
  var SESSION_KEY = 'lw:installShown';
  var DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(function () { /* the site works without it */ });
    });
  }

  function get(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function set(store, key, value) { try { store.setItem(key, value); } catch (e) { /* private mode */ } }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)').matches ||
      navigator.standalone === true;
  }
  function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  }
  function isPhone() { return /Android|iPhone|iPod/.test(navigator.userAgent); }
  function markInstalled() { set(localStorage, INSTALLED_KEY, '1'); }

  var deferred = null;

  function buttons() { return document.querySelectorAll('[data-install-app]'); }
  function hints() { return document.querySelectorAll('[data-install-hint]'); }
  function showButtons(visible) {
    buttons().forEach(function (b) { b.hidden = !visible; });
  }

  function promptInstall(onDone) {
    var prompt = deferred;
    deferred = null;
    prompt.prompt();
    prompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') { markInstalled(); showButtons(false); }
      if (onDone) onDone(choice.outcome);
    });
  }

  // --- Install invitation -------------------------------------------------

  var SHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  var banner = null;

  function isReadingPage() { return location.pathname.indexOf('/public-knowledge/') === 0; }
  function dismissedRecently() {
    var at = parseInt(get(localStorage, DISMISSED_KEY) || '0', 10);
    return at && Date.now() - at < DISMISS_MS;
  }
  function eligible() {
    return !banner && isReadingPage() && !isStandalone() &&
      get(localStorage, INSTALLED_KEY) !== '1' && !dismissedRecently() &&
      get(sessionStorage, SESSION_KEY) !== '1' &&
      (deferred || isIos());
  }

  function closeBanner(remember) {
    if (!banner) return;
    if (remember) set(localStorage, DISMISSED_KEY, String(Date.now()));
    banner.remove();
    banner = null;
  }

  function showBanner() {
    if (!eligible()) return;
    set(sessionStorage, SESSION_KEY, '1');
    banner = document.createElement('div');
    banner.className = 'lw-install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install The Living Way');
    banner.innerHTML =
      '<img src="/images/icon-192.png" alt="">' +
      '<div class="lw-ib-body">' +
        '<p class="lw-ib-title">' + (isPhone() ? 'Keep The Living Way on your phone' : 'Install The Living Way') + '</p>' +
        '<p class="lw-ib-text">Read offline, and return to it one saying at a time.</p>' +
        '<div class="lw-ib-actions">' +
          '<button type="button" class="lw-ib-go">Install</button>' +
          '<button type="button" class="lw-ib-later">Not now</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector('.lw-ib-later').addEventListener('click', function () { closeBanner(true); });
    banner.querySelector('.lw-ib-go').addEventListener('click', function () {
      if (deferred) {
        promptInstall(function (outcome) { closeBanner(outcome !== 'accepted'); });
        return;
      }
      // iOS: explain the two taps, since Safari has no install dialog.
      var text = banner.querySelector('.lw-ib-text');
      text.outerHTML =
        '<ol class="lw-ib-steps">' +
          '<li>Tap the Share button ' + SHARE_ICON + '</li>' +
          '<li>Choose “Add to Home Screen”</li>' +
        '</ol>';
      var go = banner.querySelector('.lw-ib-go');
      go.textContent = 'Done';
      go.onclick = function () { closeBanner(true); };
    });
  }

  function engaged() {
    if (parseInt(get(localStorage, VIEWS_KEY) || '0', 10) >= 3) return true;
    var doc = document.documentElement;
    var long = doc.scrollHeight > window.innerHeight * 2.5;
    return long && (window.scrollY + window.innerHeight) / doc.scrollHeight >= 0.35;
  }

  function maybeInvite() { if (engaged()) showBanner(); }

  // --- Wiring ---------------------------------------------------------------

  if (isStandalone()) markInstalled();

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    showButtons(true);
    maybeInvite();
  });

  window.addEventListener('appinstalled', function () {
    deferred = null;
    markInstalled();
    showButtons(false);
    closeBanner(false);
    hints().forEach(function (h) { h.hidden = true; });
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (isStandalone()) return;
    set(localStorage, VIEWS_KEY, String(parseInt(get(localStorage, VIEWS_KEY) || '0', 10) + 1));
    if (isIos()) showButtons(true);

    buttons().forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (deferred) { promptInstall(); return; }
        hints().forEach(function (h) {
          h.textContent = isIos()
            ? 'Tap the Share button, then “Add to Home Screen”.'
            : 'Use your browser menu and choose “Install app” or “Add to Home screen”.';
          h.hidden = false;
        });
      });
    });

    if (isReadingPage()) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking || banner) return;
        ticking = true;
        setTimeout(function () { ticking = false; maybeInvite(); }, 400);
      }, { passive: true });
      setTimeout(maybeInvite, 1500);
    }
  });
})();
