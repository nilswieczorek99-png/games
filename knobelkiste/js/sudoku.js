/* Knobelkiste – Sudoku mit Generator (eindeutige Lösung) */
(function () {
  'use strict';
  var KK = window.KK, h = KK.h;

  var LEVELS = {
    leicht: { label: 'Leicht', clues: 38, points: 5 },
    mittel: { label: 'Mittel', clues: 31, points: 10 },
    schwer: { label: 'Schwer', clues: 25, points: 20 }
  };

  // ---- Generator ----
  var ROW = [], COL = [], BOX = [], PEERS = [];
  (function () {
    for (var i = 0; i < 81; i++) {
      ROW[i] = Math.floor(i / 9); COL[i] = i % 9;
      BOX[i] = Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3);
    }
    for (var a = 0; a < 81; a++) {
      PEERS[a] = [];
      for (var b = 0; b < 81; b++) {
        if (a !== b && (ROW[a] === ROW[b] || COL[a] === COL[b] || BOX[a] === BOX[b])) PEERS[a].push(b);
      }
    }
  })();

  function bitCount(n) { var c = 0; while (n) { n &= n - 1; c++; } return c; }

  // Zählt Lösungen (bricht bei "limit" ab). grid: Array(81) mit 0 = leer
  function countSolutions(grid, limit) {
    var g = grid.slice();
    var rows = [0, 0, 0, 0, 0, 0, 0, 0, 0], cols = rows.slice(), boxes = rows.slice();
    for (var i = 0; i < 81; i++) {
      if (g[i]) {
        var bit = 1 << g[i];
        if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & bit) return 0;
        rows[ROW[i]] |= bit; cols[COL[i]] |= bit; boxes[BOX[i]] |= bit;
      }
    }
    var count = 0;
    function rec() {
      var best = -1, bestMask = 0, bestCount = 10;
      for (var i = 0; i < 81; i++) {
        if (g[i]) continue;
        var used = rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]];
        var free = ~used & 0x3FE;
        var c = bitCount(free);
        if (c < bestCount) { best = i; bestMask = free; bestCount = c; if (c <= 1) break; }
      }
      if (best === -1) { count++; return count >= limit; }
      if (bestCount === 0) return false;
      for (var v = 1; v <= 9; v++) {
        var bit = 1 << v;
        if (!(bestMask & bit)) continue;
        g[best] = v; rows[ROW[best]] |= bit; cols[COL[best]] |= bit; boxes[BOX[best]] |= bit;
        if (rec()) return true;
        g[best] = 0; rows[ROW[best]] &= ~bit; cols[COL[best]] &= ~bit; boxes[BOX[best]] &= ~bit;
      }
      return false;
    }
    rec();
    return count;
  }

  function fullGrid() {
    var g = new Array(81).fill(0);
    function ok(i, v) {
      for (var k = 0; k < PEERS[i].length; k++) if (g[PEERS[i][k]] === v) return false;
      return true;
    }
    function fill(i) {
      if (i === 81) return true;
      var vals = KK.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (var k = 0; k < 9; k++) {
        if (ok(i, vals[k])) { g[i] = vals[k]; if (fill(i + 1)) return true; g[i] = 0; }
      }
      return false;
    }
    fill(0);
    return g;
  }

  function generate(level) {
    var target = LEVELS[level].clues;
    var best = null;
    for (var attempt = 0; attempt < 6; attempt++) {
      var solution = fullGrid();
      var puzzle = solution.slice();
      var clues = 81;
      // Paarweise symmetrisch entfernen, wie in Rätselheften
      var cells = KK.shuffle(Array.from({ length: 41 }, function (_, i) { return i; }));
      for (var k = 0; k < cells.length && clues > target; k++) {
        var a = cells[k], b = 80 - a;
        var va = puzzle[a], vb = puzzle[b];
        puzzle[a] = 0; puzzle[b] = 0;
        var removed = a === b ? 1 : 2;
        if (clues - removed < target - 1 || countSolutions(puzzle, 2) !== 1) {
          puzzle[a] = va; puzzle[b] = vb;
        } else {
          clues -= removed;
        }
      }
      if (!best || clues < best.clues) best = { puzzle: puzzle, solution: solution, clues: clues };
      if (clues <= target + 1) break;
    }
    return best;
  }
  KK.sudoku = { generate: generate, countSolutions: countSolutions };

  // ---- Spiel ----
  var game = null, sel = -1, noteMode = false, timer = null, root = null, undo = [];

  function save() { if (game) KK.store.set('sudoku.game', game); }

  function newGame(level) {
    var g = generate(level);
    game = {
      level: level, puzzle: g.puzzle, solution: g.solution,
      values: g.puzzle.slice(), notes: new Array(81).fill(0),
      elapsed: 0, hints: 0, done: false, checked: false
    };
    sel = -1; undo = [];
    save();
  }

  function conflicts(i) {
    var v = game.values[i];
    if (!v) return false;
    for (var k = 0; k < PEERS[i].length; k++) if (game.values[PEERS[i][k]] === v) return true;
    return false;
  }

  function setValue(i, v) {
    if (game.done || game.puzzle[i]) return;
    undo.push({ i: i, v: game.values[i], n: game.notes[i] });
    if (undo.length > 200) undo.shift();
    if (noteMode && v) {
      if (game.values[i]) return;
      game.notes[i] ^= (1 << v);
    } else {
      game.values[i] = game.values[i] === v ? 0 : v;
      game.notes[i] = 0;
      if (v && game.values[i]) {
        // Notizen in Nachbarzellen bereinigen
        PEERS[i].forEach(function (p) { game.notes[p] &= ~(1 << v); });
      }
    }
    game.checked = false;
    save();
    draw();
    checkWin();
  }

  function checkWin() {
    for (var i = 0; i < 81; i++) if (game.values[i] !== game.solution[i]) return;
    game.done = true;
    clearInterval(timer);
    var base = LEVELS[game.level].points;
    var pts = Math.max(1, base - game.hints * 2);
    game.earned = pts;
    KK.points.add('sudoku', pts);
    var st = KK.store.get('sudoku.stats', {});
    var key = game.level;
    if (!st[key] || game.elapsed < st[key]) st[key] = game.elapsed;
    KK.store.set('sudoku.stats', st);
    save();
    draw();
    KK.vibrate([60, 40, 60]);
  }

  function draw() {
    if (!root) return;
    var board = root.querySelector('.su-board');
    var selVal = sel >= 0 ? game.values[sel] : 0;
    var cells = board.children;
    for (var i = 0; i < 81; i++) {
      var c = cells[i];
      var v = game.values[i];
      var cls = 'su-cell';
      if (COL[i] % 3 === 2 && COL[i] !== 8) cls += ' br';
      if (ROW[i] % 3 === 2 && ROW[i] !== 8) cls += ' bb';
      if (game.puzzle[i]) cls += ' given';
      if (sel >= 0) {
        if (i === sel) cls += ' sel';
        else if (ROW[i] === ROW[sel] || COL[i] === COL[sel] || BOX[i] === BOX[sel]) cls += ' peer';
        if (selVal && v === selVal && i !== sel) cls += ' same';
      }
      if (v && !game.puzzle[i] && conflicts(i)) cls += ' bad';
      if (game.checked && v && !game.puzzle[i] && v !== game.solution[i]) cls += ' bad';
      c.className = cls;
      if (v) {
        c.textContent = v;
      } else if (game.notes[i]) {
        var n = '';
        for (var d = 1; d <= 9; d++) n += '<span>' + ((game.notes[i] >> d) & 1 ? d : '') + '</span>';
        c.innerHTML = '<div class="notes">' + n + '</div>';
      } else c.textContent = '';
    }
    // Zahlenblock: wie viele noch fehlen
    var counts = new Array(10).fill(0);
    game.values.forEach(function (v) { counts[v]++; });
    root.querySelectorAll('.su-num').forEach(function (b) {
      var d = +b.getAttribute('data-d');
      b.classList.toggle('used', counts[d] >= 9);
      b.querySelector('small').textContent = counts[d] >= 9 ? '✓' : 9 - counts[d];
    });
    root.querySelector('.su-note').classList.toggle('on', noteMode);
    root.querySelector('.su-note').setAttribute('aria-pressed', noteMode ? 'true' : 'false');
    var win = root.querySelector('.su-win');
    win.hidden = !game.done;
    if (game.done) {
      win.querySelector('p').textContent = 'Gelöst in ' + KK.formatTime(game.elapsed) + ' – +' + (game.earned || 0) + ' Punkte';
    }
    root.querySelector('.su-time').textContent = KK.formatTime(game.elapsed);
    root.querySelector('.su-level').textContent = LEVELS[game.level].label + (game.hints ? ' · ' + game.hints + ' Tipp' + (game.hints > 1 ? 's' : '') : '');
  }

  function build(r) {
    root = r;
    var levelSel = h('div', { class: 'seg', role: 'group', 'aria-label': 'Neues Spiel' });
    Object.keys(LEVELS).forEach(function (k) {
      levelSel.appendChild(h('button', {
        class: 'seg-btn', text: LEVELS[k].label,
        onclick: function () {
          if (!game.done && game.values.some(function (v, i) { return v && !game.puzzle[i]; }) &&
            !window.confirm('Neues Sudoku starten? Das aktuelle geht verloren.')) return;
          startNew(k);
        }
      }));
    });

    var head = h('div', { class: 'su-head' }, [
      h('span', { class: 'su-level' }), h('span', { class: 'su-time', 'aria-label': 'Zeit' })
    ]);

    var board = h('div', { class: 'su-board', role: 'grid', 'aria-label': 'Sudoku-Feld' });
    for (var i = 0; i < 81; i++) {
      (function (i) {
        var b = h('button', {
          class: 'su-cell', 'data-i': i,
          'aria-label': 'Zeile ' + (ROW[i] + 1) + ', Spalte ' + (COL[i] + 1),
          onclick: function () { sel = i; draw(); }
        });
        board.appendChild(b);
      })(i);
    }

    var pad = h('div', { class: 'su-pad' });
    for (var d = 1; d <= 9; d++) {
      (function (d) {
        pad.appendChild(h('button', {
          class: 'su-num', 'data-d': d, 'aria-label': 'Zahl ' + d,
          onclick: function () { if (sel >= 0) setValue(sel, d); else KK.toast('Erst ein Feld antippen'); }
        }, [String(d), h('small', {})]));
      })(d);
    }

    var tools = h('div', { class: 'su-tools' }, [
      h('button', { class: 'tool', text: 'Rückgängig', onclick: doUndo }),
      h('button', { class: 'tool', text: 'Löschen', onclick: function () { if (sel >= 0 && !game.puzzle[sel]) { undo.push({ i: sel, v: game.values[sel], n: game.notes[sel] }); game.values[sel] = 0; game.notes[sel] = 0; save(); draw(); } } }),
      h('button', { class: 'tool su-note', text: 'Notizen', 'aria-pressed': 'false', onclick: function () { noteMode = !noteMode; draw(); } }),
      h('button', { class: 'tool', text: 'Prüfen', onclick: doCheck }),
      h('button', { class: 'tool', text: 'Tipp', onclick: doHint })
    ]);

    var win = h('div', { class: 'su-win', hidden: true }, [
      h('h3', { text: 'Geschafft!' }), h('p', {}),
      h('button', { class: 'btn primary', text: 'Noch eins', onclick: function () { startNew(game.level); } })
    ]);

    r.appendChild(levelSel);
    r.appendChild(head);
    r.appendChild(board);
    r.appendChild(win);
    r.appendChild(pad);
    r.appendChild(tools);
  }

  function doUndo() {
    var u = undo.pop();
    if (!u || game.done) return;
    game.values[u.i] = u.v; game.notes[u.i] = u.n; sel = u.i;
    save(); draw();
  }

  function doCheck() {
    if (game.done) return;
    var wrong = 0, empty = 0;
    for (var i = 0; i < 81; i++) {
      if (!game.values[i]) empty++;
      else if (game.values[i] !== game.solution[i]) wrong++;
    }
    game.checked = true;
    draw();
    if (wrong) KK.toast(wrong + (wrong === 1 ? ' Zahl ist' : ' Zahlen sind') + ' falsch – rot markiert', 'bad');
    else KK.toast('Bisher alles richtig. Noch ' + empty + ' Felder frei.', 'ok');
  }

  function doHint() {
    if (game.done) return;
    var i = sel;
    if (i < 0 || game.puzzle[i] || game.values[i] === game.solution[i]) {
      var cands = [];
      for (var k = 0; k < 81; k++) if (game.values[k] !== game.solution[k]) cands.push(k);
      if (!cands.length) return;
      i = cands[Math.floor(Math.random() * cands.length)];
    }
    game.hints++;
    sel = i;
    var wasNote = noteMode; noteMode = false;
    game.values[i] = 0;
    setValue(i, game.solution[i]);
    noteMode = wasNote;
    draw();
    KK.toast('Tipp eingetragen (−2 Punkte beim Lösen)');
  }

  function startNew(level) {
    var board = root.querySelector('.su-board');
    board.classList.add('loading');
    setTimeout(function () {
      newGame(level);
      board.classList.remove('loading');
      startTimer();
      draw();
    }, 30);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(function () {
      if (!game || game.done || document.hidden) return;
      game.elapsed++;
      var t = root && root.querySelector('.su-time');
      if (t) t.textContent = KK.formatTime(game.elapsed);
      if (game.elapsed % 5 === 0) save();
    }, 1000);
  }

  function onKey(e) {
    if (!game || !root) return;
    if (e.key >= '1' && e.key <= '9') { if (sel >= 0) setValue(sel, +e.key); e.preventDefault(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { if (sel >= 0 && !game.puzzle[sel]) { game.values[sel] = 0; game.notes[sel] = 0; save(); draw(); } return; }
    if (e.key === 'n' || e.key === 'N') { noteMode = !noteMode; draw(); return; }
    var mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (mv) { sel = sel < 0 ? 0 : Math.min(80, Math.max(0, sel + mv)); draw(); e.preventDefault(); }
  }

  KK.modes.sudoku = {
    title: 'Sudoku',
    mount: function (r) {
      build(r);
      game = KK.store.get('sudoku.game', null);
      if (!game || !game.solution) {
        startNew('leicht');
      } else {
        undo = []; sel = -1;
        startTimer(); draw();
      }
      document.addEventListener('keydown', onKey);
    },
    unmount: function () {
      clearInterval(timer); save();
      document.removeEventListener('keydown', onKey);
      root = null;
    }
  };
})();
