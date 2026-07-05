export interface FoodCategory {
  title: string;
  icon: string;
  items: string[];
}

export const BUDGET_FOODS: FoodCategory[] = [
  {
    title: "Proteine economiche",
    icon: "egg-outline",
    items: [
      "Uova intere",
      "Petto di pollo o fesa di tacchino",
      "Tonno in scatola al naturale",
      "Legumi secchi (lenticchie, ceci, fagioli)",
      "Yogurt greco e ricotta",
      "Latte",
      "Proteine in polvere (whey economica)",
    ],
  },
  {
    title: "Carboidrati economici",
    icon: "restaurant-outline",
    items: ["Riso", "Pasta", "Fiocchi d'avena", "Patate", "Pane integrale"],
  },
  {
    title: "Grassi economici",
    icon: "water-outline",
    items: ["Olio extravergine d'oliva", "Burro d'arachidi", "Semi misti (in grandi confezioni)"],
  },
  {
    title: "Verdura e frutta",
    icon: "leaf-outline",
    items: ["Verdura surgelata (economica e nutriente)", "Frutta di stagione", "Banane"],
  },
];

export interface MealPlanItem {
  meal: string;
  suggestion: string;
}

export const SAMPLE_MEAL_PLAN: MealPlanItem[] = [
  { meal: "Colazione", suggestion: "Fiocchi d'avena con latte + 2 uova" },
  { meal: "Spuntino", suggestion: "Yogurt greco con frutta" },
  { meal: "Pranzo", suggestion: "Riso, petto di pollo, verdura" },
  { meal: "Spuntino", suggestion: "Tonno con pane integrale" },
  { meal: "Cena", suggestion: "Pasta con legumi (o uova) e verdura" },
  { meal: "Prima di dormire (opzionale)", suggestion: "Ricotta o proteine in polvere" },
];

export const BUDGET_TIPS: string[] = [
  "Compra in grandi quantità: riso, pasta, avena e legumi secchi costano molto meno al kg.",
  "Legumi secchi invece che in scatola: ammollo la sera prima, costano una frazione del prezzo.",
  "Verdura e frutta surgelate: stesso valore nutritivo, prezzo più basso e zero sprechi.",
  "Uova e petto di pollo restano le fonti proteiche con il miglior rapporto qualità/prezzo.",
  "Evita snack processati e proteici pronti: costano di più per caloria e per grammo di proteina.",
  "Cucina in batch (meal prep) per risparmiare tempo e ridurre gli sprechi alimentari.",
];
