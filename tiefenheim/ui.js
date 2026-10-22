'use strict';
// ===== Tiefenheim – Oberfläche =====
let tab = 'caves', sheet = null, toastT = null, confirmReset = 0;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fl = n => Math.floor(n + 1e-9);

function fmtDur(sec) {
  if (!isFinite(sec)) return '∞';
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h >= 48) return Math.round(h / 24) + ' Tage';
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${sec} s`;
}
const yearOf = t => Math.floor(t / YEAR) + 1;
function costHtml(c) {
  return Object.keys(c).map(k => `<span class="cost ${S.res[k] >= c[k] ? '' : 'lack'}">${RES[k].ic} ${c[k]}</span>`).join('');
}
function rateHtml(o, m, sign) {
  return Object.keys(o).map(k => `<span class="cost">${sign}${(o[k] * m).toFixed(1).replace('.0', '')} ${RES[k].ic}</span>`).join('');
}
function dwarfIcon(d) {
  const st = stage(d);
  if (st === 'kind') return d.age < 5 ? '👶' : '🧒';
  if (st === 'alt') return d.sex === 'm' ? '👴' : '👵';
  return d.sex === 'm' ? '🧔' : '👩';
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}
function bar(p, cls = '') { return `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p * 100)).toFixed(1)}%"></i></div>`; }

// ---------- Kopfzeile ----------
function foodStock() { return S.res.pilze * RES.pilze.food + S.res.mahlzeit * RES.mahlzeit.food; }
function foodPerHour() { return S.dwarves.reduce((a, d) => a + foodNeed(d), 0); }
function renderTop() {
  const idle = S.dwarves.filter(d => !d.job && stage(d) !== 'kind').length;
  const fh = foodPerHour() ? foodStock() / foodPerHour() * 3600 : Infinity;
  const mood = S.mood;
  const mi = mood >= 70 ? '😄' : mood >= 50 ? '🙂' : mood >= 30 ? '😐' : '😠';
  $('#year').textContent = 'Jahr ' + yearOf(S.t);
  $('#stats').innerHTML = `
    <span class="st" data-a="tab" data-t="folk">👥 ${S.dwarves.length}</span>
    <span class="st ${mood < 30 ? 'bad' : ''}">${mi} ${Math.round(mood)}</span>
    <span class="st ${fh < 1800 ? 'bad' : fh < 3600 ? 'warn' : ''}">🍽️ ${fmtDur(fh)}</span>
    <span class="st ${idle ? 'warn' : ''}" data-a="tab" data-t="folk">💤 ${idle}</span>`;
  const cap = storeCap();
  $('#res').innerHTML = Object.keys(RES).filter(k => S.res[k] >= 1 || ['pilze', 'wasser', 'stein', 'pilzholz', 'balken'].includes(k)).map(k => {
    const v = S.res[k], c = v >= cap - 0.5 ? 'full' : v < 1 ? 'zero' : '';
    return `<span class="r ${c}" data-a="resinfo" data-k="${k}">${RES[k].ic}<b>${fl(v)}</b></span>`;
  }).join('') + `<span class="r cap">📦 ${cap}</span>`;
}

// ---------- Höhlen ----------
function slotHtml(sl, ci, si) {
  if (!sl.b) {
    const dep = sl.dep ? DEPOSITS[sl.dep] : null;
    return `<div class="slot empty ${dep ? 'dep' : ''}" data-a="slot" data-c="${ci}" data-s="${si}">
      <div class="ic">${dep ? dep.ic : '＋'}</div><div class="nm">${dep ? dep.n : 'Bauplatz'}</div></div>`;
  }
  const b = sl.b, def = B[b.type];
  let badge = '', cls = '';
  if (b.site) {
    cls = 'site';
    const n = buildersOf(b.id).length;
    badge = `${bar(b.site.w / b.site.need)}<div class="sub">${n ? '🔨' + n : '<span class="w">keine Bauleute</span>'}</div>`;
  } else if (def.house) {
    const r = residents(b.id).length;
    badge = `<div class="sub">${r}/${houseCap(b)} 👥</div>`;
  } else if (def.job) {
    const w = workerOf(b.id);
    if (!w) { badge = `<div class="sub w">⚠ leer</div>`; cls = 'warnb'; }
    else if (b.st && b.st.startsWith('lack')) { const k = b.st.split(':')[1]; badge = `<div class="sub w">fehlt ${k && RES[k] ? RES[k].ic : ''}</div>`; cls = 'warnb'; }
    else if (b.st === 'full') { badge = `<div class="sub w">voll</div>`; }
    else if (b.st === 'idle') { badge = `<div class="sub w">kein Projekt</div>`; cls = 'warnb'; }
    else badge = `<div class="sub ok">${dwarfIcon(w)} ${esc(w.name)}</div>`;
  }
  const pips = b.lvl > 0 ? `<div class="pips">${'◆'.repeat(b.lvl)}${'◇'.repeat(Math.max(0, maxLvl() - b.lvl))}</div>` : '';
  return `<div class="slot ${cls}" data-a="slot" data-c="${ci}" data-s="${si}">
    ${pips}<div class="ic">${def.ic}</div><div class="nm">${def.n}</div>${badge}</div>`;
}
function renderCaves() {
  let h = '';
  if (S.goal < GOALS.length) {
    const g = GOALS[S.goal];
    h += `<div class="goal"><div class="gt">🎯 ${esc(g.t)}</div><div class="gh">${esc(g.h)}</div></div>`;
  }
  S.caves.forEach((c, ci) => {
    h += `<section class="cave"><h2><span>${esc(c.name)}</span><small>Ebene ${ci + 1}</small></h2>
      <div class="grid">${c.slots.map((sl, si) => slotHtml(sl, ci, si)).join('')}</div></section>`;
  });
  // Stollen
  const lock = digLock(), need = digNeed(), dg = diggers();
  let rate = 0;
  for (const d of dg) rate += BUILD_RATE * eff(d, 'dig') / DIG_WORK_PER_M * digBonus();
  h += `<section class="cave dig"><h2><span>⛏️ Stollen zur ${S.caves.length + 1}. Höhle</span><small>${fl(S.dig.m)} / ${need} m</small></h2>
    ${bar(S.dig.m / need, 'dig')}
    <p class="muted">Jeder Meter braucht 1 ${RES.balken.ic} Balken zum Abstützen (notfalls 2 ${RES.pilzholz.ic} Pilzholz) und bringt 3 ${RES.stein.ic} Stein.</p>
    ${lock ? `<p class="w">🔒 Zu tief – erforsche zuerst <b>${RESEARCH[lock].n}</b>.</p>` :
      `<p>${dg.length ? `Hauer: ${dg.map(d => esc(d.name)).join(', ')} · ${rate.toFixed(1)} m/h · Durchbruch in ~${fmtDur((need - S.dig.m) / rate * 3600)}` : '<span class="w">Niemand gräbt.</span>'}
      ${S.dig.blocked && dg.length ? '<br><span class="w">Keine Balken und kein Pilzholz – die Arbeit ruht!</span>' : S.dig.rough && dg.length ? '<br><span class="w">Keine Balken – es wird mit Pilzholz abgestützt.</span>' : ''}</p>
      <button class="btn" data-a="pick" data-m="d">Hauer einteilen (${dg.length}/3)</button>`}
  </section>`;
  return h;
}

// ---------- Volk ----------
function renderFolk() {
  const cnt = st => S.dwarves.filter(d => stage(d) === st).length;
  const idle = S.dwarves.filter(d => !d.job && stage(d) !== 'kind').length;
  let h = `<div class="card row">
    <div class="sum"><b>${cnt('erwachsen')}</b>Erwachsene</div><div class="sum"><b>${cnt('lehrling')}</b>Lehrlinge</div>
    <div class="sum"><b>${cnt('kind')}</b>Kinder</div><div class="sum"><b>${cnt('alt')}</b>Alte</div></div>
    <div class="card"><p class="muted">Stimmung ${Math.round(S.mood)} → ${Math.round(S.moodTarget || S.mood)}. Mahlzeiten, Bier und satte Bäuche heben sie. Hunger und wartende Jungzwerge drücken sie.
    Bei Stimmung ab 60 und einer freien Wohnhöhle kommen Wanderer.</p>
    ${idle ? `<button class="btn" data-a="auto">💤 ${idle} Untätige automatisch einteilen</button>` : ''}</div>`;
  const order = { erwachsen: 0, lehrling: 1, alt: 2, kind: 3 };
  const list = [...S.dwarves].sort((a, b) => (order[stage(a)] - order[stage(b)]) || (!!a.job - !!b.job) || b.age - a.age);
  h += list.map(d => {
    const tags = [];
    if (wantsOwn(d)) tags.push(`<span class="tag warn">will ausziehen${d.wait > 0 ? ' · ' + fmtDur((Math.max(0, 1 - d.wait)) * YEAR) + ' Geduld' : ''}</span>`);
    if (d.hunger > 0.3) tags.push(`<span class="tag bad">hungrig</span>`);
    if (d.home == null) tags.push(`<span class="tag bad">obdachlos</span>`);
    const jl = jobLabel(d);
    return `<div class="dw" data-a="dwarf" data-id="${d.id}">
      <div class="av">${dwarfIcon(d)}</div>
      <div class="inf"><b>${esc(fullName(d))}</b> <small>${fl(d.age)} J.</small><br>
      <span class="${jl === 'untätig' ? 'w' : 'muted'}">${esc(jl)}</span> ${tags.join(' ')}</div></div>`;
  }).join('');
  return h;
}

// ---------- Forschung ----------
function renderResearch() {
  const ts = allBuildings().filter(b => b.type === 'tueftel' && b.lvl > 0);
  const tw = ts.map(b => workerOf(b.id)).filter(Boolean);
  let h = '';
  if (!ts.length) h += `<div class="card"><p class="w">Du hast noch keine Tüftelstube. Ohne sie wird nichts erforscht.</p></div>`;
  else if (!tw.length) h += `<div class="card"><p class="w">In der Tüftelstube sitzt niemand. Weise einen Tüftler zu – alte Zwerge sind hier besonders gut.</p></div>`;
  const cur = S.research.cur;
  if (cur) {
    const r = RESEARCH[cur.id];
    let rate = 0;
    for (const b of ts) { const w = workerOf(b.id); if (w) rate += eff(w, 'tueftel') * LVL_MULT[b.lvl - 1]; }
    h += `<div class="card cur"><div class="rt">${r.ic} ${r.n}</div>${bar(cur.p / r.h)}
      <p class="muted">${rate ? 'fertig in ~' + fmtDur((r.h - cur.p) / rate * 3600) : 'pausiert – kein Tüftler'}</p></div>`;
  }
  for (const id in RESEARCH) {
    const r = RESEARCH[id];
    const done = isDone(id), reqOk = (r.req || []).every(isDone);
    if (cur && cur.id === id) continue;
    h += `<div class="card res ${done ? 'done' : reqOk ? '' : 'locked'}">
      <div class="rt">${r.ic} ${r.n} ${done ? '<span class="ok">✓</span>' : ''}</div>
      <p class="muted">${r.desc}</p>
      ${done ? '' : !reqOk ? `<p class="muted">🔒 benötigt: ${r.req.map(q => RESEARCH[q].n).join(', ')}</p>` :
        `<div class="costs">${costHtml(r.cost)} <span class="cost">⏳ ${fmtDur(r.h * 3600)} Tüftelarbeit</span></div>
         <button class="btn" data-a="research" data-id="${id}" ${cur || !canPay(r.cost) ? 'disabled' : ''}>Erforschen</button>`}
    </div>`;
  }
  return h;
}

// ---------- Chronik ----------
function renderLog() {
  let h = `<div class="card"><div class="rt">🎯 Ziele</div>${GOALS.map((g, i) =>
    `<div class="gl ${i < S.goal ? 'ok' : i === S.goal ? '' : 'muted'}">${i < S.goal ? '✓' : i === S.goal ? '▸' : '·'} ${esc(g.t)}</div>`).join('')}</div>
    <div class="card row"><div class="sum"><b>${S.stats.born}</b>geboren</div><div class="sum"><b>${S.stats.arrived}</b>zugewandert</div>
    <div class="sum"><b>${S.stats.left}</b>fortgezogen</div><div class="sum"><b>${S.stats.died}</b>verstorben</div></div>`;
  h += `<div class="card">${S.log.map(l => `<div class="lg ${l.cls}"><small>J${yearOf(l.t)}</small> ${esc(l.txt)}</div>`).join('')}</div>`;
  h += `<div class="card"><p class="muted">Tiefenheim läuft in Echtzeit weiter, auch wenn die App geschlossen ist (bis zu 48 h). 1 Zwergenjahr = 30 Minuten. Es gibt keine Beschleuniger.</p>
    <button class="btn danger" data-a="reset">${confirmReset ? 'Wirklich alles löschen? Nochmal tippen' : 'Neues Spiel beginnen'}</button></div>`;
  return h;
}

// ---------- Sheets ----------
function openSheet(kind, args = {}) { sheet = { kind, args }; renderSheet(true); }
function closeSheet() { sheet = null; $('#sheet').classList.remove('on'); $('#shade').classList.remove('on'); }

function sheetSlot({ ci, si }) {
  const sl = S.caves[ci] && S.caves[ci].slots[si];
  if (!sl) return closeSheet();
  if (!sl.b) {
    let h = `<h3>Bauplatz${sl.dep ? ' · ' + DEPOSITS[sl.dep].ic + ' ' + DEPOSITS[sl.dep].n : ''}</h3>
      <p class="muted">Material wird beim Errichten der Baustelle sofort verbraucht. Danach müssen Zwerge bauen – ${BUILD_RATE} Arbeit pro Stunde und Bauarbeiter.</p>`;
    for (const t of BUILD_ORDER) {
      const def = B[t];
      if (def.dep && def.dep !== sl.dep) continue;
      const locked = def.req && !isDone(def.req);
      const c = costOf(t, 1);
      h += `<div class="opt ${locked ? 'locked' : ''}">
        <div class="oh"><span class="oi">${def.ic}</span><b>${def.n}</b></div>
        <p class="muted">${def.desc}</p>
        ${locked ? `<p class="muted">🔒 Forschung: ${RESEARCH[def.req].n}</p>` :
          `<div class="costs">${costHtml(c)}<span class="cost">🔨 ${workOf(t, 1)} Arbeit</span></div>
           ${def.out ? `<div class="costs">${def.inp ? rateHtml(def.inp, 1, '−') : ''}${rateHtml(def.out, 1, '+')}<span class="cost muted">pro h</span></div>` : ''}
           <button class="btn" data-a="build" data-c="${ci}" data-s="${si}" data-t="${t}" ${canPay(c) ? '' : 'disabled'}>Baustelle errichten</button>`}
      </div>`;
    }
    return h;
  }
  return sheetBuilding(sl.b);
}

function sheetBuilding(b) {
  const def = B[b.type];
  let h = `<h3>${def.ic} ${def.n} ${b.lvl ? `<small>Stufe ${b.lvl}</small>` : ''}</h3><p class="muted">${def.desc}</p>`;
  if (b.site) {
    const bs = buildersOf(b.id);
    const rate = bs.reduce((a, d) => a + BUILD_RATE * eff(d, 'bau'), 0);
    h += `<div class="card"><div class="rt">🚧 ${b.lvl === 0 ? 'Baustelle' : 'Ausbau auf Stufe ' + b.site.to}</div>
      ${bar(b.site.w / b.site.need)}<p>${fl(b.site.w)} / ${b.site.need} Arbeit · ${rate ? 'fertig in ~' + fmtDur((b.site.need - b.site.w) / rate * 3600) : '<span class="w">niemand baut</span>'}</p>
      ${bs.map(d => `<div class="dw sm"><div class="av">${dwarfIcon(d)}</div><div class="inf">${esc(fullName(d))}<br><small class="muted">${Math.round(eff(d, 'bau') * 100)} % Leistung</small></div>
        <button class="btn sm ghost" data-a="unassign" data-id="${d.id}">abziehen</button></div>`).join('')}
      ${bs.length < 3 ? `<button class="btn" data-a="pick" data-m="b" data-at="${b.id}">Bauarbeiter hinzufügen (${bs.length}/3)</button>` : ''}
      <button class="btn ghost sm" data-a="cancel" data-id="${b.id}">Bau abbrechen (¾ Material zurück)</button></div>`;
    return h;
  }
  if (def.house) {
    const rs = residents(b.id);
    h += `<div class="card"><div class="rt">Bewohner ${rs.length}/${houseCap(b)}</div>
      ${rs.length ? rs.map(d => `<div class="dw sm" data-a="dwarf" data-id="${d.id}"><div class="av">${dwarfIcon(d)}</div><div class="inf">${esc(fullName(d))} <small>${fl(d.age)} J.</small><br><small class="muted">${esc(jobLabel(d))}</small></div></div>`).join('')
        : '<p class="muted">Leer. Ein volljähriger Jungzwerg oder Wanderer zieht hier ein.</p>'}</div>`;
  } else if (def.job) {
    const w = workerOf(b.id);
    h += `<div class="card"><div class="rt">${def.job}</div>`;
    if (w) {
      const e = eff(w, b.type);
      h += `<div class="dw sm" data-a="dwarf" data-id="${w.id}"><div class="av">${dwarfIcon(w)}</div><div class="inf">${esc(fullName(w))}<br>
        <small class="muted">${Math.round(e * 100)} % Leistung · Geschick ${Math.round(skillLvl(w, b.type) * 100)} %</small></div></div>
        <div class="btns"><button class="btn sm" data-a="pick" data-m="w" data-at="${b.id}">Wechseln</button>
        <button class="btn sm ghost" data-a="unassign" data-id="${w.id}">Abziehen</button></div>`;
      if (def.out) {
        const m = LVL_MULT[b.lvl - 1] * bonus(b.type) * e;
        h += `<div class="costs">${def.inp ? rateHtml(def.inp, m, '−') : ''}${rateHtml(def.out, m, '+')}<span class="cost muted">pro h</span></div>`;
      }
      if (b.st && b.st.startsWith('lack')) h += `<p class="w">Es fehlt ${RES[b.st.split(':')[1]].n} – die Arbeit stockt.</p>`;
      if (b.st === 'full') h += `<p class="w">Das Lager ist voll. Baue ein Lagergewölbe.</p>`;
      if (b.st === 'idle') h += `<p class="w">Kein Forschungsprojekt gewählt.</p><button class="btn sm" data-a="tab" data-t="research">Zur Forschung</button>`;
    } else {
      h += `<p class="w">Niemand arbeitet hier – es entsteht nichts.</p><button class="btn" data-a="pick" data-m="w" data-at="${b.id}">Arbeiter wählen</button>`;
    }
    h += `</div>`;
  } else if (def.store) {
    h += `<div class="card"><p>Lagerplatz je Ware: <b>${storeCap()}</b></p></div>`;
  }
  if (b.lvl < 3) {
    const to = b.lvl + 1, c = costOf(b.type, to);
    const lockedL3 = to > maxLvl();
    h += `<div class="card"><div class="rt">⬆️ Ausbau auf Stufe ${to}</div>
      <p class="muted">${def.house ? `Platz für ${B.haus.house[to - 1]} Zwerge.` : def.store ? `+${def.store} Lagerplatz.` : `Leistung ×${LVL_MULT[to - 1]}.`} Während des Ausbaus ruht die Arbeit.</p>
      ${lockedL3 ? `<p class="muted">🔒 Forschung: Gewölbebau</p>` : `<div class="costs">${costHtml(c)}<span class="cost">🔨 ${workOf(b.type, to)} Arbeit</span></div>
      <button class="btn" data-a="upgrade" data-id="${b.id}" ${canPay(c) ? '' : 'disabled'}>Ausbau beginnen</button>`}</div>`;
  }
  h += `<button class="btn ghost sm" data-a="demolish" data-id="${b.id}">Abreißen (½ Material zurück)</button>`;
  return h;
}

function sheetPick({ m, at }) {
  at = at != null ? +at : null;
  let jt, title;
  if (m === 'w') { const b = findB(at); if (!b) return closeSheet(); jt = b.type; title = `${B[b.type].job} für ${B[b.type].n}`; }
  else if (m === 'b') { jt = 'bau'; title = 'Bauarbeiter wählen'; }
  else { jt = 'dig'; title = 'Hauer für den Stollen'; }
  const ok = S.dwarves.filter(d => canDo(d, m === 'w' ? jt : m === 'd' ? 'dig' : 'bau'));
  const cur = d => m === 'w' ? (d.job && d.job.k === 'w' && d.job.at === at) : m === 'b' ? (d.job && d.job.k === 'b' && d.job.at === at) : (d.job && d.job.k === 'd');
  ok.sort((a, b) => (!!a.job - !!b.job) || eff(b, jt) - eff(a, jt));
  let h = `<h3>${esc(title)}</h3><p class="muted">Untätige zuerst. Geschick wächst mit jeder Arbeitsstunde.</p>`;
  h += ok.map(d => `<div class="dw sm ${cur(d) ? 'sel' : ''}" data-a="${cur(d) ? 'unassign' : 'assign'}" data-id="${d.id}" data-m="${m}" data-at="${at}">
    <div class="av">${dwarfIcon(d)}</div><div class="inf">${esc(fullName(d))} <small>${fl(d.age)} J.</small><br>
    <small class="${d.job ? 'muted' : 'w'}">${esc(jobLabel(d))}</small></div>
    <div class="pct">${Math.round(eff(d, jt) * 100)} %</div></div>`).join('') || '<p class="muted">Niemand verfügbar.</p>';
  return h;
}

function sheetDwarf({ id }) {
  const d = dw(+id); if (!d) return closeSheet();
  const p = d.partner != null ? dw(d.partner) : null;
  const par = d.parents.map(dw).filter(Boolean);
  const kids = S.dwarves.filter(o => o.parents.includes(d.id));
  const sk = Object.keys(d.skill).filter(k => d.skill[k] > 0.5).sort((a, b) => d.skill[b] - d.skill[a]).slice(0, 4);
  const hb = d.home != null ? findB(d.home) : null, hp = hb ? slotOf(hb.id) : null;
  const skn = k => k === 'bau' ? 'Bauen' : k === 'dig' ? 'Graben' : (B[k] ? B[k].n : k);
  let h = `<h3>${dwarfIcon(d)} ${esc(fullName(d))}</h3>
    <div class="card"><p>${fl(d.age)} Jahre · ${({ kind: 'Kind', lehrling: 'Lehrling (50 %)', erwachsen: 'Erwachsen', alt: 'Alt – keine schwere Arbeit' })[stage(d)]}</p>
    <p>Tätigkeit: <b>${esc(jobLabel(d))}</b></p>
    <p>Wohnt: ${hp ? `Wohnhöhle in ${S.caves[hp.ci].name}` : '<span class="w">nirgends</span>'}</p>
    ${p ? `<p>Partner: ${esc(fullName(p))}</p>` : ''}${par.length ? `<p>Eltern: ${par.map(x => esc(x.name)).join(' & ')}</p>` : ''}
    ${kids.length ? `<p>Kinder: ${kids.map(x => esc(x.name)).join(', ')}</p>` : ''}
    ${d.hunger > 0.05 ? `<p class="w">Hunger: ${Math.round(d.hunger * 100)} %</p>` : ''}
    ${wantsOwn(d) ? `<p class="w">Will in eine eigene Wohnhöhle. Ohne freie Höhle zieht ${d.sex === 'm' ? 'er' : 'sie'} irgendwann fort.</p>` : ''}
    ${sk.length ? `<p class="muted">Geschick: ${sk.map(k => `${skn(k)} ${Math.round(skillLvl(d, k) * 100)} %`).join(' · ')}</p>` : ''}</div>`;
  if (stage(d) !== 'kind') h += `<div class="btns"><button class="btn" data-a="jobs" data-id="${d.id}">Arbeit zuweisen</button>
    ${d.job ? `<button class="btn ghost" data-a="unassign" data-id="${d.id}">Arbeit beenden</button>` : ''}</div>`;
  h += `<button class="btn ghost" data-a="homes" data-id="${d.id}">Umziehen</button>`;
  return h;
}

function sheetJobs({ id }) {
  const d = dw(+id); if (!d) return closeSheet();
  let h = `<h3>Arbeit für ${esc(d.name)}</h3>`;
  const items = [];
  for (const b of allBuildings()) {
    if (b.site) { if (buildersOf(b.id).length < 3 || (d.job && d.job.at === b.id)) items.push({ b, m: 'b', jt: 'bau', lbl: `🚧 Baustelle ${B[b.type].n}` }); continue; }
    if (!B[b.type].job || !canDo(d, b.type)) continue;
    const w = workerOf(b.id);
    items.push({ b, m: 'w', jt: b.type, lbl: `${B[b.type].ic} ${B[b.type].job}`, w });
  }
  if (!digLock() && canDo(d, 'dig')) items.push({ m: 'd', jt: 'dig', lbl: '⛏️ Stollenbau' });
  h += items.map(it => `<div class="dw sm" data-a="assign" data-id="${d.id}" data-m="${it.m}" data-at="${it.b ? it.b.id : ''}">
    <div class="inf"><b>${it.lbl}</b><br><small class="muted">${it.w ? 'jetzt: ' + esc(it.w.name) : it.m === 'w' ? '<span class="w">frei</span>' : ''}</small></div>
    <div class="pct">${Math.round(eff(d, it.jt) * 100)} %</div></div>`).join('');
  return h;
}

function sheetHomes({ id }) {
  const d = dw(+id); if (!d) return closeSheet();
  let h = `<h3>Neues Zuhause für ${esc(d.name)}</h3><p class="muted">Kinder sollten bei ihren Eltern bleiben.</p>`;
  h += houses().map(b => {
    const r = residents(b.id), p = slotOf(b.id);
    const here = d.home === b.id, full = r.length >= houseCap(b);
    return `<div class="dw sm ${here ? 'sel' : ''}" ${here || full ? '' : `data-a="move" data-id="${d.id}" data-h="${b.id}"`}>
      <div class="av">🚪</div><div class="inf"><b>${S.caves[p.ci].name}</b> · ${r.length}/${houseCap(b)}<br>
      <small class="muted">${r.map(x => esc(x.name)).join(', ') || 'leer'}</small></div>${full && !here ? '<div class="pct">voll</div>' : ''}</div>`;
  }).join('');
  return h;
}

function sheetOffline({ dur, logs, before }) {
  let h = `<h3>🌙 Während du fort warst</h3><p class="muted">${fmtDur(dur)} sind in Tiefenheim vergangen.</p>`;
  const diffs = Object.keys(RES).map(k => [k, S.res[k] - (before[k] || 0)]).filter(x => Math.abs(x[1]) >= 1);
  if (diffs.length) h += `<div class="costs">${diffs.map(([k, v]) => `<span class="cost ${v < 0 ? 'lack' : ''}">${RES[k].ic} ${v > 0 ? '+' : ''}${fl(v)}</span>`).join('')}</div>`;
  h += logs.length ? `<div class="card">${logs.map(l => `<div class="lg ${l.cls}"><small>J${yearOf(l.t)}</small> ${esc(l.txt)}</div>`).join('')}</div>` : '<p>Es war ruhig.</p>';
  h += `<button class="btn" data-a="close">Weiter</button>`;
  return h;
}

function renderSheet(fresh) {
  if (!sheet) return;
  const fn = { slot: sheetSlot, pick: sheetPick, dwarf: sheetDwarf, jobs: sheetJobs, homes: sheetHomes, offline: sheetOffline, info: a => a.html }[sheet.kind];
  const html = fn(sheet.args);
  if (!sheet) return;
  const body = $('#sheetBody');
  const st = body.scrollTop;
  body.innerHTML = html;
  if (!fresh) body.scrollTop = st; else body.scrollTop = 0;
  $('#sheet').classList.add('on'); $('#shade').classList.add('on');
}

// ---------- Render ----------
function render() {
  renderTop();
  const v = { caves: renderCaves, folk: renderFolk, research: renderResearch, log: renderLog }[tab]();
  $('#view').innerHTML = v;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  const idle = S.dwarves.filter(d => !d.job && stage(d) !== 'kind').length;
  $('#nb-folk').textContent = idle || '';
  $('#nb-research').textContent = (!S.research.cur && allBuildings().some(b => b.type === 'tueftel' && b.lvl > 0)) ? '!' : '';
  if (sheet && sheet.kind !== 'offline' && sheet.kind !== 'info') renderSheet(false);
}

// ---------- Eingaben ----------
const A = {
  tab: d => { tab = d.t; closeSheet(); $('#view').scrollTop = 0; $('main').scrollTop = 0; },
  slot: d => openSheet('slot', { ci: +d.c, si: +d.s }),
  build: d => {
    const r = actBuild(+d.c, +d.s, d.t);
    if (typeof r === 'string') return toast(r);
    openSheet('pick', { m: 'b', at: r.id });
    toast('Baustelle steht – jetzt Bauarbeiter wählen!');
  },
  pick: d => openSheet('pick', { m: d.m, at: d.at }),
  assign: d => {
    const at = d.at === '' || d.at === 'null' || d.at == null ? null : +d.at;
    if (d.m === 'b' && buildersOf(at).length >= 3) return toast('Höchstens 3 Bauarbeiter');
    if (d.m === 'd' && diggers().length >= 3) return toast('Höchstens 3 Hauer');
    actAssign(+d.id, { k: d.m, at });
    if (sheet && sheet.kind === 'pick' && d.m === 'w') { const b = findB(at); const p = slotOf(at); closeSheet(); if (p) openSheet('slot', p); }
    else if (sheet && sheet.kind === 'jobs') openSheet('dwarf', { id: d.id });
  },
  unassign: d => { const x = dw(+d.id); if (x) x.job = null; },
  dwarf: d => openSheet('dwarf', { id: d.id }),
  jobs: d => openSheet('jobs', { id: d.id }),
  homes: d => openSheet('homes', { id: d.id }),
  move: d => { const r = actMove(+d.id, +d.h); if (r !== true) toast(r); else openSheet('dwarf', { id: d.id }); },
  upgrade: d => { const r = actUpgrade(+d.id); if (r !== true) toast(r); else { openSheet('pick', { m: 'b', at: d.id }); toast('Ausbau begonnen – Bauarbeiter wählen!'); } },
  cancel: d => { actCancelSite(+d.id); closeSheet(); },
  demolish: d => {
    if (sheet.args.confirmDemo !== d.id) { sheet.args.confirmDemo = d.id; return toast('Nochmal tippen zum Abreißen'); }
    const r = actDemolish(+d.id); if (r !== true) toast(r || 'Nicht möglich'); else closeSheet();
  },
  research: d => { const r = actResearch(d.id); if (r !== true) toast(r); },
  auto: () => { const n = actAutoAssign(); toast(n ? `${n} Zwerge eingeteilt` : 'Keine passenden freien Arbeitsplätze'); },
  close: () => closeSheet(),
  resinfo: d => toast(`${RES[d.k].n}: ${fl(S.res[d.k])} / ${storeCap()}`),
  reset: () => {
    if (!confirmReset) { confirmReset = 1; setTimeout(() => { confirmReset = 0; }, 4000); return; }
    confirmReset = 0; localStorage.removeItem(SAVE_KEY); newGame(); saveGame(); tab = 'caves';
  },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const f = A[el.dataset.a];
  if (f) { f(el.dataset); render(); saveGame(); }
});
$('#shade').addEventListener('click', () => { closeSheet(); render(); });

window.handleBack = () => {
  if (sheet) { closeSheet(); render(); return true; }
  if (tab !== 'caves') { tab = 'caves'; render(); return true; }
  return false;
};
window.saveGame = saveGame;

// ---------- Zeit ----------
let lastTick = Date.now();
function catchUpReal(showSummary) {
  const now = Date.now();
  const away = (now - (S.lastReal || now)) / 1000;
  if (away > 60) {
    const before = Object.assign({}, S.res), n0 = S.log.length, top = S.log[0];
    catchUp(away);
    const idx = top ? S.log.indexOf(top) : S.log.length;
    const logs = S.log.slice(0, idx < 0 ? 30 : idx).slice(0, 40);
    if (showSummary) openSheet('offline', { dur: away, logs, before });
  }
  S.lastReal = now; lastTick = now;
}
window.onResumeGame = () => { catchUpReal(true); render(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); else window.onResumeGame(); });

function tick() {
  const now = Date.now();
  let dt = (now - lastTick) / 1000;
  lastTick = now;
  if (dt > 60) { S.lastReal = now - dt * 1000; catchUpReal(true); }
  else if (dt > 0) step(dt);
  S.lastReal = now;
  render();
}

// ---------- Start ----------
if (!loadGame()) { newGame(); saveGame(); openSheet('info', { html: `<h3>⛏️ Willkommen in Tiefenheim</h3>
  <p>Zwei Zwergensippen haben sich in einer Grotte tief unter dem Berg niedergelassen. Du lenkst ihr Schicksal.</p>
  <div class="card"><p>• <b>Jedes Gebäude braucht einen Zwerg.</b> Ohne Arbeiter entsteht nichts.</p>
  <p>• <b>Bauen kostet Material und Arbeit.</b> Bauarbeiter müssen auf die Baustelle.</p>
  <p>• <b>Zwerge altern, heiraten, bekommen Kinder.</b> Mit 25 wollen Jungzwerge ausziehen – ohne freie Wohnhöhle wandern sie ab.</p>
  <p>• <b>Die Zeit läuft echt.</b> 1 Zwergenjahr = 30 Minuten. Keine Beschleuniger. Plane voraus.</p></div>
  <button class="btn" data-a="close">Los geht's</button>` }); }
else catchUpReal(true);
render();
setInterval(tick, 1000);
setInterval(saveGame, 15000);
