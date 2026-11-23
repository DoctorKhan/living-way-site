/*
 * Adds Share and Copy-link buttons to every saying (h2[id]) on a book page.
 * They sit at the foot of the saying, beside its source line, so the title
 * stays clean.
 * Uses the native share sheet when available, otherwise copies the saying and
 * a direct link (page#saying-id) to the clipboard. A second button copies just
 * the link.
 */
(function () {
  var STYLE =
    '.lw-saying-foot{display:flex;align-items:center;gap:1rem;margin:-.6rem 0 0}' +
    '.lw-saying-foot>p{margin:0!important;flex:1;min-width:0}' +
    '.lw-actions{display:inline-flex;gap:.3rem;margin-left:auto;flex:none}' +
    '.lw-share{display:inline-flex;align-items:center;justify-content:center;' +
    'width:30px;height:30px;color:#6b6152;background:transparent;border:0;' +
    'border-radius:50%;padding:7px;cursor:pointer;opacity:.55;transition:opacity .2s,background .2s}' +
    '.lw-share svg{display:block;width:100%;height:100%}' +
    '.lw-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '.lw-share:hover,.lw-share:focus-visible{opacity:1;background:rgba(140,123,108,.12)}' +
    '.lw-saying-target{animation:lw-glow 2.4s ease-out}' +
    '@keyframes lw-glow{from{background:rgba(212,175,55,.22)}to{background:transparent}}' +
    '@media print{.lw-actions{display:none}}';

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

  var SHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"></path></svg>';
  var LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
  var CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  var status;

  function announce(msg) {
    if (!status) return;
    status.textContent = '';
    setTimeout(function () { status.textContent = msg; }, 50);
  }

  function flash(btn, msg) {
    var original = btn.innerHTML;
    btn.innerHTML = CHECK_ICON;
    announce(msg);
    setTimeout(function () { btn.innerHTML = original; }, 1800);
  }

  function sayingUrl(heading) {
    return location.origin + location.pathname + '#' + heading.id;
  }

  function copy(payload, btn, msg, promptLabel) {
    var done = function () { flash(btn, msg); };
    var fallback = function () { window.prompt(promptLabel, payload); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(payload).then(done, fallback);
    } else {
      fallback();
    }
  }

  function copyLink(heading, btn) {
    copy(sayingUrl(heading), btn, 'Link copied', 'Copy this link:');
  }

  function share(heading, btn) {
    var title = heading.dataset.title;
    var url = sayingUrl(heading);
    var body = sayingText(heading);
    var text = title + '\n\n' + body + '\n\n— ' + bookTitle();

    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () { /* cancelled */ });
      return;
    }
    copy(text + '\n' + url, btn, 'Saying copied', 'Copy this saying:');
  }

  function highlightTarget() {
    if (!location.hash) return;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!el) return;
    el.classList.remove('lw-saying-target');
    void el.offsetWidth;
    el.classList.add('lw-saying-target');
  }

  // The source line under a saying, or a new foot row when it has none.
  function footOf(h) {
    var el = h.nextElementSibling, last = h;
    while (el && !/^H[12]$/.test(el.tagName) && !el.matches('.ornament, .lw-saynav')) {
      if (el.matches('.saying-source')) { el.classList.add('lw-saying-foot'); return el; }
      last = el;
      el = el.nextElementSibling;
    }
    var foot = document.createElement('div');
    foot.className = 'lw-saying-foot';
    last.after(foot);
    return foot;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var headings = document.querySelectorAll('.container h2[id]');
    if (!headings.length) return;
    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    status = document.createElement('span');
    status.className = 'lw-sr';
    status.setAttribute('role', 'status');
    document.body.appendChild(status);

    headings.forEach(function (h) {
      h.dataset.title = h.textContent.replace(/\s+/g, ' ').trim();
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lw-share';
      btn.setAttribute('aria-label', 'Share “' + h.dataset.title + '”');
      btn.setAttribute('title', 'Share this saying');
      btn.innerHTML = SHARE_ICON;
      btn.addEventListener('click', function () { share(h, btn); });

      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'lw-share';
      link.setAttribute('aria-label', 'Copy link to “' + h.dataset.title + '”');
      link.setAttribute('title', 'Copy link');
      link.innerHTML = LINK_ICON;
      link.addEventListener('click', function () { copyLink(h, link); });

      var actions = document.createElement('span');
      actions.className = 'lw-actions';
      actions.appendChild(btn);
      actions.appendChild(link);
      footOf(h).appendChild(actions);
    });

    highlightTarget();
    window.addEventListener('hashchange', highlightTarget);
  });
})();
