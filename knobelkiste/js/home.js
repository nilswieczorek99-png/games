/* Knobelkiste – Startseite */
(function () {
  'use strict';
  var KK = window.KK, h = KK.h;

  var TILES = [
    { id: 'doomsday', name: 'Wochentag-Trainer', desc: 'Datum sehen, Wochentag im Kopf ausrechnen.', glyph: 'Di' },
    { id: 'sudoku', name: 'Sudoku', desc: 'Leicht, mittel oder schwer – immer neu.', glyph: '9' },
    { id: 'kreuzwort', name: 'Kreuzworträtsel', desc: 'Jedes Gitter frisch zusammengewürfelt.', glyph: 'A' },
    { id: 'galgen', name: 'Galgenmännchen', desc: 'Buchstaben raten, bevor er hängt.', glyph: 'A_' },
    { id: 'raetsel', name: 'Rätsel', desc: 'Was ist das? Um die Ecke denken.', glyph: '?' },
    { id: 'marken', name: 'Markenraten', desc: 'Drei Hinweise – je früher, desto mehr Punkte.', glyph: '®' }
  ];

  KK.modes.home = {
    title: 'Knobelkiste',
    mount: function (root) {
      var hour = new Date().getHours();
      var greet = hour < 11 ? 'Guten Morgen.' : hour < 18 ? 'Schön, dass du da bist.' : 'Noch eine Runde vorm Schlafen?';
      root.appendChild(h('section', { class: 'hero' }, [
        h('p', { class: 'hero-greet', text: greet }),
        h('h2', { class: 'hero-title' }, ['Worauf hast du ', h('mark', { text: 'Lust' }), '?'])
      ]));

      var list = h('nav', { class: 'tiles', 'aria-label': 'Spiele' });
      TILES.forEach(function (t) {
        var pts = KK.points.get(t.id);
        list.appendChild(h('button', {
          class: 'tile tile-' + t.id,
          onclick: function () { KK.go(t.id); }
        }, [
          h('span', { class: 'tile-glyph', 'aria-hidden': 'true', text: t.glyph }),
          h('span', { class: 'tile-body' }, [
            h('span', { class: 'tile-name', text: t.name }),
            h('span', { class: 'tile-desc', text: t.desc })
          ]),
          h('span', { class: 'tile-pts', text: pts + ' P' })
        ]));
      });
      root.appendChild(list);

      root.appendChild(h('p', { class: 'foot' }, [
        'Punkte bleiben auf diesem Gerät gespeichert. ',
        h('button', {
          class: 'linkish',
          text: 'Alles zurücksetzen',
          onclick: function () {
            if (window.confirm('Alle Punkte und Spielstände löschen?')) {
              ['points', 'doomsday.stats', 'sudoku.game', 'sudoku.stats', 'kreuzwort.game', 'raetsel.state', 'galgen.game', 'marken.state'].forEach(KK.store.remove);
              KK.toast('Alles zurückgesetzt');
              KK.modes.home.mount((root.innerHTML = '', root));
              KK.renderTotal();
            }
          }
        })
      ]));
    }
  };
})();
