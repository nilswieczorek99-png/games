/* Knobelkiste – Rätsel: Was ist das? */
(function () {
  'use strict';
  var KK = window.KK, h = KK.h;

  function stripArticle(s) {
    return s.trim().replace(/^(der|die|das|ein|eine|einen|dein|deine)\s+/i, '');
  }

  function lev(a, b) {
    var m = a.length, n = b.length, d = [];
    for (var i = 0; i <= m; i++) d[i] = [i];
    for (var j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[m][n];
  }

  function matches(guess, r) {
    var g = KK.normalize(stripArticle(guess));
    if (!g) return false;
    var all = [r.a].concat(r.alt || []);
    for (var i = 0; i < all.length; i++) {
      var t = KK.normalize(stripArticle(all[i]));
      if (g === t) return true;
      if (t.length >= 5 && lev(g, t) <= 1) return true; // kleiner Tippfehler ist okay
    }
    return false;
  }
  KK.riddleMatches = matches;

  function loadState() {
    var s = KK.store.get('raetsel.state', null);
    var n = KK.RIDDLES.length;
    if (!s || !s.deck || s.deck.length === 0 || s.size !== n) {
      s = { deck: KK.shuffle(Array.from({ length: n }, function (_, i) { return i; })), size: n, solved: s ? s.solved || 0 : 0, current: null };
    }
    return s;
  }

  var st = null;

  KK.modes.raetsel = {
    title: 'Rätsel',
    mount: function (root) {
      st = loadState();
      var card = h('section', { class: 'rt-card' });
      root.appendChild(card);

      function save() { KK.store.set('raetsel.state', st); }

      function show() {
        if (st.current === null || st.current === undefined) {
          if (!st.deck.length) st.deck = KK.shuffle(Array.from({ length: KK.RIDDLES.length }, function (_, i) { return i; }));
          st.current = st.deck.shift();
          st.hint = false; st.over = false;
          save();
        }
        var r = KK.RIDDLES[st.current];
        card.innerHTML = '';
        var left = st.deck.length;
        card.appendChild(h('p', { class: 'rt-meta', text: st.solved + ' gelöst, noch ' + left + ' im Stapel' }));
        card.appendChild(h('blockquote', { class: 'rt-q', text: r.q }));

        var input = h('input', {
          class: 'rt-input', type: 'text', placeholder: 'Deine Antwort', autocomplete: 'off',
          autocapitalize: 'sentences', spellcheck: 'false', enterkeyhint: 'done', 'aria-label': 'Antwort'
        });
        var feedback = h('p', { class: 'rt-feedback', 'aria-live': 'polite' });
        var hintEl = h('p', { class: 'rt-hint' });
        if (st.hint) hintEl.textContent = hintText(r);

        var form = h('form', { class: 'rt-form', onsubmit: function (e) { e.preventDefault(); guess(); } }, [
          input, h('button', { class: 'btn primary', type: 'submit', text: 'Prüfen' })
        ]);
        var tools = h('div', { class: 'rt-tools' }, [
          h('button', { class: 'tool', text: 'Tipp', onclick: function () {
            if (st.over) return;
            st.hint = true; save(); hintEl.textContent = hintText(r);
          } }),
          h('button', { class: 'tool', text: 'Auflösen', onclick: function () { finish(false); } }),
          h('button', { class: 'tool', text: 'Überspringen', onclick: function () {
            st.deck.push(st.current); st.current = null; save(); show();
          } })
        ]);

        card.appendChild(hintEl);
        card.appendChild(form);
        card.appendChild(feedback);
        card.appendChild(tools);

        function guess() {
          if (st.over) return;
          var g = input.value;
          if (!g.trim()) { input.focus(); return; }
          if (matches(g, r)) finish(true);
          else {
            feedback.className = 'rt-feedback bad';
            feedback.textContent = '„' + g.trim() + '“ ist es nicht. Noch mal überlegen?';
            input.select();
            KK.vibrate(80);
          }
        }

        function finish(ok) {
          st.over = true;
          var pts = ok ? (st.hint ? 1 : 3) : 0;
          if (ok) { st.solved++; KK.points.add('raetsel', pts); }
          st.current = null; save();
          form.remove(); tools.remove(); hintEl.remove();
          feedback.className = 'rt-feedback ' + (ok ? 'ok' : 'neutral');
          feedback.innerHTML = '';
          feedback.appendChild(document.createTextNode(ok ? 'Richtig! +' + pts + ' Punkt' + (pts > 1 ? 'e' : '') : 'Die Lösung:'));
          card.appendChild(h('p', { class: 'rt-answer', text: r.a }));
          if (r.note) card.appendChild(h('p', { class: 'rt-note', text: r.note }));
          var nextBtn = h('button', { class: 'btn primary wide', text: 'Nächstes Rätsel', onclick: show });
          card.appendChild(nextBtn);
          nextBtn.focus({ preventScroll: true });
        }
      }

      function hintText(r) {
        var a = r.a;
        return 'Tipp: beginnt mit „' + a[0].toUpperCase() + '“ und hat ' + a.replace(/\s/g, '').length + ' Buchstaben. (Richtig gibt dann 1 statt 3 Punkte.)';
      }

      root.appendChild(h('p', { class: 'hint-small', text: '3 Punkte ohne Tipp, 1 Punkt mit Tipp. Kleine Tippfehler werden verziehen.' }));
      show();
    },
    unmount: function () {}
  };
})();
