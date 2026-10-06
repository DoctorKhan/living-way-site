/**
 * Opens the passage behind a source reference under a saying.
 * The build embeds the passages as JSON (#lw-source-excerpts); without
 * this script each reference still links to its Sources and Echoes entry.
 */
(function () {
  var dataEl = document.getElementById('lw-source-excerpts');
  if (!dataEl) return;
  var excerpts;
  try { excerpts = JSON.parse(dataEl.textContent); } catch (e) { return; }

  // A panel opens after the source line under a saying, or at the end of
  // a Sources and Echoes entry.
  function hostOf(el) {
    return el.closest('.saying-source') || el.closest('li');
  }

  function panelOf(host) {
    var next = host.classList.contains('saying-source')
      ? host.nextElementSibling
      : host.querySelector(':scope > .source-excerpt');
    return next && next.classList.contains('source-excerpt') ? next : null;
  }

  function close(panel) {
    var host = panel.classList.contains('in-entry') ? panel.parentElement : panel.previousElementSibling;
    if (host) host.querySelectorAll('a[aria-expanded]').forEach(function (a) {
      a.setAttribute('aria-expanded', 'false');
    });
    panel.remove();
  }

  function open(link, key) {
    var host = hostOf(link);
    if (!host) return;
    var existing = panelOf(host);
    var same = existing && existing.dataset.ref === key;
    if (existing) close(existing);
    if (same) return;

    var item = excerpts[key];
    var panel = document.createElement('div');
    panel.className = 'source-excerpt';
    panel.dataset.ref = key;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', key.split(' · ')[0]);

    var head = document.createElement('div');
    head.className = 'source-excerpt-head';
    head.textContent = key.split(' · ')[0];
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'source-excerpt-close';
    x.setAttribute('aria-label', 'Close');
    x.textContent = '×';
    x.addEventListener('click', function () { close(panel); link.focus(); });
    head.appendChild(x);
    panel.appendChild(head);

    var body = document.createElement('div');
    body.className = 'source-excerpt-body';
    body.innerHTML = item.html;
    panel.appendChild(body);

    if (item.credit) {
      var credit = document.createElement('p');
      credit.className = 'source-excerpt-credit';
      if (item.link) {
        var a = document.createElement('a');
        a.href = item.link;
        a.textContent = item.credit + ' →';
        credit.appendChild(a);
      } else {
        credit.textContent = item.credit;
      }
      panel.appendChild(credit);
    }

    if (host.classList.contains('saying-source')) {
      host.after(panel);
    } else {
      panel.classList.add('in-entry');
      host.appendChild(panel);
    }
    link.setAttribute('aria-expanded', 'true');
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a.source-ref[data-ref]');
    if (!link) return;
    var key = link.getAttribute('data-ref');
    if (!excerpts[key]) return;
    e.preventDefault();
    open(link, key);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var panel = document.activeElement && document.activeElement.closest('.source-excerpt');
    if (panel) close(panel);
  });
})();
