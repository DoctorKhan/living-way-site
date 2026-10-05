/*
 * Shared header behaviour: marks the current section and opens/closes the
 * phone menu. The header markup itself is static HTML in each page.
 */
(function () {
  var header = document.querySelector('.lw-header');
  if (!header) return;

  var path = location.pathname;
  var section =
    /The_Living_Way\.html$/.test(path) ? 'read' :
    /\/paths\.html$/.test(path) ? 'voices' :
    /^\/public-knowledge\/(index\.html)?$/.test(path) ? 'library' : '';
  if (section) {
    var current = header.querySelector('[data-nav="' + section + '"]');
    if (current) current.setAttribute('aria-current', 'page');
  }

  var btn = header.querySelector('.lw-menu-btn');
  if (!btn) return;

  function setOpen(open) {
    header.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    setOpen(!header.classList.contains('is-open'));
  });
  header.querySelectorAll('.lw-links a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
  });
})();
