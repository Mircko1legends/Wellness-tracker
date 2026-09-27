/** Your skincare (with the introduction schedule used by the plan) and your supplements, with honest notes. */

export interface SkincareProduct {
  name: string;
  role: string;
  when: string;
  from: string; // introduced in the plan from this day
  how: string;
}

export const SKINCARE: SkincareProduct[] = [
  { name: "Hada Labo Gokujyun Hyaluronic Foaming Face Wash", role: "Detergente", when: "Mattina e sera", from: "2026-09-28", how: "30–40″ di massaggio con acqua tiepida, poi tamponi. Sempre il primo passaggio." },
  { name: "Hada Labo Gokujyun Hyaluronic Cream", role: "Idratante", when: "Mattina e sera", from: "2026-09-28", how: "Un pisello abbondante. Nelle sere del retinolo va sopra il retinolo." },
  { name: "Hada Labo Gokujyun UV White Gel SPF50+ PA++++", role: "Protezione solare", when: "Ogni mattina, ultimo passaggio", from: "2026-09-28", how: "Due strisce lungo indice e medio per viso e collo; riapplica dopo 2–3 ore se stai fuori." },
  { name: "Rohto Melano CC Intensive Anti-Spot Essence", role: "Vitamina C: macchie e segni", when: "Mattina, prima della crema", from: "2026-10-12", how: "2–3 gocce picchiettate, lontano dagli occhi. Se pizzica forte o arrossa, sospendi." },
  { name: "DHC Retinol Cream", role: "Retinolo: grana, segni, invecchiamento", when: "Sera: lunedì e giovedì, poi anche martedì", from: "2026-10-26", how: "Su pelle asciutta, un pisello per tutto il viso. Mai nella stessa sera dell'esfoliante. Il giorno dopo SPF obbligatorio." },
  { name: "Cure Natural Aqua Gel", role: "Esfoliante delicato", when: "Domenica, nella cura settimanale", from: "2026-11-09", how: "Su viso asciutto, massaggia 30″ (si formano palline), sciacqua bene, poi crema." },
];

export const SKINCARE_RULES = [
  "Un prodotto nuovo alla volta e 2 settimane di prova prima del successivo (regola del tuo piano): se la pelle reagisce, sai chi è stato.",
  "Prima di usare un prodotto nuovo su tutto il viso: prova 2 sere dietro l'orecchio o sulla mascella.",
  "Retinolo ed esfoliante mai nella stessa sera; SPF tutte le mattine, anche d'inverno.",
  "Acne o irritazione che non passa dopo 4–6 settimane: un dermatologo vale più di dieci prodotti.",
];

export type Evidence = "buona" | "discreta" | "scarsa" | "molto scarsa";

export interface Supplement {
  id: string;
  name: string;
  why: string;
  evidence: Evidence;
  costMin: number; // € al mese alla dose di etichetta, stima
  costMax: number;
  caution: string;
}

/** Your favourites. Costs are rough monthly estimates in Italy (online or pharmacy, mid-range brands). */
export const MY_SUPPLEMENTS: Supplement[] = [
  { id: "d3k2", name: "Vitamina D3 + K2 (MK-7)", why: "Carenza molto comune in inverno; utile per ossa, muscoli e umore se sei carente.", evidence: "buona", costMin: 3, costMax: 6, caution: "Meglio misurare prima la vitamina D nel sangue (si fa con gli esami del litio). La K2 conta se un giorno prenderai anticoagulanti." },
  { id: "shilajit", name: "Shilajit (resina purificata)", why: "Usato per energia e testosterone.", evidence: "molto scarsa", costMin: 15, costMax: 30, caution: "Pochi studi seri sull'uomo. Rischio di metalli pesanti se non è testato in laboratorio: solo marche con analisi pubblicate. Interazioni con il litio non studiate." },
  { id: "ashwagandha", name: "Ashwagandha (estratto titolato, es. KSM-66)", why: "Stress, ansia, sonno; piccoli effetti su forza.", evidence: "discreta", costMin: 6, costMax: 12, caution: "Può alzare gli ormoni tiroidei (il litio può abbassarli: complica i controlli), rari danni al fegato, effetto sedativo. In chi ha un disturbo dell'umore sono stati descritti casi di agitazione o ipomania: decisione da prendere con lo psichiatra." },
  { id: "biotina", name: "Biotina", why: "Capelli e unghie, ma aiuta solo se sei carente (raro).", evidence: "scarsa", costMin: 2, costMax: 5, caution: "Falsa molti esami del sangue, compresi quelli della tiroide che fai con il litio: sospendila 2–3 giorni prima degli esami e dillo al laboratorio." },
  { id: "cheratina", name: "Cheratina (integratore capelli)", why: "Capelli più forti.", evidence: "molto scarsa", costMin: 8, costMax: 15, caution: "Prove quasi assenti. Spesso contiene anche biotina: stessa attenzione agli esami del sangue." },
  { id: "zinco", name: "Zinco (bisglicinato)", why: "Pelle, difese, testosterone se sei carente.", evidence: "discreta", costMin: 2, costMax: 4, caution: "Alla dose di etichetta va bene; ad alte dosi per mesi fa calare il rame." },
  { id: "bcomplex", name: "Vitamine del gruppo B (complesso)", why: "Energia e sistema nervoso se la dieta è carente.", evidence: "scarsa", costMin: 3, costMax: 7, caution: "La B6 a dosi molto alte per mesi può dare formicolii. Molti complessi contengono biotina (esami del sangue)." },
  { id: "lionsmane", name: "Lion's mane (estratto del corpo fruttifero)", why: "Memoria e concentrazione.", evidence: "scarsa", costMin: 12, costMax: 25, caution: "Pochi studi sull'uomo; possibile allergia ai funghi. Interazioni con il litio non studiate." },
];

/** Worth proposing to the psychiatrist. */
export const SUGGESTED_SUPPLEMENTS: Supplement[] = [
  { id: "omega3", name: "Omega-3 ricchi di EPA", why: "L'integratore con più prove come aiuto aggiuntivo (non sostituto) nella depressione dei disturbi bipolari; utile anche per cuore e pelle.", evidence: "discreta", costMin: 10, costMax: 20, caution: "In genere sicuro; attenzione se un giorno prenderai anticoagulanti." },
  { id: "creatina", name: "Creatina monoidrato", why: "La consiglia anche il tuo PDF della dieta: più forza e massa, costa circa 15 centesimi al giorno.", evidence: "buona", costMin: 3, costMax: 6, caution: "Alza la creatinina nel sangue: può far sembrare peggiori gli esami dei reni che controlli con il litio. In alcune persone con disturbo bipolare sono stati descritti episodi di ipomania. Da decidere con lo psichiatra." },
  { id: "magnesio", name: "Magnesio (glicinato o citrato)", why: "Crampi, sonno, recupero se ne assumi poco.", evidence: "scarsa", costMin: 5, costMax: 10, caution: "Ad alte dosi può dare diarrea." },
  { id: "nac", name: "N-acetilcisteina (NAC)", why: "Studiata come aiuto aggiuntivo nella depressione bipolare, con risultati misti.", evidence: "scarsa", costMin: 6, costMax: 12, caution: "In genere ben tollerata; parlane prima con lo psichiatra." },
];

/** Better avoided with a mood disorder and lithium. */
export const AVOID = [
  "Iperico (erba di San Giovanni): può scatenare la mania e interagisce con molti farmaci.",
  "SAMe, 5-HTP, L-triptofano: alzano l'umore agendo sulla serotonina, con rischio di mania.",
  "Litio orotato o altri «litio naturali»: prendi già il litio, sommarli può portare a livelli tossici.",
  "Ginseng e pre-workout con molta caffeina o yohimbina: agitazione, sonno peggiore, casi di mania descritti.",
  "Farmaci da banco da chiedere sempre prima: ibuprofene, ketoprofene, naprossene e i diuretici alzano il litio nel sangue (per i dolori dell'MMA chiedi al medico cosa usare). Anche sudare molto senza bere lo alza.",
];

export const MOOD_TRUTH =
  "Nessun integratore può tirarti su dalla depressione con la garanzia di non spingerti verso la mania: le sostanze che alzano l'umore sono proprio quelle che, in chi ha un disturbo dell'umore, possono farlo salire troppo. Lo stabilizzatore resta il litio con la terapia; gli integratori al massimo aiutano ai margini. Porta questa lista allo psichiatra e segui quello che decide.";

export function monthlyCost(list: Supplement[]): { min: number; max: number } {
  return list.reduce((a, s) => ({ min: a.min + s.costMin, max: a.max + s.costMax }), { min: 0, max: 0 });
}
