#!/usr/bin/env node
// Node.js harness to run the WRR Full experiment from the command line.
// Usage: node tools/run-wrr-node.js [--skip-cap N] [--no-perm] [--perms N]
'use strict';

const fs = require('fs');
const path = require('path');

// ---- Parse CLI args ----
const args = process.argv.slice(2);
let skipCap = 200;
let runPerm = false;
let numPerm = 100;
let use58Filter = true;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--skip-cap' && args[i+1]) skipCap = parseInt(args[i+1]);
  if (args[i] === '--perms') { runPerm = true; numPerm = parseInt(args[i+1]); }
  if (args[i] === '--no-perm') runPerm = false;
  if (args[i] === '--no-58filter') use58Filter = false;
}

// ---- Mock self/postMessage for the worker ----
const messages = [];
global.self = {
  onmessage: null,
  postMessage(msg) {
    if (msg.type === 'wrr-phase') {
      console.log(`  [${msg.phase}] ${msg.message}`);
    } else if (msg.type === 'wrr-rabbi-done') {
      const r = msg.result;
      if (r.c !== null) {
        process.stdout.write(`  ${msg.completed}/${msg.total} ${r.en}: c=${r.c.toFixed(4)}` +
          (r.c_noRabbi !== null ? ` c_nr=${r.c_noRabbi.toFixed(4)}` : '') + '\n');
      } else {
        process.stdout.write(`  ${msg.completed}/${msg.total} ${r.en}: c=null\n`);
      }
    } else if (msg.type === 'wrr-complete') {
      console.log('\n========== WRR RESULTS ==========');
      console.log(`Matched rabbis: ${msg.matchedCount} / ${msg.totalRabbis}`);
      if (msg.matchedCount_noRabbi !== undefined)
        console.log(`Matched (no רבי): ${msg.matchedCount_noRabbi}`);
      if (msg.totalPairsConsidered)
        console.log(`Word pairs (5-8 chars): ${msg.totalPairsConsidered} (filtered: ${msg.pairsFiltered})`);
      console.log(`P₁ (Bin 0.2): ${msg.p1.toExponential(4)}`);
      console.log(`P₂ (Gamma):   ${msg.p2.toExponential(4)}`);
      if (msg.p3 !== undefined) {
        console.log(`P₃ (Bin, no רבי): ${msg.p3.toExponential(4)}`);
        console.log(`P₄ (Gamma, no רבי): ${msg.p4.toExponential(4)}`);
        console.log(`P = 4·min(P₁–P₄): ${msg.overallP.toExponential(4)}`);
      } else {
        console.log(`P = 2·min(P₁,P₂): ${msg.overallP.toExponential(4)}`);
      }
      console.log('=================================\n');

      // Print per-rabbi c values sorted
      const sorted = msg.rabbiResults
        .filter(r => r.c !== null)
        .sort((a,b) => a.c - b.c);
      console.log('Per-rabbi c values (sorted):');
      for (const r of sorted) {
        console.log(`  ${r.c.toFixed(4)}  ${r.en}  [${r.name} × ${r.date}]`);
      }
      const cBelow02 = msg.cValues.filter(c => c < 0.2).length;
      const cBelow01 = msg.cValues.filter(c => c < 0.1).length;
      console.log(`\nc < 0.2: ${cBelow02}/${msg.cValues.length}   c < 0.1: ${cBelow01}/${msg.cValues.length}`);
      messages.push(msg);
    } else if (msg.type === 'wrr-perm-progress') {
      if (msg.completed % 10 === 0 || msg.completed === msg.total) {
        process.stdout.write(`  Perm ${msg.completed}/${msg.total}  better: ${msg.betterCount}  est.P: ${msg.currentPValue.toFixed(4)}\r`);
      }
    } else if (msg.type === 'wrr-perm-complete') {
      console.log(`\nPermutation test: P = ${msg.pValue.toFixed(4)} (${msg.betterCount}/${msg.numPermutations} ≤ ${msg.actualOverallP.toExponential(4)})`);
    } else if (msg.type === 'error') {
      console.error('ERROR:', msg.message);
    }
  }
};

// ---- Load the worker (it sets self.onmessage) ----
require('../engines/wrr.worker.js');

// ---- Load Torah text and prepare Genesis ----
const torahPath = path.join(__dirname, '..', 'data', 'torahNoSpaces.txt');
const torah = fs.readFileSync(torahPath, 'utf-8').trim();
const genesis = torah.slice(0, 78064);

// Sofit normalization
const SOFIT_MAP = { 'ך':'כ', 'ם':'מ', 'ן':'נ', 'ף':'פ', 'ץ':'צ' };
function normalizeSofiot(s) {
  return s.replace(/[ךםןףץ]/g, ch => SOFIT_MAP[ch]);
}
const genesisNorm = normalizeSofiot(genesis);

// Letter frequency map
const letterFreqs = {};
for (const ch of genesisNorm) {
  letterFreqs[ch] = (letterFreqs[ch] || 0) + 1;
}
for (const ch in letterFreqs) {
  letterFreqs[ch] /= genesisNorm.length;
}

// ---- Rabbi data (List 2 — 32 rabbis, 174 appellations) ----
const WRR_RABBIS = [
  { id:1, en:"Abraham ben David (RABaD)", names:["רביאברהמ","הראבי","הרבאבד","הראבד","האשכול","בעלהאשכול","ראבי","הרבאבביתדינ","ראבד"], dates:["כ חשונ","כ בחשונ","בכ חשונ"] },
  { id:2, en:"Abraham Yitzhaki", names:["רביאברהמ","יצחקי","זרעאברהמ","בעלזרעאברהמ","אברהמיצחקי"], dates:["יג סיונ","יג בסיונ","ביג סיונ"] },
  { id:3, en:"Abraham HaMalakh", names:["רביאברהמ","המלאכ","חסדלאברהמ","בעלחסדלאברהמ"], dates:["יב תשרי","יב בתשרי","ביב תשרי"] },
  { id:4, en:"Abraham Saba", names:["רביאברהמ","אברהמסבע","צרורהמר","בעלצרורהמר"], dates:[] },
  { id:5, en:"Aaron HaGadol of Karlin", names:["רביאהרנ","אהרנהגדולמקרלינ"], dates:["יט ניסנ","יט בניסנ","ביט ניסנ"] },
  { id:6, en:"Eliezer Ashkenazi", names:["מעשיהשמ","מעשייהוה","בעלמעשיהשמ","בעלמעשייהוה","אליעזראשכנזי","רביאליעזר"], dates:["כב כסלו","כב בכסלו","בכב כסלו"] },
  { id:7, en:"David Oppenheim", names:["רבידוד","אופנהימ","הרדא","מהרדאופנהימ","דודאופנהימ"], dates:["ז תשרי","ז בתשרי","בז תשרי"] },
  { id:8, en:"David HaNagid", names:["רבידוד","דודהנגיד"], dates:[] },
  { id:9, en:"David Nieto", names:["רבידוד","דודניטו","הכוזריהשני","בעלהכוזריהשני","ניטו"], dates:["כח טבת","כח בטבת","בכח טבת"] },
  { id:10, en:"Hayyim Abulafia", names:["רביחיימ","חיימאבואלעפיה","אבואלעפיה"], dates:["ו ניסנ","ו בניסנ","בו ניסנ"] },
  { id:11, en:"Hayyim Benveniste", names:["רביחיימ","בנבנשת","כנסתהגדולה","בעלכנסתהגדולה","חיימבנבנשת"], dates:["יט אלול","יט באלול","ביט אלול"] },
  { id:12, en:"Hayyim Capusi", names:["רביחיימ","כפוסי","בעלנס","בעלהנס","חיימכפוסי"], dates:["יב שבט","יב בשבט","ביב שבט"] },
  { id:13, en:"Hayyim Shabetai", names:["רביחיימ","חיימשבתי","מהרחש","המהרחש"], dates:["יג ניסנ","יג בניסנ","ביג ניסנ"] },
  { id:14, en:"Yair Hayyim Bacharach", names:["חותיאיר","בעלחותיאיר","יאירחיימבכרכ","בכרכ","רבייאירחיימ"], dates:["א טבת","א בטבת","בא טבת"] },
  { id:15, en:"Yehuda HeHasid", names:["רבייהודה","יהודהחסיד","יהודההחסיד"], dates:["ה חשונ","ה בחשונ","בה חשונ"] },
  { id:16, en:"Yehuda Ayash", names:["רבייהודה","מהריעיאש","יהודהעיאש","עיאש"], dates:["א תשרי","א בתשרי","בא תשרי"] },
  { id:17, en:"Yehosef HaNagid", names:["רבייהוספ"], dates:["ט טבת","ט בטבת","בט טבת"] },
  { id:18, en:"Yehoshua (Maginei Shlomo)", names:["רבייהושע","מגנישלמה"], dates:["כז אב","כז באב","בכז אב"] },
  { id:19, en:"Yosef di Trani (MaHaRiT)", names:["רבייוספ","מטרני","יוספטרני","טראני","מטראני","מהרימט","המהרימט","מהריט","המהריט","יוספמטרני","יוספטראני","יוספמטראני","טרני"], dates:["יד תמוז","יד בתמוז","ביד תמוז"] },
  { id:20, en:"Yosef Te'omim", names:["רבייוספ","תאומימ","פרימגדימ","בעלפרימגדימ","יוספתאומימ"], dates:["ד איר","ד באיר","בד איר"] },
  { id:21, en:"Ya'akov BeRav", names:["רבייעקב","יעקבבירב","מהריבירב","הריבר","בירב"], dates:["ל ניסנ","ל בניסנ","בל ניסנ"] },
  { id:22, en:"Yisrael Ya'akov Hagiz", names:["חאגיז","בעלהלקט","הלקט","ישראליעקב","רביישראליעקב"], dates:["כו שבט","כו בשבט","בכו שבט"] },
  { id:23, en:"Ya'akov Moelin (MaHaRIL)", names:["רבייעקב","מולינ","יעקבסגל","יעקבהלוי","מהריסגל","מהריהלוי","מהריל","המהריל","יעקבמולינ"], dates:["כב אלול","כב באלול","בכב אלול"] },
  { id:24, en:"Ya'akov Emden (Ya'avetz)", names:["היעבצ","הריעבצ","עמדינ","הריעמדנ","הריעמדינ","יעקבישראלעמדנ","יעקבישראלעמדינ","עמדנ","רבייעקבישראל"], dates:["ל ניסנ","ל בניסנ","בל ניסנ"] },
  { id:25, en:"Yitzhak HaLevi Horowitz", names:["רבייצחק","הורוויצ","יצחקהלוי","רביאיצקלהמבורגר","יצחקהלויאישהורוויצ"], dates:["ו איר","ו באיר","בו איר"] },
  { id:26, en:"Menachem Mendel Krochmal", names:["רבימנחמ","קרוכמל","רבימענדל","צמחצדק","בעלצמחצדק","מנחממענדל"], dates:["ב שבט","ב בשבט","בב שבט"] },
  { id:27, en:"Moshe Zacuto", names:["רבימשה","זכותא","זכותו","משהזכות","משהזכותא","משהזכותו","מהרמזכות","מהרמז","המהרמז","המזלנ","קולהרמז","מזלנ","בעלקולהרמז","זכות"], dates:["טז תשרי","טז בתשרי","בטז תשרי","יו תשרי","יו בתשרי","ביו תשרי"] },
  { id:28, en:"Moshe Margalit", names:["רבימשה","מרגלית","פנימשה","בעלפנימשה","משהמרגלית"], dates:["יב טבת","יב בטבת","ביב טבת"] },
  { id:29, en:"Azariah Figo", names:["רביעזריה","עזריהפיגו"], dates:["א אדרא","א באדרא","בא אדרא"] },
  { id:30, en:"Immanuel Hai Ricchi", names:["אחהער","ישרלבב","משנתחסידימ","בעלמשנתחסידימ","בעלישרלבב","עמנואלחירפאלריקי","ריקי","רביעמנואלחירפאל"], dates:["א אדר","א באדר","בא אדר"] },
  { id:31, en:"Shalom Sharabi (RaShaSh)", names:["רבישלומ","מזרחי","שרעבי","שרשלומ","מהרשש","המהרשש","שמש","השמש","שלוממזרחי"], dates:["י שבט","י בשבט","בי שבט"] },
  { id:32, en:"Shlomo HaMa'almi", names:["רבישלמה","מרכבתהמשנה","בעלמרכבתהמשנה","שלמהמחלמא","שלמהמחעלמא"], dates:["כא תמוז","כא בתמוז","בכא תמוז"] }
];

console.log(`\nWRR Full Experiment — Node.js Runner`);
console.log(`Genesis: ${genesisNorm.length} chars, Skip cap: ±${skipCap}`);
console.log(`Rabbis: ${WRR_RABBIS.length} (${WRR_RABBIS.filter(r => r.dates.length > 0).length} with dates)`);
const totalAppellations = WRR_RABBIS.reduce((s, r) => s + r.names.length, 0);
console.log(`Total appellations: ${totalAppellations}`);
console.log(`5-8 char filter: ${use58Filter ? 'ON' : 'OFF'}`);
console.log(`Permutation test: ${runPerm ? numPerm + ' permutations' : 'disabled'}\n`);

// ---- Fire the worker ----
const startTime = Date.now();
self.onmessage({ data: {
  action: 'run-wrr-full',
  genesisNorm,
  rabbis: WRR_RABBIS,
  skipCap,
  letterFreqs,
  runPermTest: runPerm,
  numPermutations: numPerm,
  use58Filter
}});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nTotal time: ${elapsed}s`);
