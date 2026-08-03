import { Exercise, WorkoutTier } from "../types";

export const EXERCISES: Exercise[] = [
  { id: "knee-pushup", name: "Piegamenti sulle ginocchia", muscle: "Petto/Tricipiti", icon: "body-outline", instructions: "Mani leggermente più larghe delle spalle, ginocchia a terra, scendi fino a sfiorare il petto e risali." },
  { id: "pushup", name: "Piegamenti standard", muscle: "Petto/Tricipiti", icon: "body-outline", instructions: "Corpo in linea retta dalla testa ai talloni, scendi controllato e risali spingendo." },
  { id: "decline-pushup", name: "Piegamenti declinati", muscle: "Petto alto/Spalle", icon: "trending-up-outline", instructions: "Piedi appoggiati su un gradino o superficie rialzata, mani a terra, esegui il piegamento." },
  { id: "diamond-pushup", name: "Piegamenti a diamante", muscle: "Tricipiti", icon: "diamond-outline", instructions: "Mani unite a formare un diamante sotto il petto, scendi e risali." },
  { id: "pike-pushup", name: "Piegamenti pike", muscle: "Spalle", icon: "triangle-outline", instructions: "Corpo a V rovesciata, scendi portando la testa verso il pavimento tra le mani." },
  { id: "explosive-pushup", name: "Piegamenti esplosivi", muscle: "Petto/Potenza", icon: "flash-outline", instructions: "Scendi controllato e spingi con forza fino a staccare le mani da terra." },
  { id: "squat", name: "Squat a corpo libero", muscle: "Gambe", icon: "body-outline", instructions: "Piedi larghezza spalle, scendi come per sederti su una sedia, schiena dritta." },
  { id: "jump-squat", name: "Squat con salto", muscle: "Gambe/Potenza", icon: "flash-outline", instructions: "Esegui uno squat e salta esplosivamente verso l'alto, atterra morbido." },
  { id: "lunges", name: "Affondi in cammino", muscle: "Gambe/Glutei", icon: "walk-outline", instructions: "Fai un passo avanti e scendi finché il ginocchio posteriore sfiora terra, alterna le gambe." },
  { id: "reverse-lunge", name: "Affondi inversi", muscle: "Gambe/Glutei", icon: "walk-outline", instructions: "Fai un passo indietro invece che avanti: più leggero sulle ginocchia rispetto all'affondo classico." },
  { id: "jump-lunge", name: "Affondi con salto", muscle: "Gambe/Potenza", icon: "flash-outline", instructions: "Alterna le gambe saltando esplosivamente tra un affondo e l'altro." },
  { id: "wall-sit", name: "Sedia contro il muro", muscle: "Gambe (isometrico)", icon: "square-outline", instructions: "Schiena al muro, ginocchia piegate a 90°, resta in posizione per il tempo indicato." },
  { id: "glute-bridge", name: "Ponte glutei", muscle: "Glutei/Posteriore", icon: "remove-outline", instructions: "Sdraiato supino, ginocchia piegate, solleva il bacino stringendo i glutei in alto." },
  { id: "single-leg-glute-bridge", name: "Ponte glutei a una gamba", muscle: "Glutei (avanzato)", icon: "remove-outline", instructions: "Come il ponte glutei ma con una gamba tesa sollevata, alterna dopo le ripetizioni." },
  { id: "calf-raises", name: "Slanci polpacci", muscle: "Polpacci", icon: "arrow-up-outline", instructions: "In piedi, sollevati sulle punte dei piedi e ridiscendi lentamente." },
  { id: "plank", name: "Plank", muscle: "Core (isometrico)", icon: "remove-outline", instructions: "Avambracci a terra, corpo in linea retta, contrai gli addominali per il tempo indicato." },
  { id: "side-plank", name: "Plank laterale", muscle: "Core obliqui", icon: "remove-outline", instructions: "Appoggio su un avambraccio, corpo in linea laterale, ripeti per entrambi i lati." },
  { id: "mountain-climbers", name: "Mountain climbers", muscle: "Core/Cardio", icon: "pulse-outline", instructions: "In posizione plank, porta alternativamente le ginocchia al petto il più rapido possibile." },
  { id: "leg-raises", name: "Sollevamento gambe", muscle: "Addominali bassi", icon: "arrow-up-outline", instructions: "Sdraiato supino, solleva le gambe tese verso l'alto e riabbassa senza toccare terra." },
  { id: "bicycle-crunch", name: "Bicycle crunch", muscle: "Addominali/Obliqui", icon: "sync-outline", instructions: "Sdraiato, pedala portando il gomito opposto verso il ginocchio che si solleva." },
  { id: "hollow-hold", name: "Hollow body hold", muscle: "Core (avanzato)", icon: "remove-outline", instructions: "Sdraiato supino, solleva spalle e gambe da terra mantenendo la schiena bassa a contatto." },
  { id: "superman", name: "Superman", muscle: "Schiena bassa", icon: "airplane-outline", instructions: "Sdraiato prono, solleva contemporaneamente braccia e gambe tese." },
  { id: "prone-y-raise", name: "Y raise a terra", muscle: "Schiena alta/Spalle", icon: "body-outline", instructions: "Sdraiato prono, solleva le braccia tese a formare una Y sopra la testa." },
  { id: "shoulder-tap-plank", name: "Plank con tocco spalle", muscle: "Core/Stabilità", icon: "hand-left-outline", instructions: "In plank su mani, tocca alternativamente la spalla opposta mantenendo il bacino fermo." },
  { id: "burpee", name: "Burpee", muscle: "Full body/Cardio", icon: "flash-outline", instructions: "Da in piedi, scendi in plank, fai un piegamento, salta i piedi verso le mani e salta in alto." },
  { id: "archer-pushup", name: "Piegamenti ad arciere", muscle: "Petto/Tricipiti (avanzato)", icon: "swap-horizontal-outline", instructions: "Mani molto più larghe delle spalle, sposta il peso su un braccio piegandolo mentre l'altro resta teso lateralmente, alterna lato." },
  { id: "pseudo-planche-pushup", name: "Pseudo planche push-up", muscle: "Spalle/Petto (avanzato)", icon: "trending-down-outline", instructions: "Mani accanto ai fianchi con le dita rivolte ai piedi, inclina il busto ben oltre le mani e scendi controllato." },
  { id: "pistol-squat-assisted", name: "Pistol squat assistito", muscle: "Gambe (avanzato)", icon: "accessibility-outline", instructions: "Su una gamba sola, l'altra tesa in avanti, scendi tenendoti a un supporto per bilanciarti." },
  { id: "l-sit", name: "L-sit su appoggi", muscle: "Core/Flessori d'anca (avanzato, isometrico)", icon: "remove-outline", instructions: "Seduto tra due appoggi rialzati, solleva il bacino e tendi le gambe in avanti parallele al suolo." },
  { id: "bulgarian-split-squat", name: "Affondo bulgaro", muscle: "Gambe/Glutei (avanzato)", icon: "walk-outline", instructions: "Piede posteriore appoggiato su una superficie rialzata, scendi con la gamba anteriore fino a 90°, alterna." },
  { id: "pistol-squat", name: "Pistol squat", muscle: "Gambe (elite)", icon: "flame-outline", instructions: "Squat su una gamba sola senza appoggio, l'altra gamba tesa in avanti, scendi controllato e risali in equilibrio." },
  { id: "one-arm-pushup-negative", name: "Negative a un braccio", muscle: "Petto/Tricipiti (elite)", icon: "arrow-down-circle-outline", instructions: "Un braccio dietro la schiena, scendi il più lentamente possibile su un solo braccio, poi risali con entrambe le mani." },
  { id: "dragon-flag", name: "Dragon flag", muscle: "Core (elite)", icon: "flame-outline", instructions: "Sdraiato, tieniti a un appoggio dietro la testa, solleva tutto il corpo teso tranne le spalle e scendi controllato senza inarcare la schiena." },
  { id: "handstand-pushup-wall", name: "Verticale al muro con piegamento", muscle: "Spalle (elite)", icon: "arrow-up-circle-outline", instructions: "In verticale con i piedi al muro, scendi piegando le braccia fino a sfiorare la testa a terra e risali in spinta." },
  { id: "clap-pushup", name: "Piegamenti con battito", muscle: "Petto/Potenza (elite)", icon: "hand-right-outline", instructions: "Scendi controllato e spingi con forza esplosiva fino a staccare le mani e battere le mani a mezz'aria." },

  // --- Livello avanzato: spinta ---
  { id: "typewriter-pushup", name: "Piegamenti typewriter", muscle: "Petto/Tricipiti (unilaterale)", icon: "sync-outline", instructions: "Scendi in basso largo e scorri lateralmente da un braccio piegato all'altro senza risalire, poi spingi su." },
  { id: "deficit-diamond-pushup", name: "Piegamenti a diamante in deficit", muscle: "Tricipiti (avanzato)", icon: "diamond-outline", instructions: "Mani a diamante su un rialzo stabile (libri o gradino), scendi oltre il livello dei piedi per un range di movimento più ampio." },
  { id: "wall-handstand-hold", name: "Verticale al muro (hold)", muscle: "Spalle (isometrico)", icon: "triangle-outline", instructions: "Cammina con le mani verso il muro fino a essere in verticale con la pancia o schiena al muro, e mantieni la posizione." },
  { id: "wall-handstand-pushup", name: "Piegamenti in verticale al muro", muscle: "Spalle (elite)", icon: "triangle-outline", instructions: "Dalla verticale al muro, scendi piegando i gomiti fino a sfiorare la testa a terra e risali spingendo con le spalle." },

  // --- Livello avanzato: gambe ---
  { id: "shrimp-squat", name: "Shrimp squat", muscle: "Gambe (unilaterale avanzato)", icon: "body-outline", instructions: "In piedi su una gamba, afferra la caviglia dell'altra gamba dietro di te e scendi fino a sfiorare il ginocchio a terra." },
  { id: "cossack-squat", name: "Squat cosacco", muscle: "Gambe/Adduttori", icon: "walk-outline", instructions: "Piedi molto larghi, sposta il peso su una gamba piegandola mentre l'altra resta tesa lateralmente, poi cambia lato." },
  { id: "sissy-squat", name: "Sissy squat", muscle: "Quadricipiti (avanzato)", icon: "trending-up-outline", instructions: "Sui talloni sollevati, inclina ginocchia e busto in avanti mantenendo il corpo in linea retta, scendi controllando con i quadricipiti." },
  { id: "broad-jump", name: "Salto in lungo da fermo", muscle: "Gambe/Potenza", icon: "flash-outline", instructions: "Da fermo, carica sulle gambe e salta il più lontano possibile in avanti, atterrando morbido sugli avampiedi." },

  // --- Livello avanzato: core ---
  { id: "hollow-rocks", name: "Hollow rocks", muscle: "Core (dinamico)", icon: "remove-outline", instructions: "Dalla posizione di hollow hold, dondola avanti e indietro mantenendo la forma senza far toccare la schiena bassa a terra." },
  { id: "side-plank-leg-lift", name: "Plank laterale con sollevamento gamba", muscle: "Core obliqui/Glutei", icon: "remove-outline", instructions: "In plank laterale, solleva e abbassa la gamba superiore mantenendo il bacino alto e stabile." },
  { id: "v-ups", name: "V-ups", muscle: "Addominali (dinamico)", icon: "arrow-up-outline", instructions: "Sdraiato supino, solleva contemporaneamente busto e gambe tese cercando di toccare i piedi con le mani, a formare una V." },
  { id: "tucked-dragon-flag", name: "Bandiera raccolta", muscle: "Core (avanzato)", icon: "remove-outline", instructions: "Sdraiato, mani dietro la testa come appoggio, solleva bacino e ginocchia piegate al petto mantenendo il corpo rigido dalle spalle in giù." },
  { id: "l-sit-tuck", name: "L-sit raccolto", muscle: "Core/Flessori dell'anca", icon: "triangle-outline", instructions: "Seduto, mani a terra ai lati dei fianchi, spingi per sollevare il bacino con le ginocchia raccolte al petto." },

  // --- Livello avanzato: catena posteriore ---
  { id: "superman-hold", name: "Superman hold", muscle: "Schiena bassa (isometrico)", icon: "airplane-outline", instructions: "Come il Superman ma mantieni braccia e gambe sollevate e tese per l'intera durata, senza muoverti." },
];

export const EXERCISES_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e])
);

export const WORKOUT_TIERS: WorkoutTier[] = [
  {
    level: 1,
    name: "Fondamenta",
    description: "Costruisci volume e costanza sui movimenti che già sai fare.",
    sessionsToUnlockNext: 6,
    days: [
      {
        id: "t1-a",
        name: "Giorno A",
        focus: "Parte superiore & core",
        exercises: [
          { exerciseId: "pushup", sets: 3, reps: "6" },
          { exerciseId: "plank", sets: 3, reps: "20s" },
          { exerciseId: "superman", sets: 3, reps: "10" },
          { exerciseId: "glute-bridge", sets: 3, reps: "12" },
        ],
      },
      {
        id: "t1-b",
        name: "Giorno B",
        focus: "Gambe & glutei",
        exercises: [
          { exerciseId: "squat", sets: 3, reps: "10" },
          { exerciseId: "reverse-lunge", sets: 3, reps: "8 per gamba" },
          { exerciseId: "wall-sit", sets: 3, reps: "20s" },
          { exerciseId: "calf-raises", sets: 3, reps: "15" },
        ],
      },
    ],
  },
  {
    level: 2,
    name: "Costruzione",
    description: "Più volume e le prime varianti in piedi sulle mani.",
    sessionsToUnlockNext: 8,
    days: [
      {
        id: "t2-a",
        name: "Giorno A",
        focus: "Spinta",
        exercises: [
          { exerciseId: "pushup", sets: 3, reps: "10" },
          { exerciseId: "pike-pushup", sets: 3, reps: "8" },
          { exerciseId: "plank", sets: 3, reps: "35s" },
          { exerciseId: "mountain-climbers", sets: 3, reps: "20" },
        ],
      },
      {
        id: "t2-b",
        name: "Giorno B",
        focus: "Gambe & core",
        exercises: [
          { exerciseId: "squat", sets: 4, reps: "12" },
          { exerciseId: "lunges", sets: 3, reps: "10 per gamba" },
          { exerciseId: "glute-bridge", sets: 3, reps: "15" },
          { exerciseId: "leg-raises", sets: 3, reps: "12" },
        ],
      },
    ],
  },
  {
    level: 3,
    name: "Crescita",
    description: "Angoli più difficili e isometrie più lunghe.",
    sessionsToUnlockNext: 10,
    days: [
      {
        id: "t3-a",
        name: "Giorno A",
        focus: "Spinta avanzata",
        exercises: [
          { exerciseId: "decline-pushup", sets: 3, reps: "10" },
          { exerciseId: "pike-pushup", sets: 3, reps: "10" },
          { exerciseId: "side-plank", sets: 3, reps: "25s per lato" },
          { exerciseId: "bicycle-crunch", sets: 3, reps: "20" },
        ],
      },
      {
        id: "t3-b",
        name: "Giorno B",
        focus: "Potenza gambe",
        exercises: [
          { exerciseId: "jump-squat", sets: 3, reps: "10" },
          { exerciseId: "lunges", sets: 4, reps: "12 per gamba" },
          { exerciseId: "wall-sit", sets: 3, reps: "40s" },
          { exerciseId: "single-leg-glute-bridge", sets: 3, reps: "10 per gamba" },
        ],
      },
    ],
  },
  {
    level: 4,
    name: "Intensità",
    description: "Volume alto e i primi movimenti esplosivi.",
    sessionsToUnlockNext: 12,
    days: [
      {
        id: "t4-a",
        name: "Giorno A",
        focus: "Forza superiore",
        exercises: [
          { exerciseId: "diamond-pushup", sets: 4, reps: "10" },
          { exerciseId: "decline-pushup", sets: 3, reps: "12" },
          { exerciseId: "hollow-hold", sets: 3, reps: "20s" },
          { exerciseId: "shoulder-tap-plank", sets: 3, reps: "20" },
        ],
      },
      {
        id: "t4-b",
        name: "Giorno B",
        focus: "Esplosività inferiore",
        exercises: [
          { exerciseId: "jump-lunge", sets: 4, reps: "10" },
          { exerciseId: "jump-squat", sets: 4, reps: "12" },
          { exerciseId: "burpee", sets: 3, reps: "8" },
          { exerciseId: "single-leg-glute-bridge", sets: 4, reps: "12 per gamba" },
        ],
      },
    ],
  },
  {
    level: 5,
    name: "Elite",
    description: "Massima intensità a corpo libero: potenza, controllo, resistenza.",
    sessionsToUnlockNext: 10,
    days: [
      {
        id: "t5-a",
        name: "Giorno A",
        focus: "Total body elite A",
        exercises: [
          { exerciseId: "explosive-pushup", sets: 4, reps: "10" },
          { exerciseId: "diamond-pushup", sets: 4, reps: "18" },
          { exerciseId: "hollow-hold", sets: 4, reps: "30s" },
          { exerciseId: "burpee", sets: 4, reps: "12" },
        ],
      },
      {
        id: "t5-b",
        name: "Giorno B",
        focus: "Total body elite B",
        exercises: [
          { exerciseId: "jump-lunge", sets: 4, reps: "14" },
          { exerciseId: "jump-squat", sets: 4, reps: "18" },
          { exerciseId: "side-plank", sets: 4, reps: "40s per lato" },
          { exerciseId: "shoulder-tap-plank", sets: 4, reps: "30" },
        ],
      },
    ],
  },
  {
    level: 6,
    name: "Avanzato",
    description: "Leve difficili e squat a una gamba: qui il corpo libero inizia a fare davvero male.",
    sessionsToUnlockNext: 12,
    days: [
      {
        id: "t6-a",
        name: "Giorno A",
        focus: "Spinta avanzata",
        exercises: [
          { exerciseId: "diamond-pushup", sets: 4, reps: "20" },
          { exerciseId: "archer-pushup", sets: 4, reps: "8 per lato" },
          { exerciseId: "pseudo-planche-pushup", sets: 3, reps: "10" },
          { exerciseId: "hollow-hold", sets: 4, reps: "35s" },
        ],
      },
      {
        id: "t6-b",
        name: "Giorno B",
        focus: "Gambe avanzate",
        exercises: [
          { exerciseId: "pistol-squat-assisted", sets: 4, reps: "8 per gamba" },
          { exerciseId: "bulgarian-split-squat", sets: 4, reps: "12 per gamba" },
          { exerciseId: "jump-lunge", sets: 4, reps: "16" },
          { exerciseId: "l-sit", sets: 4, reps: "15s" },
        ],
      },
    ],
  },
  {
    level: 7,
    name: "Sovrumano",
    description: "Skill da elite del corpo libero: qui non si contano più solo le ripetizioni.",
    sessionsToUnlockNext: 999,
    days: [
      {
        id: "t7-a",
        name: "Giorno A",
        focus: "Total body sovrumano A",
        exercises: [
          { exerciseId: "one-arm-pushup-negative", sets: 4, reps: "5 per lato" },
          { exerciseId: "clap-pushup", sets: 4, reps: "10" },
          { exerciseId: "dragon-flag", sets: 4, reps: "6" },
          { exerciseId: "l-sit", sets: 4, reps: "25s" },
        ],
      },
      {
        id: "t7-b",
        name: "Giorno B",
        focus: "Total body sovrumano B",
        exercises: [
          { exerciseId: "pistol-squat", sets: 4, reps: "8 per gamba" },
          { exerciseId: "handstand-pushup-wall", sets: 4, reps: "6" },
          { exerciseId: "burpee", sets: 5, reps: "15" },
          { exerciseId: "archer-pushup", sets: 4, reps: "12 per lato" },
        ],
      },
    ],
  },
];

export const WORKOUT_TIERS_BY_LEVEL: Record<number, WorkoutTier> = Object.fromEntries(
  WORKOUT_TIERS.map((t) => [t.level, t])
);

export const MAX_WORKOUT_TIER = WORKOUT_TIERS.length;
