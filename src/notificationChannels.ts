import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * One sound per kind of activity. Android fixes a channel's sound when the channel is created,
 * so the ids carry a version: change it if a sound file changes.
 */
export type SoundKind = "water" | "meal" | "training" | "study" | "hygiene" | "lens" | "meds" | "sleep" | "rest" | "routine";

const VERSION = "v1";

export const SOUND_CHANNELS: Record<SoundKind, { name: string; description: string }> = {
  water: { name: "Acqua", description: "Sorsi durante la giornata (gocce)" },
  meal: { name: "Pasti e cucina", description: "Pasti, spuntini e sessioni di cucina (marimba)" },
  training: { name: "Allenamento", description: "Pesi, MMA, shadow (colpo + tre note che salgono)" },
  study: { name: "Studio e inglese", description: "Blocchi di studio e inglese (campana tibetana)" },
  hygiene: { name: "Igiene e skincare", description: "Igiene, doccia e skincare (cristalli)" },
  lens: { name: "Lenti a contatto", description: "Lenti a contatto (din-don)" },
  meds: { name: "Farmaci", description: "Promemoria dei farmaci (accordo morbido)" },
  sleep: { name: "Sera e sonno", description: "Routine serale e sonno (ninna nanna)" },
  rest: { name: "Timer di recupero", description: "Fine del recupero tra le serie" },
  routine: { name: "Routine", description: "Tutto il resto della giornata (kalimba)" },
};

export function channelId(kind: SoundKind): string {
  return `snd-${kind}-${VERSION}`;
}

export function soundFile(kind: SoundKind): string {
  return `${kind}.wav`;
}

let ready: Promise<void> | null = null;

export function ensureSoundChannels(): Promise<void> {
  if (Platform.OS !== "android") return Promise.resolve();
  ready ??= (async () => {
    for (const [kind, meta] of Object.entries(SOUND_CHANNELS) as [SoundKind, (typeof SOUND_CHANNELS)[SoundKind]][]) {
      await Notifications.setNotificationChannelAsync(channelId(kind), {
        name: meta.name,
        description: meta.description,
        importance: kind === "rest" || kind === "meds" || kind === "lens" ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.HIGH,
        sound: soundFile(kind),
        vibrationPattern: kind === "water" ? [0, 120] : [0, 250, 150, 250],
      });
    }
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** Content fields that make a notification use its category's sound (Android via channel, iOS via file). */
export function soundContent(kind: SoundKind): Pick<Notifications.NotificationContentInput, "sound"> {
  return { sound: soundFile(kind) };
}

const MEAL = /colazione|pranzo|cena|spuntino|merenda|snack|pasto|cucina|teglia|spesa|contenitor/i;
const TRAINING = /pesi|mma|muay|palestra|allenamento|shadow|tecnica a casa|lower|upper|condizionamento/i;
const STUDY = /studio|inglese|english|maturit|matematica|fisica|sant'?anna|tolc|ripasso|flashcard|ascolto|errori/i;
const HYGIENE = /igiene|doccia|skincare|denti|viso|cura settimanale|capelli/i;
const SLEEP = /sonno|routine serale|dormire/i;
const LENS = /lenti/i;

/** The sound for a plan activity, from its title (and kind). */
export function soundForActivity(title: string, kind?: "routine" | "meal"): SoundKind {
  if (kind === "meal" || MEAL.test(title)) return "meal";
  if (SLEEP.test(title)) return "sleep";
  if (TRAINING.test(title)) return "training";
  if (LENS.test(title)) return "lens";
  if (HYGIENE.test(title)) return "hygiene";
  if (STUDY.test(title)) return "study";
  return "routine";
}
