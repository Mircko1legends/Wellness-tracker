import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTimeline } from "../context/TimelineContext";
import { DietMeal, parseDietItem } from "../import/dietParser";
import { importFile, ImportOutcome } from "../import/importFile";
import { PickedFile, pickFile } from "../import/pickFile";
import { formatHm, parseHm } from "../import/time";
import { ImportedActivity } from "../import/types";
import { usePdfEngine } from "../import/usePdfEngine";
import type { DayStackParamList } from "../navigation/DayStack";
import { colors, radii, spacing } from "../theme";

type Props = NativeStackScreenProps<DayStackParamList, "Import">;

const DAY_LETTERS = ["D", "L", "M", "M", "G", "V", "S"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const METHOD_LABELS: Record<string, string> = {
  text: "letto dal telefono (testo)",
  chart: "letto dal telefono (grafico)",
  pie: "letto dal telefono (grafico a torta)",
  ai: "letto con l'IA",
  manual: "inserimento manuale",
};

function normalizeTime(text: string): string | null {
  const m = parseHm(text.trim().replace(".", ":"));
  return m === null ? null : formatHm(m);
}

interface DraftMeal {
  name: string;
  time: string;
  items: string;
}

function AiSettingsCard() {
  const { ai, updateAi } = useTimeline();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(ai.geminiApiKey);
  const [model, setModel] = useState(ai.model);
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.rowBetween} onPress={() => setOpen(!open)}>
        <Text style={styles.cardTitle}>IA di riserva (Gemini gratuito) {ai.geminiApiKey ? "· attiva" : "· non attiva"}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <>
          <Text style={styles.hint}>
            Si usa solo se il telefono non riesce a leggere il file (es. una foto). Crea una chiave gratuita, senza carta,
            su Google AI Studio e incollala qui. Il file letto con l'IA viene inviato a Google.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://aistudio.google.com/apikey")}>
            <Text style={styles.link}>Apri Google AI Studio</Text>
          </TouchableOpacity>
          <TextInput style={styles.input} value={key} onChangeText={setKey} placeholder="Chiave API" placeholderTextColor={colors.textMuted} autoCapitalize="none" secureTextEntry />
          <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Modello" placeholderTextColor={colors.textMuted} autoCapitalize="none" />
          <PressableScale style={styles.button} onPress={() => updateAi({ geminiApiKey: key.trim(), model: model.trim() || "gemini-2.5-flash" })}>
            <Text style={styles.buttonText}>Salva</Text>
          </PressableScale>
        </>
      )}
    </View>
  );
}

function RoutineEditor({ items, onChange }: { items: ImportedActivity[]; onChange: (next: ImportedActivity[]) => void }) {
  const update = (i: number, patch: Partial<ImportedActivity>) => onChange(items.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const toggleDay = (i: number, day: number) => {
    const current = items[i].days ?? [0, 1, 2, 3, 4, 5, 6];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    update(i, { days: next.length === 7 ? undefined : next });
  };
  return (
    <>
      {items.map((a, i) => (
        <View key={i} style={styles.editRow}>
          <View style={styles.rowBetween}>
            <View style={[styles.dot, { backgroundColor: a.color ?? colors.primary }]} />
            <TextInput style={[styles.input, styles.flex]} value={a.title} onChangeText={(title) => update(i, { title })} placeholder="Attività" placeholderTextColor={colors.textMuted} />
            <TouchableOpacity onPress={() => onChange(items.filter((_, j) => j !== i))} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.time, !normalizeTime(a.start) && styles.invalid]} value={a.start} onChangeText={(start) => update(i, { start })} placeholder="07:00" placeholderTextColor={colors.textMuted} />
            <Text style={styles.hint}>→</Text>
            <TextInput style={[styles.input, styles.time, !normalizeTime(a.end) && styles.invalid]} value={a.end} onChangeText={(end) => update(i, { end })} placeholder="07:30" placeholderTextColor={colors.textMuted} />
            <View style={styles.days}>
              {DAY_ORDER.map((d) => {
                const on = !a.days || a.days.includes(d);
                return (
                  <TouchableOpacity key={d} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => toggleDay(i, d)}>
                    <Text style={[styles.dayText, on && styles.dayTextOn]}>{DAY_LETTERS[d]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...items, { title: "", start: "", end: "" }])}>
        <Text style={styles.link}>+ Aggiungi attività</Text>
      </TouchableOpacity>
    </>
  );
}

function DietEditor({ items, onChange }: { items: DraftMeal[]; onChange: (next: DraftMeal[]) => void }) {
  const update = (i: number, patch: Partial<DraftMeal>) => onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <>
      {items.map((m, i) => (
        <View key={i} style={styles.editRow}>
          <View style={styles.rowBetween}>
            <TextInput style={[styles.input, styles.flex]} value={m.name} onChangeText={(name) => update(i, { name })} placeholder="Pasto" placeholderTextColor={colors.textMuted} />
            <TextInput style={[styles.input, styles.time, !normalizeTime(m.time) && styles.invalid]} value={m.time} onChangeText={(time) => update(i, { time })} placeholder="13:00" placeholderTextColor={colors.textMuted} />
            <TouchableOpacity onPress={() => onChange(items.filter((_, j) => j !== i))} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
          <TextInput style={[styles.input, styles.multiline]} value={m.items} onChangeText={(text) => update(i, { items: text })} multiline placeholder="Un alimento per riga, es. 80 g avena" placeholderTextColor={colors.textMuted} />
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...items, { name: "", time: "", items: "" }])}>
        <Text style={styles.link}>+ Aggiungi pasto</Text>
      </TouchableOpacity>
    </>
  );
}

export function ImportScreen({ navigation, route }: Props) {
  const kind = route.params.kind;
  const { ai, saveRoutine, saveDiet } = useTimeline();
  const engine = usePdfEngine();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [activities, setActivities] = useState<ImportedActivity[]>([]);
  const [meals, setMeals] = useState<DraftMeal[]>([]);

  const read = async (picked: PickedFile, forceAi = false) => {
    setBusy(true);
    setOutcome(null);
    try {
      const result = await importFile(kind, picked, engine.analyze, ai, forceAi);
      setOutcome(result);
      setActivities(result.activities);
      setMeals(result.meals.map((m) => ({ name: m.name, time: m.time, items: m.items.map((i) => i.text).join("\n") })));
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    const picked = await pickFile();
    if (!picked) return;
    setFile(picked);
    await read(picked);
  };

  const validRoutine = activities.filter((a) => a.title.trim() && normalizeTime(a.start) && normalizeTime(a.end));
  const validMeals = meals.filter((m) => m.name.trim() && normalizeTime(m.time) && m.items.trim());
  const canSave = kind === "routine" ? validRoutine.length > 0 : validMeals.length > 0;
  const invalidCount = kind === "routine" ? activities.length - validRoutine.length : meals.length - validMeals.length;

  const save = async () => {
    const name = file?.name ?? "manuale";
    const method = outcome?.method ?? "manual";
    if (kind === "routine") {
      await saveRoutine(
        validRoutine.map((a) => ({ ...a, title: a.title.trim(), start: normalizeTime(a.start)!, end: normalizeTime(a.end)! })),
        name,
        method
      );
    } else {
      const parsed: DietMeal[] = validMeals.map((m) => ({
        name: m.name.trim(),
        time: normalizeTime(m.time)!,
        items: m.items.split("\n").map((l) => l.trim()).filter(Boolean).map(parseDietItem),
      }));
      await saveDiet(parsed, name, method);
    }
    navigation.goBack();
  };

  const title = kind === "routine" ? "Importa la routine" : "Importa la dieta";
  const showEditor = outcome !== null || activities.length > 0 || meals.length > 0;

  return (
    <View style={styles.container}>
      {engine.host}
      <ScreenHeader title={title} subtitle="PDF, foto o file di testo" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!showEditor && (
          <View style={styles.card}>
            <Text style={styles.hint}>
              {kind === "routine"
                ? "Funziona con elenchi e tabelle di orari, grafici colorati sulla linea del tempo (anche settimanali, con la legenda dei colori) e grafici a torta delle 24 ore. Dopo la lettura puoi correggere tutto prima di salvare."
                : "Funziona con piani dove ogni pasto ha un titolo (Colazione, Pranzo…), l'orario e gli alimenti con le quantità. Dopo la lettura puoi correggere tutto prima di salvare."}
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <PressableScale style={[styles.button, styles.flex, busy && styles.disabled]} onPress={choose}>
            <Text style={styles.buttonText}>{file ? "Scegli un altro file" : "Scegli il file"}</Text>
          </PressableScale>
          {!showEditor && (
            <PressableScale style={[styles.ghost, styles.flex]} onPress={() => (kind === "routine" ? setActivities([{ title: "", start: "", end: "" }]) : setMeals([{ name: "", time: "", items: "" }]))}>
              <Text style={styles.ghostText}>Inserisci a mano</Text>
            </PressableScale>
          )}
        </View>

        {busy && (
          <View style={[styles.card, styles.rowBetween]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.hint, styles.flex]}>Sto leggendo {file?.name}…</Text>
          </View>
        )}

        {outcome && (
          <View style={[styles.card, outcome.error ? styles.cardError : null]}>
            <Text style={styles.cardTitle}>{outcome.fileName}</Text>
            <Text style={styles.hint}>{METHOD_LABELS[outcome.method]}</Text>
            {outcome.error && <Text style={styles.error}>{outcome.error}</Text>}
            {outcome.notes.map((n) => (
              <Text key={n} style={styles.hint}>
                • {n}
              </Text>
            ))}
            {file && ai.geminiApiKey && outcome.method !== "ai" && (
              <PressableScale style={[styles.ghost, { marginTop: spacing.sm }, busy && styles.disabled]} onPress={() => read(file, true)}>
                <Text style={styles.ghostText}>Non è giusto? Riprova con l'IA</Text>
              </PressableScale>
            )}
          </View>
        )}

        {showEditor && !busy && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Controlla e correggi</Text>
            {kind === "routine" ? <RoutineEditor items={activities} onChange={setActivities} /> : <DietEditor items={meals} onChange={setMeals} />}
            {invalidCount > 0 && <Text style={styles.error}>{invalidCount} righe incomplete non verranno salvate (orari nel formato 07:30).</Text>}
            <PressableScale style={[styles.button, { marginTop: spacing.md }, !canSave && styles.disabled]} onPress={() => canSave && save()}>
              <Text style={styles.buttonText}>Salva nella mia giornata</Text>
            </PressableScale>
            {kind === "routine" && <Text style={[styles.hint, { marginTop: spacing.sm }]}>Salvando, ogni attività viene divisa in micro-azioni con l'orario esatto.</Text>}
          </View>
        )}

        <AiSettingsCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  cardError: { borderColor: colors.accent },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  error: { fontSize: 12, color: colors.accent, lineHeight: 17, marginTop: 4 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600", marginVertical: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 13 },
  ghost: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, alignItems: "center" },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.4 },
  input: { backgroundColor: colors.cardAlt, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6, color: colors.text, marginBottom: spacing.xs },
  invalid: { borderColor: colors.accent },
  time: { width: 62, textAlign: "center" },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  editRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  days: { flexDirection: "row", gap: 2, flex: 1, justifyContent: "flex-end" },
  dayChip: { width: 20, height: 22, borderRadius: 4, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 10, color: colors.textMuted, fontWeight: "700" },
  dayTextOn: { color: colors.onPrimary },
});
