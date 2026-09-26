/**
 * Average values per 100 g of edible part, rounded, based on USDA FoodData Central
 * (public domain, usable in a public/commercial app). Raw weight unless the name says otherwise.
 */
export interface Food {
  id: string;
  name: string;
  aliases: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  unitGrams?: number; // weight of "1 <food>", e.g. one egg
}

const f = (id: string, name: string, aliases: string[], kcal: number, protein: number, carbs: number, fat: number, unitGrams?: number): Food => ({
  id,
  name,
  aliases,
  kcal,
  protein,
  carbs,
  fat,
  unitGrams,
});

export const FOODS: Food[] = [
  // cereals & bread
  f("avena", "Fiocchi d'avena", ["avena", "fiocchi d'avena", "oats", "porridge"], 380, 13.5, 67, 6.5),
  f("riso", "Riso (crudo)", ["riso", "riso crudo", "riso basmati", "riso bianco"], 360, 7, 79, 0.7),
  f("riso-cotto", "Riso (cotto)", ["riso cotto", "riso bollito", "riso avanzato"], 130, 2.7, 28, 0.3),
  f("pasta", "Pasta (cruda)", ["pasta", "pasta cruda", "spaghetti", "penne", "fusilli", "rigatoni"], 360, 12.5, 73, 1.5),
  f("pasta-cotta", "Pasta (cotta)", ["pasta cotta", "pasta al pomodoro", "pastasciutta"], 158, 5.8, 31, 0.9),
  f("pane", "Pane", ["pane", "pane bianco", "panino", "rosetta", "baguette"], 266, 8.5, 51, 3.2, 50),
  f("pane-integrale", "Pane integrale", ["pane integrale", "pane di segale"], 247, 12, 41, 3.4, 50),
  f("fette-biscottate", "Fette biscottate", ["fette biscottate", "fetta biscottata"], 410, 11, 73, 6, 10),
  f("couscous", "Couscous (crudo)", ["couscous", "cous cous"], 376, 12.8, 77, 0.6),
  f("patate", "Patate", ["patate", "patata", "patate lesse", "patate al forno"], 77, 2, 17.5, 0.1, 170),
  f("patatine", "Patatine fritte", ["patatine fritte", "patate fritte", "french fries"], 312, 3.4, 41, 15),
  f("pizza", "Pizza margherita", ["pizza", "pizza margherita"], 260, 11, 33, 9),
  f("biscotti", "Biscotti secchi", ["biscotti", "biscotto", "frollini"], 450, 7, 70, 16, 10),
  f("cereali", "Cereali da colazione", ["cereali", "corn flakes", "muesli"], 380, 8, 80, 3),
  // protein
  f("pollo", "Petto di pollo (crudo)", ["pollo", "petto di pollo", "fesa di pollo"], 120, 22.5, 0, 2.6),
  f("tacchino", "Petto di tacchino (crudo)", ["tacchino", "fesa di tacchino", "petto di tacchino"], 114, 23.7, 0, 1.5),
  f("manzo", "Macinato magro di manzo (crudo)", ["manzo", "macinato", "carne macinata", "hamburger", "bistecca"], 137, 21.4, 0, 5),
  f("uova", "Uova", ["uova", "uovo", "frittata", "uova strapazzate", "albume"], 143, 12.6, 0.7, 9.5, 50),
  f("tonno", "Tonno al naturale (sgocciolato)", ["tonno", "tonno al naturale", "tonno in scatola"], 116, 25.5, 0, 0.8),
  f("tonno-olio", "Tonno sott'olio (sgocciolato)", ["tonno sott'olio", "tonno all'olio"], 198, 29, 0, 8.2),
  f("sgombro", "Sgombro in scatola", ["sgombro", "sgombro in scatola"], 156, 23, 0, 6.3),
  f("salmone", "Salmone", ["salmone"], 208, 20, 0, 13),
  f("merluzzo", "Merluzzo / pesce bianco", ["merluzzo", "nasello", "platessa", "pesce bianco", "pesce"], 82, 18, 0, 0.7),
  f("prosciutto-cotto", "Prosciutto cotto", ["prosciutto cotto"], 132, 19, 1, 5.5),
  f("prosciutto-crudo", "Prosciutto crudo", ["prosciutto crudo", "prosciutto"], 250, 26, 0, 16),
  f("bresaola", "Bresaola", ["bresaola"], 151, 32, 0, 2),
  f("whey", "Proteine in polvere (whey)", ["whey", "proteine in polvere", "proteine whey", "shake proteico"], 400, 78, 8, 6, 30),
  // legumes (cooked / canned, drained)
  f("ceci", "Ceci (cotti o in scatola)", ["ceci"], 139, 7, 22.5, 2.6),
  f("fagioli", "Fagioli (cotti o in scatola)", ["fagioli", "borlotti", "cannellini"], 115, 7.5, 20, 0.5),
  f("lenticchie", "Lenticchie (cotte)", ["lenticchie"], 116, 9, 20, 0.4),
  f("piselli", "Piselli", ["piselli"], 81, 5.4, 14.5, 0.4),
  // dairy
  f("latte", "Latte parzialmente scremato", ["latte", "latte parzialmente scremato"], 50, 3.3, 4.8, 2),
  f("latte-intero", "Latte intero", ["latte intero"], 61, 3.2, 4.8, 3.3),
  f("yogurt", "Yogurt bianco intero", ["yogurt", "yogurt bianco", "yogurt intero"], 61, 3.5, 4.7, 3.3, 125),
  f("yogurt-greco", "Yogurt greco 0%", ["yogurt greco", "skyr"], 59, 10.3, 3.6, 0.4, 170),
  f("ricotta", "Ricotta", ["ricotta"], 174, 11, 3, 13),
  f("mozzarella", "Mozzarella", ["mozzarella", "fior di latte"], 253, 18.7, 0.7, 19.5, 125),
  f("parmigiano", "Parmigiano", ["parmigiano", "grana"], 392, 33, 0, 28),
  f("formaggio", "Formaggio stagionato", ["formaggio", "emmental", "pecorino"], 380, 26, 1, 30),
  // fats, nuts, sweets
  f("olio", "Olio extravergine d'oliva", ["olio", "olio evo", "olio d'oliva", "olio extravergine"], 884, 0, 0, 100),
  f("burro", "Burro", ["burro"], 717, 0.9, 0.1, 81),
  f("burro-arachidi", "Burro d'arachidi", ["burro d'arachidi", "burro di arachidi", "crema di arachidi"], 588, 25, 20, 50),
  f("frutta-secca", "Frutta secca (noci, mandorle)", ["noci", "mandorle", "nocciole", "frutta secca", "anacardi"], 610, 18, 17, 54),
  f("semi", "Semi misti", ["semi", "semi misti", "semi di chia", "semi di lino"], 530, 20, 25, 40),
  f("cioccolato", "Cioccolato fondente", ["cioccolato", "cioccolato fondente"], 598, 7.8, 46, 43),
  f("miele", "Miele", ["miele"], 304, 0.3, 82, 0),
  f("zucchero", "Zucchero", ["zucchero"], 387, 0, 100, 0),
  f("marmellata", "Marmellata", ["marmellata", "confettura"], 250, 0.4, 62, 0.1),
  f("gelato", "Gelato", ["gelato"], 207, 3.5, 24, 11),
  // fruit
  f("banana", "Banana", ["banana", "banane"], 89, 1.1, 22.8, 0.3, 120),
  f("mela", "Mela", ["mela", "mele"], 52, 0.3, 14, 0.2, 180),
  f("arancia", "Arancia", ["arancia", "arance", "mandarino", "clementina"], 47, 0.9, 12, 0.1, 150),
  f("frutto", "Frutta (media)", ["frutto", "frutta", "pera", "kiwi", "pesca", "fragole", "uva"], 55, 0.7, 13.5, 0.2, 150),
  f("avocado", "Avocado", ["avocado"], 160, 2, 8.5, 14.7, 150),
  // vegetables
  f("verdure", "Verdure (media)", ["verdure", "verdura", "verdure miste", "verdure surgelate", "minestrone", "contorno"], 35, 2, 6, 0.3),
  f("insalata", "Insalata / lattuga", ["insalata", "lattuga", "rucola", "valeriana"], 15, 1.4, 2.9, 0.2),
  f("pomodori", "Pomodori", ["pomodori", "pomodoro", "pomodorini", "pelati", "passata"], 20, 0.9, 3.9, 0.2),
  f("zucchine", "Zucchine", ["zucchine", "zucchina"], 17, 1.2, 3.1, 0.3),
  f("broccoli", "Broccoli", ["broccoli", "cavolfiore", "cavolo"], 34, 2.8, 6.6, 0.4),
  f("spinaci", "Spinaci", ["spinaci", "bietole"], 23, 2.9, 3.6, 0.4),
  f("carote", "Carote", ["carote", "carota"], 41, 0.9, 9.6, 0.2, 60),
  f("fagiolini", "Fagiolini", ["fagiolini"], 31, 1.8, 7, 0.2),
  f("cipolla", "Cipolla", ["cipolla", "cipolle"], 40, 1.1, 9.3, 0.1, 100),
  f("peperoni", "Peperoni", ["peperoni", "peperone"], 26, 1, 6, 0.3),
  f("melanzane", "Melanzane", ["melanzane", "melanzana"], 25, 1, 6, 0.2),
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best food whose alias starts a word in the text (longest alias wins: "tonno sott'olio" over "tonno"). */
export function matchFood(text: string): Food | null {
  const t = ` ${normalize(text)}`;
  let best: { food: Food; len: number } | null = null;
  for (const food of FOODS) {
    for (const alias of food.aliases) {
      const a = normalize(alias);
      if (t.includes(` ${a}`) && (!best || a.length > best.len)) best = { food, len: a.length };
    }
  }
  return best?.food ?? null;
}

export function searchFoods(query: string, limit = 8): Food[] {
  const q = normalize(query);
  if (!q) return [];
  return FOODS.filter((food) => normalize(food.name).includes(q) || food.aliases.some((a) => normalize(a).includes(q))).slice(0, limit);
}
