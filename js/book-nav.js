/*
 * Book navigation for library book pages, built from the page's own headings:
 * - a contents list: a sticky sidebar on wide screens, a pull-out panel elsewhere
 * - a title filter, and the current section highlighted while reading
 * For The Living Way only (its sayings, numbered in order):
 * - saying numbers beside each title (drawn with CSS, so titles stay clean)
 * - previous / next links after each saying
 * - "continue where you left off", remembered on this device
 */
(function () {
  var container = document.querySelector('.container');
  if (!container) return;

  var isLivingWay = /The_Living_Way\.html$/.test(location.pathname);
  var PROGRESS_KEY = 'lw:lastSaying';
  var headings = Array.prototype.filter.call(
    container.querySelectorAll('h1[id], h2[id]'),
    function (h) { return h.parentElement === container; }
  );
  if (headings.length < 4) return;

  function titleOf(h) {
    return h.dataset.title || h.textContent.replace(/\s+/g, ' ').trim();
  }
  function store(fn) { try { return fn(); } catch (e) { return null; } }

  // Group h2s under their h1. An h1 with no h2s is a single entry.
  var groups = [];
  var current = null;
  headings.forEach(function (h) {
    if (h.tagName === 'H1') {
      current = { head: h, items: [] };
      groups.push(current);
    } else if (current) {
      current.items.push(h);
    } else {
      groups.push({ head: h, items: [] });
    }
  });

  // Number the sayings of The Living Way (books are the h1s that have sayings).
  var sayings = [];
  if (isLivingWay) {
    groups.forEach(function (g) {
      if (g.items.length && !g.head.classList.contains('backmatter')) {
        g.items.forEach(function (h) { sayings.push(h); h.dataset.num = sayings.length; });
      }
    });

  }

  // --- Contents panel -----------------------------------------------------
  var toc = document.createElement('aside');
  toc.className = 'lw-toc';
  toc.id = 'lw-toc';
  toc.setAttribute('aria-label', 'Contents');
  var html =
    '<div class="lw-toc-head">' +
      '<p class="lw-toc-title">Contents</p>' +
      '<button type="button" class="lw-toc-close" aria-label="Close contents">×</button>' +
    '</div>' +
    '<input type="search" class="lw-toc-filter" placeholder="Find a saying…" aria-label="Filter by title">' +
    '<ol class="lw-toc-list">';
  groups.forEach(function (g, gi) {
    var t = titleOf(g.head);
    if (!g.items.length) {
      html += '<li class="lw-toc-single"><a href="#' + g.head.id + '" data-id="' + g.head.id + '">' + t + '</a></li>';
      return;
    }
    html += '<li class="lw-toc-group" data-group="' + gi + '">' +
      '<button type="button" class="lw-toc-book" aria-expanded="false">' +
        '<span>' + t + '</span><span class="lw-toc-chev" aria-hidden="true"></span></button>' +
      '<ol class="lw-toc-items">' +
        '<li><a href="#' + g.head.id + '" data-id="' + g.head.id + '" class="lw-toc-intro">' + (isLivingWay ? 'Opening' : 'Introduction') + '</a></li>';
    g.items.forEach(function (h) {
      var num = h.dataset.num ? '<span class="lw-toc-num">' + h.dataset.num + '</span>' : '';
      html += '<li><a href="#' + h.id + '" data-id="' + h.id + '">' + num + '<span class="lw-toc-text">' + titleOf(h) + '</span></a></li>';
    });
    html += '</ol></li>';
  });
  html += '</ol><p class="lw-toc-empty" hidden>No matching titles.</p>';
  toc.innerHTML = html;
  document.body.appendChild(toc);

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'lw-toc-toggle';
  toggle.setAttribute('aria-controls', 'lw-toc');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="lw-toc-toggle-icon" aria-hidden="true"></span>Contents';
  document.body.appendChild(toggle);

  var backdrop = document.createElement('div');
  backdrop.className = 'lw-toc-backdrop';
  document.body.appendChild(backdrop);
  document.body.classList.add('lw-has-toc');

  var links = toc.querySelectorAll('a[data-id]');
  var groupEls = toc.querySelectorAll('.lw-toc-group');
  var filter = toc.querySelector('.lw-toc-filter');
  var lastFocus = null;

  function setGroupOpen(el, open) {
    el.classList.toggle('is-open', open);
    el.querySelector('.lw-toc-book').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  groupEls.forEach(function (el) {
    el.querySelector('.lw-toc-book').addEventListener('click', function () {
      setGroupOpen(el, !el.classList.contains('is-open'));
    });
  });

  function openPanel(returnFocusTo) {
    lastFocus = returnFocusTo || document.activeElement;
    document.body.classList.add('lw-toc-open');
    toggle.setAttribute('aria-expanded', 'true');
    if (menuRead && mobileMenu.matches) menuRead.setAttribute('aria-expanded', 'true');
    var active = toc.querySelector('a[aria-current]');
    if (active) active.scrollIntoView({ block: 'center' });
    setTimeout(function () { filter.focus({ preventScroll: true }); }, 50);
  }

  // On phones, make the existing Read menu entry a second route to the book
  // contents. The floating Contents button remains the quick in-reading control.
  var menuRead = document.querySelector('.lw-links a[data-nav="read"]');
  var mobileMenu = window.matchMedia('(max-width: 720px)');
  if (menuRead) {
    var readLabel = menuRead.textContent;
    var readHref = menuRead.getAttribute('href');
    var readCurrent = menuRead.getAttribute('aria-current');
    function syncMenuContents() {
      if (mobileMenu.matches) {
        menuRead.textContent = 'Contents';
        menuRead.setAttribute('href', '#lw-toc');
        menuRead.setAttribute('aria-label', 'Open this book’s contents');
        menuRead.setAttribute('aria-controls', 'lw-toc');
        menuRead.setAttribute('aria-expanded', document.body.classList.contains('lw-toc-open') ? 'true' : 'false');
        menuRead.removeAttribute('aria-current');
      } else {
        menuRead.textContent = readLabel;
        menuRead.setAttribute('href', readHref);
        menuRead.removeAttribute('aria-label');
        menuRead.removeAttribute('aria-controls');
        menuRead.removeAttribute('aria-expanded');
        if (readCurrent) menuRead.setAttribute('aria-current', readCurrent);
      }
    }
    menuRead.addEventListener('click', function (e) {
      if (!mobileMenu.matches) return;
      e.preventDefault();
      openPanel(document.querySelector('.lw-menu-btn'));
    });
    syncMenuContents();
    mobileMenu.addEventListener('change', syncMenuContents);
  }

  function closePanel() {
    if (!document.body.classList.contains('lw-toc-open')) return;
    document.body.classList.remove('lw-toc-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (menuRead) menuRead.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', openPanel);
  backdrop.addEventListener('click', closePanel);
  toc.querySelector('.lw-toc-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  links.forEach(function (a) { a.addEventListener('click', closePanel); });

  filter.addEventListener('input', function () {
    var q = filter.value.trim().toLowerCase();
    var any = false;
    toc.querySelectorAll('.lw-toc-single').forEach(function (li) {
      var hit = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
      li.hidden = !hit; any = any || hit;
    });
    groupEls.forEach(function (el) {
      var hits = 0;
      el.querySelectorAll('.lw-toc-items li').forEach(function (li) {
        var hit = !q || li.textContent.toLowerCase().indexOf(q) !== -1 ||
          el.querySelector('.lw-toc-book').textContent.toLowerCase().indexOf(q) !== -1;
        li.hidden = !hit; if (hit) hits++;
      });
      el.hidden = q && !hits;
      if (q && hits) setGroupOpen(el, true);
      any = any || hits > 0;
    });
    toc.querySelector('.lw-toc-empty').hidden = any;
    if (!q) highlight(true);
  });

  // --- Where am I? ----------------------------------------------------------
  var activeId = null;
  function highlight(force) {
    var line = 110;
    var found = headings[0];
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= line) found = headings[i]; else break;
    }
    if (!force && found.id === activeId) return;
    activeId = found.id;
    links.forEach(function (a) {
      if (a.dataset.id === activeId) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    var link = toc.querySelector('a[data-id="' + activeId + '"]');
    var group = link && link.closest('.lw-toc-group');
    if (group && !filter.value) {
      groupEls.forEach(function (el) { if (el !== group) setGroupOpen(el, false); });
      setGroupOpen(group, true);
    }
    if (link && !document.body.classList.contains('lw-toc-open') && !toc.matches(':hover')) {
      var r = link.getBoundingClientRect(), tr = toc.getBoundingClientRect();
      if (r.top < tr.top + 60 || r.bottom > tr.bottom - 20) {
        toc.scrollTop += r.top - tr.top - tr.height / 3;
      }
    }
    if (found.dataset.num) {
      store(function () {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({ id: found.id, num: found.dataset.num, title: titleOf(found) }));
      });
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; highlight(false); });
  }, { passive: true });

  // --- The Living Way: previous / next, continue reading ---------------------
  if (sayings.length) {
    sayings.forEach(function (h, i) {
      var end = h.nextElementSibling;
      while (end && !/^H[12]$/.test(end.tagName) && !(end.classList && end.classList.contains('ornament'))) {
        end = end.nextElementSibling;
      }
      var prev = sayings[i - 1], next = sayings[i + 1];
      var nav = document.createElement('nav');
      nav.className = 'lw-saynav';
      nav.setAttribute('aria-label', 'Saying ' + (i + 1));
      nav.innerHTML =
        (prev ? '<a class="lw-prev" href="#' + prev.id + '"><span aria-hidden="true">←</span><span class="lw-sn-t">' + (i) + ' · ' + titleOf(prev) + '</span></a>' : '<span></span>') +
        (next ? '<a class="lw-next" href="#' + next.id + '"><span class="lw-sn-t">' + (i + 2) + ' · ' + titleOf(next) + '</span><span aria-hidden="true">→</span></a>'
              : '<a class="lw-next" href="#sources-and-echoes"><span class="lw-sn-t">Sources and Echoes</span><span aria-hidden="true">→</span></a>');
      container.insertBefore(nav, end);
    });

    var saved = store(function () { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); });
    var target = saved && document.getElementById(saved.id);
    if (target && !location.hash && saved.num > 1) {
      var bar = document.createElement('div');
      bar.className = 'lw-continue';
      bar.setAttribute('role', 'status');
      bar.innerHTML =
        '<span>Continue at <strong>' + saved.num + ' · ' + titleOf(target) + '</strong></span>' +
        '<a href="#' + saved.id + '" class="lw-continue-go">Continue</a>' +
        '<button type="button" class="lw-continue-x" aria-label="Dismiss">×</button>';
      document.body.appendChild(bar);
      var dismiss = function () { bar.remove(); };
      bar.querySelector('.lw-continue-go').addEventListener('click', dismiss);
      bar.querySelector('.lw-continue-x').addEventListener('click', dismiss);
      window.addEventListener('scroll', function onScroll() {
        if (window.scrollY > window.innerHeight) { dismiss(); window.removeEventListener('scroll', onScroll); }
      }, { passive: true });
    }
  }

  // Verse: wrap each line between <br>s so long lines get a hanging indent.
  Array.prototype.forEach.call(container.children, function (p) {
    if (p.tagName !== 'P' || !p.querySelector('br')) return;
    var lines = [], line = document.createElement('span');
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeName === 'BR') { lines.push(line); line = document.createElement('span'); }
      else line.appendChild(n);
    });
    lines.push(line);
    p.textContent = '';
    lines.forEach(function (l) {
      if (!l.textContent.trim()) return;
      l.className = 'lw-line';
      p.appendChild(l);
    });
    p.classList.add('lw-verse');
  });

  // Contents button steps aside while scrolling down, returns on scroll up.
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (Math.abs(y - lastY) < 8) return;
    toggle.classList.toggle('is-hidden', y > lastY && y > 240);
    lastY = y;
  }, { passive: true });

  // Wait a beat so the share script and layout settle, then mark the start point.
  setTimeout(function () { highlight(true); }, 0);
})();
