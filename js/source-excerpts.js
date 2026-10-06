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

  function close(panel) {
    var line = panel.previousElementSibling;
    if (line) line.querySelectorAll('a[aria-expanded]').forEach(function (a) {
      a.setAttribute('aria-expanded', 'false');
    });
    panel.remove();
  }

  function open(link, key) {
    var line = link.closest('.saying-source');
    var existing = line.nextElementSibling;
    var same = existing && existing.classList.contains('source-excerpt') && existing.dataset.ref === key;
    if (existing && existing.classList.contains('source-excerpt')) close(existing);
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

    line.after(panel);
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
