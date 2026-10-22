'use strict';
// ===== Tiefenheim – Spieldaten =====
// Zeit: 1 Zwergenjahr = 30 echte Minuten. Raten sind "pro echte Stunde".
const YEAR = 1800;
const AGE_APPRENTICE = 15, AGE_ADULT = 25, AGE_ELDER = 120;
const BUILD_RATE = 60;          // Arbeit pro Stunde pro Bauarbeiter
const DIG_WORK_PER_M = 8;       // Arbeit pro Stollenmeter
const BASE_STORE = 150;
const LVL_MULT = [1, 1.6, 2.2];

const RES = {
  pilze:    { n: 'Pilze',       ic: '🍄', food: 1 },
  mahlzeit: { n: 'Mahlzeiten',  ic: '🍲', food: 2.5 },
  wasser:   { n: 'Wasser',      ic: '💧' },
  bier:     { n: 'Pilzbier',    ic: '🍺' },
  pilzholz: { n: 'Pilzholz',    ic: '🪵' },
  balken:   { n: 'Balken',      ic: '🪜' },
  stein:    { n: 'Stein',       ic: '🪨' },
  quader:   { n: 'Quader',      ic: '🧱' },
  kohle:    { n: 'Kohle',       ic: '⚫' },
  erz:      { n: 'Eisenerz',    ic: '🟤' },
  eisen:    { n: 'Eisen',       ic: '🔩' },
  werkzeug: { n: 'Werkzeug',    ic: '🔨' },
};

const DEPOSITS = {
  quelle: { n: 'Quelle', ic: '💧' },
  kohle:  { n: 'Kohleflöz', ic: '⚫' },
  erz:    { n: 'Erzader', ic: '🟤' },
};

const B = {
  haus:       { n: 'Wohnhöhle', ic: '🚪', cost: { stein: 20, pilzholz: 15 }, work: 60, house: [4, 6, 8],
                desc: 'Wohnraum für eine Familie. Junge Zwerge wollen mit 25 ausziehen – ohne freie Höhle wandern sie ab.' },
  pilzgarten: { n: 'Pilzgarten', ic: '🍄', cost: { stein: 10, pilzholz: 10 }, work: 45, inp: { wasser: 6 }, out: { pilze: 30 }, job: 'Pilzbauer',
                desc: 'Feuchte Beete voller Speisepilze. Braucht Wasser.' },
  brunnen:    { n: 'Brunnen', ic: '⛲', dep: 'quelle', cost: { stein: 25, pilzholz: 10 }, work: 60, out: { wasser: 40 }, job: 'Brunnenwart',
                desc: 'Schöpft Wasser aus einer Quelle.' },
  hain:       { n: 'Riesenpilzhain', ic: '🌿', cost: { stein: 10, pilze: 20 }, work: 45, inp: { wasser: 4 }, out: { pilzholz: 16 }, job: 'Hainpfleger',
                desc: 'Baumhohe Pilze. Ihre zähen Stiele sind das Holz der Tiefe.' },
  steinbruch: { n: 'Steinbruch', ic: '⛏️', cost: { pilzholz: 15 }, work: 40, out: { stein: 24 }, heavy: 1, job: 'Steinhauer',
                desc: 'Bricht Stein aus der Höhlenwand. Schwere Arbeit.' },
  zimmerei:   { n: 'Zimmerei', ic: '🪚', cost: { stein: 15, pilzholz: 25 }, work: 60, inp: { pilzholz: 24 }, out: { balken: 12 }, job: 'Zimmermann',
                desc: 'Sägt Pilzholz zu tragfähigen Balken.' },
  lager:      { n: 'Lagergewölbe', ic: '📦', cost: { stein: 30, pilzholz: 20 }, work: 80, store: 250,
                desc: 'Mehr Platz für alle Waren (+250 je Stufe).' },
  tueftel:    { n: 'Tüftelstube', ic: '📜', cost: { stein: 20, pilzholz: 15, balken: 5 }, work: 70, research: 1, job: 'Tüftler',
                desc: 'Hier wird aus Überschuss Neues ersonnen. Alte Zwerge sind hier besonders gut.' },
  kueche:     { n: 'Küche', ic: '🍲', req: 'kochkunst', cost: { stein: 20, balken: 8 }, work: 50, inp: { pilze: 18, wasser: 6 }, out: { mahlzeit: 12 }, job: 'Koch',
                desc: 'Mahlzeiten sättigen 2,5× so gut wie rohe Pilze und heben die Stimmung.' },
  brauerei:   { n: 'Brauerei', ic: '🍺', req: 'braukunst', cost: { stein: 20, balken: 15 }, work: 70, inp: { pilze: 10, wasser: 10 }, out: { bier: 8 }, job: 'Brauer',
                desc: 'Ein Zwerg ohne Bier ist ein mürrischer Zwerg.' },
  kohlegrube: { n: 'Kohlegrube', ic: '⚫', dep: 'kohle', cost: { balken: 15, pilzholz: 10 }, work: 70, out: { kohle: 15 }, heavy: 1, job: 'Kohlehauer',
                desc: 'Baut Kohle aus einem Flöz ab.' },
  erzmine:    { n: 'Erzmine', ic: '⛰️', dep: 'erz', cost: { balken: 20, stein: 10 }, work: 90, out: { erz: 12 }, heavy: 1, job: 'Erzhauer',
                desc: 'Folgt der Erzader in den Fels.' },
  steinmetz:  { n: 'Steinmetz', ic: '🧱', req: 'steinmetzkunst', cost: { stein: 30, balken: 10 }, work: 60, inp: { stein: 16 }, out: { quader: 8 }, job: 'Steinmetz',
                desc: 'Behaut Bruchstein zu passgenauen Quadern.' },
  schmelze:   { n: 'Schmelze', ic: '🔥', req: 'ofenbau', cost: { quader: 20, stein: 20, balken: 10 }, work: 100, inp: { erz: 12, kohle: 8 }, out: { eisen: 6 }, job: 'Schmelzer',
                desc: 'Erz und Kohle werden zu Eisen.' },
  schmiede:   { n: 'Schmiede', ic: '⚒️', req: 'schmiedekunst', cost: { quader: 15, balken: 15, eisen: 10 }, work: 100, inp: { eisen: 4, balken: 2 }, out: { werkzeug: 3 }, job: 'Schmied',
                desc: 'Fertigt Werkzeug aus Eisen und Holz.' },
};
const BUILD_ORDER = ['haus', 'pilzgarten', 'brunnen', 'hain', 'steinbruch', 'zimmerei', 'lager', 'tueftel', 'kueche', 'brauerei',
  'kohlegrube', 'erzmine', 'steinmetz', 'schmelze', 'schmiede'];

const RESEARCH = {
  kochkunst:      { n: 'Kochkunst', ic: '🍲', cost: { pilze: 20, wasser: 20 }, h: 0.5, desc: 'Schaltet die Küche frei.' },
  steinmetzkunst: { n: 'Steinmetzkunst', ic: '🧱', cost: { stein: 40 }, h: 0.75, desc: 'Schaltet den Steinmetz frei.' },
  stuetzbalken:   { n: 'Stützbalken', ic: '🪜', cost: { balken: 30, stein: 20 }, h: 1, desc: 'Erlaubt Stollen tiefer als die zweite Höhle.' },
  braukunst:      { n: 'Braukunst', ic: '🍺', cost: { pilze: 40, wasser: 30, balken: 10 }, h: 1, req: ['kochkunst'], desc: 'Schaltet die Brauerei frei.' },
  pilzzucht:      { n: 'Pilzzucht', ic: '🍄', cost: { pilze: 60, wasser: 40, mahlzeit: 10 }, h: 1.5, req: ['kochkunst'], desc: 'Pilzgärten +30 %.' },
  ofenbau:        { n: 'Ofenbau', ic: '🔥', cost: { quader: 20, stein: 40 }, h: 1.5, req: ['steinmetzkunst'], desc: 'Schaltet die Schmelze frei.' },
  schmiedekunst:  { n: 'Schmiedekunst', ic: '⚒️', cost: { eisen: 15, balken: 20 }, h: 2, req: ['ofenbau'], desc: 'Schaltet die Schmiede frei.' },
  flaschenzug:    { n: 'Flaschenzug', ic: '⛓️', cost: { balken: 30, eisen: 10, pilzholz: 20 }, h: 2, req: ['ofenbau'], desc: 'Steinbruch, Gruben & Stollenbau +25 %. Nötig für Höhlen ab Nr. 5.' },
  wasserrad:      { n: 'Wasserrad', ic: '🛞', cost: { balken: 40, eisen: 10 }, h: 2, req: ['ofenbau'], desc: 'Brunnen +50 %.' },
  gewoelbebau:    { n: 'Gewölbebau', ic: '🏛️', cost: { quader: 40, balken: 30, werkzeug: 5 }, h: 3, req: ['schmiedekunst'], desc: 'Erlaubt Ausbaustufe 3 für alle Gebäude.' },
  loren:          { n: 'Loren & Schienen', ic: '🛤️', cost: { eisen: 30, balken: 40, werkzeug: 5 }, h: 3, req: ['flaschenzug'], desc: 'Gruben +40 %, Stollenbau +30 %. Nötig für Höhlen ab Nr. 7.' },
};

const CAVE_NAMES = ['Eingangsgrotte', 'Moosgewölbe', 'Glutkluft', 'Tropfsteinsaal', 'Erzhalle', 'Echokammer',
  'Schwarzer Schlund', 'Kristallgrund', 'Tiefe Halle', 'Wurzelgang', 'Nebelsee', 'Ahnengruft'];

const NAMES_M = ['Brokk', 'Hagor', 'Garrik', 'Bodo', 'Ulfgar', 'Korgan', 'Dvalin', 'Fjalar', 'Hjalmar', 'Ragnor', 'Grimwald', 'Bärgo',
  'Torvik', 'Alrik', 'Snorri', 'Ivar', 'Holger', 'Bjarni', 'Gunnar', 'Ormar', 'Egil', 'Vigo', 'Skarn', 'Haldor'];
const NAMES_F = ['Ingrun', 'Sigrun', 'Asta', 'Tordis', 'Hilde', 'Brunhild', 'Gudrun', 'Helga', 'Ragna', 'Ylva', 'Svala', 'Dagny',
  'Frida', 'Runa', 'Thora', 'Alva', 'Edda', 'Gerda', 'Ilka', 'Sölvi', 'Wenna', 'Berit', 'Kelda', 'Mira'];
const SURNAMES = ['Eisenbart', 'Steinfaust', 'Kupferhand', 'Tiefgrund', 'Funkenschlag', 'Felsenbruch', 'Grauhammer', 'Moosbart',
  'Ambossweg', 'Schlackenbrot', 'Erzläufer', 'Glimmstein'];

const GOALS = [
  { t: 'Teile Arbeiter ein', h: 'Tippe auf den Pilzgarten und den Brunnen und weise jeweils einen Zwerg zu. Ohne Arbeiter entsteht nichts.',
    done: s => hasWorker(s, 'pilzgarten') && hasWorker(s, 'brunnen') },
  { t: 'Baue einen Steinbruch', h: 'Tippe auf einen freien Bauplatz. Danach Bauarbeiter auf die Baustelle schicken – Material allein baut nichts.',
    done: s => countB(s, 'steinbruch') > 0 },
  { t: 'Baue einen Riesenpilzhain', h: 'Pilzholz ist das Holz der Tiefe. Ohne Holz keine Gebäude.', done: s => countB(s, 'hain') > 0 },
  { t: 'Baue eine dritte Wohnhöhle', h: 'Garrik wird bald volljährig. Findet er keine eigene Höhle, zieht er fort.', done: s => countB(s, 'haus') >= 3 },
  { t: 'Baue eine Zimmerei', h: 'Balken braucht man für Stollen, Ausbauten und fast alles Weitere.', done: s => countB(s, 'zimmerei') > 0 },
  { t: 'Baue eine Tüftelstube & erforsche Kochkunst', h: 'Der alte Fjalar weiß noch, wie man Pilze richtig kocht.', done: s => s.research.done.includes('kochkunst') },
  { t: 'Grabe einen Stollen zur nächsten Höhle', h: 'Dein Platz ist begrenzt. Unten in der Dunkelheit warten Kohle, Erz und Quellen.', done: s => s.caves.length >= 2 },
  { t: 'Erforsche Ofenbau', h: 'Steinmetzkunst → Quader → Ofenbau. Eisen ist die Zukunft.', done: s => s.research.done.includes('ofenbau') },
  { t: 'Stelle Werkzeug her', h: 'Schmelze und Schmiede brauchen Erz und Kohle aus tieferen Höhlen.', done: s => (s.stats.made.werkzeug || 0) >= 1 },
  { t: 'Erreiche 20 Einwohner', h: 'Gute Stimmung lockt Wanderer an – aber nur, wenn eine Höhle frei ist.', done: s => s.dwarves.length >= 20 },
];
