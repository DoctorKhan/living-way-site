/*
 * Adds a "Share" button to every saying (h2[id]) on a book page.
 * Uses the native share sheet when available, otherwise copies the saying and
 * a direct link (page#saying-id) to the clipboard.
 */
(function () {
  var STYLE =
    '.lw-share{display:inline-flex;align-items:center;justify-content:center;margin-left:.55em;vertical-align:middle;' +
    'width:1.8em;height:1.8em;color:#6b6152;background:transparent;border:1px solid rgba(107,97,82,.3);' +
    'border-radius:50%;padding:.35em;cursor:pointer;opacity:.72;transition:opacity .2s,background .2s}' +
    '.lw-share svg{display:block;width:100%;height:100%}' +
    '.lw-share:hover,.lw-share:focus-visible{opacity:1;background:rgba(255,255,255,.6)}' +
    '.lw-saying-target{animation:lw-glow 2.4s ease-out}' +
    '@keyframes lw-glow{from{background:rgba(212,175,55,.22)}to{background:transparent}}' +
    '@media print{.lw-share{display:none}}';

  function sayingText(heading) {
    var parts = [];
    for (var el = heading.nextElementSibling; el && !/^H[1-2]$/.test(el.tagName); el = el.nextElementSibling) {
      if (el.tagName === 'P' || el.tagName === 'BLOCKQUOTE') parts.push(el.innerText.trim());
    }
    return parts.join('\n\n');
  }

  function bookTitle() {
    var t = (document.title || '').trim();
    return t === 'The Hidden Wisdom of Yeshua' ? 'The Living Way' : t;
  }

  function flash(btn, label) {
    var original = btn.innerHTML;
    btn.textContent = label;
    setTimeout(function () { btn.innerHTML = original; }, 1800);
  }

  function share(heading, btn) {
    var title = heading.dataset.title;
    var url = location.origin + location.pathname + '#' + heading.id;
    var body = sayingText(heading);
    var text = title + '\n\n' + body + '\n\n— ' + bookTitle();

    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () { /* cancelled */ });
      return;
    }
    var payload = text + '\n' + url;
    var done = function () { flash(btn, 'Copied'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(payload).then(done, function () { window.prompt('Copy this saying:', payload); });
    } else {
      window.prompt('Copy this saying:', payload);
    }
  }

  function highlightTarget() {
    if (!location.hash) return;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!el) return;
    el.classList.remove('lw-saying-target');
    void el.offsetWidth;
    el.classList.add('lw-saying-target');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var headings = document.querySelectorAll('.container h2[id]');
    if (!headings.length) return;
    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    headings.forEach(function (h) {
      h.dataset.title = h.textContent.replace(/\s+/g, ' ').trim();
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lw-share';
      btn.setAttribute('aria-label', 'Share “' + h.dataset.title + '”');
      btn.setAttribute('title', 'Share this saying');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"></path></svg>';
      btn.addEventListener('click', function () { share(h, btn); });
      h.appendChild(btn);
    });

    highlightTarget();
    window.addEventListener('hashchange', highlightTarget);
  });
})();
