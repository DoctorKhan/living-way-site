/*
 * The Living Way PWA bootstrap: registers the service worker, drives any
 * [data-install-app] button, and shows a gentle one-time install invitation
 * on the first visit.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt` once the page meets the install
 * criteria; we hold it and trigger it from our own button or banner. iOS Safari
 * never fires it, so there we show Share → Add to Home Screen steps instead.
 *
 * iOS has no install dialog in any browser, so there the invitation shows the
 * exact steps for the browser in use (Safari, Chrome, Firefox, Edge), and in
 * in-app browsers (Instagram, Gmail, ...), where Add to Home Screen is missing,
 * it asks the reader to open the page in Safari first.
 *
 * The invitation appears a few seconds into the first visit on any page, once
 * per session, never in the installed app, and stays away for 30 days after
 * "Not now". An [data-install-app] button always brings it back.
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

  var SHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  var MORE = '<span class="lw-ib-key" aria-label="More">⋯</span>';
  var banner = null;

  // Which iOS browser this is, as far as install steps differ.
  function iosBrowser() {
    var ua = navigator.userAgent;
    if (/FBAN|FBAV|Instagram|LinkedInApp|Twitter|MicroMessenger|Line\/|GSA\/|Snapchat|Pinterest/i.test(ua)) return 'inapp';
    if (/CriOS/i.test(ua)) return 'chrome';
    if (/FxiOS/i.test(ua)) return 'firefox';
    if (/EdgiOS/i.test(ua)) return 'edge';
    return 'safari';
  }

  function iosGuide() {
    var b = iosBrowser();
    var b_ = function (t) { return '<b>' + t + '</b>'; };
    if (b === 'inapp') return {
      title: 'Open in Safari to install',
      text: 'This app’s built-in browser can’t add pages to your Home Screen.',
      steps: [
        'Tap ' + MORE + ' or the compass, and choose ' + b_('Open in Safari') + ' (or Open in Browser)',
        'Then tap Share ' + SHARE_ICON + ' → ' + b_('Add to Home Screen'),
      ],
    };
    if (b === 'chrome') return {
      title: 'Add The Living Way to your Home Screen',
      steps: [
        'Tap Share ' + SHARE_ICON + ' at the right of the address bar',
        'Scroll down and tap ' + b_('Add to Home Screen'),
        'Tap ' + b_('Add'),
      ],
    };
    if (b === 'firefox' || b === 'edge') return {
      title: 'Add The Living Way to your Home Screen',
      steps: [
        'Open the browser menu (☰ or ' + MORE + ')',
        'Tap ' + b_('Share') + ', then ' + b_('Add to Home Screen'),
        'Tap ' + b_('Add'),
      ],
    };
    return {
      title: 'Add The Living Way to your Home Screen',
      steps: [
        'Tap ' + MORE + ' in Safari’s toolbar, then ' + b_('Share') + ' (or tap Share ' + SHARE_ICON + ' directly)',
        'Scroll down and tap ' + b_('Add to Home Screen'),
        'Leave ' + b_('Open as Web App') + ' on if you see it, then tap ' + b_('Add'),
      ],
    };
  }

  function dismissedRecently() {
    var at = parseInt(get(localStorage, DISMISSED_KEY) || '0', 10);
    return at && Date.now() - at < DISMISS_MS;
  }
  function canOffer() { return !isStandalone() && (deferred || isIos()); }
  function eligible() {
    return !banner && canOffer() &&
      get(localStorage, INSTALLED_KEY) !== '1' && !dismissedRecently() &&
      get(sessionStorage, SESSION_KEY) !== '1';
  }

  function closeBanner(remember) {
    if (!banner) return;
    if (remember) set(localStorage, DISMISSED_KEY, String(Date.now()));
    banner.remove();
    banner = null;
  }

  function showBanner(force) {
    if (banner || !canOffer() || (!force && !eligible())) return;
    // Only where the shared stylesheet is loaded, so it never appears unstyled.
    if (!document.querySelector('link[href*="site-nav.css"]')) return;
    set(sessionStorage, SESSION_KEY, '1');
    var ios = !deferred && isIos();
    var guide = ios ? iosGuide() : null;
    banner = document.createElement('div');
    banner.className = 'lw-install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install The Living Way');
    banner.innerHTML =
      '<img src="/images/icon-192.png" alt="">' +
      '<div class="lw-ib-body">' +
        '<p class="lw-ib-title">' + (guide ? guide.title : (isPhone() ? 'Keep The Living Way on your phone' : 'Install The Living Way')) + '</p>' +
        (guide
          ? (guide.text ? '<p class="lw-ib-text">' + guide.text + '</p>' : '') +
            '<ol class="lw-ib-steps">' + guide.steps.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>'
          : '<p class="lw-ib-text">Read offline, and return to it one saying at a time.</p>') +
        '<div class="lw-ib-actions">' +
          '<button type="button" class="lw-ib-go">' + (guide ? 'Got it' : 'Install') + '</button>' +
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
      closeBanner(false);
    });
  }

  // --- Wiring ---------------------------------------------------------------

  if (isStandalone()) markInstalled();

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    showButtons(true);
    setTimeout(function () { showBanner(false); }, 2000);
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
        if (isIos()) { closeBanner(false); showBanner(true); return; }
        hints().forEach(function (h) {
          h.textContent = 'Use your browser menu and choose “Install app” or “Add to Home screen”.';
          h.hidden = false;
        });
      });
    });

    // A few seconds into the first visit, once the page has been seen.
    setTimeout(function () { showBanner(false); }, 4000);
  });
})();
