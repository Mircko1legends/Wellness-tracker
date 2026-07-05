export type BudgetTier = "low" | "medium" | "high";

export interface ProductItem {
  name: string;
  note: string;
}

export interface ProductCategory {
  title: string;
  icon: string;
  items: ProductItem[];
}

export interface BudgetGuide {
  tier: BudgetTier;
  label: string;
  intro: string;
  categories: ProductCategory[];
}

export const BUDGET_GUIDES: BudgetGuide[] = [
  {
    tier: "low",
    label: "Basso",
    intro: "Le basi che contano davvero, senza spendere granché.",
    categories: [
      {
        title: "Skincare",
        icon: "water-outline",
        items: [
          { name: "Detergente delicato", note: "Senza solfati aggressivi, mattina e sera." },
          { name: "Crema idratante con ceramidi", note: "Protegge la barriera cutanea, va bene per ogni tipo di pelle." },
          { name: "SPF 50 economico", note: "La protezione solare quotidiana è il prodotto anti-età più efficace che esista." },
        ],
      },
      {
        title: "Hair care",
        icon: "cut-outline",
        items: [
          { name: "Shampoo delicato", note: "Lavaggi non troppo frequenti, acqua non bollente." },
          { name: "Olio di cocco o argan economico", note: "Come maschera occasionale per capelli secchi o sfibrati." },
        ],
      },
      {
        title: "Integratori",
        icon: "medkit-outline",
        items: [
          { name: "Multivitaminico base", note: "Copre eventuali carenze di una dieta non perfetta." },
          { name: "Vitamina D", note: "Carenza molto comune, specie con poca esposizione al sole." },
          { name: "Omega-3", note: "Supporto per pelle, umore e funzione cognitiva." },
        ],
      },
    ],
  },
  {
    tier: "medium",
    label: "Medio",
    intro: "In più rispetto alla fascia base, per risultati più mirati.",
    categories: [
      {
        title: "Skincare",
        icon: "water-outline",
        items: [
          { name: "Siero alla niacinamide", note: "Aiuta con texture della pelle e imperfezioni." },
          { name: "Retinolo a bassa concentrazione", note: "Da introdurre gradualmente, solo la sera, sempre con SPF al mattino." },
        ],
      },
      {
        title: "Hair care",
        icon: "cut-outline",
        items: [
          { name: "Shampoo/trattamento con caffeina o biotina", note: "Per supportare la salute del cuoio capelluto." },
          { name: "Trattamento specifico per il cuoio capelluto", note: "In base a esigenze (forfora, grasso, secchezza)." },
        ],
      },
      {
        title: "Integratori",
        icon: "medkit-outline",
        items: [
          { name: "Creatina monoidrato", note: "Uno degli integratori più studiati e sicuri per forza e massa muscolare." },
          { name: "Proteine in polvere (whey o vegetali)", note: "Utile per raggiungere il target proteico giornaliero." },
        ],
      },
    ],
  },
  {
    tier: "high",
    label: "Alto",
    intro: "Trattamenti mirati e supporto professionale.",
    categories: [
      {
        title: "Skincare",
        icon: "water-outline",
        items: [
          { name: "Vitamina C stabilizzata", note: "Antiossidante, uniforma il tono della pelle, da usare al mattino." },
          { name: "Visita dermatologica", note: "Per trattamenti mirati (retinoidi su prescrizione, peeling professionali)." },
        ],
      },
      {
        title: "Hair care",
        icon: "cut-outline",
        items: [
          { name: "Consulenza tricologica", note: "Diagnosi professionale prima di qualsiasi trattamento importante." },
          { name: "Minoxidil (solo su indicazione medica)", note: "Efficace ma richiede supervisione: parlarne prima con un medico." },
        ],
      },
      {
        title: "Integratori",
        icon: "medkit-outline",
        items: [
          { name: "Consulenza con un nutrizionista sportivo", note: "Piano di integrazione personalizzato sui tuoi obiettivi ed esami del sangue." },
          { name: "Analisi del sangue periodiche", note: "Per verificare carenze reali invece di integrare alla cieca." },
        ],
      },
    ],
  },
];
