/* Knobelkiste – Galgenmännchen gegen den Computer */
(function () {
  'use strict';
  var KK = window.KK, h = KK.h;
  var LIVES = 10;

  // Teile der Zeichnung, einer pro Fehlversuch
  var PARTS = [
    '<line x1="10" y1="150" x2="90" y2="150"/>',
    '<line x1="30" y1="150" x2="30" y2="12"/>',
    '<line x1="30" y1="12" x2="100" y2="12"/>',
    '<line x1="30" y1="38" x2="56" y2="12"/>',
    '<line x1="100" y1="12" x2="100" y2="34"/>',
    '<circle cx="100" cy="46" r="12"/>',
    '<line x1="100" y1="58" x2="100" y2="102"/>',
    '<line x1="100" y1="70" x2="82" y2="88"/><line x1="100" y1="70" x2="118" y2="88"/>',
    '<line x1="100" y1="102" x2="86" y2="128"/>',
    '<line x1="100" y1="102" x2="114" y2="128"/>'
  ];

  // Wörter aus dem Kreuzworträtsel, ohne umschriebene Umlaute (BRUECKE sieht hier komisch aus)
  function wordPool() {
    return KK.WORDS.filter(function (w) {
      return w[0].length >= 5 && !/AE|OE|[^EQ]UE/.test(w[0]);
    });
  }

  var st = null, root = null;

  function save() { KK.store.set('galgen.game', st); }

  function newGame() {
    var pool = wordPool();
    var recent = (st && st.recent) || [];
    var w;
    do { w = pool[Math.floor(Math.random() * pool.length)]; } while (recent.indexOf(w[0]) >= 0 && recent.length < pool.length);
    recent = recent.concat(w[0]).slice(-40);
    st = { word: w[0], clue: w[1], guessed: [], wrong: 0, hint: false, over: false, won: false, recent: recent,
      wins: st ? st.wins || 0 : 0, losses: st ? st.losses || 0 : 0 };
    save();
  }

  function guess(ch) {
    if (st.over || st.guessed.indexOf(ch) >= 0) return;
    st.guessed.push(ch);
    if (st.word.indexOf(ch) < 0) { st.wrong++; KK.vibrate(60); }
    var solved = st.word.split('').every(function (c) { return st.guessed.indexOf(c) >= 0; });
    if (solved) {
      st.over = true; st.won = true; st.wins++;
      var left = LIVES - st.wrong;
      st.earned = Math.max(1, 1 + Math.ceil(left / 3) - (st.hint ? 1 : 0));
      KK.points.add('galgen', st.earned);
      KK.vibrate([60, 40, 60]);
    } else if (st.wrong >= LIVES) {
      st.over = true; st.won = false; st.losses++;
    }
    save(); draw();
  }

  function draw() {
    if (!root) return;
    var svg = root.querySelector('.hg-svg');
    // nur neue Teile anhängen, damit nur der neue Strich eingeblendet wird
    if (svg.childElementCount > st.wrong) svg.innerHTML = '';
    var have = +(svg.getAttribute('data-n') || 0);
    if (svg.childElementCount === 0) have = 0;
    for (var i = have; i < st.wrong; i++) svg.insertAdjacentHTML('beforeend', '<g>' + PARTS[i] + '</g>');
    svg.setAttribute('data-n', st.wrong);
    root.querySelector('.hg-lives').textContent = st.over ? '' : (LIVES - st.wrong) + ' Fehlversuche übrig';
    root.querySelector('.hg-score').textContent = st.wins + ' gewonnen, ' + st.losses + ' verloren';

    var wordEl = root.querySelector('.hg-word');
    wordEl.innerHTML = '';
    st.word.split('').forEach(function (c) {
      var shown = st.guessed.indexOf(c) >= 0;
      var cls = 'hg-letter' + (shown ? ' shown' : '') + (st.over && !shown ? ' missed' : '');
      wordEl.appendChild(h('span', { class: cls, text: shown || st.over ? c : '' }));
    });
    wordEl.setAttribute('aria-label', st.over ? st.word : st.word.split('').map(function (c) { return st.guessed.indexOf(c) >= 0 ? c : 'Lücke'; }).join(' '));

    var hintEl = root.querySelector('.hg-hint');
    hintEl.textContent = st.hint || st.over ? 'Hinweis: ' + st.clue : '';
    root.querySelector('.hg-hintbtn').hidden = st.hint || st.over;

    root.querySelectorAll('.kb-key').forEach(function (k) {
      var ch = k.getAttribute('data-k');
      var used = st.guessed.indexOf(ch) >= 0;
      k.disabled = used || st.over;
      k.classList.toggle('hit', used && st.word.indexOf(ch) >= 0);
      k.classList.toggle('miss', used && st.word.indexOf(ch) < 0);
    });

    var res = root.querySelector('.hg-result');
    res.hidden = !st.over;
    if (st.over) {
      res.className = 'hg-result ' + (st.won ? 'won' : 'lost');
      res.querySelector('h3').textContent = st.won ? 'Gerettet!' : 'Hängt.';
      res.querySelector('p').textContent = st.won
        ? '+' + st.earned + ' Punkt' + (st.earned > 1 ? 'e' : '') + ', mit ' + st.wrong + ' Fehler' + (st.wrong === 1 ? '' : 'n')
        : 'Das Wort war ' + st.word + '.';
    }
  }

  function onKey(e) {
    if (!st || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) { guess(e.key.toUpperCase()); e.preventDefault(); }
    else if (e.key === 'Enter' && st.over) { newGame(); draw(); }
  }

  KK.modes.galgen = {
    title: 'Galgenmännchen',
    mount: function (r) {
      root = r;
      r.appendChild(h('p', { class: 'hg-score' }));
      r.appendChild(h('div', { class: 'hg-stage' }, [
        h('div', { class: 'hg-draw', html: '<svg class="hg-svg" viewBox="0 0 130 160" aria-hidden="true"></svg>' }),
        h('p', { class: 'hg-lives' })
      ]));
      r.appendChild(h('div', { class: 'hg-word', role: 'img' }));
      r.appendChild(h('p', { class: 'hg-hint' }));
      r.appendChild(h('div', { class: 'hg-result', hidden: true }, [
        h('h3', {}), h('p', {}),
        h('button', { class: 'btn primary', text: 'Neues Wort', onclick: function () { newGame(); draw(); } })
      ]));
      var kb = h('div', { class: 'kb hg-kb', 'aria-label': 'Buchstaben' });
      ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'].forEach(function (row) {
        var rowEl = h('div', { class: 'kb-row' });
        row.split('').forEach(function (ch) {
          rowEl.appendChild(h('button', { class: 'kb-key', 'data-k': ch, text: ch, onclick: function () { guess(ch); } }));
        });
        kb.appendChild(rowEl);
      });
      r.appendChild(kb);
      r.appendChild(h('div', { class: 'hg-tools' }, [
        h('button', { class: 'tool hg-hintbtn', text: 'Hinweis zeigen (−1 Punkt)', onclick: function () { st.hint = true; save(); draw(); } }),
        h('button', { class: 'tool', text: 'Neues Wort', onclick: function () {
          if (!st.over && st.guessed.length && !window.confirm('Dieses Wort aufgeben?')) return;
          if (!st.over && st.guessed.length) { st.losses++; }
          newGame(); draw();
        } })
      ]));
      st = KK.store.get('galgen.game', null);
      if (!st || !st.word) newGame();
      draw();
      document.addEventListener('keydown', onKey);
    },
    unmount: function () { document.removeEventListener('keydown', onKey); root = null; }
  };
})();
