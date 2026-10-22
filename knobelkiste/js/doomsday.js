/* Knobelkiste – Wochentag-Trainer nach der Doomsday-Methode */
(function () {
  'use strict';
  var KK = window.KK, h = KK.h;

  var DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var ORDER = [1, 2, 3, 4, 5, 6, 0]; // Anzeige Montag … Sonntag
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var RANGES = {
    all: { from: 1900, to: 2100, label: '1900–2100' },
    c20: { from: 1900, to: 1999, label: '1900–1999' },
    c21: { from: 2000, to: 2099, label: '2000–2099' }
  };

  // ---- Rechnen ----
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m: 1–12
  function weekday(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
  function mod7(n) { return ((n % 7) + 7) % 7; }

  function centuryAnchor(y) {
    // Anker des Jahrhunderts: 1800 Fr, 1900 Mi, 2000 Di, 2100 So
    var c = Math.floor(y / 100);
    return mod7(5 * (c % 4) + 2);
  }

  function monthRef(y, m) {
    var leap = isLeap(y);
    return [leap ? 4 : 3, leap ? 29 : 28, 14, 4, 9, 6, 11, 8, 5, 10, 7, 12][m - 1];
  }

  function solve(y, m, d) {
    var anchor = centuryAnchor(y);
    var yy = y % 100;
    var a = Math.floor(yy / 12), b = yy % 12, c = Math.floor(b / 4);
    var doom = mod7(anchor + a + b + c);
    var ref = monthRef(y, m);
    var diff = d - ref;
    var result = mod7(doom + diff);
    return { anchor: anchor, yy: yy, a: a, b: b, c: c, doom: doom, ref: ref, diff: diff, result: result, leap: isLeap(y) };
  }
  KK.doomsday = { solve: solve, weekday: weekday, centuryAnchor: centuryAnchor };

  function dateText(y, m, d) { return d + '. ' + MONTHS[m - 1] + ' ' + y; }

  // ---- Statistik ----
  function loadStats() {
    return KK.store.get('doomsday.stats', { rounds: 0, correct: 0, streak: 0, best: 0, fastest: null, timeSum: 0 });
  }

  function randomDate(range) {
    var r = RANGES[range] || RANGES.all;
    var y = KK.randInt(r.from, r.to);
    var m = KK.randInt(1, 12);
    var d = KK.randInt(1, daysIn(y, m));
    return { y: y, m: m, d: d };
  }

  // ---- Lösungsweg ----
  function explanation(q, s) {
    var steps = [];
    var anchorYear = Math.floor(q.y / 100) * 100;
    steps.push(['Jahrhundert-Anker', anchorYear + ' → ' + DAYS[s.anchor] + ' (' + s.anchor + ')']);
    steps.push(['Jahr ' + (s.yy < 10 ? '0' : '') + s.yy,
      s.yy + ' ÷ 12 = ' + s.a + ' Rest ' + s.b + ', ' + s.b + ' ÷ 4 = ' + s.c +
      ' → ' + s.a + ' + ' + s.b + ' + ' + s.c + ' = ' + (s.a + s.b + s.c)]);
    steps.push(['Doomsday ' + q.y, s.anchor + ' + ' + (s.a + s.b + s.c) + ' = ' + (s.anchor + s.a + s.b + s.c) +
      (s.anchor + s.a + s.b + s.c >= 7 ? ' → mod 7 = ' + s.doom : '') + ' → ' + DAYS[s.doom]]);
    if (q.d !== undefined) {
      var refTxt = s.ref + '. ' + MONTHS[q.m - 1];
      var leapNote = (q.m <= 2) ? (s.leap ? ' (Schaltjahr)' : ' (kein Schaltjahr)') : '';
      steps.push(['Merkdatum', refTxt + leapNote + ' ist ein ' + DAYS[s.doom]]);
      var diffTxt = s.diff === 0 ? 'Gleicher Tag, kein Abstand'
        : (s.diff > 0 ? '+' : '') + s.diff + ' Tage' + (Math.abs(s.diff) >= 7 ? ' → mod 7 = ' + (s.diff > 0 ? '+' : '') + (s.diff > 0 ? s.diff % 7 : -((-s.diff) % 7)) : '');
      steps.push(['Abstand zum ' + q.d + '.', diffTxt]);
    }
    steps.push(['Ergebnis', DAYS[s.result]]);
    var list = h('ol', { class: 'steps' });
    steps.forEach(function (st, i) {
      list.appendChild(h('li', { class: i === steps.length - 1 ? 'final' : '' }, [
        h('span', { class: 'step-k', text: st[0] }),
        h('span', { class: 'step-v', text: st[1] })
      ]));
    });
    return list;
  }

  // ---- Übungsansicht ----
  var state = null;

  function mountTrainer(root) {
    var settings = KK.store.get('doomsday.settings', { range: 'all', kind: 'date' });
    state = { settings: settings, q: null, answered: false, start: 0, timer: null };

    var statsBar = h('div', { class: 'dd-stats' });
    var kindSel = h('div', { class: 'seg', role: 'group', 'aria-label': 'Übungsart' });
    [['date', 'Ganzes Datum'], ['year', 'Nur Jahr']].forEach(function (k) {
      kindSel.appendChild(h('button', {
        class: 'seg-btn' + (settings.kind === k[0] ? ' on' : ''), text: k[1],
        'aria-pressed': settings.kind === k[0] ? 'true' : 'false',
        onclick: function () { settings.kind = k[0]; KK.store.set('doomsday.settings', settings); rerender(); }
      }));
    });
    var rangeSel = h('div', { class: 'seg', role: 'group', 'aria-label': 'Zeitraum' });
    ['all', 'c20', 'c21'].forEach(function (k) {
      rangeSel.appendChild(h('button', {
        class: 'seg-btn' + (settings.range === k ? ' on' : ''), text: RANGES[k].label,
        'aria-pressed': settings.range === k ? 'true' : 'false',
        onclick: function () { settings.range = k; KK.store.set('doomsday.settings', settings); rerender(); }
      }));
    });

    var card = h('section', { class: 'dd-card' });
    var answers = h('div', { class: 'dd-answers' });
    var after = h('div', { class: 'dd-after' });

    root.appendChild(h('div', { class: 'dd-controls' }, [kindSel, rangeSel]));
    root.appendChild(statsBar);
    root.appendChild(card);
    root.appendChild(answers);
    root.appendChild(after);
    root.appendChild(h('button', { class: 'btn ghost wide', text: 'So funktioniert die Methode', onclick: function () { KK.go('doomsday/lernen'); } }));

    function rerender() { root.innerHTML = ''; clearInterval(state.timer); mountTrainer(root); }

    function renderStats() {
      var s = loadStats();
      var rate = s.rounds ? Math.round(100 * s.correct / s.rounds) : 0;
      var avg = s.correct ? (s.timeSum / s.correct).toFixed(1).replace('.', ',') + ' s' : '–';
      statsBar.innerHTML = '';
      [['Serie', s.streak], ['Beste Serie', s.best], ['Trefferquote', rate + ' %'], ['Ø Zeit', avg]].forEach(function (p) {
        statsBar.appendChild(h('div', { class: 'stat' }, [h('b', { text: String(p[1]) }), h('span', { text: p[0] })]));
      });
    }

    function next() {
      state.q = randomDate(settings.range);
      state.answered = false;
      var q = state.q;
      card.innerHTML = '';
      if (settings.kind === 'year') {
        card.appendChild(h('p', { class: 'dd-ask', text: 'Auf welchen Wochentag fällt der Doomsday im Jahr' }));
        card.appendChild(h('p', { class: 'dd-date dd-year', text: String(q.y) }));
      } else {
        card.appendChild(h('p', { class: 'dd-ask', text: 'Welcher Wochentag war oder ist der' }));
        card.appendChild(h('p', { class: 'dd-date' }, [
          h('span', { class: 'dd-day', text: q.d + '.' }), ' ',
          h('span', { class: 'dd-month', text: MONTHS[q.m - 1] }), ' ',
          h('span', { class: 'dd-yr', text: String(q.y) })
        ]));
      }
      var clock = h('p', { class: 'dd-clock', text: '0,0 s' });
      card.appendChild(clock);
      state.start = Date.now();
      clearInterval(state.timer);
      state.timer = setInterval(function () {
        var t = (Date.now() - state.start) / 1000;
        clock.textContent = t.toFixed(1).replace('.', ',') + ' s';
      }, 100);

      answers.innerHTML = '';
      ORDER.forEach(function (wd) {
        answers.appendChild(h('button', {
          class: 'dd-ans', 'data-wd': wd,
          onclick: function () { answer(wd); }
        }, [h('span', { class: 'dd-ans-short', text: SHORT[wd] }), h('span', { class: 'dd-ans-long', text: DAYS[wd] })]));
      });
      after.innerHTML = '';
      renderStats();
    }

    function answer(wd) {
      if (state.answered) return;
      state.answered = true;
      clearInterval(state.timer);
      var secs = (Date.now() - state.start) / 1000;
      var q = state.q;
      var s = solve(q.y, settings.kind === 'year' ? 4 : q.m, settings.kind === 'year' ? 4 : q.d);
      var correct = settings.kind === 'year' ? s.doom : s.result;
      // Sicherheitscheck gegen den echten Kalender
      if (settings.kind !== 'year' && correct !== weekday(q.y, q.m, q.d)) correct = weekday(q.y, q.m, q.d);
      var ok = wd === correct;

      var st = loadStats();
      st.rounds++;
      if (ok) {
        st.correct++; st.streak++; st.best = Math.max(st.best, st.streak); st.timeSum += secs;
        if (st.fastest === null || secs < st.fastest) st.fastest = secs;
        KK.points.add('doomsday', 1);
      } else {
        st.streak = 0;
        KK.vibrate(120);
      }
      KK.store.set('doomsday.stats', st);

      Array.prototype.forEach.call(answers.children, function (b) {
        var bwd = +b.getAttribute('data-wd');
        b.disabled = true;
        if (bwd === correct) b.classList.add('right');
        else if (bwd === wd) b.classList.add('wrong');
      });

      after.innerHTML = '';
      var verdict = ok
        ? h('p', { class: 'verdict ok' }, ['Richtig! ' + secs.toFixed(1).replace('.', ',') + ' s', st.streak > 1 ? ' – ' + st.streak + ' in Folge' : ''])
        : h('p', { class: 'verdict bad', text: 'Leider nicht. Es ist ein ' + DAYS[correct] + '.' });
      var q2 = settings.kind === 'year' ? { y: q.y } : q;
      var details = h('details', { class: 'explain', open: !ok }, [
        h('summary', { text: 'Lösungsweg' }),
        explanation(q2, settings.kind === 'year' ? { anchor: s.anchor, yy: s.yy, a: s.a, b: s.b, c: s.c, doom: s.doom, result: s.doom } : s)
      ]);
      var nextBtn = h('button', { class: 'btn primary wide', text: 'Nächstes Datum', onclick: next });
      after.appendChild(verdict);
      after.appendChild(nextBtn);
      after.appendChild(details);
      renderStats();
      nextBtn.focus({ preventScroll: true });
    }

    next();
  }

  // ---- Erklärseite ----
  function mountLearn(root) {
    var ex = solve(1987, 10, 12);
    var art = h('article', { class: 'learn' });
    art.innerHTML =
      '<p class="lead">Jedes Jahr gibt es Tage, die immer auf denselben Wochentag fallen – den <b>Doomsday</b> des Jahres. ' +
      'Kennst du ihn, rechnest du jedes Datum in Sekunden aus.</p>' +
      '<h3>1. Wochentage als Zahlen</h3>' +
      '<p>So&nbsp;=&nbsp;0, Mo&nbsp;=&nbsp;1, Di&nbsp;=&nbsp;2, Mi&nbsp;=&nbsp;3, Do&nbsp;=&nbsp;4, Fr&nbsp;=&nbsp;5, Sa&nbsp;=&nbsp;6. Gerechnet wird immer „modulo 7“, also nur der Rest nach Teilen durch 7.</p>' +
      '<h3>2. Anker des Jahrhunderts</h3>' +
      '<table class="tbl"><tr><th>1900–1999</th><td>Mittwoch (3)</td></tr><tr><th>2000–2099</th><td>Dienstag (2)</td></tr><tr><th>2100</th><td>Sonntag (0)</td></tr></table>' +
      '<h3>3. Doomsday des Jahres</h3>' +
      '<p>Nimm die letzten zwei Ziffern des Jahres:</p>' +
      '<ol class="plain"><li>Wie oft passt 12 hinein? (<i>a</i>)</li><li>Was bleibt übrig? (<i>b</i>)</li><li>Wie oft passt 4 in den Rest? (<i>c</i>)</li></ol>' +
      '<p>Anker + <i>a</i> + <i>b</i> + <i>c</i>, modulo 7 – das ist der Doomsday des Jahres.</p>' +
      '<h3>4. Merkdaten – alle fallen auf den Doomsday</h3>' +
      '<table class="tbl months">' +
      '<tr><th>Januar</th><td>3. (im Schaltjahr 4.)</td></tr>' +
      '<tr><th>Februar</th><td>28. (im Schaltjahr 29.)</td></tr>' +
      '<tr><th>März</th><td>14. (Pi-Tag)</td></tr>' +
      '<tr><th>April, Juni, August, Oktober, Dezember</th><td>4.4., 6.6., 8.8., 10.10., 12.12.</td></tr>' +
      '<tr><th>Mai, September</th><td>9.5. und 5.9.</td></tr>' +
      '<tr><th>Juli, November</th><td>11.7. und 7.11.</td></tr>' +
      '</table>' +
      '<p class="tip">Eselsbrücke für die ungeraden Monate: „Ich arbeite von <b>9 bis 5</b> im <b>7-Eleven</b>“ – 9.5./5.9. und 7.11./11.7.</p>' +
      '<h3>5. Abstand zählen</h3>' +
      '<p>Vom Merkdatum des Monats zum gesuchten Tag zählen, Vielfache von 7 weglassen. Fertig.</p>' +
      '<h3>Beispiel: 12. Oktober 1987</h3>';
    var exList = explanation({ y: 1987, m: 10, d: 12 }, ex);
    art.appendChild(exList);
    var more = h('div', {});
    more.innerHTML =
      '<h3>Schaltjahre</h3><p>Durch 4 teilbar = Schaltjahr. Ausnahme: volle Jahrhunderte, außer sie sind durch 400 teilbar. ' +
      '1900 und 2100 sind also <b>keine</b> Schaltjahre, 2000 schon.</p>' +
      '<h3>Übungstipp</h3><p>Starte mit „Nur Jahr“, bis der Doomsday eines Jahres sitzt. Dann aufs ganze Datum wechseln. ' +
      'Mit etwas Übung schaffst du ein Datum in unter 5 Sekunden.</p>';
    art.appendChild(more);
    art.appendChild(h('button', { class: 'btn primary wide', text: 'Jetzt üben', onclick: function () { history.length > 1 ? history.back() : KK.go('doomsday'); } }));
    root.appendChild(art);
  }

  KK.modes.doomsday = {
    title: function (sub) { return sub === 'lernen' ? 'So geht’s' : 'Wochentag-Trainer'; },
    mount: function (root, sub) {
      if (sub === 'lernen') mountLearn(root); else mountTrainer(root);
    },
    unmount: function () { if (state) clearInterval(state.timer); }
  };
})();
