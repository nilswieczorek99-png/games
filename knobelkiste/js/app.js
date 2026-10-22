/* Knobelkiste – Navigation zwischen den Bereichen */
(function () {
  'use strict';
  var KK = window.KK;
  var view = document.getElementById('view');
  var titleEl = document.getElementById('title');
  var backBtn = document.getElementById('backBtn');
  var current = null;
  var depth = 0; // wie viele Schritte wir innerhalb der App navigiert sind

  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    return { mode: parts[0] || 'home', sub: parts[1] || '' };
  }

  function render() {
    var r = parse();
    var mode = KK.modes[r.mode] || KK.modes.home;
    if (current && current.unmount) {
      try { current.unmount(); } catch (e) { /* weiter */ }
    }
    view.innerHTML = '';
    view.className = 'view view-' + (KK.modes[r.mode] ? r.mode : 'home');
    current = mode;
    var title = typeof mode.title === 'function' ? mode.title(r.sub) : mode.title;
    titleEl.textContent = title || 'Knobelkiste';
    document.title = r.mode === 'home' ? 'Knobelkiste' : title + ' – Knobelkiste';
    backBtn.hidden = r.mode === 'home';
    mode.mount(view, r.sub);
    window.scrollTo(0, 0);
    KK.renderTotal();
  }

  KK.go = function (path) {
    depth++;
    location.hash = '#/' + path;
  };

  backBtn.addEventListener('click', function () {
    if (depth > 0) { depth--; history.back(); }
    else {
      var r = parse();
      location.replace('#/' + (r.sub ? r.mode : ''));
    }
  });

  window.addEventListener('hashchange', render);
  render();

  // Offline-Fähigkeit (nur über http/https, nicht in der APK)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* egal */ });
    });
  }
})();
