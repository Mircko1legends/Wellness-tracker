import type { StudySubject } from "../timeline/plan";

/**
 * What each study block is about in a given month: "Routine annuale 2026–27", sections 4.3–4.6 and the calendar.
 * Month keys are 1–12; July–September are the summer before the Sant'Anna exams.
 */
type MonthTable = Partial<Record<number, string>>;

const MATEMATICA: MonthTable = {
  10: "Algebra: equazioni e disequazioni (anche fratte e con modulo), sistemi. Prima settimana: test diagnostico (esercizi di fine capitolo di ogni argomento).",
  11: "Funzioni e grafici, esponenziali e logaritmi.",
  12: "Goniometria e trigonometria.",
  1: "Geometria analitica: retta e coniche.",
  2: "Successioni, limiti, continuità (45′ a settimana passano alle prove passate del Sant'Anna).",
  3: "Derivate e studio di funzione.",
  4: "Integrali, geometria euclidea e solida.",
  5: "Combinatoria, probabilità, problemi misti.",
  6: "Solo mantenimento (il sabato): la priorità è la maturità.",
  7: "Estate: argomenti deboli dal quaderno degli errori + esercizi da prove passate (120′ al mattino).",
  8: "Estate: prove degli ultimi anni a tempo, correzione il giorno dopo.",
  9: "Orale del Sant'Anna: spiega ad alta voce le soluzioni.",
};

const FISICA: MonthTable = {
  10: "Grandezze, vettori, cinematica 1D.",
  11: "Cinematica 2D, principi della dinamica.",
  12: "Lavoro, energia, conservazione.",
  1: "Quantità di moto, urti.",
  2: "Moto rotatorio, gravitazione: meccanica completata.",
  3: "Fluidi, termodinamica.",
  4: "Onde, elettrostatica.",
  5: "Circuiti, magnetismo, induzione.",
  6: "Pausa: maturità.",
  7: "Estate: problemi da prove passate e Olimpiadi di Fisica (120′).",
  8: "Estate: simulazioni a tempo della prova di fisica.",
  9: "Orale: fisica spiegata ad alta voce.",
};

const SANTANNA: MonthTable = {
  10: "Test diagnostico. Costruisci il ragionamento: problemi di logica, esercizi «non standard».",
  11: "Leggi 2 prove passate del Sant'Anna (senza risolverle): capisci che cosa chiedono.",
  12: "Problemi di logica (anche nelle vacanze).",
  1: "Primi esercizi TOLC-I (matematica, logica, scienze, comprensione verbale, inglese).",
  2: "1 esercizio da prove passate a settimana + TOLC-I: il blocco sale a 2h30 settimanali.",
  3: "Leggi il bando 2027 (esce di solito entro marzo): requisiti, date TOLC, soglia.",
  4: "Iscrizione e primo TOLC-I (così non ce l'hai addosso durante la maturità).",
  5: "Secondo TOLC-I se serve; prove passate a tempo.",
  6: "Pausa: maturità.",
  7: "Iscrizione al concorso entro la scadenza del bando; prove passate più vecchie senza limite di tempo.",
  8: "Ritmo d'esame: 2 simulazioni a settimana, poi rifinitura e prove scritte a Pisa.",
  9: "Orale: fisica, attitudine alla progettazione, motivazioni (perché Ingegneria, perché il Sant'Anna).",
};

const MATURITA: MonthTable = {
  10: "Media ≥ 9 in tutte le materie: studio ogni giorno di quanto spiegato in classe. Nessuna insufficienza.",
  11: "Prime verifiche: stesso metodo, studio attivo quotidiano.",
  12: "Pagella del primo periodo. Vacanze: studio 08:00–12:00, pomeriggio libero.",
  1: "Recuperi e, a fine mese, uscita delle materie della seconda prova.",
  2: "Simulazioni: 1 seconda prova ogni 2 settimane (sabato) e 1 testo completo di prima prova ogni 2 settimane (tipologie A, B, C).",
  3: "Mappe dei collegamenti per il colloquio, una per materia.",
  4: "Simulazioni scritte con regolarità.",
  5: "Ripasso generale; la domenica simulazioni del colloquio ad alta voce (anche registrandoti).",
  6: "Esame: ripasso globale, ritmo dell'esame, sonno invariato anche la notte prima.",
};

const INGLESE: MonthTable = {
  10: "Grammatica intermedia (es. Murphy, «English Grammar in Use»): tempi verbali. Test di livello gratuito all'inizio del mese.",
  11: "Grammatica intermedia: condizionali.",
  12: "Grammatica intermedia: passivo.",
  1: "Grammatica intermedia: discorso indiretto; ripasso di tutto il livello.",
  2: "Da ora grammatica avanzata (es. Hewings, «Advanced Grammar in Use»). Test di livello intermedio.",
  3: "Grammatica avanzata + 1 testo scritto (email, saggio breve) corretto con le regole studiate.",
  4: "Grammatica avanzata + writing.",
  5: "Test di livello finale.",
  6: "Solo mantenimento (bus, ascolto).",
  7: "Solo ascolto e flashcard nei momenti morti.",
  8: "Solo ascolto e flashcard nei momenti morti.",
};

const ERRORI: MonthTable = {};

const TABLES: Record<StudySubject, MonthTable> = {
  maturita: MATURITA,
  matematica: MATEMATICA,
  fisica: FISICA,
  santanna: SANTANNA,
  inglese: INGLESE,
  errori: ERRORI,
};

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** "Questo mese (ottobre): ..." for a study block, or null when the plan has nothing specific. */
export function monthTopic(subject: StudySubject, date: string): string | null {
  const month = Number(date.slice(5, 7));
  if (subject === "errori") {
    const m = MATEMATICA[month];
    const f = FISICA[month];
    return m || f ? `Rifai gli errori della settimana su: ${[m, f].filter(Boolean).join(" · ")}` : null;
  }
  const topic = TABLES[subject][month];
  return topic ? `Questo mese (${MONTHS[month - 1]}): ${topic}` : null;
}

/** The "Altro" column of the year calendar: one-off things to do in the month. */
export const MONTH_EXTRAS: MonthTable = {
  10: "Test di livello inglese · acquisti di base per MMA e palestra · orari definitivi.",
  11: "Decisione sulla 3DS a fine mese (solo se quote fisse pagate, fondo imprevisti intatto e prezzo coperto dal fondo svago).",
  12: "Vacanze: studio 08:00–12:00, pomeriggio libero · settimana di scarico dei pesi.",
  1: "Revisione del piano · settimana di scarico dei pesi a fine mese.",
  2: "Test di inglese intermedio.",
  3: "Lettura del bando Sant'Anna.",
  4: "Iscrizione al TOLC-I · scarico a Pasqua.",
  5: "Test di inglese finale.",
  6: "Esame di maturità · sonno invariato.",
};
