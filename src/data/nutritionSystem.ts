/** "Nutrition & Training System" (sections 03, 04, 10, 11): shopping, recipes, substitutions. */

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  cost: number; // € a settimana, indicativo (prezzi da discount)
}

export const SHOPPING_LIST: ShoppingItem[] = [
  { id: "latte", name: "Latte", quantity: "4 L", cost: 4.4 },
  { id: "avena", name: "Fiocchi d'avena", quantity: "1,5 kg", cost: 2.2 },
  { id: "uova", name: "Uova", quantity: "24", cost: 6.0 },
  { id: "pollo", name: "Pollo (1 kg cosce + 700 g petto)", quantity: "1,7 kg", cost: 9.0 },
  { id: "tonno", name: "Tonno al naturale", quantity: "8 scatolette", cost: 7.0 },
  { id: "sgombro", name: "Sgombro in scatola", quantity: "3 scatolette", cost: 3.5 },
  { id: "legumi", name: "Legumi secchi + in scatola", quantity: "500 g + 5 scatole", cost: 5.0 },
  { id: "riso", name: "Riso", quantity: "1,5 kg", cost: 2.2 },
  { id: "pasta", name: "Pasta", quantity: "1,5 kg", cost: 2.0 },
  { id: "pane", name: "Pane (quello da 1 kg del banco)", quantity: "1,5 kg", cost: 3.5 },
  { id: "patate", name: "Patate", quantity: "3 kg", cost: 3.5 },
  { id: "verdure-surgelate", name: "Verdure surgelate", quantity: "2 kg", cost: 4.0 },
  { id: "verdure-fresche", name: "Verdure fresche + pelati", quantity: "—", cost: 4.0 },
  { id: "frutta", name: "Frutta (banane, mele)", quantity: "3,5 kg", cost: 5.5 },
  { id: "yogurt", name: "Yogurt bianco", quantity: "1,5 kg", cost: 3.5 },
  { id: "burro-arachidi", name: "Burro d'arachidi", quantity: "1 vasetto ogni 2 settimane", cost: 1.5 },
  { id: "olio", name: "Olio extravergine", quantity: "1 bottiglia ogni 3 settimane", cost: 2.3 },
];

export const SHOPPING_TOTAL = Math.round(SHOPPING_LIST.reduce((a, i) => a + i.cost, 0));

export const SAVING_VERSION =
  "Versione risparmio (~50 €): togli sgombro e petto di pollo, tieni solo le cosce; raddoppia uova e legumi secchi (sostituiscono il tonno nei due spuntini e in un pranzo). Frutta e verdura di stagione al mercato a fine giornata; verdure surgelate sempre.";

export const SUBSTITUTIONS: [string, string][] = [
  ["150 g di pollo", "3 uova · 150 g di tonno sgocciolato · 125 g di sgombro · 250 g di legumi cotti"],
  ["100 g di pasta o riso (crudi)", "400 g di patate · 150 g di pane"],
  ["200 g di verdura", "fresca o surgelata, indifferente: la surgelata costa meno e non si butta"],
  ["20 g di burro d'arachidi", "25 g di frutta secca · 15 g di olio in più nel piatto"],
];

export interface Recipe {
  name: string;
  time: string;
  ingredients: string;
  steps: string[];
}

export const RECIPES: Recipe[] = [
  { name: "Teglia di pollo e patate", time: "40′ · 3 porzioni", ingredients: "1 kg cosce di pollo, 1 kg patate, 2 cucchiai olio, sale, paprika, rosmarino.", steps: ["Taglia le patate a cubi di 2 cm.", "Metti tutto in una teglia, condisci e mescola con le mani.", "Forno a 200 °C per 30–35 minuti. Dividi in 3 contenitori."] },
  { name: "Overnight oats", time: "3′ · la sera prima", ingredients: "100 g avena, 300 ml latte, 1 banana, 20 g burro d'arachidi, cannella.", steps: ["Metti avena e latte in un barattolo e mescola.", "Aggiungi la banana a fette e il burro d'arachidi.", "In frigo tutta la notte: la mattina si mangia e basta."] },
  { name: "Pasta e ceci", time: "20′ · 2 porzioni", ingredients: "200 g pasta corta, 1 scatola di ceci, 200 g pelati, 1 spicchio d'aglio, olio, rosmarino.", steps: ["Soffriggi aglio e rosmarino, aggiungi pelati e ceci con la loro acqua.", "Dopo 10 minuti versa la pasta cruda e acqua a coprire.", "Cuoci mescolando finché la pasta è pronta."] },
  { name: "Riso saltato veloce", time: "8′ · con il riso avanzato", ingredients: "Riso già cotto, 3 uova, 200 g verdure surgelate, salsa di soia, olio.", steps: ["Salta le verdure surgelate in padella a fuoco alto.", "Sposta di lato e strapazza le uova nello spazio libero.", "Aggiungi riso e salsa di soia, mescola due minuti."] },
  { name: "Pasta e fagioli", time: "20′ · 2 porzioni", ingredients: "200 g pasta, 1 scatola di fagioli, 200 g pelati, aglio, olio, alloro.", steps: ["Scalda pelati, fagioli e aglio con un bicchiere d'acqua.", "Dopo 8 minuti schiaccia metà fagioli: viene cremosa.", "Butta la pasta direttamente dentro e cuoci mescolando."] },
  { name: "Frittata di patate e cipolla", time: "15′ · 2 porzioni", ingredients: "6 uova, 2 patate già lesse, 1 cipolla, olio, sale.", steps: ["Rosola cipolla e patate a fette in padella.", "Sbatti le uova con il sale e versale sopra.", "Coperchio, fuoco basso, 5 minuti; gira e altri 2."] },
  { name: "Uova strapazzate come si deve", time: "6′ · 1 porzione", ingredients: "3 uova, 10 g olio, sale, 100 g pane, verdure surgelate.", steps: ["Salta le verdure in padella e mettile da parte.", "Fuoco basso, uova sbattute appena, mescola in continuazione.", "Togli dal fuoco quando sono ancora umide: finiscono di cuocere da sole."] },
  { name: "Tonno, fagioli e pomodorini", time: "5′ · nessuna cottura", ingredients: "120 g tonno, 1 scatola di fagioli, 10 pomodorini, olio, origano, pane.", steps: ["Sciacqua i fagioli sotto l'acqua fredda.", "Unisci tutto in una ciotola e condisci.", "È il pranzo della domenica e il piano B di qualsiasi giorno."] },
];

export const COOKING_RULES = [
  "Cuoci una volta, mangia tre volte: ogni cottura riempie almeno 2–3 contenitori.",
  "Il forno lavora da solo: mentre la teglia cuoce fai riso, uova sode e legumi.",
  "Congela il terzo giorno: quello che mangi entro 48 ore sta in frigo, il resto in freezer subito dopo la cottura.",
  "Se ti stufi: spezie (paprika, curry, peperoncino, origano), acidità (limone, aceto), forma (lo stesso pollo a fette, sfilacciato o in un panino). Ruota le proteine tra una settimana e l'altra con le sostituzioni.",
  "Se salta una sessione di cucina: non saltare i pasti, usa il piano B senza cottura (tonno, fagioli, pomodorini e pane). Tienine sempre scorta per due pasti.",
];

export const EQUIPMENT =
  "Una teglia grande, una pentola, una padella antiaderente, 6 contenitori da un litro con coperchio, un barattolo di vetro per gli overnight oats. La bilancia da cucina da 10 € è l'acquisto che cambia di più: pesa tutto per 3–4 settimane, poi l'occhio impara.";
