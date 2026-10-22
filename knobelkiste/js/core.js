/* Knobelkiste – Grundfunktionen: Speicher, Punkte, Hilfsfunktionen */
(function () {
  'use strict';
  var KK = (window.KK = window.KK || {});
  KK.modes = {};

  // ---- Speicher (localStorage, abgesichert) ----
  var PREFIX = 'knobelkiste.';
  KK.store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* egal */ }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(PREFIX + key); } catch (e) { /* egal */ }
    }
  };

  // ---- Punkte pro Modus ----
  KK.points = {
    all: function () { return KK.store.get('points', { doomsday: 0, sudoku: 0, kreuzwort: 0, raetsel: 0 }); },
    add: function (mode, n) {
      var p = KK.points.all();
      p[mode] = (p[mode] || 0) + n;
      KK.store.set('points', p);
      KK.renderTotal();
      return p[mode];
    },
    get: function (mode) { return KK.points.all()[mode] || 0; },
    total: function () {
      var p = KK.points.all(), s = 0;
      for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) s += p[k];
      return s;
    }
  };

  KK.renderTotal = function () {
    var el = document.getElementById('totalScore');
    if (el) el.textContent = KK.points.total() + ' P';
  };

  // ---- DOM-Helfer ----
  KK.h = function (tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    if (children !== undefined) {
      if (!Array.isArray(children)) children = [children];
      children.forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    }
    return el;
  };

  var toastTimer = null;
  KK.toast = function (msg, kind) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2200);
  };

  KK.vibrate = function (ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* egal */ }
  };

  // ---- Zufall ----
  KK.randInt = function (min, max) { return min + Math.floor(Math.random() * (max - min + 1)); };
  KK.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  KK.formatTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };

  // Text vergleichbar machen (für Rätsel-Antworten)
  KK.normalize = function (s) {
    return String(s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  };
})();
