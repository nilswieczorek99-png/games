'use strict';
// ===== Tiefenheim – Simulation =====
const SAVE_KEY = 'tiefenheim_save_v1';
let S = null;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const chanceYear = (p, dt) => Math.random() < 1 - Math.pow(1 - p, dt / YEAR);

function allBuildings(s = S) {
  const r = [];
  s.caves.forEach((c, ci) => c.slots.forEach((sl, si) => { if (sl.b) r.push(sl.b); }));
  return r;
}
function findB(id, s = S) {
  for (const c of s.caves) for (const sl of c.slots) if (sl.b && sl.b.id === id) return sl.b;
  return null;
}
function slotOf(id, s = S) {
  for (let ci = 0; ci < s.caves.length; ci++) {
    const c = s.caves[ci];
    for (let si = 0; si < c.slots.length; si++) if (c.slots[si].b && c.slots[si].b.id === id) return { ci, si };
  }
  return null;
}
const countB = (s, t) => allBuildings(s).filter(b => b.type === t && b.lvl > 0).length;
const hasWorker = (s, t) => allBuildings(s).some(b => b.type === t && s.dwarves.some(d => d.job && d.job.k === 'w' && d.job.at === b.id));
const dw = id => S.dwarves.find(d => d.id === id);
const fullName = d => d.name + ' ' + d.fam;
const isDone = r => S.research.done.includes(r);

function storeCap(s = S) {
  let c = BASE_STORE;
  for (const b of allBuildings(s)) if (b.type === 'lager' && b.lvl > 0) c += B.lager.store * b.lvl;
  return c;
}
function maxLvl() { return isDone('gewoelbebau') ? 3 : 2; }

function log(txt, cls = '') {
  S.log.unshift({ t: S.t, txt, cls });
  if (S.log.length > 150) S.log.length = 150;
}

// ---------- Neues Spiel ----------
function newDwarf(o) {
  const d = Object.assign({ id: S.nextId++, sex: 'm', age: 30, fam: pick(SURNAMES), home: null, partner: null,
    parents: [], job: null, skill: {}, hunger: 0, wait: 0 }, o);
  if (!d.name) {
    const pool = d.sex === 'm' ? NAMES_M : NAMES_F;
    const free = pool.filter(n => !S.dwarves.some(o => o.name === n));
    d.name = pick(free.length ? free : pool);
  }
  S.dwarves.push(d);
  return d;
}
function newBuilding(type, lvl = 1) { return { id: S.nextId++, type, lvl, site: null }; }

function makeCave(idx) {
  let slots;
  if (idx === 0) return null;
  const n = idx <= 2 ? 5 : 4 + Math.floor(Math.random() * 3);
  slots = Array.from({ length: n }, () => ({ dep: null, b: null }));
  let deps;
  if (idx === 1) deps = ['kohle', 'quelle'];
  else if (idx === 2) deps = ['erz', 'kohle'];
  else {
    deps = [];
    const k = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < k; i++) deps.push(pick(['erz', 'erz', 'kohle', 'quelle']));
  }
  deps.forEach((d, i) => { slots[Math.floor(i * n / deps.length)].dep = d; });
  return { name: CAVE_NAMES[idx % CAVE_NAMES.length], slots };
}

function newGame() {
  S = { v: 1, t: 0, lastReal: Date.now(), nextId: 1, res: {}, dwarves: [], caves: [], mood: 60, log: [],
    research: { done: [], cur: null }, dig: { m: 0 }, goal: 0, stats: { made: {}, born: 0, left: 0, died: 0, arrived: 0 } };
  for (const k in RES) S.res[k] = 0;
  Object.assign(S.res, { pilze: 120, wasser: 50, stein: 70, pilzholz: 50, balken: 15 });
  const c0 = { name: CAVE_NAMES[0], slots: Array.from({ length: 8 }, () => ({ dep: null, b: null })) };
  S.caves.push(c0);
  const h1 = newBuilding('haus'), h2 = newBuilding('haus');
  c0.slots[0].b = h1; c0.slots[1].b = h2;
  c0.slots[2].b = newBuilding('pilzgarten');
  c0.slots[3].dep = 'quelle'; c0.slots[3].b = newBuilding('brunnen');

  const brokk = newDwarf({ name: 'Brokk', fam: 'Eisenbart', sex: 'm', age: 64, home: h1.id, skill: { steinbruch: 12, bau: 8 } });
  const ingrun = newDwarf({ name: 'Ingrun', fam: 'Eisenbart', sex: 'f', age: 59, home: h1.id, skill: { pilzgarten: 10 } });
  brokk.partner = ingrun.id; ingrun.partner = brokk.id;
  newDwarf({ name: 'Garrik', fam: 'Eisenbart', sex: 'm', age: 22.6, home: h1.id, parents: [brokk.id, ingrun.id], skill: { steinbruch: 2 } });
  newDwarf({ name: 'Asta', fam: 'Eisenbart', sex: 'f', age: 9, home: h1.id, parents: [brokk.id, ingrun.id] });
  const hagor = newDwarf({ name: 'Hagor', fam: 'Steinfaust', sex: 'm', age: 41, home: h2.id, skill: { zimmerei: 6, bau: 5 } });
  const sigrun = newDwarf({ name: 'Sigrun', fam: 'Steinfaust', sex: 'f', age: 38, home: h2.id, skill: { brunnen: 5, kueche: 4 } });
  hagor.partner = sigrun.id; sigrun.partner = hagor.id;
  newDwarf({ name: 'Bodo', fam: 'Steinfaust', sex: 'm', age: 1.5, home: h2.id, parents: [hagor.id, sigrun.id] });
  newDwarf({ name: 'Fjalar', fam: 'Moosbart', sex: 'm', age: 124, home: h2.id, skill: { tueftel: 20 } });
  log('Die Sippen Eisenbart und Steinfaust beziehen die Eingangsgrotte. Der alte Fjalar Moosbart ist mit ihnen gezogen.', 'gold');
}

// ---------- Hilfen ----------
function costOf(type, toLvl) {
  const base = B[type].cost, c = {};
  const m = toLvl === 1 ? 1 : toLvl === 2 ? 1.5 : 2;
  for (const k in base) c[k] = Math.ceil(base[k] * m);
  if (toLvl === 2) c.balken = (c.balken || 0) + 10;
  if (toLvl === 3) { c.quader = (c.quader || 0) + 12; c.werkzeug = (c.werkzeug || 0) + 4; }
  return c;
}
function workOf(type, toLvl) { return Math.round(B[type].work * (toLvl === 1 ? 1 : toLvl === 2 ? 1.5 : 2)); }
function canPay(c) { for (const k in c) if ((S.res[k] || 0) < c[k]) return false; return true; }
function pay(c) { for (const k in c) S.res[k] -= c[k]; }
function refund(c, f) { const cap = storeCap(); for (const k in c) S.res[k] = Math.min(cap, S.res[k] + Math.floor(c[k] * f)); }

function stage(d) {
  if (d.age < AGE_APPRENTICE) return 'kind';
  if (d.age < AGE_ADULT) return 'lehrling';
  if (d.age < AGE_ELDER) return 'erwachsen';
  return 'alt';
}
function canDo(d, jobType) {
  const st = stage(d);
  if (st === 'kind') return false;
  if (st === 'alt' && (jobType === 'dig' || (B[jobType] && B[jobType].heavy))) return false;
  return true;
}
function skillLvl(d, k) { return 1 - Math.exp(-(d.skill[k] || 0) / 6); }
function eff(d, k) {
  const st = stage(d);
  let a = st === 'lehrling' ? 0.5 : st === 'alt' ? (k === 'tueftel' ? 1.25 : 0.6) : 1;
  const moodM = 0.8 + 0.4 * (S.mood / 100);
  return a * (0.75 + 0.5 * skillLvl(d, k)) * (1 - 0.6 * d.hunger) * moodM;
}
function foodNeed(d) { const st = stage(d); return st === 'kind' ? 3 : st === 'alt' ? 5 : 6; }

function bonus(type) {
  let m = 1;
  if (type === 'pilzgarten' && isDone('pilzzucht')) m *= 1.3;
  if (['steinbruch', 'kohlegrube', 'erzmine'].includes(type) && isDone('flaschenzug')) m *= 1.25;
  if (['kohlegrube', 'erzmine'].includes(type) && isDone('loren')) m *= 1.4;
  if (type === 'brunnen' && isDone('wasserrad')) m *= 1.5;
  return m;
}
function digBonus() { return (isDone('flaschenzug') ? 1.25 : 1) * (isDone('loren') ? 1.3 : 1); }
function digNeed(idx = S.caves.length) { return 12 + 10 * (idx - 1); }
function digLock(idx = S.caves.length) {
  if (idx >= 3 && !isDone('stuetzbalken')) return 'stuetzbalken';
  if (idx >= 5 && !isDone('flaschenzug')) return 'flaschenzug';
  if (idx >= 7 && !isDone('loren')) return 'loren';
  return null;
}

function residents(hid) { return S.dwarves.filter(d => d.home === hid); }
function houseCap(b) { return b.lvl > 0 ? B.haus.house[b.lvl - 1] : 0; }
function houses() { return allBuildings().filter(b => b.type === 'haus' && b.lvl > 0); }
function wantsOwn(d) {
  if (d.age < AGE_ADULT || d.age >= 60 || d.home == null) return false;
  // Volljährige Kinder wollen aus dem Elternhaus ausziehen
  return residents(d.home).some(o => d.parents.includes(o.id));
}
function workerOf(bid) { return S.dwarves.find(d => d.job && d.job.k === 'w' && d.job.at === bid); }
function buildersOf(bid) { return S.dwarves.filter(d => d.job && d.job.k === 'b' && d.job.at === bid); }
function diggers() { return S.dwarves.filter(d => d.job && d.job.k === 'd'); }
function jobLabel(d) {
  if (!d.job) return stage(d) === 'kind' ? 'Kind' : 'untätig';
  if (d.job.k === 'd') return 'Stollenbau';
  const b = findB(d.job.at); if (!b) return 'untätig';
  if (d.job.k === 'b') return 'Baustelle ' + B[b.type].n;
  return B[b.type].job || B[b.type].n;
}

function removeDwarf(d, why, cls) {
  if (d.partner != null) { const p = dw(d.partner); if (p) p.partner = null; }
  S.dwarves = S.dwarves.filter(x => x.id !== d.id);
  log(why, cls);
}

// ---------- Simulationsschritt ----------
function step(dt) {
  S.t += dt;
  const dtH = dt / 3600;
  const cap = storeCap();
  const add = (k, v) => { S.res[k] = Math.min(cap, S.res[k] + v); if (v > 0) S.stats.made[k] = (S.stats.made[k] || 0) + v; };

  // Altern
  for (const d of S.dwarves) {
    const before = d.age;
    d.age += dt / YEAR;
    if (before < AGE_APPRENTICE && d.age >= AGE_APPRENTICE) log(`${fullName(d)} ist alt genug für eine Lehre.`);
    if (before < AGE_ADULT && d.age >= AGE_ADULT) log(`${fullName(d)} ist volljährig und sucht eine eigene Wohnhöhle.`, 'warn');
    if (before < AGE_ELDER && d.age >= AGE_ELDER) {
      log(`${fullName(d)} ist alt geworden – keine schwere Arbeit mehr.`);
      if (d.job && !canDo(d, d.job.k === 'd' ? 'dig' : (findB(d.job.at) || {}).type)) d.job = null;
    }
  }

  // Ernährung
  let need = 0;
  for (const d of S.dwarves) need += foodNeed(d) * dtH;
  let got = 0, mealShare = 0;
  if (need > 0) {
    const fromMeal = Math.min(S.res.mahlzeit * RES.mahlzeit.food, need);
    S.res.mahlzeit -= fromMeal / RES.mahlzeit.food; got += fromMeal;
    const fromP = Math.min(S.res.pilze, need - got);
    S.res.pilze -= fromP; got += fromP;
    mealShare = fromMeal / need;
  }
  const fed = need > 0 ? got / need : 1;
  for (const d of S.dwarves) {
    if (fed < 0.999) d.hunger = Math.min(1, d.hunger + (1 - fed) * dt / 3600);
    else d.hunger = Math.max(0, d.hunger - dt / 1200);
  }
  // Bier
  const adults = S.dwarves.filter(d => d.age >= AGE_ADULT).length;
  const beerNeed = adults * 0.5 * dtH;
  const beer = Math.min(S.res.bier, beerNeed);
  S.res.bier -= beer;
  const beerOk = beerNeed > 0 && beer >= beerNeed * 0.99;

  // Stimmung
  const avgH = S.dwarves.length ? S.dwarves.reduce((a, d) => a + d.hunger, 0) / S.dwarves.length : 0;
  const waiting = S.dwarves.filter(wantsOwn).length;
  const homeless = S.dwarves.filter(d => d.home == null).length;
  let target = 55 + Math.min(12, mealShare * 24) + (beerOk ? 15 : 0) - avgH * 60 - Math.min(15, waiting * 5) - homeless * 8;
  target = Math.max(0, Math.min(100, target));
  S.moodTarget = target;
  S.mood += (target - S.mood) * Math.min(1, dt / 240);

  // Produktion
  const workerMap = {};
  for (const d of S.dwarves) if (d.job && d.job.k === 'w') workerMap[d.job.at] = d;
  for (const b of allBuildings()) {
    const def = B[b.type];
    b.st = '';
    if (b.site) continue;
    if (!def.job) continue;
    const w = workerMap[b.id];
    if (!w) { b.st = 'noworker'; continue; }
    if (def.research) {
      const cur = S.research.cur;
      if (!cur) { b.st = 'idle'; continue; }
      const e = eff(w, b.type) * LVL_MULT[b.lvl - 1];
      cur.p += dtH * e;
      w.skill.tueftel = (w.skill.tueftel || 0) + dtH;
      b.st = 'ok';
      if (cur.p >= RESEARCH[cur.id].h) {
        S.research.done.push(cur.id);
        log(`Erforscht: ${RESEARCH[cur.id].n}! ${RESEARCH[cur.id].desc}`, 'gold');
        S.research.cur = null;
      }
      continue;
    }
    const m = LVL_MULT[b.lvl - 1] * bonus(b.type) * eff(w, b.type) * dtH;
    let frac = 1, lack = null;
    for (const k in def.inp || {}) {
      const nd = def.inp[k] * m;
      if (nd > 0 && S.res[k] < nd) { const f = S.res[k] / nd; if (f < frac) { frac = f; lack = k; } }
    }
    let full = true;
    for (const k in def.out) {
      const room = cap - S.res[k];
      if (room > 0.001) full = false;
      const pr = def.out[k] * m;
      if (pr > 0 && room < pr) frac = Math.min(frac, Math.max(0, room / pr));
    }
    if (full) { b.st = 'full'; continue; }
    if (frac <= 0.001) { b.st = 'lack:' + lack; continue; }
    for (const k in def.inp || {}) S.res[k] = Math.max(0, S.res[k] - def.inp[k] * m * frac);
    for (const k in def.out) add(k, def.out[k] * m * frac);
    w.skill[b.type] = (w.skill[b.type] || 0) + dtH * frac;
    b.st = frac < 0.95 ? 'lack:' + lack : 'ok';
  }

  // Baustellen
  for (const b of allBuildings()) {
    if (!b.site) continue;
    for (const d of buildersOf(b.id)) {
      b.site.w += BUILD_RATE * dtH * eff(d, 'bau');
      d.skill.bau = (d.skill.bau || 0) + dtH;
    }
    if (b.site.w >= b.site.need) {
      const was = b.lvl;
      b.lvl = b.site.to; b.site = null;
      for (const d of buildersOf(b.id)) d.job = null;
      log(was === 0 ? `${B[b.type].n} fertiggestellt.` : `${B[b.type].n} auf Stufe ${b.lvl} ausgebaut.`, 'good');
    }
  }

  // Stollenbau
  const lock = digLock();
  const dg = diggers();
  if (!lock && dg.length) {
    let meters = 0;
    for (const d of dg) { meters += BUILD_RATE * dtH * eff(d, 'dig') / DIG_WORK_PER_M * digBonus(); d.skill.dig = (d.skill.dig || 0) + dtH; }
    // Stützen: 1 Balken pro Meter – notfalls 2 Pilzholz als grobe Stützen
    const fromB = Math.min(meters, S.res.balken);
    const fromH = Math.min(meters - fromB, S.res.pilzholz / 2);
    meters = fromB + fromH;
    S.dig.blocked = meters <= 0.0001;
    S.dig.rough = fromH > 0;
    if (meters > 0) {
      S.res.balken -= fromB; S.res.pilzholz -= fromH * 2;
      S.dig.m += meters;
      add('stein', meters * 3);
      if (S.dig.m >= digNeed()) {
        const c = makeCave(S.caves.length);
        S.caves.push(c);
        S.dig.m = 0;
        const deps = c.slots.filter(x => x.dep).map(x => DEPOSITS[x.dep].n);
        log(`Durchbruch! Neue Höhle: ${c.name} mit ${c.slots.length} Bauplätzen${deps.length ? ' – gefunden: ' + deps.join(', ') : ''}.`, 'gold');
        if (digLock()) { for (const d of dg) d.job = null; }
      }
    }
  } else S.dig.blocked = false;

  population(dt);
  checkGoals();
}

function population(dt) {
  const hs = houses();
  const emptyHouse = () => hs.find(h => residents(h.id).length === 0);
  // Obdachlose / Häuser verloren
  for (const d of S.dwarves) {
    if (d.home != null && !hs.some(h => h.id === d.home)) d.home = null;
    if (d.home == null) {
      const h = hs.find(h => residents(h.id).length < houseCap(h));
      if (h) { d.home = h.id; log(`${fullName(d)} findet Unterschlupf.`); }
    }
  }
  // Auszug
  for (const d of S.dwarves) {
    if (!wantsOwn(d)) { d.wait = 0; continue; }
    const h = emptyHouse();
    if (h) {
      d.home = h.id; d.wait = 0;
      log(`${fullName(d)} bezieht eine eigene Wohnhöhle.`, 'good');
      if (d.partner != null) { const p = dw(d.partner); if (p) p.home = h.id; }
    } else d.wait += dt / YEAR;
  }
  // Abwanderung
  for (const d of [...S.dwarves]) {
    if (wantsOwn(d) && d.wait > 1 && chanceYear(0.3, dt)) {
      S.stats.left++;
      removeDwarf(d, `${fullName(d)} fand keine eigene Höhle und ist fortgezogen.`, 'bad');
    } else if (d.hunger >= 1 && d.age >= AGE_APPRENTICE && chanceYear(0.5, dt)) {
      S.stats.left++;
      removeDwarf(d, `${fullName(d)} hat Hunger gelitten und die Siedlung verlassen.`, 'bad');
    } else if (d.home == null && chanceYear(0.6, dt)) {
      S.stats.left++;
      removeDwarf(d, `${fullName(d)} hatte kein Dach über dem Kopf und ist fortgezogen.`, 'bad');
    } else if (S.mood < 25 && d.age >= AGE_ADULT && chanceYear(0.08, dt)) {
      S.stats.left++;
      removeDwarf(d, `${fullName(d)} hatte genug von der schlechten Stimmung und ist gegangen.`, 'bad');
    } else if (d.age > 130 && chanceYear(Math.min(0.9, (d.age - 130) * 0.035), dt)) {
      S.stats.died++;
      removeDwarf(d, `${fullName(d)} ist im Alter von ${Math.floor(d.age)} Jahren zu den Ahnen gegangen.`, 'bad');
    }
  }
  // Heirat
  const singles = S.dwarves.filter(d => d.partner == null && d.age >= AGE_ADULT && d.age < 110 && d.home != null);
  for (const a of singles) {
    if (a.partner != null) continue;
    const b = singles.find(o => o.partner == null && o.sex !== a.sex && o.id !== a.id && !a.parents.some(p => o.parents.includes(p)));
    if (!b || !chanceYear(0.35, dt)) continue;
    // Wer zieht zu wem?
    const ha = findB(a.home), hb = findB(b.home);
    const own = (d) => !wantsOwn(d);
    let target = null, mover = null;
    if (own(a) && residents(a.home).length < houseCap(ha)) { target = a.home; mover = b; }
    else if (own(b) && residents(b.home).length < houseCap(hb)) { target = b.home; mover = a; }
    if (target == null) continue;
    a.partner = b.id; b.partner = a.id;
    mover.home = target; mover.wait = 0;
    if (b.sex === 'f') b.fam = a.fam; else a.fam = b.fam;
    log(`${a.name} und ${b.name} haben den Bund geschlossen und leben nun zusammen.`, 'good');
  }
  // Geburten
  for (const f of S.dwarves) {
    if (f.sex !== 'f' || f.partner == null || f.age < AGE_ADULT || f.age > 110) continue;
    const m = dw(f.partner);
    if (!m || m.home !== f.home || f.home == null) continue;
    const h = findB(f.home);
    if (residents(f.home).length >= houseCap(h)) continue;
    if (chanceYear(0.22, dt)) {
      const sex = Math.random() < 0.5 ? 'm' : 'f';
      const c = newDwarf({ sex, age: 0, fam: m.fam, home: f.home, parents: [m.id, f.id] });
      S.stats.born++;
      log(`Nachwuchs! ${f.name} und ${m.name} haben ${sex === 'm' ? 'einen Sohn' : 'eine Tochter'}: ${c.name}.`, 'good');
    }
  }
  // Zuwanderung
  const e = emptyHouse();
  if (e && S.mood >= 60 && chanceYear(0.25, dt)) {
    const fam = pick(SURNAMES);
    const a = newDwarf({ sex: Math.random() < 0.5 ? 'm' : 'f', age: rnd(28, 80), fam, home: e.id });
    a.skill[pick(Object.keys(B).filter(k => B[k].job))] = rnd(3, 15);
    let txt = `${fullName(a)} ist als Wanderer angekommen`;
    if (Math.random() < 0.4) {
      const b = newDwarf({ sex: a.sex === 'm' ? 'f' : 'm', age: rnd(28, 80), fam, home: e.id });
      a.partner = b.id; b.partner = a.id;
      txt += ` – zusammen mit ${b.name}`;
    }
    S.stats.arrived++;
    log(txt + '. Die gute Stimmung hat sich herumgesprochen.', 'good');
  }
}

function checkGoals() {
  while (S.goal < GOALS.length && GOALS[S.goal].done(S)) {
    log(`Ziel erreicht: ${GOALS[S.goal].t}`, 'gold');
    S.goal++;
  }
}

// ---------- Aktionen ----------
function actBuild(ci, si, type) {
  const sl = S.caves[ci].slots[si];
  if (sl.b) return 'Platz belegt';
  const def = B[type];
  if (def.dep && sl.dep !== def.dep) return 'Benötigt ' + DEPOSITS[def.dep].n;
  if (def.req && !isDone(def.req)) return 'Noch nicht erforscht';
  const c = costOf(type, 1);
  if (!canPay(c)) return 'Nicht genug Material';
  pay(c);
  const b = newBuilding(type, 0);
  b.site = { to: 1, w: 0, need: workOf(type, 1), cost: c };
  sl.b = b;
  log(`Baustelle eröffnet: ${def.n}.`);
  return b;
}
function actUpgrade(bid) {
  const b = findB(bid);
  if (!b || b.site || b.lvl >= maxLvl()) return 'Nicht möglich';
  const c = costOf(b.type, b.lvl + 1);
  if (!canPay(c)) return 'Nicht genug Material';
  pay(c);
  b.site = { to: b.lvl + 1, w: 0, need: workOf(b.type, b.lvl + 1), cost: c };
  const w = workerOf(bid); if (w) w.job = null;
  log(`Ausbau begonnen: ${B[b.type].n} → Stufe ${b.lvl + 1}.`);
  return true;
}
function actCancelSite(bid) {
  const b = findB(bid); if (!b || !b.site) return;
  refund(b.site.cost, 0.75);
  for (const d of buildersOf(bid)) d.job = null;
  if (b.lvl === 0) { const p = slotOf(bid); S.caves[p.ci].slots[p.si].b = null; }
  else b.site = null;
  log(`Bauarbeiten abgebrochen (¾ des Materials zurück).`);
}
function actDemolish(bid) {
  const b = findB(bid); if (!b) return;
  if (b.type === 'haus' && residents(bid).length) return 'Bewohnt';
  for (const d of S.dwarves) if (d.job && d.job.at === bid) d.job = null;
  refund(costOf(b.type, 1), 0.5);
  const p = slotOf(bid); S.caves[p.ci].slots[p.si].b = null;
  log(`${B[b.type].n} abgerissen.`);
  return true;
}
function actAssign(did, job) {
  const d = dw(did); if (!d) return;
  if (job && job.k === 'w') { const o = workerOf(job.at); if (o && o.id !== did) o.job = null; }
  d.job = job;
}
function actMove(did, hid) {
  const d = dw(did), h = findB(hid);
  if (!d || !h || residents(hid).length >= houseCap(h)) return 'Kein Platz';
  d.home = hid; d.wait = 0;
  return true;
}
function actResearch(id) {
  const r = RESEARCH[id];
  if (S.research.cur || isDone(id)) return 'Nicht möglich';
  if ((r.req || []).some(q => !isDone(q))) return 'Voraussetzung fehlt';
  if (!canPay(r.cost)) return 'Nicht genug Material';
  pay(r.cost);
  S.research.cur = { id, p: 0 };
  log(`Forschung begonnen: ${r.n}.`);
  return true;
}
function actAutoAssign() {
  let n = 0;
  const idle = () => S.dwarves.filter(d => !d.job && stage(d) !== 'kind');
  for (const b of allBuildings()) {
    if (b.site || !B[b.type].job || workerOf(b.id)) continue;
    if (B[b.type].research && !S.research.cur) continue;
    const cand = idle().filter(d => canDo(d, b.type)).sort((x, y) => eff(y, b.type) - eff(x, b.type))[0];
    if (cand) { cand.job = { k: 'w', at: b.id }; n++; }
  }
  return n;
}

// ---------- Speichern ----------
function saveGame() {
  if (!S) return;
  S.lastReal = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}
function loadGame() {
  try { const j = localStorage.getItem(SAVE_KEY); if (j) { S = JSON.parse(j); return true; } } catch (e) {}
  return false;
}
// Zeit nachholen (max. 48 h)
function catchUp(sec) {
  sec = Math.min(sec, 48 * 3600);
  while (sec > 0) { const d = Math.min(10, sec); step(d); sec -= d; }
}
