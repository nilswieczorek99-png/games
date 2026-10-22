/* Knobelkiste – Markenraten mit drei Hinweisen */
(function () {
  'use strict';
  var KK = window.KK, h = KK.h;
  var POINTS = [3, 2, 1];

  function freshDeck() { return KK.shuffle(Array.from({ length: KK.BRANDS.length }, function (_, i) { return i; })); }

  function loadState() {
    var s = KK.store.get('marken.state', null);
    if (!s || !s.deck || s.size !== KK.BRANDS.length) {
      s = { deck: freshDeck(), size: KK.BRANDS.length, solved: s ? s.solved || 0 : 0, current: null };
    }
    return s;
  }

  KK.modes.marken = {
    title: 'Markenraten',
    mount: function (root) {
      var st = loadState();
      var card = h('section', { class: 'rt-card mk-card' });
      root.appendChild(card);
      root.appendChild(h('p', { class: 'hint-small', text: 'Richtig nach dem 1. Hinweis: 3 Punkte, nach dem 2.: 2, nach dem 3.: 1.' }));

      function save() { KK.store.set('marken.state', st); }

      function show() {
        if (st.current === null || st.current === undefined) {
          if (!st.deck.length) st.deck = freshDeck();
          st.current = st.deck.shift();
          st.shown = 1;
          save();
        }
        var b = KK.BRANDS[st.current];
        var item = { a: b.a, alt: b.alt };
        card.innerHTML = '';
        card.appendChild(h('p', { class: 'rt-meta', text: st.solved + ' erraten, noch ' + st.deck.length + ' im Stapel' }));
        card.appendChild(h('h2', { class: 'mk-ask', text: 'Welche Marke ist gesucht?' }));
        var list = h('ol', { class: 'mk-hints' });
        card.appendChild(list);

        function renderHints() {
          list.innerHTML = '';
          b.h.forEach(function (txt, i) {
            var open = i < st.shown;
            list.appendChild(h('li', { class: open ? 'open' : 'locked' }, [
              h('span', { class: 'mk-pts', text: POINTS[i] + ' P' }),
              h('span', { class: 'mk-txt', text: open ? txt : 'Noch verdeckt' })
            ]));
          });
          moreBtn.hidden = st.shown >= b.h.length;
        }

        var input = h('input', {
          class: 'rt-input', type: 'text', placeholder: 'Markenname', autocomplete: 'off',
          autocapitalize: 'words', spellcheck: 'false', enterkeyhint: 'done', 'aria-label': 'Markenname'
        });
        var feedback = h('p', { class: 'rt-feedback', 'aria-live': 'polite' });
        var form = h('form', { class: 'rt-form', onsubmit: function (e) { e.preventDefault(); guess(); } }, [
          input, h('button', { class: 'btn primary', type: 'submit', text: 'Prüfen' })
        ]);
        var moreBtn = h('button', { class: 'tool', text: 'Nächster Hinweis', onclick: function () {
          st.shown = Math.min(b.h.length, st.shown + 1); save(); renderHints();
        } });
        var tools = h('div', { class: 'rt-tools mk-tools' }, [
          moreBtn,
          h('button', { class: 'tool', text: 'Auflösen', onclick: function () { finish(false); } })
        ]);
        card.appendChild(form);
        card.appendChild(feedback);
        card.appendChild(tools);
        renderHints();

        function guess() {
          var g = input.value;
          if (!g.trim()) { input.focus(); return; }
          if (KK.riddleMatches(g, item)) { finish(true); return; }
          feedback.className = 'rt-feedback bad';
          if (st.shown < b.h.length) {
            st.shown++; save(); renderHints();
            feedback.textContent = '„' + g.trim() + '“ ist es nicht. Hier ist der nächste Hinweis.';
          } else {
            feedback.textContent = '„' + g.trim() + '“ ist es nicht. Noch ein Versuch?';
          }
          input.select();
          KK.vibrate(80);
        }

        function finish(ok) {
          var pts = ok ? POINTS[st.shown - 1] : 0;
          if (ok) { st.solved++; KK.points.add('marken', pts); }
          st.current = null; save();
          st.shown = b.h.length; renderHints();
          form.remove(); tools.remove();
          feedback.className = 'rt-feedback ' + (ok ? 'ok' : 'neutral');
          feedback.textContent = ok ? 'Richtig! +' + pts + ' Punkt' + (pts > 1 ? 'e' : '') : 'Gesucht war:';
          card.appendChild(h('p', { class: 'rt-answer', text: b.a }));
          var nextBtn = h('button', { class: 'btn primary wide', text: 'Nächste Marke', onclick: show });
          card.appendChild(nextBtn);
          nextBtn.focus({ preventScroll: true });
        }
      }
      show();
    },
    unmount: function () {}
  };
})();
