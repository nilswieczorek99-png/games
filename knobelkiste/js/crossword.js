/* Knobelkiste – Kreuzworträtsel mit Gitter-Generator */
(function () {
  'use strict';
  var KK = window.KK, h = KK.h;
  var N = 13;          // maximale Gittergröße beim Bauen
  var MAX_WORDS = 14;

  // ---- Generator ----
  function tryBuild(words) {
    var grid = [], dirs = [];
    for (var r = 0; r < N; r++) { grid.push(new Array(N).fill(null)); dirs.push(new Array(N).fill('')); }
    var placed = [], used = {};

    function at(r, c) { return r >= 0 && c >= 0 && r < N && c < N ? grid[r][c] : null; }

    function check(word, r, c, dir) {
      var dr = dir === 'd' ? 1 : 0, dc = dir === 'a' ? 1 : 0;
      var er = r + dr * (word.length - 1), ec = c + dc * (word.length - 1);
      if (r < 0 || c < 0 || er >= N || ec >= N) return -1;
      if (at(r - dr, c - dc) || at(er + dr, ec + dc)) return -1;
      var cross = 0;
      for (var k = 0; k < word.length; k++) {
        var rr = r + dr * k, cc = c + dc * k, cur = grid[rr][cc];
        if (cur) {
          if (cur !== word[k] || dirs[rr][cc].indexOf(dir) >= 0) return -1;
          cross++;
        } else {
          // seitliche Nachbarn müssen frei sein, sonst entstehen Unsinnswörter
          if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1;
        }
      }
      if (cross === word.length) return -1;
      return cross;
    }

    function put(w, r, c, dir) {
      var dr = dir === 'd' ? 1 : 0, dc = dir === 'a' ? 1 : 0;
      for (var k = 0; k < w[0].length; k++) {
        grid[r + dr * k][c + dc * k] = w[0][k];
        dirs[r + dr * k][c + dc * k] += dir;
      }
      placed.push({ word: w[0], clue: w[1], r: r, c: c, dir: dir });
      used[w[0]] = true;
    }

    var first = null;
    for (var i = 0; i < words.length; i++) {
      if (words[i][0].length >= 6 && words[i][0].length <= 9) { first = words[i]; break; }
    }
    if (!first) return null;
    put(first, Math.floor(N / 2), Math.floor((N - first[0].length) / 2), 'a');

    var crossings = 0;
    for (var pass = 0; pass < 2 && placed.length < MAX_WORDS; pass++) {
      for (var wi = 0; wi < words.length && placed.length < MAX_WORDS; wi++) {
        var w = words[wi], word = w[0];
        if (used[word] || word.length > N) continue;
        var options = [];
        for (var r2 = 0; r2 < N; r2++) {
          for (var c2 = 0; c2 < N; c2++) {
            var g = grid[r2][c2];
            if (!g) continue;
            for (var k = 0; k < word.length; k++) {
              if (word[k] !== g) continue;
              ['a', 'd'].forEach(function (dir) {
                var sr = dir === 'd' ? r2 - k : r2, sc = dir === 'a' ? c2 - k : c2;
                var x = check(word, sr, sc, dir);
                if (x > 0) options.push({ r: sr, c: sc, dir: dir, x: x });
              });
            }
          }
        }
        if (!options.length) continue;
        var maxX = Math.max.apply(null, options.map(function (o) { return o.x; }));
        var bestOpts = options.filter(function (o) { return o.x === maxX; });
        var o = bestOpts[Math.floor(Math.random() * bestOpts.length)];
        put(w, o.r, o.c, o.dir);
        crossings += o.x;
      }
    }
    return { grid: grid, placed: placed, crossings: crossings };
  }

  function generate() {
    var best = null, bestScore = -1;
    for (var t = 0; t < 40; t++) {
      var words = KK.shuffle(KK.WORDS.slice());
      var res = tryBuild(words);
      if (!res) continue;
      // Ausdehnung bestimmen
      var minR = N, maxR = 0, minC = N, maxC = 0;
      res.placed.forEach(function (p) {
        var er = p.r + (p.dir === 'd' ? p.word.length - 1 : 0);
        var ec = p.c + (p.dir === 'a' ? p.word.length - 1 : 0);
        minR = Math.min(minR, p.r); maxR = Math.max(maxR, er);
        minC = Math.min(minC, p.c); maxC = Math.max(maxC, ec);
      });
      var area = (maxR - minR + 1) * (maxC - minC + 1);
      var score = res.placed.length * 10 + res.crossings * 3 - area / 12;
      if (score > bestScore) { bestScore = score; best = { res: res, minR: minR, maxR: maxR, minC: minC, maxC: maxC }; }
    }
    var rows = best.maxR - best.minR + 1, cols = best.maxC - best.minC + 1;
    var sol = [];
    for (var r = 0; r < rows; r++) {
      sol.push([]);
      for (var c = 0; c < cols; c++) sol[r].push(best.res.grid[r + best.minR][c + best.minC] || '');
    }
    var placed = best.res.placed.map(function (p) {
      return { word: p.word, clue: p.clue, r: p.r - best.minR, c: p.c - best.minC, dir: p.dir };
    });
    // Nummerieren
    placed.sort(function (a, b) { return a.r - b.r || a.c - b.c || (a.dir === 'a' ? -1 : 1); });
    var num = 0, lastKey = '';
    placed.forEach(function (p) {
      var key = p.r + ',' + p.c;
      if (key !== lastKey) { num++; lastKey = key; }
      p.num = num;
    });
    return { rows: rows, cols: cols, sol: sol, placed: placed };
  }
  KK.crossword = { generate: generate };

  // ---- Spiel ----
  var game = null, root = null, cur = { r: -1, c: -1, dir: 'a' }, timer = null;

  function save() { if (game) KK.store.set('kreuzwort.game', game); }

  function newGame() {
    var g = generate();
    var entries = g.sol.map(function (row) { return row.map(function () { return ''; }); });
    game = { rows: g.rows, cols: g.cols, sol: g.sol, placed: g.placed, entries: entries, revealed: 0, checked: false, done: false, elapsed: 0 };
    var p0 = game.placed[0];
    cur = { r: p0.r, c: p0.c, dir: p0.dir };
    save();
  }

  function isCell(r, c) { return r >= 0 && c >= 0 && r < game.rows && c < game.cols && !!game.sol[r][c]; }

  function wordAt(r, c, dir) {
    for (var i = 0; i < game.placed.length; i++) {
      var p = game.placed[i];
      if (p.dir !== dir) continue;
      if (dir === 'a' && p.r === r && c >= p.c && c < p.c + p.word.length) return p;
      if (dir === 'd' && p.c === c && r >= p.r && r < p.r + p.word.length) return p;
    }
    return null;
  }

  function cellsOf(p) {
    var out = [];
    for (var k = 0; k < p.word.length; k++) out.push(p.dir === 'a' ? [p.r, p.c + k] : [p.r + k, p.c]);
    return out;
  }

  function select(r, c) {
    if (!isCell(r, c)) return;
    if (cur.r === r && cur.c === c) {
      var other = cur.dir === 'a' ? 'd' : 'a';
      if (wordAt(r, c, other)) cur.dir = other;
    } else {
      cur.r = r; cur.c = c;
      if (!wordAt(r, c, cur.dir)) cur.dir = cur.dir === 'a' ? 'd' : 'a';
    }
    draw();
  }

  function selectWord(p) {
    var cells = cellsOf(p), target = cells[0];
    for (var i = 0; i < cells.length; i++) {
      if (!game.entries[cells[i][0]][cells[i][1]]) { target = cells[i]; break; }
    }
    cur = { r: target[0], c: target[1], dir: p.dir };
    draw();
  }

  function type(letter) {
    if (game.done || cur.r < 0) return;
    game.entries[cur.r][cur.c] = letter;
    game.checked = false;
    var p = wordAt(cur.r, cur.c, cur.dir);
    if (p) {
      var cells = cellsOf(p);
      var idx = cells.findIndex(function (x) { return x[0] === cur.r && x[1] === cur.c; });
      // einfach ein Feld weiter, auch über schon ausgefüllte Kreuzungen
      var moved = false;
      if (!moved && idx + 1 < cells.length) { cur.r = cells[idx + 1][0]; cur.c = cells[idx + 1][1]; }
    }
    save(); draw(); checkWin();
  }

  function backspace() {
    if (game.done || cur.r < 0) return;
    if (game.entries[cur.r][cur.c]) { game.entries[cur.r][cur.c] = ''; }
    else {
      var p = wordAt(cur.r, cur.c, cur.dir);
      if (p) {
        var cells = cellsOf(p);
        var idx = cells.findIndex(function (x) { return x[0] === cur.r && x[1] === cur.c; });
        if (idx > 0) { cur.r = cells[idx - 1][0]; cur.c = cells[idx - 1][1]; game.entries[cur.r][cur.c] = ''; }
      }
    }
    save(); draw();
  }

  function checkWin() {
    for (var r = 0; r < game.rows; r++) for (var c = 0; c < game.cols; c++) {
      if (game.sol[r][c] && game.entries[r][c] !== game.sol[r][c]) return;
    }
    game.done = true;
    clearInterval(timer);
    var pts = Math.max(2, game.placed.length - game.revealed);
    game.earned = pts;
    KK.points.add('kreuzwort', pts);
    save(); draw();
    KK.vibrate([60, 40, 60]);
  }

  function reveal(kind) {
    if (game.done) return;
    var cells = [];
    if (kind === 'letter') cells = [[cur.r, cur.c]];
    else { var p = wordAt(cur.r, cur.c, cur.dir); if (p) cells = cellsOf(p); }
    cells.forEach(function (x) {
      if (game.entries[x[0]][x[1]] !== game.sol[x[0]][x[1]]) {
        game.entries[x[0]][x[1]] = game.sol[x[0]][x[1]];
        game.revealed++;
      }
    });
    save(); draw(); checkWin();
  }

  function check() {
    var wrong = 0, empty = 0;
    for (var r = 0; r < game.rows; r++) for (var c = 0; c < game.cols; c++) {
      if (!game.sol[r][c]) continue;
      if (!game.entries[r][c]) empty++;
      else if (game.entries[r][c] !== game.sol[r][c]) wrong++;
    }
    game.checked = true; draw();
    if (wrong) KK.toast(wrong + ' Buchstabe' + (wrong > 1 ? 'n' : '') + ' falsch – rot markiert', 'bad');
    else KK.toast(empty ? 'Bisher alles richtig. Noch ' + empty + ' frei.' : 'Alles richtig!', 'ok');
  }

  function draw() {
    if (!root || !game) return;
    var gridEl = root.querySelector('.cw-grid');
    var p = cur.r >= 0 ? wordAt(cur.r, cur.c, cur.dir) : null;
    var inWord = {};
    if (p) cellsOf(p).forEach(function (x) { inWord[x[0] + ',' + x[1]] = true; });
    var starts = {};
    game.placed.forEach(function (q) { starts[q.r + ',' + q.c] = q.num; });

    gridEl.style.gridTemplateColumns = 'repeat(' + game.cols + ', var(--cw))';
    var cellPx = Math.floor(Math.min(40, (Math.min(window.innerWidth, 560) - 32) / game.cols));
    gridEl.style.setProperty('--cw', cellPx + 'px');
    if (gridEl.children.length !== game.rows * game.cols) {
      gridEl.innerHTML = '';
      for (var r = 0; r < game.rows; r++) for (var c = 0; c < game.cols; c++) {
        (function (r, c) {
          var cell = h('div', { class: 'cw-cell', 'data-r': r, 'data-c': c });
          if (game.sol[r][c]) cell.addEventListener('click', function () { select(r, c); });
          gridEl.appendChild(cell);
        })(r, c);
      }
    }
    for (var i = 0; i < gridEl.children.length; i++) {
      var el = gridEl.children[i];
      var rr = +el.getAttribute('data-r'), cc = +el.getAttribute('data-c');
      if (!game.sol[rr][cc]) { el.className = 'cw-cell void'; continue; }
      var key = rr + ',' + cc, cls = 'cw-cell';
      if (inWord[key]) cls += ' word';
      if (rr === cur.r && cc === cur.c) cls += ' sel';
      var e = game.entries[rr][cc];
      if (game.checked && e && e !== game.sol[rr][cc]) cls += ' bad';
      if (game.done) cls += ' solved';
      el.className = cls;
      el.innerHTML = (starts[key] ? '<i>' + starts[key] + '</i>' : '') + '<b>' + (e || '') + '</b>';
    }

    var bar = root.querySelector('.cw-current');
    bar.textContent = p ? p.num + (p.dir === 'a' ? ' waagerecht: ' : ' senkrecht: ') + p.clue + ' (' + p.word.length + ')' : 'Tippe ein Feld an';

    ['a', 'd'].forEach(function (dir) {
      var list = root.querySelector('.cw-list-' + dir);
      list.innerHTML = '';
      game.placed.filter(function (q) { return q.dir === dir; }).sort(function (a, b) { return a.num - b.num; }).forEach(function (q) {
        var full = cellsOf(q).every(function (x) { return game.entries[x[0]][x[1]]; });
        list.appendChild(h('li', {
          class: (q === p ? 'on' : '') + (full ? ' full' : ''),
          onclick: function () { selectWord(q); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        }, [h('b', { text: q.num + ' ' }), q.clue + ' (' + q.word.length + ')']));
      });
    });

    var win = root.querySelector('.cw-win');
    win.hidden = !game.done;
    if (game.done) win.querySelector('p').textContent = 'Gelöst in ' + KK.formatTime(game.elapsed) + ' – +' + (game.earned || 0) + ' Punkte';
  }

  function build(r) {
    root = r;
    r.appendChild(h('div', { class: 'cw-top' }, [
      h('button', { class: 'tool', text: 'Neues Rätsel', onclick: function () {
        if (!game.done && game.entries.some(function (row) { return row.some(Boolean); }) && !window.confirm('Neues Kreuzworträtsel? Das aktuelle geht verloren.')) return;
        newGame(); startTimer(); root.querySelector('.cw-grid').innerHTML = ''; draw();
      } }),
      h('button', { class: 'tool', text: 'Prüfen', onclick: check }),
      h('button', { class: 'tool', text: 'Buchstabe', title: 'Buchstabe aufdecken', onclick: function () { reveal('letter'); } }),
      h('button', { class: 'tool', text: 'Wort', title: 'Wort aufdecken', onclick: function () { reveal('word'); } })
    ]));
    r.appendChild(h('div', { class: 'cw-wrap' }, h('div', { class: 'cw-grid' })));
    r.appendChild(h('div', { class: 'cw-win', hidden: true }, [
      h('h3', { text: 'Gelöst!' }), h('p', {}),
      h('button', { class: 'btn primary', text: 'Nächstes Rätsel', onclick: function () { newGame(); startTimer(); root.querySelector('.cw-grid').innerHTML = ''; draw(); } })
    ]));
    var kb = h('div', { class: 'kb', 'aria-label': 'Tastatur' });
    kb.appendChild(h('p', { class: 'cw-current' }));
    ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'].forEach(function (row, i) {
      var rowEl = h('div', { class: 'kb-row' });
      row.split('').forEach(function (ch) {
        rowEl.appendChild(h('button', { class: 'kb-key', text: ch, onclick: function () { type(ch); } }));
      });
      if (i === 2) rowEl.appendChild(h('button', { class: 'kb-key kb-wide', 'aria-label': 'Löschen', text: '⌫', onclick: backspace }));
      kb.appendChild(rowEl);
    });
    r.appendChild(kb);
    r.appendChild(h('p', { class: 'hint-small', text: 'Umlaute schreibst du wie im Rätselheft: Ä = AE, Ö = OE, Ü = UE. Feld zweimal antippen wechselt die Richtung.' }));
    r.appendChild(h('div', { class: 'cw-clues' }, [
      h('div', {}, [h('h3', { text: 'Waagerecht' }), h('ol', { class: 'cw-list cw-list-a' })]),
      h('div', {}, [h('h3', { text: 'Senkrecht' }), h('ol', { class: 'cw-list cw-list-d' })])
    ]));
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(function () {
      if (!game || game.done || document.hidden) return;
      game.elapsed++;
      if (game.elapsed % 5 === 0) save();
    }, 1000);
  }

  function onKey(e) {
    if (!game || !root || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (/^[a-zA-Z]$/.test(k)) { type(k.toUpperCase()); e.preventDefault(); return; }
    if (k === 'ä' || k === 'Ä') { type('A'); type('E'); return; }
    if (k === 'ö' || k === 'Ö') { type('O'); type('E'); return; }
    if (k === 'ü' || k === 'Ü') { type('U'); type('E'); return; }
    if (k === 'Backspace') { backspace(); e.preventDefault(); return; }
    var mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (mv) {
      var r = cur.r + mv[0], c = cur.c + mv[1];
      while (r >= 0 && c >= 0 && r < game.rows && c < game.cols && !isCell(r, c)) { r += mv[0]; c += mv[1]; }
      if (isCell(r, c)) { cur.r = r; cur.c = c; cur.dir = mv[0] ? 'd' : 'a'; if (!wordAt(r, c, cur.dir)) cur.dir = mv[0] ? 'a' : 'd'; draw(); }
      e.preventDefault();
    }
  }

  function onResize() { draw(); }

  KK.modes.kreuzwort = {
    title: 'Kreuzworträtsel',
    mount: function (r) {
      build(r);
      game = KK.store.get('kreuzwort.game', null);
      if (!game || !game.placed) newGame();
      else { var p0 = game.placed[0]; cur = { r: p0.r, c: p0.c, dir: p0.dir }; }
      startTimer(); draw();
      document.addEventListener('keydown', onKey);
      window.addEventListener('resize', onResize);
    },
    unmount: function () {
      clearInterval(timer); save();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      root = null;
    }
  };
})();
