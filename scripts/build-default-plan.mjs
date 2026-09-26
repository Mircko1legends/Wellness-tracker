// Builds the built-in plan from "Routine annuale 2026-2027" + "Nutrition & Training System".
// Run `node scripts/build-default-plan.mjs` after editing to regenerate src/data/defaultPlan.json.
import { writeFileSync } from "node:fs";

const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0;
const C = {
  sonno: "#c9d1e3", scuola: "#8fb3e0", trasporti: "#cfcfca", pasti: "#a8d99a", studio: "#6e62b6",
  allenamento: "#e07a5f", igiene: "#86cfc2", organizzazione: "#f2c27b", libero: "#e9e2cf",
};

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hm = (m) => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

let seq = 0;
const routine = [];
/** steps: [[minutesFromStart, label], ...] */
function act({ title, start, end, days, color, steps, essential, weeks, group }) {
  const id = `a${++seq}`;
  const s0 = toMin(start);
  routine.push({
    id, title, start, end, days, color,
    ...(essential !== undefined ? { essential } : {}),
    ...(weeks ? { weeks } : {}),
    ...(group ? { group } : {}),
    steps: steps.map(([off, label], j) => ({ id: `${id}-s${j}`, time: hm(s0 + off), label })),
  });
}

// ---------- shared blocks ----------
const SCHOOL = [MON, TUE, WED, THU, FRI];
const ALL = [MON, TUE, WED, THU, FRI, SAT, SUN];

act({ title: "Igiene mattina", start: "06:30", end: "06:50", days: ALL.filter((d) => d !== SUN), color: C.igiene, essential: true, steps: [
  [0, "Denti 2′ (spazzolino + lingua)"], [3, "Viso: detergente delicato"], [5, "Idratante"], [7, "Protezione solare SPF 30+"],
  [9, "Deodorante"], [11, "Capelli"], [14, "Lenti a contatto: mani lavate e asciutte, poi mettile"], [18, "Controllo generale: unghie, barba se serve"],
]});
act({ title: "Igiene mattina + pesata", start: "06:30", end: "06:50", days: [SUN], color: C.igiene, essential: true, steps: [
  [0, "Pesati: appena sveglio, dopo il bagno, prima di bere. Annota il peso"], [3, "Denti 2′ (spazzolino + lingua)"],
  [6, "Viso: detergente, idratante, SPF"], [10, "Deodorante e capelli"], [14, "Lenti a contatto: mani lavate e asciutte, poi mettile"],
]});

act({ title: "Vestiti, zaino", start: "07:05", end: "07:15", days: SCHOOL, color: C.organizzazione, essential: true, steps: [
  [0, "Vestiti (preparati ieri sera)"], [4, "Controllo zaino e borsa sport"], [7, "Borraccia da 1 L piena nello zaino"],
]});
act({ title: "Bus · inglese", start: "07:15", end: "08:00", days: SCHOOL, color: C.trasporti, steps: [
  [0, "15′ grammatica: esercizi sull'argomento della settimana"], [15, "15′ vocaboli in flashcard"], [30, "15′ flashcard della maturità"],
]});

// Scuola (8 ore il giovedì)
const snackAtSchool = {
  [MON]: "Pasto 2: panino con 100 g pane + 80 g tonno al naturale + 1 mela",
  [TUE]: "Pasto 2: panino con 100 g pane + 2 uova sode + 1 mela",
  [WED]: "Pasto 2: panino con 100 g pane + 100 g sgombro + 1 mela",
  [THU]: "Pasto 2 (doppio, oggi 8 ore): 150 g pane + 80 g tonno + 2 uova sode + 2 frutti",
  [FRI]: "Pasto 2: panino con 100 g pane + 80 g tonno + 1 mela",
};
for (const d of SCHOOL) {
  const long = d === THU;
  act({ title: "Scuola", start: "08:00", end: long ? "16:00" : "14:00", days: [d], color: C.scuola, essential: true, steps: [
    [0, "In classe: telefono silenzioso, appunti"],
    [180, snackAtSchool[d]],
    [185, "Riempi la borraccia"],
    [long ? 470 : 350, "Annota compiti, verifiche e interrogazioni"],
  ]});
}

act({ title: "Bus · ascolto", start: "14:00", end: "14:45", days: [MON, TUE, WED, FRI], color: C.trasporti, steps: [
  [0, "Podcast o video in inglese B2–C1 (20–25′)"], [25, "Stacco mentale"],
]});
act({ title: "Bus · ascolto", start: "16:00", end: "16:45", days: [THU], color: C.trasporti, steps: [
  [0, "Podcast o video in inglese (20–25′)"], [25, "Stacco mentale"],
]});

// ---------- meals ----------
function meal(title, start, end, days, items, extra = []) {
  const span = toMin(end) - toMin(start);
  const labels = [...items.map((i) => `Prepara/pesa: ${i}`), "Mangia seduto, senza telefono", ...extra];
  const steps = labels.map((l, i) => [labels.length > 1 ? Math.round(((span - 2) * i) / (labels.length - 1)) : 0, l]);
  act({ title, start, end, days, color: C.pasti, essential: true, steps });
}
const OATS = ["overnight oats (preparati la sera prima): 100 g avena + 300 ml latte + 1 banana + 20 g burro d'arachidi"];
const YOGURT_BOWL = ["250 g yogurt bianco + 80 g avena + 1 banana + 20 g burro d'arachidi"];
meal("Colazione", "06:50", "07:05", [MON, WED, FRI], OATS);
meal("Colazione", "06:50", "07:05", [TUE, THU], YOGURT_BOWL);
meal("Colazione", "06:50", "07:05", [SAT, SUN], ["3 uova strapazzate (fuoco basso)", "100 g pane + 1 frutto + 200 ml latte"]);

meal("Pranzo", "14:45", "15:00", [MON, FRI], ["dal contenitore: 150 g pollo + 120 g riso (crudo) + 200 g verdure + 10 g olio"]);
meal("Pranzo", "14:45", "15:00", [TUE], ["dal contenitore: 150 g pollo + 400 g patate + 200 g verdure + 10 g olio + 60 g pane"]);
meal("Pranzo", "14:45", "15:00", [WED], ["dal contenitore: pasta e ceci (100 g pasta + 150 g ceci + pelati + 10 g olio)"]);
meal("Pranzo tardivo", "16:45", "17:00", [THU], ["dal contenitore: 120 g riso + 160 g tonno + 200 g verdure + 10 g olio (buono anche freddo)"]);

act({ title: "Denti + stacco", start: "15:00", end: "15:15", days: [MON, TUE, WED, FRI], color: C.igiene, steps: [
  [0, "Denti (o almeno risciacquo) + filo se serve"], [5, "10′ senza schermo"],
]});
act({ title: "Denti + stacco", start: "17:00", end: "17:15", days: [THU], color: C.igiene, steps: [
  [0, "Denti + filo se serve"], [5, "10′ senza schermo"],
]});

// ---------- study blocks (method from section 4.2) ----------
function study(title, subject, start, minutes, days, detail) {
  const steps = [[0, `Scrivi in una riga l'obiettivo del blocco (${subject}) · telefono in un'altra stanza`]];
  if (minutes >= 90) {
    steps.push([2, `45′: ${detail}`], [47, "Pausa 5′ in piedi"], [52, `40′: ${detail}`]);
  } else if (minutes >= 60) {
    steps.push([2, detail], [Math.round(minutes / 2), "Metà blocco: ripeti a voce senza guardare"]);
  } else {
    steps.push([2, detail]);
  }
  steps.push([minutes - 2, "Segna le ore nella scheda settimanale"]);
  act({ title: `${title} · ${subject}`, start, end: hm(toMin(start) + minutes), days, color: C.studio, essential: false, steps });
}
const MAT = "studio attivo: ripeti a voce, schemi, flashcard (mai solo rileggere)";
const MATH = "20% teoria, 80% esercizi graduati; ogni errore nel quaderno degli errori";
const PHYS = "problemi; ogni errore nel quaderno degli errori";

// Lun/Mer/Ven: allenamento (3.3)
study("Studio 75′", "Maturità", "15:15", 75, [MON, WED, FRI], "compiti + consolidamento di quanto spiegato oggi");
act({ title: "Borsa sport", start: "16:30", end: "16:40", days: [MON, WED, FRI], color: C.organizzazione, steps: [
  [0, "Bende pulite"], [1, "Guantoni"], [2, "Paradenti nella custodia"], [3, "Asciugamano e ciabatte"], [5, "Cambio"], [7, "Snack (Pasto 4) e borraccia"],
]});
act({ title: "Tragitto palestra", start: "16:40", end: "17:00", days: [MON, WED, FRI], color: C.trasporti, steps: [
  [0, "Parti"], [2, "Flashcard sul bus"],
]});
act({ title: "Cambio", start: "17:00", end: "17:10", days: [MON, WED, FRI], color: C.allenamento, steps: [
  [0, "Spogliatoio"], [4, "Bendaggio mani"],
]});
act({ title: "Muay Thai 90′", start: "17:10", end: "18:40", days: [MON, WED, FRI], color: C.allenamento, essential: false, steps: [
  [0, "Lezione: tecnica prima dei pesi, da fresco"], [45, "Bevi durante la sessione"], [85, "Paradenti sciacquato subito e nella custodia"],
]});
const SCHEDA_A = ["Squat (o goblet squat) 3 × 6–10", "Panca piana con manubri 3 × 8–12", "Rematore con manubrio o al cavo 3 × 8–12", "Stacco rumeno 2 × 8–10", "Plank / core anti-rotazione 2 serie"];
const SCHEDA_B = ["Pressa o affondi 3 × 8–12", "Military press con manubri 3 × 8–10", "Lat machine o trazioni 3 × 6–12", "Hip thrust o leg curl 2 × 10–12", "Addominali + isometrie del collo leggere (con l'ok del maestro) 2 serie"];
function weights(letter, list, days, weeks) {
  const steps = [[0, "1–2 serie leggere del primo esercizio (sei già caldo dalla Muay Thai)"]];
  list.forEach((ex, i) => steps.push([2 + i * 8, ex]));
  steps.push([43, "Annota carichi e ripetizioni nel registro"]);
  act({ title: `Pesi 45′ · Scheda ${letter}`, group: "Pesi 45′", start: "18:40", end: "19:25", days, weeks, color: C.allenamento, essential: false, steps });
}
// Settimana 1 (ISO dispari) = A-B-A · settimana 2 (ISO pari) = B-A-B
weights("A", SCHEDA_A, [MON, FRI], "odd");
weights("B", SCHEDA_B, [WED], "odd");
weights("B", SCHEDA_B, [MON, FRI], "even");
weights("A", SCHEDA_A, [WED], "even");
act({ title: "Doccia post", start: "19:25", end: "19:45", days: [MON, WED, FRI], color: C.igiene, essential: false, steps: [
  [0, "Doccia completa con ciabatte"], [8, "Capelli"], [11, "Asciuga bene tra le dita dei piedi"], [14, "Deodorante e biancheria pulita"], [17, "Crema viso idratante"],
]});
act({ title: "Ritorno + snack", start: "19:45", end: "20:05", days: [MON, WED, FRI], color: C.pasti, essential: false, steps: [
  [0, "Pasto 4: 1 banana + 30 g pane"], [5, "Ascolto leggero sul bus"],
]});
meal("Cena", "20:05", "20:20", [MON], ["frittata di patate e cipolla (3 uova)", "100 g pane + insalata"], ["Più tardi, se hai fame: 250 ml latte"]);
meal("Cena", "20:05", "20:20", [WED], ["pasta al tonno: 100 g pasta + 120 g tonno + pelati + 10 g olio + verdura"], ["Più tardi, se hai fame: 150 g yogurt bianco"]);
meal("Cena", "20:05", "20:20", [FRI], ["riso saltato: riso avanzato + 3 uova + 200 g verdure surgelate + salsa di soia"], ["Più tardi, se hai fame: 250 ml latte o 150 g yogurt"]);
act({ title: "Libero", start: "20:20", end: "21:00", days: [MON, WED, FRI], color: C.libero, essential: false, steps: [
  [0, "Guantoni aperti ad asciugare, bende a lavare"], [5, "Tempo per te: recupero, famiglia"], [30, "Prepara zaino, borsa e vestiti per domani"],
]});

// Martedì (3.4)
study("Studio 90′", "Matematica", "15:15", 90, [TUE], `teoria + ${MATH}`);
act({ title: "Pausa", start: "16:45", end: "17:00", days: [TUE], color: C.libero, steps: [[0, "Alzati, bevi acqua, niente social"]] });
study("Studio 75′", "Fisica", "17:00", 75, [TUE], PHYS);
meal("Spuntino", "18:15", "18:30", [TUE], ["1 banana + 30 g pane"]);
study("Studio 60′", "Maturità", "18:30", 60, [TUE], `materie di indirizzo, ${MAT}`);
act({ title: "Shadow + mobilità", start: "19:30", end: "19:45", days: [TUE], color: C.allenamento, essential: false, steps: [
  [0, "3 round di shadow boxing da 3′ sul tema dell'ultima lezione"], [10, "Mobilità anche e caviglie"],
]});
meal("Cena", "19:45", "20:00", [TUE], ["125 g sgombro in scatola + 400 g patate lesse + 200 g verdure + 10 g olio"],
  ["Prima di sederti: seconda teglia (pollo e riso) in forno — cuoce mentre ceni"]);
act({ title: "Libero", start: "20:00", end: "20:30", days: [TUE], color: C.libero, essential: false, steps: [
  [0, "Recupero"], [20, "Togli la teglia: riempi 2 contenitori (pranzo di giovedì in frigo, venerdì in freezer)"],
]});

// Giovedì (3.2)
study("Studio 90′", "Matematica", "17:15", 90, [THU], MATH);
meal("Spuntino", "18:45", "19:00", [THU], ["1 banana (leggero: la cena è vicina)"]);
study("Studio 40′", "Inglese", "19:00", 40, [THU], "grammatica: teoria dell'argomento della settimana + esercizi scritti");
act({ title: "Shadow + mobilità", start: "19:40", end: "19:55", days: [THU], color: C.allenamento, essential: false, steps: [
  [0, "3 round di shadow boxing"], [10, "Stretching"],
]});
meal("Cena", "19:55", "20:10", [THU], ["3 uova strapazzate + 100 g pane", "verdure saltate + 10 g olio"], ["Più tardi, se hai fame: 250 ml latte"]);
act({ title: "Libero", start: "20:10", end: "20:30", days: [THU], color: C.libero, essential: false, steps: [[0, "Giornata lunga: stacca davvero"]] });

// Doccia serale mar/gio/sab/dom
act({ title: "Doccia + capelli", start: "20:30", end: "21:00", days: [TUE, THU, SAT, SUN], color: C.igiene, essential: true, steps: [
  [0, "Doccia completa"], [15, "Capelli"], [22, "Cura del corpo"],
]});

// Routine serale (tutti)
function evening(days, extra) {
  act({ title: "Routine serale", start: "21:00", end: "21:30", days, color: C.igiene, essential: true, steps: [
    [0, "Filo interdentale + denti 2′"], [5, "Detergente viso"], [8, "Idratante"], [10, "Antitraspirante (funziona meglio la sera)"],
    ...extra,
    [18, "Contenitore di domani dal freezer al frigo, poi nello zaino"],
    [21, "Togli le lenti a contatto e premi \"Ho tolto le lenti\""],
    [25, "Luci basse, telefono fuori dalla camera"],
  ]});
}
evening([MON, WED, FRI], [[13, "Paradenti lavato con acqua fredda e sapone"], [15, "Prepara vestiti di domani"]]);
evening([TUE], [[13, "Prepara zaino e vestiti di domani"]]);
evening([THU], [[13, "Prepara la borsa sport per venerdì"]]);
evening([SAT], [[13, "Prepara la domenica"]]);
evening([SUN], [[13, "Tutto pronto per lunedì?"]]);

act({ title: "Sonno", start: "21:30", end: "06:30", days: ALL, color: C.sonno, essential: true, steps: [
  [0, "Spegni: 9 ore piene, telefono fuori dalla camera o in modalità aereo"], [539, "Sveglia alle 06:30, anche nel weekend"],
]});

// Sabato (3.5)
act({ title: "Risveglio lento", start: "07:05", end: "07:40", days: [SAT], color: C.libero, steps: [[0, "Lettura leggera o musica, niente social"]] });
act({ title: "Luce + piano", start: "07:40", end: "08:00", days: [SAT], color: C.organizzazione, steps: [
  [0, "5′ fuori o alla finestra"], [6, "Scrivi i 5 obiettivi dei blocchi di oggi"],
]});
study("Studio 90′", "Matematica", "08:00", 90, [SAT], `blocco più difficile a mente fresca: ${MATH}`);
act({ title: "Pausa", start: "09:30", end: "09:45", days: [SAT], color: C.libero, steps: [[0, "Alzati, acqua, niente social"]] });
study("Studio 90′", "Fisica", "09:45", 90, [SAT], PHYS);
meal("Spuntino", "11:15", "11:30", [SAT], ["150 g yogurt bianco o 250 ml latte (la dieta il sabato non lo prevede: tienilo leggero)"]);
study("Studio 75′", "Sant'Anna / TOLC-I", "11:30", 75, [SAT], "problem solving: problemi di logica ed esercizi non standard");
act({ title: "Pausa", start: "12:45", end: "13:00", days: [SAT], color: C.libero, steps: [[0, "Alzati, acqua"]] });
meal("Pranzo", "13:00", "13:15", [SAT], ["dal contenitore: 150 g pollo + 400 g patate + 200 g verdure + 100 g pane"]);
act({ title: "Pausa lunga", start: "13:15", end: "14:30", days: [SAT], color: C.libero, steps: [[0, "Riposo vero: niente studio"]] });
study("Studio 75′", "Maturità", "14:30", 75, [SAT], MAT);
act({ title: "Pausa", start: "15:45", end: "16:00", days: [SAT], color: C.libero, steps: [[0, "Alzati, acqua"]] });
study("Studio 60′", "Inglese", "16:00", 60, [SAT], "test di ripasso + 1 testo scritto (email o saggio breve) corretto con le regole studiate");
meal("Spuntino", "17:00", "17:15", [SAT], ["250 g yogurt + 1 banana + 30 g pane (anche in piedi)"]);
act({ title: "Tecnica a casa 45′", start: "17:15", end: "18:00", days: [SAT], color: C.allenamento, essential: false, steps: [
  [0, "Shadow a tema (ultima lezione)"], [15, "Lavoro di piedi"], [27, "Mobilità anche e caviglie"], [37, "Core"],
]});
act({ title: "Cucina 30′", start: "18:00", end: "18:30", days: [SAT], color: C.organizzazione, essential: false, steps: [
  [0, "Pentola di fagioli (cena di oggi + pranzo di domani)"], [8, "400 g di riso"], [15, "4 uova sode"],
]});
act({ title: "Libero", start: "18:30", end: "19:30", days: [SAT], color: C.libero, essential: false, steps: [[0, "Uscite, amici, hobby"]] });
meal("Cena", "19:30", "19:45", [SAT], ["pasta e fagioli: 100 g pasta + 240 g fagioli + pelati + 10 g olio + verdura"], ["Più tardi, se hai fame: 250 ml latte"]);
act({ title: "Libero", start: "19:45", end: "20:30", days: [SAT], color: C.libero, essential: false, steps: [[0, "Tempo libero"]] });

// Domenica (3.6)
act({ title: "Libero", start: "07:05", end: "08:30", days: [SUN], color: C.libero, essential: false, steps: [[0, "Colazione con calma, passeggiata"]] });
study("Studio 90′", "Errori mate/fisica", "08:30", 90, [SUN], "quaderno degli errori: rifai gli esercizi sbagliati in settimana");
meal("Spuntino", "10:00", "10:15", [SUN], ["150 g yogurt bianco o 250 ml latte (la dieta la domenica non lo prevede: tienilo leggero)"]);
study("Studio 60′", "Maturità", "10:15", 60, [SUN], "flashcard della maturità + esercizi misti");
act({ title: "Libero", start: "11:15", end: "13:00", days: [SUN], color: C.libero, essential: false, steps: [[0, "Tempo libero"]] });
meal("Pranzo", "13:00", "13:15", [SUN], ["zero cottura, 5′: 120 g tonno + 240 g fagioli + pomodorini + 10 g olio + 100 g pane"]);
act({ title: "Riposo", start: "13:15", end: "16:00", days: [SUN], color: C.libero, essential: false, steps: [[0, "Famiglia, uscite, riposo"]] });
meal("Spuntino", "16:00", "16:15", [SUN], ["250 g yogurt + 1 banana + 40 g avena"]);
act({ title: "Revisione settimanale", start: "16:15", end: "17:00", days: [SUN], color: C.organizzazione, essential: false, steps: [
  [0, "Ore di studio, allenamenti e sonno della settimana segnati?"],
  [4, "Quali blocchi sono saltati e perché? Sposta o accorcia un blocco"],
  [8, "Voti e verifiche: c'è una materia della maturità in calo?"],
  [12, "Quaderno degli errori: rifatti tutti?"],
  [16, "In linea con il mese del calendario (mate, fisica, Sant'Anna)?"],
  [20, "Pesi: carichi saliti su almeno 2 esercizi nelle ultime 2 settimane?"],
  [24, "Peso medio: sale di 0,25–0,5% a settimana? Se no, correggi la dieta (+/- 200 kcal)"],
  [28, "Sonno: quante sere hai spento dopo le 21:30? Cosa l'ha causato?"],
  [32, "Budget: spese della settimana registrate e dentro le quote?"],
  [36, "Verifiche e scadenze della prossima settimana (TOLC, bando, interrogazioni)"],
  [40, "Borsa sport lavata e pronta, zaino pronto, vestiti del lunedì scelti?"],
]});
act({ title: "Cura settimanale", start: "17:00", end: "17:45", days: [SUN], color: C.igiene, essential: false, steps: [
  [0, "Unghie di mani e piedi corte (obbligatorio per sparring e clinch)"], [12, "Scrub corpo leggero"],
  [22, "Pulizia di rasoio e pettini"], [30, "Lava bende, borsa e borraccia"], [40, "Guantoni aperti ad asciugare e arieggiare"],
]});
act({ title: "Libero", start: "17:45", end: "18:30", days: [SUN], color: C.libero, essential: false, steps: [[0, "Tempo libero"]] });
act({ title: "Cucina 60′", start: "18:30", end: "19:30", days: [SUN], color: C.organizzazione, essential: false, steps: [
  [0, "Teglia pollo e patate in forno: 1 kg cosce + 1 kg patate a cubi, olio, paprika, rosmarino · 200 °C per 30–35′ (3 porzioni)"],
  [5, "Mentre cuoce: 500 g di riso"], [15, "6 uova sode"], [25, "Pentola di ceci per il pranzo di mercoledì"],
  [40, "3 barattoli di overnight oats (lun, mer, ven)"], [55, "Dividi la teglia: cena di stasera + contenitori di lunedì e martedì"],
]});
meal("Cena", "19:30", "19:45", [SUN], ["dalla teglia appena fatta: 150 g pollo + 350 g patate + 200 g verdure + 10 g olio + 60 g pane"]);
act({ title: "Prepara lunedì", start: "19:45", end: "20:00", days: [SUN], color: C.organizzazione, essential: true, steps: [
  [0, "Zaino"], [5, "Borsa sport"], [10, "Vestiti"],
]});
act({ title: "Libero", start: "20:00", end: "20:30", days: [SUN], color: C.libero, essential: false, steps: [[0, "Tempo libero"]] });

// ---------- goals ----------
let g = 0;
function goal(title, priority, target, milestones) {
  const id = `goal${++g}`;
  return { id, title, priority, target, milestones: milestones.map(([due, t], i) => ({ id: `${id}-m${i}`, due, title: t })) };
}
const goals = [
  goal("100 alla maturità", 1, "100/100 all'esame di giugno 2027", [
    ["2026-10", "Nessuna insufficienza nel primo mese"],
    ["2026-12", "Pagella del primo periodo con media ≥ 9"],
    ["2027-01", "Materie della seconda prova uscite: piano delle simulazioni pronto"],
    ["2027-02", "Media ≥ 9 e nessuna insufficienza (obiettivo intermedio)"],
    ["2027-02", "Prima simulazione di seconda prova (poi una ogni 2 settimane)"],
    ["2027-02", "Primo testo completo di prima prova corretto dal docente"],
    ["2027-03", "Mappa dei collegamenti per ogni materia del colloquio"],
    ["2027-04", "Due mesi di simulazioni scritte con regolarità"],
    ["2027-05", "Simulazioni del colloquio ad alta voce, registrandoti la domenica"],
    ["2027-06", "Ripasso globale con sonno invariato, anche la notte prima"],
    ["2027-06", "Esame: 100/100"],
  ]),
  goal("Ammissione al Sant'Anna · Ingegneria", 2, "TOLC-I sopra soglia e prove scritte a fine agosto 2027", [
    ["2026-10", "Test diagnostico di matematica e fisica"],
    ["2026-10", "Mate: algebra, equazioni e disequazioni (fratte, modulo), sistemi"],
    ["2026-10", "Fisica: grandezze, vettori, cinematica 1D"],
    ["2026-11", "Mate: funzioni, esponenziali e logaritmi"],
    ["2026-11", "Fisica: cinematica 2D e principi della dinamica"],
    ["2026-11", "Leggere 2 prove passate del Sant'Anna"],
    ["2026-12", "Mate: goniometria e trigonometria"],
    ["2026-12", "Fisica: lavoro, energia, conservazione"],
    ["2027-01", "Mate: geometria analitica (retta e coniche)"],
    ["2027-01", "Fisica: quantità di moto e urti"],
    ["2027-01", "Primi esercizi TOLC-I"],
    ["2027-02", "Mate: successioni, limiti, continuità"],
    ["2027-02", "Fisica: moto rotatorio e gravitazione · meccanica completata"],
    ["2027-02", "Prime 3 prove passate lette e tentate"],
    ["2027-03", "Mate: derivate e studio di funzione"],
    ["2027-03", "Fisica: fluidi e termodinamica"],
    ["2027-03", "Leggere il bando 2027 (requisiti, date TOLC, soglia)"],
    ["2027-04", "Mate: integrali, geometria euclidea e solida"],
    ["2027-04", "Fisica: onde ed elettrostatica"],
    ["2027-04", "Iscrizione e primo TOLC-I"],
    ["2027-05", "Mate: combinatoria, probabilità, problemi misti"],
    ["2027-05", "Fisica: circuiti, magnetismo, induzione"],
    ["2027-05", "Secondo TOLC-I, se serve"],
    ["2027-06", "TOLC-I sopra soglia e 10+ prove passate provate"],
    ["2027-07", "Iscrizione al concorso entro la scadenza del bando"],
    ["2027-08", "Prove scritte a Pisa"],
    ["2027-09", "Orale"],
  ]),
  goal("Muay Thai e autodifesa concreta", 3, "Sparring tecnico regolare e valutazione positiva del maestro", [
    ["2026-10", "Iscrizione, orari definitivi del corso, certificato medico se richiesto"],
    ["2026-10", "Attrezzatura: guantoni, 2 paia di bende, paradenti, parastinchi, conchiglia"],
    ["2026-11", "Combinazioni base pulite al sacco e ai colpitori"],
    ["2027-01", "Combinazioni da 3–4 colpi e contrattacchi"],
    ["2027-02", "3 round da 3′ al sacco a ritmo costante"],
    ["2027-02", "Clinch di base e condizionamento"],
    ["2027-03", "Primi sparring tecnici (solo con l'ok del maestro)"],
    ["2027-04", "Lezioni su situazioni di difesa realistiche (chiedi al maestro)"],
    ["2027-05", "Sparring leggero regolare"],
    ["2027-06", "Valutazione positiva del maestro"],
  ]),
  goal("Fisico e massa muscolare", 4, "Carichi dei fondamentali in crescita, peso in aumento controllato (0,25–0,5% a settimana)", [
    ["2026-10", "Prime 2 settimane: carichi leggeri e tecnica con l'istruttore"],
    ["2026-10", "Registro di carichi e ripetizioni a ogni seduta"],
    ["2026-10", "Pesata della domenica mattina ogni settimana"],
    ["2026-11", "5 pasti con proteine ogni giorno per 4 settimane"],
    ["2026-12", "Settimana di scarico a Natale"],
    ["2027-02", "Carichi aumentati su tutti gli esercizi rispetto a ottobre"],
    ["2027-03", "Peso medio in salita regolare da 3 mesi"],
    ["2027-04", "Settimana di scarico a Pasqua"],
    ["2027-06", "Carichi dei fondamentali in crescita costante"],
  ]),
  goal("Inglese da B1 verso C1", 5, "B2 solido entro giugno 2027, C1 pieno nel 2027–28", [
    ["2026-10", "Test di livello gratuito (punto di partenza)"],
    ["2026-10", "Inglese sul bus 5 giorni su 5 per 4 settimane"],
    ["2027-01", "Grammatica intermedia: tempi verbali, condizionali, passivo, discorso indiretto"],
    ["2027-02", "Test di livello intermedio e passaggio alla grammatica avanzata"],
    ["2027-04", "Un testo scritto corretto ogni sabato per 8 settimane"],
    ["2027-05", "Test di livello finale"],
    ["2027-06", "B2 solido in grammatica"],
    ["2028-06", "C1 pieno"],
  ]),
  goal("Attrattività: da 4,5 a 7", 6, "Pelle, igiene, cura e fisico curati con costanza: la parte che dipende da te", [
    ["2026-10", "Skincare livello 1 ogni giorno: detergente, idratante, SPF"],
    ["2026-10", "Igiene mattina e sera completa 6 giorni su 7 per 4 settimane"],
    ["2026-11", "Cura della domenica per 4 settimane di fila (unghie, scrub, rasoio)"],
    ["2026-11", "Federa del cuscino cambiata 2 volte a settimana"],
    ["2026-12", "Skincare livello 2, se il budget lo consente (un prodotto alla volta, 2 settimane di prova)"],
    ["2027-01", "Se l'acne persiste: visita dal dermatologo"],
    ["2027-02", "Postura: shadow e mobilità regolari per 8 settimane"],
    ["2027-06", "Fisico in crescita (vedi obiettivo 4)"],
  ]),
];

const pack = {
  app: "wellness-tracker-plan",
  version: 1,
  name: "Routine annuale 2026–27 + dieta",
  routine,
  meals: [],
  goals,
  water: { start: "06:30", end: "21:30", intervalMin: 60 },
};

// Sanity: every weekday's activities must not overlap and must cover 06:30-21:30 without gaps.
for (const day of [0, 1, 2, 3, 4, 5, 6]) {
  const list = routine.filter((a) => a.days.includes(day));
  for (const weeks of ["odd", "even"]) {
    const acts = list.filter((a) => !a.weeks || a.weeks === weeks).filter((a) => a.title !== "Sonno")
      .map((a) => [toMin(a.start), toMin(a.end), a.title]).sort((x, y) => x[0] - y[0]);
    let cursor = toMin("06:30");
    for (const [s, e, t] of acts) {
      if (s !== cursor) console.log(`day ${day} ${weeks}: gap/overlap before ${t} (${hm(cursor)} → ${hm(s)})`);
      cursor = e;
    }
    if (cursor !== toMin("21:30")) console.log(`day ${day} ${weeks}: ends at ${hm(cursor)}`);
    for (const a of list) for (const s of a.steps) {
      const st = toMin(s.time), a0 = toMin(a.start), a1 = toMin(a.end);
      const inside = a1 > a0 ? st >= a0 && st < a1 : st >= a0 || st < a1;
      if (!inside) console.log(`step outside activity: ${a.title} ${s.time} ${s.label}`);
    }
  }
}

const out = new URL("../src/data/defaultPlan.json", import.meta.url);
writeFileSync(out, JSON.stringify(pack, null, 1));
const steps = routine.reduce((n, a) => n + a.steps.length, 0);
console.log(`activities ${routine.length}, steps ${steps}, goals ${goals.length}, milestones ${goals.reduce((n, x) => n + x.milestones.length, 0)}`);
