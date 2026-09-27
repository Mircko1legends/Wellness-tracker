// Builds the built-in plan from the two PDFs ("Routine annuale 2026–2027" and "Nutrition & Training System")
// with the real weekly schedule: weights Mon (lower) · Tue (upper) · Thu (lower) · Fri (upper), MMA Tue and Thu 19:00–20:00.
// Run `node scripts/build-default-plan.mjs` after editing to regenerate src/data/defaultPlan.json.
import { writeFileSync } from "node:fs";

const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0;
const SCHOOL = [MON, TUE, WED, THU, FRI];
const ALL = [MON, TUE, WED, THU, FRI, SAT, SUN];
const C = {
  sonno: "#c9d1e3", scuola: "#8fb3e0", trasporti: "#cfcfca", pasti: "#a8d99a", studio: "#6e62b6",
  allenamento: "#e07a5f", igiene: "#86cfc2", organizzazione: "#f2c27b", libero: "#e9e2cf",
};

// Skincare: one new product every two weeks (Routine, section 6), starting from the basics.
const SKIN_START = "2026-09-28";
const MELANO_FROM = "2026-10-12";
const RETINOL_FROM = "2026-10-26";
const CURE_FROM = "2026-11-09";
const RETINOL_3_FROM = "2026-11-23";
const BRAINSTORM_FROM = "2026-10-04";

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hm = (m) => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

let seq = 0;
const routine = [];
/** steps: [minutesFromStart, label, detail?, extra?] */
function act({ title, start, end, days, color, steps, essential, group, subject, from, until, detail }) {
  const id = `a${++seq}`;
  const s0 = toMin(start);
  routine.push({
    id, title, start, end, days, color,
    ...(essential !== undefined ? { essential } : {}),
    ...(group ? { group } : {}),
    ...(subject ? { subject } : {}),
    ...(from ? { from } : {}),
    ...(until ? { until } : {}),
    ...(detail ? { detail } : {}),
    steps: steps.map(([off, label, stepDetail, extra], j) => ({
      id: `${id}-s${j}`, time: hm(s0 + off), label, ...(stepDetail ? { detail: stepDetail } : {}), ...(extra ?? {}),
    })),
  });
}

// ---------------------------------------------------------------- details used in many places
const D = {
  phone: "Telefono in un'altra stanza (non in tasca, non a faccia in giù sulla scrivania): è la regola del metodo di studio. Se ti serve per le flashcard, modalità aereo.",
  goal: "Prima di iniziare (2′): scrivi in una riga cosa avrai fatto alla fine del blocco, concreto e misurabile. Esempi: «10 disequazioni fratte», «capitolo 3 di storia + 15 flashcard». Un obiettivo vago («studio mate») non conta.",
  hours: "Fine blocco (2′): segna quanti minuti hai studiato davvero. L'app li somma nel resoconto della domenica (obiettivo settimanale 18h10, minimo 15h).",
  mathMethod: "20% teoria, 80% esercizi. Leggi la teoria solo quanto basta per fare il primo esercizio, poi esercizi graduati dal più facile al più difficile. Ogni errore va nel quaderno degli errori con 4 righe: testo, errore, correzione, perché l'hai sbagliato. La domenica li rifai.",
  maturita: "Studio attivo, mai solo rileggere: leggi un paragrafo, chiudi il libro, ripetilo a voce; fai lo schema a memoria e poi confrontalo; trasforma le cose da ricordare in flashcard. Parti da quanto spiegato oggi in classe e dai compiti per domani.",
  pause5: "5′ in piedi: alzati, bevi qualche sorso, guarda fuori dalla finestra. Niente telefono e niente social: una pausa sul telefono stanca come studiare.",
  eat: "Mangia seduto, a tavola, senza telefono né video: 10–15′. Mastica con calma. Se il pasto non è tutto pronto, usa la tabella delle sostituzioni (Dieta → Ricette e sostituzioni).",
  margin: "Tempo di riserva per gli imprevisti (bus in ritardo, una cosa durata più del previsto). Se non ti serve, è pausa vera: siediti, bevi, respira. Non riempirlo con altro.",
  free: "Tempo libero vero: fai quello che ti ricarica (famiglia, amici, musica, giochi, uscire). È parte del piano, non uno spreco: non recuperare studio qui.",
  containerRule: "Dal freezer al frigo, poi direttamente nello zaino se domani lo porti a scuola: 30 secondi. È l'abitudine che rende possibile il pranzo da 15′.",
};

// ---------------------------------------------------------------- morning (all days)
function morning(days, sunday = false) {
  const steps = [];
  if (sunday) steps.push([0, "Pesati: appena sveglio, dopo il bagno, prima di bere", "Bilancia sempre nello stesso punto, a piedi nudi, senza vestiti o con gli stessi leggeri. Una volta a settimana, la domenica: segna il peso in Dieta → Peso e massa. Conta la media delle ultime 4 settimane, mai il singolo giorno."]);
  const o = sunday ? 2 : 0;
  if (!sunday) steps.push([0, "Sveglia alle 06:30: alzati subito", "Anche nel weekend. Alzati appena suona, senza rimandare: il telefono resta lontano fino a fine colazione (a parte la sveglia)."]);
  steps.push(
    [o, "Denti 2′ (spazzolino + lingua)", "2 minuti cronometrati: 30″ per quadrante (sopra-destra, sopra-sinistra, sotto-destra, sotto-sinistra), setole a 45° verso la gengiva, movimenti piccoli. Poi 10 passate sulla lingua dal fondo verso la punta. Sputa ma non sciacquare con acqua: il fluoro lavora di più."],
    [o + 3, "Viso: Hada Labo Gokujyun Foaming Face Wash", "Mani lavate. Bagna il viso con acqua tiepida (non calda). Una pompata di schiuma sul palmo, massaggia 30–40″ con i polpastrelli: fronte, naso, lati del naso, mento, guance, attaccatura dei capelli e sotto la mascella. Sciacqua bene e tampona con un asciugamano pulito, senza strofinare."],
    [o + 5, "Mani lavate e asciutte, poi metti le lenti", "Lava le mani con sapone per 20″, sciacqua e asciuga con un panno che non lascia pelucchi. Prima la lente destra, sempre (così non le scambi). Controlla che non sia rovesciata (bordo a coppa, non a piattino), guarda in alto e appoggiala sull'occhio. Poi la sinistra. Il portalenti: svuota, sciacqua con la soluzione (mai acqua del rubinetto) e lascialo asciugare aperto a testa in giù."],
    [o + 8, "Rohto Melano CC: 2–3 gocce", "Dopo le lenti, con le mani pulite: 2–3 gocce sui polpastrelli, picchietta su tutto il viso, a un dito di distanza dalle ciglia. Aspetta 1′ che si assorba. È vitamina C: la mattina protegge dai danni del sole e schiarisce le macchie. Se pizzica forte o arrossa, saltala e parlane nel brainstorm.", { from: MELANO_FROM }],
    [o + 10, "Hada Labo Gokujyun Hyaluronic Cream", "Quanto un pisello abbondante: puntini su fronte, guance, naso e mento, poi stendi. È l'idratante: la pelle idratata sopporta meglio SPF, vitamina C e retinolo."],
    [o + 12, "SPF: Hada Labo UV White Gel SPF50+", "Ultimo passaggio della skincare, ogni mattina, anche nuvoloso e d'inverno. Quantità: due strisce lungo indice e medio per viso e collo; ricorda orecchie e nuca. Retinolo e vitamina C rendono la pelle più sensibile al sole. Se stai fuori a lungo, riapplica dopo 2–3 ore."],
    [o + 14, "Deodorante e capelli", "Deodorante sotto le ascelle asciutte. Capelli: pettina/sistema come ti piace, senza perderci più di 3′."],
    [o + 16, "Controllo: unghie, barba se serve", "Guardati allo specchio 30″: unghie corte e pulite (obbligatorie per l'MMA), barba rasata se serve, niente macchie sui vestiti. Se devi radere, fallo la sera prima: al mattino il tempo è contato."],
  );
  act({ title: sunday ? "Pesata + igiene mattina" : "Igiene mattina", start: "06:30", end: "06:50", days, color: C.igiene, essential: true, steps,
    detail: "20′ fissi: denti, viso, lenti, skincare, deodorante, capelli. I prodotti della skincare entrano uno alla volta ogni 2 settimane (regola del PDF): Melano CC dal 12 ottobre, retinolo dal 26 ottobre, Cure dal 9 novembre." });
}
morning(ALL.filter((d) => d !== SUN));
morning([SUN], true);

// ---------------------------------------------------------------- meals
function meal({ title, start, end, days, items, extra = [], detail }) {
  const span = toMin(end) - toMin(start);
  const steps = [
    ...items.map(([label, d, carbs]) => [0, `Prepara/pesa: ${label}`, d, carbs ? { carbs: true } : undefined]),
    [Math.min(3, span - 2), "Mangia seduto, senza telefono", D.eat],
    ...extra,
  ];
  // spread the rest across the meal
  steps.forEach((s, i) => { s[0] = steps.length > 1 ? Math.round(((span - 2) * i) / (steps.length - 1)) : 0; });
  act({ title, start, end, days, color: C.pasti, essential: true, steps, detail });
}
const WEIGH = "Pesa con la bilancia da cucina: le prime 3–4 settimane tutto, poi l'occhio impara. Grammature a crudo, tranne dove è scritto diversamente. Pasta, riso, patate e pane sono già adattati al tuo peso (menu del PDF pensato per 70 kg).";
const OATS = ["overnight oats (fatti ieri sera): 100 g avena + 300 ml latte + 1 banana + 20 g burro d'arachidi", "Dal frigo, già pronti nel barattolo: mescola e mangia. Se ieri sera non li hai preparati: stessi ingredienti in una ciotola, 3′ e via (anche da freddi). ≈ 735 kcal, 29 g proteine."];
const BOWL = ["yogurt bowl: 250 g yogurt bianco + 80 g avena + 1 banana + 20 g burro d'arachidi", "In una ciotola: yogurt, avena, banana a rondelle, burro d'arachidi sopra. 3′ di preparazione. ≈ 675 kcal, 26 g proteine."];
const EGGS = ["3 uova strapazzate + 100 g pane + 1 frutto + 200 ml latte", "Uova strapazzate come si deve (6′): fuoco basso, uova appena sbattute con un pizzico di sale, mescola di continuo e togli dal fuoco quando sono ancora umide: finiscono di cuocere da sole. ≈ 650 kcal, 35 g proteine."];
meal({ title: "Colazione", start: "06:50", end: "07:05", days: [MON, WED, FRI], items: [OATS], detail: "Pasto 1. Regola del mattino: niente telefono fino alla fine della colazione (a parte la sveglia)." });
meal({ title: "Colazione", start: "06:50", end: "07:05", days: [TUE, THU], items: [BOWL], detail: "Pasto 1. Niente telefono fino alla fine della colazione." });
meal({ title: "Colazione", start: "06:50", end: "07:05", days: [SAT, SUN], items: [EGGS], detail: "Pasto 1. Nel weekend la sveglia resta alle 06:30: il ritmo del sonno non cambia." });

// ---------------------------------------------------------------- school days: morning out
act({ title: "Vestiti, zaino", start: "07:05", end: "07:10", days: SCHOOL, color: C.organizzazione, essential: true, steps: [
  [0, "Vestiti preparati ieri sera", "Solo indossarli: si scelgono la sera prima nella routine serale, così al mattino non decidi niente."],
  [2, "Zaino: contenitore, spuntino e 2 bottigliette piene", "Controlla che ci siano: libri del giorno, contenitore del pranzo (messo ieri sera), spuntino della scuola, 2 bottigliette d'acqua da mezzo litro piene. Nei giorni di palestra la borsa è già pronta vicino alla porta."],
]});
act({ title: "Margine", start: "07:10", end: "07:15", days: SCHOOL, color: C.libero, steps: [[0, "Riserva per gli imprevisti del mattino", D.margin]] });
act({ title: "Bus · inglese", start: "07:15", end: "08:00", days: SCHOOL, color: C.trasporti, subject: "inglese", steps: [
  [0, "15′ grammatica: esercizi sull'argomento della settimana", "Un argomento a settimana (vedi il tema del mese qui sopra). Esercizi scritti su app o libro, non teoria: se sbagli, leggi la regola solo di quell'errore. Il giovedì non studi inglese a casa: il venerdì sera recuperi 40′."],
  [15, "15′ vocaboli: flashcard (tipo Anki)", "Ripassa le carte in scadenza, poi aggiungi 5–10 parole nuove prese da podcast o video della settimana (con una frase d'esempio, non solo la traduzione)."],
  [30, "15′ flashcard della maturità", "Le flashcard che hai creato studiando le materie della maturità: definizioni, date, formule, autori. Rispondi a voce bassa prima di girare la carta."],
], detail: "45′ di bus sfruttati per le attività leggere: la grammatica è il tuo punto debole, l'ascolto il tuo punto forte." });

const SNACK = {
  [MON]: ["panino: 100 g pane + 80 g tonno al naturale + 1 mela", "Preparato la sera prima o al mattino (2′): pane tagliato, tonno sgocciolato dentro. ≈ 435 kcal, 28 g proteine."],
  [TUE]: ["panino: 100 g pane + 2 uova sode + 1 mela", "Le uova sode escono dalla cucina della domenica. ≈ 490 kcal, 23 g proteine."],
  [WED]: ["panino: 100 g pane + 100 g sgombro + 1 mela", "Sgombro in scatola sgocciolato nel pane. ≈ 550 kcal, 30 g proteine."],
  [THU]: ["spuntino doppio: 150 g pane + 80 g tonno + 2 uova sode + 2 frutti", "Oggi la scuola dura 8 ore e poi ci sono pesi e MMA: è il giorno che ne ha più bisogno. ≈ 800 kcal, 40 g proteine."],
  [FRI]: ["panino: 100 g pane + 80 g tonno + 1 mela", "≈ 435 kcal, 28 g proteine."],
};
for (const d of SCHOOL) {
  const thu = d === THU;
  act({ title: "Scuola", start: "08:00", end: "10:55", days: [d], color: C.scuola, essential: true, steps: [
    [0, "In classe: telefono silenzioso, appunti", "Telefono spento o silenzioso nello zaino. Prendi appunti che poi userai nel blocco di maturità del pomeriggio: parole chiave e domande, non trascrizioni."],
    [60, "Qualche sorso d'acqua tra un'ora e l'altra", "Le bottigliette sono nello zaino: bevi ai cambi d'ora, così arrivi a 10 senza fatica."],
  ]});
  act({ title: thu ? "Spuntino doppio a scuola" : "Spuntino a scuola", start: "10:55", end: "11:10", days: [d], color: C.pasti, essential: true, steps: [
    [0, `Prepara: ${SNACK[d][0]}`, SNACK[d][1]],
    [2, "Mangia con calma, anche parlando con i compagni", "Pasto 2. È la ricreazione: mangia tutto, serve per arrivare al pranzo senza cali. L'orario va adattato alla tua ricreazione reale."],
  ], detail: "Pasto 2, durante la ricreazione (orario ipotizzato: adattalo)." });
  act({ title: "Scuola", start: "11:10", end: thu ? "13:00" : "14:00", days: [d], color: C.scuola, essential: true, steps: [
    [0, "Seconda parte della mattina", "Stesse regole: telefono nello zaino, appunti utili per il pomeriggio."],
    [thu ? 100 : 160, "Annota compiti, verifiche e interrogazioni", "Scrivili nel diario o nell'agenda prima di uscire: stasera e nella revisione della domenica ti servono per decidere i blocchi."],
  ]});
}
// Thursday: lunch at school, afternoon at school
meal({ title: "Pranzo a scuola", start: "13:00", end: "13:20", days: [THU], items: [["dal contenitore: 120 g riso + 160 g tonno + 200 g verdure + 10 g olio", "Il riso viene dalla teglia di mercoledì; il tonno lo aggiungi dalla scatola. Buono anche freddo: non serve scaldarlo. ≈ 750 kcal, 49 g proteine.", true]], detail: "Pasto 3 del giovedì, durante la pausa pranzo della giornata lunga." });
act({ title: "Scuola", start: "13:20", end: "16:00", days: [THU], color: C.scuola, essential: true, steps: [
  [0, "Pomeriggio a scuola", "Ultime ore della giornata lunga. Tieni le energie: stasera pesi e MMA."],
  [150, "Annota compiti, verifiche e interrogazioni", "Oggi non studi a casa: segna bene cosa serve per venerdì."],
]});

act({ title: "Bus · ascolto", start: "14:00", end: "14:45", days: [MON, TUE, WED, FRI], color: C.trasporti, steps: [
  [0, "Podcast o video in inglese B2–C1 (20–25′)", "Notizie o divulgazione scientifica in inglese, livello B2–C1 (es. BBC Learning English, TED-Ed, Kurzgesagt). Ascolto attivo: se senti un'espressione nuova, segnala per le flashcard di domani."],
  [25, "Stacco mentale", "Niente schermi: guarda fuori, respira. Arrivi a casa scarico e pronto per mangiare."],
]});
act({ title: "Bus · ascolto", start: "16:00", end: "16:45", days: [THU], color: C.trasporti, steps: [
  [0, "Podcast o video in inglese (20–25′)", "Come gli altri giorni. Oggi è l'unico inglese dopo il bus di andata."],
  [25, "Stacco mentale", "Niente schermi: ti aspettano pesi e MMA."],
]});

// Lunch at home 14:45 (Mon/Tue/Wed/Fri)
meal({ title: "Pranzo", start: "14:45", end: "15:00", days: [MON], items: [["dal contenitore: 150 g pollo + 120 g riso (peso crudo) + 200 g verdure + 10 g olio", "Pollo dalla teglia della domenica, riso dai 500 g cotti domenica, verdure surgelate saltate o al vapore, olio a crudo. Scalda 2–3′. ≈ 745 kcal, 42 g proteine.", true]], detail: "Pasto 3, già pronto nel contenitore: 15′ in tutto." });
meal({ title: "Pranzo", start: "14:45", end: "15:00", days: [TUE], items: [["dal contenitore: 150 g pollo + 400 g patate + 200 g verdure + 10 g olio + 60 g pane", "Pollo e patate dalla teglia della domenica. ≈ 775 kcal, 46 g proteine. Oggi pesi e MMA: mangialo tutto.", true]] });
meal({ title: "Pranzo", start: "14:45", end: "15:00", days: [WED], items: [["dal contenitore: pasta e ceci: 100 g pasta + 150 g ceci + pelati + 10 g olio", "Ceci dalla pentola della domenica. Ricetta (20′, 2 porzioni): soffriggi aglio e rosmarino, aggiungi pelati e ceci con la loro acqua; dopo 10′ versa la pasta cruda e acqua a coprire, cuoci mescolando finché la pasta è pronta. ≈ 620 kcal, 25 g proteine.", true]] });
meal({ title: "Pranzo", start: "14:45", end: "15:00", days: [FRI], items: [["dal contenitore: 150 g pollo + 120 g riso + 200 g verdure + 10 g olio", "Dalla teglia di pollo e riso di mercoledì. ≈ 745 kcal, 42 g proteine.", true]] });

act({ title: "Denti + stacco", start: "15:00", end: "15:15", days: [MON, TUE, WED, FRI], color: C.igiene, steps: [
  [0, "Denti dopo pranzo (o almeno risciacquo) + filo se serve", "2′ di spazzolino oppure risciacquo energico con acqua; filo solo se hai qualcosa tra i denti."],
  [5, "10′ senza schermo", "Sdraiati o siediti lontano da telefono e PC: il cervello scarica la mattina e il blocco di studio rende di più. Fa anche da margine per gli imprevisti del rientro."],
]});

// ---------------------------------------------------------------- study blocks
function study(subject, label, start, minutes, days, what, detailExtra = "") {
  const steps = [
    [0, "Obiettivo del blocco in una riga · telefono in un'altra stanza", `${D.goal} ${D.phone}`],
  ];
  if (minutes >= 90) {
    steps.push([2, `45′: ${what[0]}`, what[1]], [47, "Pausa 5′ in piedi", D.pause5], [52, `40′: ${what[0]}`, what[1]]);
  } else if (minutes >= 60) {
    steps.push([2, what[0], what[1]], [Math.round(minutes / 2), "Metà blocco: ripeti a voce senza guardare", "Chiudi libro e appunti e ripeti ad alta voce quello che hai fatto finora, come se lo spiegassi a un compagno. Dove ti blocchi è ciò che devi riguardare nella seconda metà."]);
  } else {
    steps.push([2, what[0], what[1]]);
  }
  steps.push([minutes - 2, "Segna le ore nella scheda settimanale", D.hours]);
  act({ title: `Studio ${minutes}′ · ${label}`, start, end: hm(toMin(start) + minutes), days, color: C.studio, essential: false, subject, steps,
    detail: `Blocco di ${label.toLowerCase()} di ${minutes} minuti. ${detailExtra}`.trim() });
}
const W = {
  maturita: ["studio attivo di quanto spiegato oggi + compiti", D.maturita],
  matematica: ["teoria minima, poi esercizi graduati", D.mathMethod],
  fisica: ["problemi, dal più semplice al più difficile", "Per ogni problema: disegno, dati con unità di misura, formula, conto, controllo dell'ordine di grandezza. " + D.mathMethod],
  santanna: ["problem solving: logica ed esercizi «non standard»", "Problemi di logica e di matematica fuori dagli schemi della scuola (archivi delle Olimpiadi, prove passate del Sant'Anna). Quando non esce, prova 15′ davvero, poi leggi la soluzione e rifai il problema da capo senza guardarla."],
  inglese: ["grammatica: teoria dell'argomento della settimana + esercizi scritti", "Il sabato: test di ripasso + 1 testo scritto (email, saggio breve) corretto con le regole studiate. Il venerdì sera: la grammatica spostata dal giovedì."],
  errori: ["rifai gli esercizi sbagliati in settimana", "Apri il quaderno degli errori: rifai ogni esercizio della settimana da zero, senza guardare la correzione. Se riesce, spuntalo; se no, resta per la prossima domenica."],
};
study("maturita", "Maturità", "15:15", 75, [MON, TUE, FRI], W.maturita, "Compiti + consolidamento del giorno: il credito del 5° anno si costruisce qui.");
study("matematica", "Matematica", "15:15", 90, [WED], W.matematica, "Il blocco di matematica più importante della settimana.");
study("fisica", "Fisica", "17:00", 75, [WED], W.fisica);
study("maturita", "Maturità", "18:30", 60, [WED], W.maturita, "Materie di indirizzo.");
study("inglese", "Inglese", "19:55", 40, [FRI], W.inglese, "Grammatica spostata dal giovedì (giornata con scuola, pesi e MMA).");
// Saturday (section 3.5)
study("matematica", "Matematica", "08:00", 90, [SAT], W.matematica, "Il blocco più difficile a mente fresca.");
study("fisica", "Fisica", "09:45", 90, [SAT], W.fisica);
study("santanna", "Sant'Anna", "11:30", 75, [SAT], W.santanna, "Sant'Anna / TOLC-I · problem solving.");
study("maturita", "Maturità", "14:30", 75, [SAT], W.maturita, "Da febbraio: una simulazione di seconda prova ogni 2 settimane in questo blocco (esteso).");
study("inglese", "Inglese", "16:00", 60, [SAT], W.inglese, "Grammatica + writing.");
// Sunday (section 3.6)
study("errori", "Errori mate/fisica", "08:30", 90, [SUN], W.errori, "Quaderno degli errori della settimana.");
study("maturita", "Maturità", "10:15", 60, [SUN], ["flashcard della maturità + esercizi misti", D.maturita], "Da maggio: simulazioni del colloquio ad alta voce (anche registrandoti).");
study("matematica", "Matematica", "15:00", 60, [SUN], W.matematica, "Recupera il blocco di matematica del giovedì, che ora è giorno di pesi e MMA.");

const pauses = [[WED, "16:45", "17:00"], [WED, "18:15", "18:30"], [SAT, "09:30", "09:45"], [SAT, "11:15", "11:30"], [SAT, "12:45", "13:00"], [SAT, "15:45", "16:00"], [SUN, "10:00", "10:15"]];
for (const [d, s, e] of pauses) act({ title: "Pausa", start: s, end: e, days: [d], color: C.libero, steps: [[0, "Alzati, qualche sorso, niente social", "Tra due blocchi di studio: in piedi, finestra, acqua. Niente telefono: il prossimo blocco parte più facile."]] });

// ---------------------------------------------------------------- training
function goGym({ days, borsa, travel, change, withMma }) {
  act({ title: "Borsa + spuntino pre-palestra", start: borsa[0], end: borsa[1], days, color: C.organizzazione, steps: [
    [0, withMma ? "Borsa: cambio pesi e MMA, bende, paradenti, asciugamano, ciabatte, 2 bottigliette" : "Borsa: cambio, asciugamano, ciabatte, 2 bottigliette", "La borsa è già stata preparata ieri sera nella routine serale: qui controlli soltanto. Bende pulite (tienine 2 paia e alternale), paradenti nella custodia, ciabatte e asciugamano personali, lucchetto."],
    [5, days.includes(THU) ? "Mangia: 1 banana" : "Mangia: 1 banana + 30 g pane", "Pre-palestra (dal PDF della dieta): carboidrati veloci e leggeri, 60–90′ prima dei pesi."],
  ]});
  act({ title: "Tragitto palestra", start: travel[0], end: travel[1], days, color: C.trasporti, steps: [
    [0, "Esci e prendi il bus (orario da confermare)", "30′ di viaggio. Con i pesi prima dell'MMA esci prima delle 18: controlla l'orario del bus e correggi qui se serve."],
    [3, "Sul bus: flashcard", "Flashcard di inglese o della maturità, come la mattina. Niente di pesante."],
  ]});
  act({ title: "Cambio", start: change[0], end: change[1], days, color: C.allenamento, steps: [
    [0, "Spogliatoio: cambio, borsa nell'armadietto", "Ciabatte ai piedi negli spogliatoi, sempre."],
    [5, "Bottiglietta con te in sala", "Bevi durante tutta la sessione, qualche sorso tra le serie."],
  ]});
}
goGym({ days: [MON, FRI], borsa: ["16:30", "16:40"], travel: ["16:40", "17:10"], change: ["17:10", "17:20"], withMma: false });
goGym({ days: [TUE], borsa: ["16:30", "16:45"], travel: ["16:45", "17:15"], change: ["17:15", "17:25"], withMma: true });
act({ title: "Casa: denti + borsa + banana", start: "16:45", end: "16:55", days: [THU], color: C.organizzazione, steps: [
  [0, "Denti o risciacquo", "Veloce: hai appena pranzato a scuola."],
  [3, "Prendi la borsa (pronta da ieri sera)", "Cambio pesi e MMA, bende, paradenti, asciugamano, ciabatte, 2 bottigliette."],
  [6, "Mangia: 1 banana", "Pre-palestra del giovedì (dal PDF della dieta)."],
]});
act({ title: "Tragitto palestra", start: "16:55", end: "17:25", days: [THU], color: C.trasporti, steps: [
  [0, "Esci e prendi il bus (orario da confermare)", "Controlla l'orario reale del bus e correggi qui se serve."],
  [3, "Sul bus: flashcard", "Leggere: oggi la giornata è lunga."],
]});
act({ title: "Cambio", start: "17:25", end: "17:35", days: [THU], color: C.allenamento, steps: [[0, "Spogliatoio: cambio, borsa nell'armadietto", "Ciabatte negli spogliatoi, bottiglietta con te."]] });

const EX = (name, sets, rest, note) => [`${name} ${sets} · recupero ${rest}`, `${note} Fermati 1–3 ripetizioni prima del cedimento. Nel tab Allenamento il peso è già impostato: correggilo solo se serve, tocca ✓ dopo ogni serie e parte il timer di recupero.`];
const WARMUP = ["Riscaldamento 6–8′", "3′ di bici + mobilità di spalle e anche. Poi solo sul primo esercizio: 1 serie da 5 con metà del peso di lavoro e 1 da 3 con tre quarti. Il riscaldamento non si conta nelle serie."];
function weights({ title, group, start, end, days, list, detail }) {
  const span = toMin(end) - toMin(start);
  const steps = [[0, ...WARMUP]];
  list.forEach((e, i) => steps.push([8 + Math.round(((span - 12) * i) / list.length), ...e]));
  steps.push([span - 3, "Registro completo: carichi e ripetizioni salvati", "Controlla nel tab Allenamento che tutte le serie siano spuntate: senza numeri la massa non si misura."]);
  act({ title, group, start, end, days, color: C.allenamento, essential: false, steps, detail });
}
const LOWER_B = [
  EX("Stacco da terra", "4 × 4–6", "3′", "Tecnica prima del carico, sempre: schiena neutra, bilanciere attaccato alle gambe, spingi il pavimento. Filmati di lato ogni tanto."),
  EX("Pressa 45°", "3 × 8–12", "2′", "Oppure hack squat. Scendi finché la schiena resta appoggiata, ginocchia in linea con le punte."),
  EX("Squat bulgaro", "3 × 8–10 per gamba", "90″", "Corregge gli squilibri tra le due gambe. Parti dalla gamba più debole."),
  EX("Leg extension", "3 × 12–15", "60″", "Pausa di un secondo in alto."),
  EX("Calf raise da seduto", "4 × 12–15", "60″", "Lavora il soleo. Pausa di un secondo in alto e in basso."),
  ["Condizionamento 15′: 10 × 30″ forte / 60″ piano", "Bici o vogatore. 30″ a tutta (ma tecnica pulita), 60″ pedalando piano, per 10 volte. Oggi niente MMA: è il tuo lavoro di fiato."],
];
const UPPER_A = [
  EX("Panca piana con bilanciere", "4 × 5–8", "2–3′", "Il movimento su cui misuri i progressi della parte alta. Scapole strette e basse, piedi piantati, bilanciere al petto basso, gomiti a circa 45°."),
  EX("Rematore con bilanciere", "4 × 6–10", "2′", "Schiena piatta, busto a circa 45°, tira verso l'ombelico."),
  EX("Military press in piedi", "3 × 6–10", "2′", "Oppure lento avanti con manubri se la spalla tira. Glutei e addome contratti, niente schiena inarcata."),
  EX("Lat machine presa larga", "3 × 8–12", "90″", "Petto in fuori, tira la sbarra al mento/petto alto. Passa alle trazioni assistite appena ci riesci."),
  EX("Curl con bilanciere", "3 × 8–12", "75″", "Gomiti fermi al fianco, niente slancio."),
  EX("Push-down ai cavi", "3 × 10–12", "75″", "Oppure French press con manubrio. Gomiti fermi."),
];
const LOWER_A_THU = [
  EX("Squat con bilanciere", "4 × 5–8", "3′", "Il movimento su cui misuri i progressi della parte bassa. Piedi alla larghezza delle spalle, scendi almeno a parallelo con la schiena neutra. Oggi c'è l'MMA dopo: lascia sempre 2–3 ripetizioni di riserva."),
  EX("Stacco rumeno", "3 × 8–10", "2′", "Scendi finché senti tirare dietro la coscia, non oltre. Schiena neutra."),
  EX("Leg curl", "3 × 10–12", "90″", "Due secondi in discesa."),
  EX("Calf raise in piedi", "4 × 12–15", "60″", "Pausa di un secondo in alto e in basso."),
];
const UPPER_B = [
  EX("Trazioni alla sbarra", "4 × 6–10", "2–3′", "Assistite o lat machine presa inversa se non arrivi a 6."),
  EX("Panca inclinata con manubri", "4 × 8–10", "2′", "Inclinazione 30°, non di più."),
  EX("Rematore con manubrio, un braccio", "3 × 10–12", "90″", "Appoggio su panca, tira lungo il fianco."),
  EX("Alzate laterali", "3 × 12–15", "60″", "Leggere: qui non serve il carico, serve la sensazione sul deltoide."),
  EX("Dip alle parallele", "3 × 8–12", "90″", "Oppure panca presa stretta."),
  EX("Curl a martello", "3 × 10–12", "60″", "Presa neutra, lavora anche l'avambraccio."),
];
weights({ title: "Pesi 80′ · Lower B", group: "Pesi", start: "17:20", end: "18:40", days: [MON], list: LOWER_B, detail: "Parte bassa B (catena posteriore, quadricipiti, condizionamento). Lunedì senza MMA: è la seduta più pesante per le gambe, lontana dall'MMA di martedì." });
weights({ title: "Pesi 75′ · Upper A", group: "Pesi", start: "17:25", end: "18:40", days: [TUE], list: UPPER_A, detail: "Parte alta A (petto, dorso, spalle, braccia). Prima dell'MMA: niente cedimento, lascia 2 ripetizioni di riserva." });
weights({ title: "Pesi 65′ · Lower A (ridotta)", group: "Pesi", start: "17:35", end: "18:40", days: [THU], list: LOWER_A_THU, detail: "Parte bassa A in versione ridotta: niente affondi e niente plank perché dopo c'è l'MMA (le gambe servono fresche e il core lo lavori lì). È la regola del PDF: se il tempo è poco, solo gli esercizi principali." });
weights({ title: "Pesi 75′ · Upper B", group: "Pesi", start: "17:20", end: "18:35", days: [FRI], list: UPPER_B, detail: "Parte alta B (dorso, petto alto, spalle, braccia)." });

act({ title: "Pre-MMA", start: "18:40", end: "19:00", days: [TUE, THU], color: C.allenamento, steps: [
  [0, "Qualche sorso e 5′ seduto", "Recupera dai pesi: acqua, respira. Se hai fame: mezza banana (tienila da parte dal pre-palestra)."],
  [5, "Cambio per l'MMA: bende, paradenti nella custodia", "Bende pulite, unghie corte, paradenti pronto. Chiedi al maestro se preferisce un riscaldamento suo."],
  [10, "Riscaldamento o quello che ti dice il maestro", "Corda, mobilità, shadow leggero: 8–10′ per arrivare caldo alle 19:00."],
]});
act({ title: "MMA", start: "19:00", end: "20:00", days: [TUE, THU], color: C.allenamento, essential: false, steps: [
  [0, "Lezione: ascolta il maestro, tecnica prima della forza", "Stai imparando: movimenti puliti e controllati. Sparring solo quando e come dice il maestro. Autodifesa concreta: la prima tecnica è evitare lo scontro (attenzione, distanza, allontanarsi); la legge italiana ammette solo una difesa proporzionata all'offesa."],
  [30, "Bevi tra un round e l'altro", "Qualche sorso ogni pausa: oggi sudi tanto."],
  [57, "Paradenti sciacquato subito e nella custodia", "Sotto l'acqua fredda appena finisci, poi nella custodia. Stasera lo lavi con acqua fredda e sapone."],
], detail: "Martedì e giovedì 19:00–20:00. Dopo: doccia veloce e bus delle 20:20." });
act({ title: "Doccia in palestra", start: "20:00", end: "20:15", days: [TUE, THU], color: C.igiene, steps: [
  [0, "Doccia veloce con ciabatte", "Doccia completa ma rapida (il bus è alle 20:20): sapone su tutto il corpo, capelli se serve."],
  [9, "Asciuga bene tra le dita dei piedi, deodorante, biancheria pulita", "Piedi ben asciutti prevengono funghi e irritazioni."],
  [12, "Bende e vestiti sudati nel sacchetto", "Separati dal resto: a casa le bende si lavano (ne alterni 2 paia)."],
]});
act({ title: "Alla fermata", start: "20:15", end: "20:20", days: [TUE, THU], color: C.trasporti, steps: [[0, "Aspetta il bus delle 20:20", "Nessuna attività: guarda solo se arriva il bus. Va bene così."]] });
act({ title: "Bus ritorno", start: "20:20", end: "20:50", days: [TUE, THU], color: C.trasporti, steps: [
  [0, "Siediti e bevi", "Finisci la bottiglietta: dopo pesi e MMA ti serve."],
  [3, "Stacca: niente o ascolto leggero", "Musica o podcast leggero, oppure niente. La giornata di lavoro è finita."],
]});
function gymShowerHome({ days, shower, back }) {
  act({ title: "Doccia in palestra", start: shower[0], end: shower[1], days, color: C.igiene, steps: [
    [0, "Doccia completa con ciabatte", "Sempre, anche se sei stanco: corpo, capelli."],
    [12, "Piedi asciutti, deodorante, biancheria pulita", "Asciuga bene tra le dita dei piedi."],
    [16, "Crema viso Hada Labo", "La pelle dopo la doccia calda si secca: un velo di crema."],
  ]});
  act({ title: "Ritorno", start: back[0], end: back[1], days, color: C.trasporti, steps: [
    [0, "Bus di ritorno", "Bevi e ascolto leggero."],
    [5, "Ascolto leggero o stacco", "Niente di impegnativo."],
  ]});
}
gymShowerHome({ days: [MON], shower: ["18:40", "19:00"], back: ["19:00", "19:30"] });
gymShowerHome({ days: [FRI], shower: ["18:35", "18:55"], back: ["18:55", "19:25"] });

act({ title: "Shadow + mobilità", start: "19:40", end: "19:55", days: [WED], color: C.allenamento, steps: [
  [0, "3 round di shadow da 3′", "Ripassa quello che hai fatto all'ultima lezione di MMA: guardia, passi, combinazioni. Lento e pulito, 1′ di pausa tra i round."],
  [11, "Mobilità anche e caviglie", "Affondi profondi con rotazione, cerchi di caviglia, 90/90 per le anche: 4′ in tutto."],
], detail: "Tecnica a casa nel giorno senza palestra. Intanto la teglia è in forno." });
act({ title: "Tecnica MMA a casa 45′", start: "17:15", end: "18:00", days: [SAT], color: C.allenamento, steps: [
  [0, "Shadow a tema: l'ultima lezione", "3–4 round da 3′: rifai le tecniche della settimana, pulite e lente, poi a ritmo."],
  [15, "Lavoro di piedi", "Passi avanti/indietro/laterali in guardia, cambi di angolo: 10′."],
  [25, "Mobilità", "Anche, caviglie, spalle: 10′."],
  [35, "Core", "Plank 3 × 45″, dead bug, hollow hold: 10′."],
], detail: "Leggera: serve alla tecnica, non ad affaticarti." });

// ---------------------------------------------------------------- dinners and evenings
meal({ title: "Cena", start: "19:30", end: "19:50", days: [MON], items: [["frittata di patate e cipolla (3 uova) + 100 g pane + insalata", "Ricetta (15′, 2 porzioni: l'altra la conservi): rosola cipolla e 2 patate già lesse a fette in padella con olio, versa sopra 6 uova sbattute con sale, coperchio e fuoco basso 5′, gira e altri 2′. ≈ 830 kcal, 33 g proteine.", true]], detail: "Pasto 5 dopo i pesi: conta il totale della giornata." });
meal({ title: "Cena", start: "20:50", end: "21:10", days: [TUE], items: [["125 g sgombro in scatola + 400 g patate lesse + 200 g verdure + 10 g olio", "Patate lesse già pronte (o 10′ in pentola a pressione), sgombro sgocciolato, verdure surgelate saltate. ≈ 710 kcal, 36 g proteine.", true]], detail: "Pasto 5 dopo pesi e MMA." });
meal({ title: "Cena", start: "19:55", end: "20:15", days: [WED], items: [["pasta al tonno: 100 g pasta + 120 g tonno + pelati + 10 g olio + verdura", "10′: pasta in acqua salata; nel frattempo scalda pelati e tonno in padella con l'olio; unisci con la verdura. ≈ 670 kcal, 46 g proteine.", true]] });
meal({ title: "Cena", start: "20:50", end: "21:10", days: [THU], items: [["3 uova strapazzate + 100 g pane + verdure saltate + 10 g olio", "6′: salta le verdure surgelate e mettile da parte; uova a fuoco basso mescolando, via dal fuoco ancora umide. ≈ 620 kcal, 30 g proteine.", true]] });
meal({ title: "Cena", start: "19:25", end: "19:45", days: [FRI], items: [["riso saltato: riso avanzato + 3 uova + 200 g verdure surgelate + salsa di soia", "8′: verdure in padella a fuoco alto; spostale di lato e strapazza le uova nello spazio libero; aggiungi il riso già cotto e la salsa di soia, mescola 2′. ≈ 810 kcal, 29 g proteine."]] });
meal({ title: "Cena", start: "19:30", end: "19:45", days: [SAT], items: [["pasta e fagioli: 100 g pasta + 240 g fagioli + pelati + 10 g olio + verdura", "Fagioli dalla pentola cotta alle 18:15. Ricetta (20′): scalda pelati, fagioli e aglio con un bicchiere d'acqua; dopo 8′ schiaccia metà fagioli (viene cremosa); butta la pasta dentro e cuoci mescolando. ≈ 740 kcal, 30 g proteine.", true]] });
meal({ title: "Cena", start: "19:30", end: "19:45", days: [SUN], items: [["dalla teglia appena fatta: 150 g pollo + 350 g patate + 200 g verdure + 10 g olio + 60 g pane", "≈ 745 kcal, 46 g proteine.", true]] });

act({ title: "Margine", start: "19:50", end: "20:00", days: [MON], color: C.libero, steps: [[0, "Riserva per gli imprevisti", D.margin]] });
act({ title: "Margine", start: "19:45", end: "19:55", days: [FRI], color: C.libero, steps: [[0, "Riserva per gli imprevisti", D.margin]] });
act({ title: "Margine", start: "20:25", end: "20:30", days: [WED], color: C.libero, steps: [[0, "Riserva per gli imprevisti", D.margin]] });
const freeTime = [[MON, "20:00", "21:00"], [FRI, "20:35", "21:00"], [SAT, "13:15", "14:30"], [SAT, "18:00", "18:15"], [SAT, "18:45", "19:30"], [SAT, "19:45", "20:30"], [SUN, "07:05", "08:30"], [SUN, "12:15", "13:00"], [SUN, "13:15", "15:00"], [SUN, "17:45", "18:30"]];
for (const [d, s, e] of freeTime) act({ title: "Tempo libero", start: s, end: e, days: [d], color: C.libero, essential: false, steps: [[0, "Tempo per te", D.free]] });

// Cooking (Nutrition system, section 04) and shopping
act({ title: "Cucina: teglia pollo e riso", start: "19:30", end: "19:40", days: [WED], color: C.organizzazione, steps: [
  [0, "Teglia in forno: pollo e riso", "Pollo a pezzi e riso (già cotto o crudo con acqua, secondo come lo fai di solito), olio, sale e spezie in teglia; forno a 200 °C. Cuoce da sola mentre fai shadow e ceni: zero minuti di lavoro in più."],
  [6, "Timer del forno puntato", "Metti il timer: la togli dopo cena."],
], detail: "Seconda sessione di cucina della settimana (dal PDF della dieta): prepara i pranzi di giovedì e venerdì." });
act({ title: "Contenitori di giovedì e venerdì", start: "20:15", end: "20:25", days: [WED], color: C.organizzazione, steps: [
  [0, "Sforna e riempi 2 contenitori", "Contenitore di giovedì: riso (ci aggiungerai 160 g tonno) + verdure. Contenitore di venerdì: pollo + riso + verdure. Il giovedì va davanti a tutto in frigo: domattina parte nello zaino."],
  [6, "Pulisci teglia e piano", "Subito, finché è caldo: 3′."],
]});
act({ title: "Cucina 30′", start: "18:15", end: "18:45", days: [SAT], color: C.organizzazione, steps: [
  [0, "Pentola di fagioli", "Per la cena di stasera (pasta e fagioli) e il pranzo di domani."],
  [8, "400 g di riso", "Per il riso saltato e i contenitori della settimana."],
  [15, "4 uova sode", "9′ in acqua bollente, poi acqua fredda: per gli spuntini a scuola."],
  [25, "Tutto in frigo, etichettato", "Quello che si mangia entro 48 ore sta in frigo, il resto in freezer subito."],
], detail: "Terza sessione di cucina, prima della sera libera." });
act({ title: "Spesa settimanale", start: "11:15", end: "12:15", days: [SUN], color: C.organizzazione, steps: [
  [0, "Controlla dispensa e frigo", "Guarda cosa manca rispetto alla lista (Dieta → Lista della spesa). Tieni sempre la scorta del piano B: tonno, fagioli, pomodorini e pane per 2 pasti."],
  [5, "Spesa con la lista dell'app", "Discount o mercato a fine giornata. Circa 69 € a settimana (50 € nella versione risparmio): solo quello che c'è in lista."],
  [45, "Pane da 1 kg: affettalo e congelalo oggi", "Si scongela in padella in 2′."],
  [52, "Riponi e registra la spesa in Finanza", "Registrare le spese: 2′ al giorno, totale controllato la domenica."],
]});
act({ title: "Cucina 60′", start: "18:30", end: "19:30", days: [SUN], color: C.organizzazione, steps: [
  [0, "Teglia pollo e patate in forno (3 porzioni)", "1 kg cosce di pollo + 1 kg patate a cubi da 2 cm, 2 cucchiai d'olio, sale, paprika, rosmarino; mescola con le mani in teglia; forno a 200 °C per 30–35′. Esce: cena di stasera, pranzo di lunedì e di martedì."],
  [5, "Mentre cuoce: 500 g di riso", "Per il contenitore di lunedì e per il resto della settimana."],
  [15, "6 uova sode", "9′ in acqua bollente, poi fredda. Per gli spuntini della settimana."],
  [25, "Pentola di ceci", "Per la pasta e ceci di mercoledì (ceci in scatola o secchi messi a bagno ieri)."],
  [40, "3 barattoli di overnight oats (lun, mer, ven)", "Per ognuno: 100 g avena + 300 ml latte + 1 banana a fette + 20 g burro d'arachidi + cannella. In frigo."],
  [55, "Dividi la teglia: cena + contenitori di lunedì e martedì", "Contenitore di lunedì: pollo + riso + verdure. Contenitore di martedì: pollo + patate + verdure."],
], detail: "Prima e più lunga sessione di cucina: «cuoci una volta, mangia tre volte»." });

meal({ title: "Pranzo", start: "13:00", end: "13:15", days: [SAT], items: [["150 g pollo + 400 g patate + 200 g verdure + 100 g pane", "Pollo in padella (10′) o dal freezer se avanzato, patate lesse, verdure surgelate. ≈ 855 kcal, 50 g proteine.", true]], detail: "Pasto 3 del sabato, tra due blocchi di studio." });
meal({ title: "Pranzo", start: "13:00", end: "13:15", days: [SUN], items: [["zero cottura: 120 g tonno + 240 g fagioli + pomodorini + 10 g olio + 100 g pane", "5′: sciacqua i fagioli (quelli cotti sabato o in scatola) sotto l'acqua fredda, unisci tonno, 10 pomodorini tagliati, olio e origano. È anche il piano B di qualsiasi giorno. ≈ 690 kcal, 54 g proteine.", true]] });

// Snacks / optional
meal({ title: "Merenda", start: "17:00", end: "17:15", days: [SAT], items: [["250 g yogurt + 1 banana + 30 g pane", "Al cambio di attività, anche in piedi. ≈ 350 kcal, 14 g proteine."]] });
meal({ title: "Merenda", start: "16:00", end: "16:15", days: [SUN], items: [["250 g yogurt + 1 banana + 40 g avena", "≈ 430 kcal, 17 g proteine."]] });

// Saturday morning
act({ title: "Risveglio lento", start: "07:05", end: "07:40", days: [SAT], color: C.libero, steps: [[0, "Lettura leggera o musica, niente social", "Un libro, musica, un caffè in pace. Niente social: la giornata di studio parte meglio."]] });
act({ title: "Luce + piano", start: "07:40", end: "08:00", days: [SAT], color: C.organizzazione, steps: [
  [0, "5′ fuori o alla finestra", "Luce naturale in faccia: sveglia il cervello."],
  [5, "Scrivi i 5 obiettivi dei blocchi di oggi", "Uno per blocco (matematica, fisica, Sant'Anna, maturità, inglese), concreti e misurabili."],
]});

// Showers at home (Wed/Sat/Sun)
act({ title: "Doccia + capelli", start: "20:30", end: "21:00", days: [WED, SAT, SUN], color: C.igiene, steps: [
  [0, "Doccia completa", "Corpo, capelli con shampoo, risciacquo accurato."],
  [18, "Asciuga bene, anche tra le dita dei piedi", "Asciugamano pulito: prima i capelli, poi il corpo; tra le dita dei piedi con cura, così non vengono funghi."],
  [25, "Cura del corpo", "Crema corpo se la pelle tira; unghie a posto."],
]});

// Weekly review, care, Monday prep, brainstorm
act({ title: "Revisione settimanale", start: "16:15", end: "17:00", days: [SUN], color: C.organizzazione, essential: false, steps: [
  [0, "Apri il Resoconto settimana nell'app", "Altro → Resoconto settimana: ore di studio, allenamenti, sonno, pasti, peso. Rispondi alle domande qui sotto guardando quei numeri."],
  [3, "Ore di studio, allenamenti e sonno segnati?", "Obiettivi: studio 18h10 (minimo 15h), 4 sedute di pesi e 2 di MMA, 7 notti su 7 con spegnimento alle 21:30 (minimo 6)."],
  [7, "Quali blocchi sono saltati e perché? Serve spostarne o accorciarne uno?", "Una riga per blocco saltato: causa e cosa cambi."],
  [11, "Voti e verifiche: c'è una materia della maturità in calo?", "Se sì, sposta su quella materia il blocco di maturità di martedì."],
  [15, "Quaderno degli errori: rifatti tutti?", "Quelli non riusciti restano per la prossima domenica."],
  [19, "In linea con il mese del calendario (mate, fisica, Sant'Anna)?", "Guarda il tema del mese nei blocchi di studio."],
  [23, "Pesi: carichi saliti su almeno 2 esercizi nelle ultime 2 settimane?", "Se due sedute di fila senza progressi: controlla sonno, cibo, recupero; se sono a posto, togli una serie per esercizio per 2 settimane."],
  [27, "Peso medio: sale tra 0,2 e 0,5 kg a settimana?", "Regola del PDF: meno di 0,2 kg → +200 kcal (50 g di pasta o riso crudi, oppure 30 g di burro d'arachidi); più di 0,5 kg → −200 kcal."],
  [31, "Sonno: quante sere hai spento dopo le 21:30? Cosa l'ha causato?", "Una riga di causa per ogni sera."],
  [35, "Budget: spese registrate e dentro le quote?", "Finanza: spese della settimana."],
  [39, "Scadenze della prossima settimana (verifiche, TOLC, bando)", "Scrivile nel diario con il giorno, e decidi in quale blocco di studio le prepari."],
  [42, "Borsa sport lavata e pronta, zaino pronto, vestiti del lunedì scelti?", "Se no, fallo nella cura settimanale o in «Prepara lunedì»."],
]});
act({ title: "Cura settimanale", start: "17:00", end: "17:45", days: [SUN], color: C.igiene, essential: false, steps: [
  [0, "Unghie di mani e piedi corte", "Obbligatorio per l'MMA (sparring e clinch): corte e senza angoli."],
  [10, "Scrub corpo leggero", "Sotto la doccia o con la pelle umida: gomiti, ginocchia, schiena. Leggero."],
  [18, "Viso: Cure Natural Aqua Gel", "Esfoliante 1 volta a settimana, mai nella stessa sera del retinolo. Viso asciutto: una pompata, massaggia 30″ in piccoli cerchi (si formano palline), sciacqua bene, poi crema Hada Labo.", { from: CURE_FROM }],
  [24, "Pulisci rasoio e pettini", "Acqua calda e sapone, asciuga."],
  [30, "Lava bende, borsa, bottigliette", "Bende in lavatrice o a mano; borsa aperta ad arieggiare; bottigliette lavate."],
  [40, "Guantoni aperti ad asciugare", "Mai chiusi nella borsa."],
]});
act({ title: "Prepara lunedì", start: "19:45", end: "20:00", days: [SUN], color: C.organizzazione, essential: true, steps: [
  [0, "Zaino", "Libri del lunedì, astuccio, compiti fatti."],
  [5, "Borsa palestra", "Lunedì: pesi Lower B. Cambio, asciugamano, ciabatte, 2 bottigliette."],
  [10, "Vestiti", "Scelti e pronti sulla sedia."],
]});
act({ title: "Brainstorm settimanale con Claude", start: "20:00", end: "20:30", days: [SUN], color: C.organizzazione, from: BRAINSTORM_FROM, steps: [
  [0, "Copia il resoconto della settimana", "Altro → Resoconto settimana → Condividi/copia per il brainstorm."],
  [3, "Incollalo nella chat con Claude + cosa ti è pesato e cosa ti è mancato", "Scegliamo insieme 2–3 miglioramenti per la settimana."],
]});
act({ title: "Tempo libero", start: "20:00", end: "20:30", days: [SUN], color: C.libero, until: "2026-10-03", steps: [[0, "Tempo per te", D.free]] });

// ---------------------------------------------------------------- evening routine
const NEXT_CONTAINER = { [SUN]: "lunedì", [MON]: "martedì", [TUE]: "mercoledì", [WED]: "giovedì", [THU]: "venerdì", [FRI]: "sabato" };
const OPTIONAL = { [MON]: "250 ml latte", [TUE]: "250 ml latte", [WED]: "150 g yogurt bianco", [THU]: "250 ml latte", [FRI]: "250 ml latte o 150 g yogurt", [SAT]: "250 ml latte", [SUN]: "250 ml latte" };
function evening(day, start, reduced) {
  const steps = [];
  let t = 0;
  const add = (min, label, detail, extra) => { steps.push([t, label, detail, extra]); t += min; };
  add(3, "Togli le lenti e spunta «Lenti tolte» nell'app", "Mani lavate e asciutte. Togli prima la destra. Metti ogni lente nel suo lato del portalenti con soluzione nuova (mai rabboccare quella vecchia). Poi spunta «Lenti tolte» nell'app: se non lo fai entro l'orario, parte l'SMS al tuo amico.");
  add(3, "Filo interdentale + denti 2′", "Filo tra tutti i denti (anche dietro gli ultimi), poi 2′ di spazzolino come al mattino.");
  add(2, "Viso: Hada Labo Foaming Face Wash", "Come al mattino: 30–40″ di massaggio, risciacquo tiepido, tamponi.");
  if (day === MON || day === THU) add(2, "DHC Retinol Cream (sera del retinolo)", "Viso completamente asciutto (aspetta 2′ dopo il lavaggio). Quantità: un pisello per tutto il viso, a puntini, lontano da occhi, narici e labbra. I primi giorni può tirare o arrossare un po': se brucia, salta la sera successiva. Domattina SPF obbligatorio.", { from: RETINOL_FROM });
  if (day === TUE) add(2, "DHC Retinol Cream (terza sera del retinolo)", "Dalla quarta settimana di retinolo, se la pelle lo tollera: terza sera. Stesse regole: viso asciutto, un pisello, lontano da occhi e labbra.", { from: RETINOL_3_FROM });
  add(2, "Hada Labo Gokujyun Hyaluronic Cream", "Un pisello abbondante. Nelle sere del retinolo va dopo, sopra: attenua l'irritazione.");
  add(1, "Antitraspirante", "La sera, sulla pelle asciutta: funziona meglio che al mattino.");
  if (day === TUE || day === THU) add(2, "Paradenti: acqua fredda e sapone", "Lavalo, sciacqualo e lascialo asciugare nella custodia aperta.");
  if (day === WED || day === SUN) add(2, "Cambia la federa del cuscino", "2 volte a settimana (mercoledì e domenica): aiuta anche la pelle del viso.");
  if (NEXT_CONTAINER[day]) add(1, `Contenitore di ${NEXT_CONTAINER[day]}: dal freezer al frigo (e nello zaino)`, D.containerRule);
  if (!reduced) add(3, "Vestiti, zaino e borsa di domani", "Tutto pronto stasera: domattina non decidi niente.");
  else add(2, "Borsa di domani", "Solo lo stretto necessario: il resto domattina nel margine.");
  add(1, `Se hai fame: ${OPTIONAL[day]}`, "Spuntino facoltativo del PDF: solo se hai fame. Con il tuo peso attuale il menu lo toglie (regola del PDF: sotto i 65 kg si salta).", { optional: true });
  add(1, "Luci basse, telefono fuori dalla camera o in modalità aereo", "Dalle 21:30 si dorme: 9 ore piene. Niente schermi a letto.");
  const end = reduced ? "21:30" : "21:30";
  // squeeze the steps into the available minutes
  const span = toMin(end) - toMin(start);
  steps.forEach((s, i) => { s[0] = Math.round(((span - 1) * i) / Math.max(1, steps.length - 1)); });
  act({ title: reduced ? "Routine serale (ridotta)" : "Routine serale", start, end, days: [day], color: C.igiene, essential: true, steps,
    detail: reduced ? "20′ invece di 30′: stasera sei rientrato alle 20:50. Niente doccia (fatta in palestra)." : "30′: lenti, denti, skincare della sera, preparazione del giorno dopo, luci basse." });
}
evening(MON, "21:00", false);
evening(TUE, "21:10", true);
evening(WED, "21:00", false);
evening(THU, "21:10", true);
evening(FRI, "21:00", false);
evening(SAT, "21:00", false);
evening(SUN, "21:00", false);

act({ title: "Sonno", start: "21:30", end: "06:30", days: ALL, color: C.sonno, essential: true, steps: [
  [0, "Luci spente: 9 ore piene", "Il sonno è fisso tutti i 7 giorni: nessuna attività, nemmeno lo studio, si prende ore di sonno. Telefono fuori dalla camera o in modalità aereo."],
]});

// ---------------------------------------------------------------- goals (priority order given by you)
let g = 0;
function goal(title, priority, target, milestones) {
  const id = `goal${++g}`;
  return { id, title, priority, target, milestones: milestones.map(([due, t], i) => ({ id: `${id}-m${i}`, due, title: t })) };
}
const goals = [
  goal("100 alla maturità", 1, "100/100 all'esame di giugno 2027 (credito del 5° anno + prima prova + seconda prova + colloquio)", [
    ["2026-10", "Nessuna insufficienza nel primo mese"],
    ["2026-10", "Verificato con i docenti il formato ufficiale dell'esame 2027"],
    ["2026-12", "Pagella del primo periodo con media ≥ 9"],
    ["2027-01", "Materie della seconda prova uscite: piano delle simulazioni pronto"],
    ["2027-02", "Media ≥ 9 e nessuna insufficienza (obiettivo intermedio)"],
    ["2027-02", "Prima simulazione di seconda prova (poi una ogni 2 settimane, il sabato)"],
    ["2027-02", "Primo testo completo di prima prova corretto dal docente (poi uno ogni 2 settimane, tipologie A, B, C)"],
    ["2027-03", "Mappa dei collegamenti per ogni materia del colloquio"],
    ["2027-04", "Due mesi di simulazioni scritte con regolarità"],
    ["2027-05", "Simulazioni del colloquio ad alta voce, registrandoti la domenica"],
    ["2027-06", "Ripasso globale con sonno invariato, anche la notte prima delle prove"],
    ["2027-06", "Esame: 100/100"],
  ]),
  goal("Ammissione al Sant'Anna · Ingegneria", 2, "TOLC-I sopra soglia, prove scritte a Pisa a fine agosto 2027, orale a settembre", [
    ["2026-10", "Test diagnostico di matematica e fisica"],
    ["2026-10", "Mate: algebra, equazioni e disequazioni (fratte, modulo), sistemi"],
    ["2026-10", "Fisica: grandezze, vettori, cinematica 1D"],
    ["2026-10", "Fondo concorso avviato: 50 € al mese (450 € a giugno per TOLC, viaggio e soggiorno a Pisa)"],
    ["2026-11", "Mate: funzioni, esponenziali e logaritmi"],
    ["2026-11", "Fisica: cinematica 2D e principi della dinamica"],
    ["2026-11", "Lette 2 prove passate del Sant'Anna (senza risolverle)"],
    ["2026-12", "Mate: goniometria e trigonometria"],
    ["2026-12", "Fisica: lavoro, energia, conservazione"],
    ["2026-12", "Problemi di logica nelle vacanze"],
    ["2027-01", "Mate: geometria analitica (retta e coniche)"],
    ["2027-01", "Fisica: quantità di moto e urti"],
    ["2027-01", "Primi esercizi TOLC-I"],
    ["2027-02", "Mate: successioni, limiti, continuità (arrivato ai limiti)"],
    ["2027-02", "Fisica: moto rotatorio e gravitazione · meccanica completata"],
    ["2027-02", "Prime 3 prove passate lette e tentate"],
    ["2027-03", "Mate: derivate e studio di funzione"],
    ["2027-03", "Fisica: fluidi e termodinamica"],
    ["2027-03", "Bando 2027 letto: requisiti, date valide del TOLC-I, soglia"],
    ["2027-04", "Mate: integrali, geometria euclidea e solida"],
    ["2027-04", "Fisica: onde ed elettrostatica"],
    ["2027-04", "Iscrizione e primo TOLC-I"],
    ["2027-05", "Mate: combinatoria, probabilità, problemi misti"],
    ["2027-05", "Fisica: circuiti, magnetismo, induzione"],
    ["2027-05", "Secondo TOLC-I, se serve"],
    ["2027-06", "TOLC-I sopra soglia e 10+ prove passate provate"],
    ["2027-07", "Iscrizione al concorso entro la scadenza del bando · viaggio a Pisa organizzato"],
    ["2027-07", "Lacune chiuse (settimane 2–3 dell'estate)"],
    ["2027-08", "Ritmo d'esame: 2 simulazioni a settimana, poi rifinitura"],
    ["2027-08", "Prove scritte a Pisa"],
    ["2027-09", "Orale: soluzioni spiegate ad alta voce e motivazioni pronte"],
  ]),
  goal("Fisico e massa muscolare", 3, "Carichi dei fondamentali in crescita, peso in aumento controllato (+0,2–0,5 kg a settimana): circa 6–9 kg in un anno scolastico", [
    ["2026-10", "Prime 3 settimane: carichi leggeri, si impara la tecnica (squat e stacco guardati o filmati)"],
    ["2026-10", "Registro completo di carichi e ripetizioni a ogni seduta"],
    ["2026-10", "Pesata della domenica mattina ogni settimana"],
    ["2026-10", "Bilancia da cucina: tutto pesato per 3–4 settimane"],
    ["2026-11", "5 pasti con proteine ogni giorno per 4 settimane"],
    ["2026-11", "Settimana di scarico a fine novembre (stessi pesi, metà serie)"],
    ["2027-01", "Settimana di scarico a fine gennaio"],
    ["2027-02", "Carichi aumentati su tutti gli esercizi rispetto a ottobre"],
    ["2027-03", "Peso medio in salita regolare da 3 mesi"],
    ["2027-04", "Settimana di scarico a Pasqua"],
    ["2027-06", "Carichi dei fondamentali quasi raddoppiati rispetto a ottobre"],
  ]),
  goal("MMA e autodifesa concreta", 4, "Tecnica solida, sparring controllato con l'ok del maestro, autodifesa realistica", [
    ["2026-10", "Iscrizione, certificato medico sportivo e quota: tutto chiesto e fatto"],
    ["2026-10", "Attrezzatura: guantini/guantoni, 2 paia di bende, paradenti, parastinchi, conchiglia (chiedi al maestro cosa serve)"],
    ["2026-11", "Fondamentali puliti: guardia, passi, colpi base"],
    ["2027-01", "Combinazioni da 3–4 colpi e contrattacchi"],
    ["2027-02", "3 round da 3′ a ritmo costante"],
    ["2027-02", "Clinch e lotta di base"],
    ["2027-03", "Primi sparring tecnici (solo con l'ok del maestro)"],
    ["2027-04", "Lezioni su situazioni di difesa realistiche (chiedile al maestro)"],
    ["2027-05", "Sparring leggero regolare"],
    ["2027-06", "Valutazione positiva del maestro"],
    ["2027-08", "Niente sparring pesante nelle 2 settimane prima delle prove a Pisa"],
  ]),
  goal("Inglese da B1 verso C1", 5, "B2 solido entro giugno 2027 (grammatica), C1 pieno nel 2027–28", [
    ["2026-10", "Test di livello gratuito (punto di partenza)"],
    ["2026-10", "Inglese sul bus 5 giorni su 5 per 4 settimane"],
    ["2027-01", "Grammatica intermedia completata: tempi verbali, condizionali, passivo, discorso indiretto"],
    ["2027-02", "Test di livello intermedio e passaggio alla grammatica avanzata"],
    ["2027-04", "Un testo scritto corretto ogni sabato per 8 settimane"],
    ["2027-05", "Test di livello finale"],
    ["2027-06", "B2 solido in grammatica"],
    ["2028-06", "C1 pieno"],
  ]),
  goal("Attrattività: da 4,5 a 7", 6, "Pelle, igiene, cura e fisico curati con costanza: la parte che dipende da te", [
    ["2026-09", "Skincare base ogni giorno: Foaming Face Wash, Hyaluronic Cream, UV White Gel SPF50+"],
    ["2026-10", "Prima foto progressi di viso e fisico"],
    ["2026-10", "Rohto Melano CC introdotta dal 12 ottobre (da sola, 2 settimane di prova)"],
    ["2026-10", "DHC Retinol introdotto dal 26 ottobre, 2 sere a settimana"],
    ["2026-11", "Cure Natural Aqua Gel introdotto dal 9 novembre, 1 volta a settimana"],
    ["2026-11", "Retinolo a 3 sere a settimana dal 23 novembre, se la pelle lo tollera"],
    ["2026-11", "Cura della domenica per 4 settimane di fila (unghie, scrub, rasoio)"],
    ["2026-11", "Federa del cuscino cambiata 2 volte a settimana per 4 settimane"],
    ["2026-12", "Seconda foto progressi: confronto con ottobre"],
    ["2027-01", "Se acne o irritazioni persistono: visita dal dermatologo"],
    ["2027-03", "Foto progressi di marzo: pelle e fisico a confronto"],
    ["2027-06", "Fisico in crescita (vedi obiettivo 3) e foto di giugno"],
  ]),
];

const pack = {
  app: "wellness-tracker-plan",
  version: 2,
  name: "Routine annuale 2026–27 + dieta (MMA mar/gio, pesi lun/mar/gio/ven)",
  routine,
  meals: [],
  goals,
  water: { start: "06:30", end: "21:30", intervalMin: 30 },
};

// ---------------------------------------------------------------- sanity checks
let problems = 0;
for (const day of ALL) {
  const acts = routine.filter((a) => a.days.includes(day) && a.title !== "Sonno" && !a.from)
    .map((a) => [toMin(a.start), toMin(a.end), a.title]).sort((x, y) => x[0] - y[0]);
  let cursor = toMin("06:30");
  for (const [s, e, t] of acts) {
    if (s !== cursor) { console.log(`day ${day}: gap/overlap before ${t} (${hm(cursor)} → ${hm(s)})`); problems++; }
    cursor = e;
  }
  if (cursor !== toMin("21:30")) { console.log(`day ${day}: ends at ${hm(cursor)}`); problems++; }
}
for (const a of routine) for (const s of a.steps) {
  const st = toMin(s.time), a0 = toMin(a.start), a1 = toMin(a.end);
  const inside = a1 > a0 ? st >= a0 && st < a1 : st >= a0 || st < a1;
  if (!inside) { console.log(`step outside activity: ${a.title} ${s.time} ${s.label}`); problems++; }
  if (!s.detail) { console.log(`step without detail: ${a.title} · ${s.label}`); problems++; }
}
const titles = new Set(routine.map((a) => a.title));
for (const bad of ["Libero", "Riposo", "Pausa lunga", "Muay Thai"]) if ([...titles].some((t) => t.startsWith(bad))) { console.log(`old name still used: ${bad}`); problems++; }

const out = new URL("../src/data/defaultPlan.json", import.meta.url);
writeFileSync(out, JSON.stringify(pack, null, 1));
const steps = routine.reduce((n, a) => n + a.steps.length, 0);
console.log(`activities ${routine.length}, steps ${steps}, goals ${goals.length}, milestones ${goals.reduce((n, x) => n + x.milestones.length, 0)}, problems ${problems}`);
