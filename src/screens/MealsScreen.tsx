import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTimeline } from "../context/TimelineContext";
import { AiReadError } from "../import/gemini";
import type { DietStackParamList } from "../navigation/DietStack";
import { searchFoods } from "../nutrition/foods";
import {
  analyzeMealPhoto,
  itemFromFood,
  MealEntry,
  MealItem,
  OnlineFood,
  planMeals,
  reliability,
  RELIABILITY_TEXT,
  searchOpenFoodFacts,
  totals,
} from "../nutrition/meals";
import { loadMealLog, saveMealLog } from "../storage/storage";
import { colors, radii, spacing } from "../theme";
import { dayTimeline } from "../timeline/plan";
import { todayKey } from "../utils/date";
import { isoWeekNumber } from "../utils/weeklyTable";

type Props = NativeStackScreenProps<DietStackParamList, "Meals">;

const nowHm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Macros({ t, muted }: { t: { kcal: number; protein: number; carbs: number; fat: number }; muted?: boolean }) {
  return (
    <Text style={[styles.macros, muted && { color: colors.textMuted }]}>
      {t.kcal} kcal · P {t.protein} g · C {t.carbs} g · G {t.fat} g
    </Text>
  );
}

function FoodSearch({ initial, onPick }: { initial: string; onPick: (name: string, per100: MealItem["per100"], source: MealItem["source"]) => void }) {
  const [q, setQ] = useState(initial);
  const [online, setOnline] = useState<OnlineFood[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const local = searchFoods(q);
  const goOnline = async () => {
    setBusy(true);
    setError("");
    try {
      setOnline(await searchOpenFoodFacts(q));
    } catch {
      setError("Ricerca online non riuscita: controlla la connessione.");
    }
    setBusy(false);
  };
  return (
    <View style={styles.search}>
      <TextInput value={q} onChangeText={setQ} placeholder="Cerca alimento" placeholderTextColor={colors.textMuted} style={styles.input} />
      {local.map((food) => (
        <TouchableOpacity key={food.id} onPress={() => onPick(food.name, { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat }, "tabella")}>
          <Text style={styles.result}>
            {food.name} <Text style={styles.resultMuted}>· {food.kcal} kcal, P {food.protein} g /100 g</Text>
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={goOnline} disabled={busy || !q.trim()}>
        <Text style={styles.link}>{busy ? "Cerco…" : "Cerca prodotti confezionati online (Open Food Facts)"}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {online?.map((p) => (
        <TouchableOpacity key={p.name} onPress={() => onPick(p.name, p.per100, "openfoodfacts")}>
          <Text style={styles.result}>
            {p.name} <Text style={styles.resultMuted}>· {Math.round(p.per100.kcal)} kcal, P {p.per100.protein} g /100 g</Text>
          </Text>
        </TouchableOpacity>
      ))}
      {online && !online.length ? <Text style={styles.hint}>Nessun prodotto trovato.</Text> : null}
    </View>
  );
}

function Editor({ draft, onChange, onSave, onCancel }: { draft: MealEntry; onChange: (d: MealEntry) => void; onSave: () => void; onCancel: () => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const setItem = (i: number, patch: Partial<MealItem>) => onChange({ ...draft, items: draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const rel = reliability(draft.items);
  const t = totals(draft.items);
  return (
    <View style={[styles.card, styles.editor]}>
      <Text style={styles.cardTitle}>{draft.title}</Text>
      {draft.items.map((item, i) => (
        <View key={i} style={styles.item}>
          <TouchableOpacity onPress={() => setOpenIdx(openIdx === i ? null : i)}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={[styles.hint, !item.per100 && { color: colors.danger }]}>
              {item.per100 ? `${item.foodName ?? item.name}${item.source === "openfoodfacts" ? " (Open Food Facts)" : ""}` : "Valori non trovati: tocca per sceglierlo"}
            </Text>
          </TouchableOpacity>
          <View style={styles.itemRow}>
            <TouchableOpacity accessibilityLabel={`Meno grammi ${item.name}`} style={styles.stepBtn} onPress={() => setItem(i, { grams: Math.max(0, item.grams - 10) })}>
              <Ionicons name="remove" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              accessibilityLabel={`Grammi ${item.name}`}
              style={styles.grams}
              keyboardType="numeric"
              value={String(item.grams)}
              onChangeText={(v) => setItem(i, { grams: Math.max(0, Math.round(Number(v.replace(",", ".")) || 0)) })}
            />
            <Text style={styles.hint}>g</Text>
            <TouchableOpacity accessibilityLabel={`Più grammi ${item.name}`} style={styles.stepBtn} onPress={() => setItem(i, { grams: item.grams + 10 })}>
              <Ionicons name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Text style={styles.hint}>pesato</Text>
            <Switch
              accessibilityLabel={`Pesato ${item.name}`}
              value={item.weighed}
              onValueChange={(weighed) => setItem(i, { weighed })}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
            <TouchableOpacity accessibilityLabel={`Togli ${item.name}`} onPress={() => onChange({ ...draft, items: draft.items.filter((_, j) => j !== i) })}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {openIdx === i && (
            <FoodSearch
              initial={item.name}
              onPick={(foodName, per100, source) => {
                setItem(i, { per100, source, foodName });
                setOpenIdx(null);
              }}
            />
          )}
        </View>
      ))}
      <View style={styles.itemRow}>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Aggiungi: es. 30 g pane"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity
          style={styles.smallBtn}
          onPress={() => {
            if (!newName.trim()) return;
            const m = /^(\d+)\s*(g|ml)?\s*(.*)$/i.exec(newName.trim());
            const item = m ? itemFromFood(m[3] || newName, Number(m[1]), !!m[2]) : itemFromFood(newName.trim(), 100, false);
            onChange({ ...draft, items: [...draft.items, item] });
            setNewName("");
          }}
        >
          <Text style={styles.smallBtnText}>Aggiungi</Text>
        </TouchableOpacity>
      </View>
      <Macros t={t} />
      <Text style={[styles.hint, { marginTop: 4 }, rel === "affidabile" && { color: colors.success }]}>{RELIABILITY_TEXT[rel]}</Text>
      <View style={[styles.buttonRow, { marginTop: spacing.sm }]}>
        <PressableScale style={[styles.button, { flex: 1 }]} onPress={onSave}>
          <Text style={styles.buttonText}>Salva pasto</Text>
        </PressableScale>
        <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={onCancel}>
          <Text style={styles.ghostText}>Annulla</Text>
        </PressableScale>
      </View>
    </View>
  );
}

export function MealsScreen({ navigation }: Props) {
  const { plan, ai, updateAi } = useTimeline();
  const date = todayKey();
  const [log, setLog] = useState<MealEntry[]>([]);
  const [draft, setDraft] = useState<MealEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [key, setKey] = useState("");

  useEffect(() => {
    loadMealLog().then(setLog);
  }, []);

  const meals = useMemo(() => planMeals(dayTimeline(plan, new Date().getDay(), isoWeekNumber(date))), [plan, date]);
  const today = log.filter((e) => e.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const eaten = totals(today.flatMap((e) => e.items));
  const planned = totals(meals.flatMap((m) => m.items));

  const persist = async (next: MealEntry[]) => {
    setLog(next);
    await saveMealLog(next);
  };

  const logPlan = (title: string, items: MealItem[]) =>
    persist([...log, { id: `${Date.now()}`, date, time: nowHm(), title, origin: "piano", items }]);

  const fromPhoto = async (title: string, camera: boolean) => {
    setMessage("");
    if (!ai.geminiApiKey) {
      setMessage("Per leggere le foto serve la chiave gratuita di Gemini: incollala qui sotto.");
      return;
    }
    try {
      const options: ImagePicker.ImagePickerOptions = { base64: true, quality: 0.5, mediaTypes: ["images"] };
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setMessage("Senza permesso per la fotocamera puoi scegliere una foto dalla galleria.");
          return;
        }
      }
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.base64) return;
      setBusy(true);
      const { items, note } = await analyzeMealPhoto(asset.base64, asset.mimeType ?? "image/jpeg", ai);
      setDraft({ id: `${Date.now()}`, date, time: nowHm(), title, origin: "foto", items });
      setMessage(items.length ? note : "Nella foto non ho riconosciuto alimenti: aggiungili a mano.");
    } catch (e) {
      setMessage(e instanceof AiReadError ? e.message : "Analisi non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    await persist([...log.filter((e) => e.id !== draft.id), draft]);
    setDraft(null);
    setMessage("");
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Pasti di oggi" subtitle="Foto, bilancia e tabella nutrizionale" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Oggi</Text>
          <Macros t={eaten} />
          {planned.kcal > 0 && (
            <>
              <Text style={styles.hint}>Il piano di oggi: {planned.kcal} kcal · {planned.protein} g proteine</Text>
              <Text style={styles.barLabel}>Calorie {Math.round((eaten.kcal / planned.kcal) * 100)}%</Text>
              <ProgressBar progress={Math.min(1, eaten.kcal / planned.kcal)} color={colors.primary} />
              <Text style={styles.barLabel}>Proteine {planned.protein ? Math.round((eaten.protein / planned.protein) * 100) : 0}%</Text>
              <ProgressBar progress={planned.protein ? Math.min(1, eaten.protein / planned.protein) : 0} color={colors.success} />
            </>
          )}
          <Text style={[styles.hint, { marginTop: 6 }]}>Sono numeri per orientarti, non un voto. Un giorno diverso dal piano va bene.</Text>
        </View>

        {busy && (
          <View style={[styles.card, styles.row]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>Analizzo la foto…</Text>
          </View>
        )}
        {message ? <Text style={[styles.hint, styles.message]}>{message}</Text> : null}
        {!ai.geminiApiKey && message.includes("chiave") && (
          <View style={styles.card}>
            <TextInput value={key} onChangeText={setKey} placeholder="Chiave API di Gemini" placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="none" />
            <Text style={styles.hint}>Gratis su aistudio.google.com → Get API key. Resta solo sul telefono.</Text>
            <PressableScale style={[styles.button, { marginTop: spacing.sm }]} onPress={() => key.trim() && updateAi({ ...ai, geminiApiKey: key.trim() }).then(() => setMessage(""))}>
              <Text style={styles.buttonText}>Salva chiave</Text>
            </PressableScale>
          </View>
        )}

        {draft && <Editor draft={draft} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)} />}

        {meals.map(({ activity, items }) => {
          const logged = today.filter((e) => e.title === activity.title);
          const plannedT = totals(items);
          return (
            <View key={activity.id} style={styles.card}>
              <Text style={styles.activityTime}>{activity.start}</Text>
              <Text style={styles.cardTitle}>{activity.title}</Text>
              <Text style={styles.hint}>Da piano: {items.map((i) => `${i.grams} g ${i.name}`).join(" + ")}</Text>
              <Macros t={plannedT} muted />
              {logged.map((e) => (
                <View key={e.id} style={styles.logged}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loggedText}>
                      {e.origin === "piano" ? "Come da piano" : e.origin === "foto" ? "Da foto" : "A mano"} · {e.time}
                    </Text>
                    <Macros t={totals(e.items)} />
                    <Text style={styles.hint}>{reliability(e.items) === "affidabile" ? "Affidabile" : reliability(e.items) === "stima" ? "Stima" : "Incompleto"}</Text>
                  </View>
                  <TouchableOpacity accessibilityLabel="Modifica pasto" onPress={() => setDraft(e)}>
                    <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityLabel="Elimina pasto" onPress={() => persist(log.filter((x) => x.id !== e.id))}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              {!logged.length && (
                <View style={[styles.buttonRow, { marginTop: spacing.sm }]}>
                  <PressableScale style={[styles.button, { flex: 1.3 }]} onPress={() => logPlan(activity.title, items)}>
                    <Text style={styles.buttonText}>Come da piano</Text>
                  </PressableScale>
                  <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => fromPhoto(activity.title, true)}>
                    <Text style={styles.ghostText}>Foto</Text>
                  </PressableScale>
                  <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => setDraft({ id: `${Date.now()}`, date, time: nowHm(), title: activity.title, origin: "manuale", items: items.map((i) => ({ ...i })) })}>
                    <Text style={styles.ghostText}>Modifica</Text>
                  </PressableScale>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pasto fuori piano</Text>
          {today
            .filter((e) => !meals.some((m) => m.activity.title === e.title))
            .map((e) => (
              <View key={e.id} style={styles.logged}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.loggedText}>
                    {e.title} · {e.time}
                  </Text>
                  <Macros t={totals(e.items)} />
                </View>
                <TouchableOpacity accessibilityLabel="Modifica pasto" onPress={() => setDraft(e)}>
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel="Elimina pasto" onPress={() => persist(log.filter((x) => x.id !== e.id))}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          <View style={[styles.buttonRow, { marginTop: spacing.sm }]}>
            <PressableScale style={[styles.button, { flex: 1 }]} onPress={() => fromPhoto("Fuori piano", true)}>
              <Text style={styles.buttonText}>Scatta foto</Text>
            </PressableScale>
            <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => fromPhoto("Fuori piano", false)}>
              <Text style={styles.ghostText}>Dalla galleria</Text>
            </PressableScale>
            <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => setDraft({ id: `${Date.now()}`, date, time: nowHm(), title: "Fuori piano", origin: "manuale", items: [] })}>
              <Text style={styles.ghostText}>A mano</Text>
            </PressableScale>
          </View>
        </View>

        <Text style={styles.hint}>
          Valori medi per 100 g da USDA FoodData Central (pubblico dominio). Prodotti confezionati da Open Food Facts
          (openfoodfacts.org, licenza ODbL). La foto viene inviata a Gemini solo per l'analisi e non viene salvata
          nell'app.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("DietGuide")}>
          <Text style={[styles.link, { textAlign: "center", marginTop: spacing.md }]}>Guida alla dieta economica</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  editor: { borderColor: colors.primary, borderWidth: 2 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 4 },
  activityTime: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  macros: { fontSize: 13, color: colors.text, fontWeight: "700", marginTop: 2 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  message: { marginBottom: spacing.sm, color: colors.text },
  error: { fontSize: 12, color: colors.danger },
  barLabel: { fontSize: 11, color: colors.textMuted, marginTop: 6, marginBottom: 2 },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 13 },
  ghost: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, alignItems: "center" },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  logged: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.sm },
  loggedText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  item: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  itemName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  stepBtn: { padding: 6, backgroundColor: colors.cardAlt, borderRadius: radii.sm },
  grams: { minWidth: 52, color: colors.text, fontWeight: "800", fontSize: 14, textAlign: "center", backgroundColor: colors.cardAlt, borderRadius: radii.sm, paddingVertical: 4 },
  input: { backgroundColor: colors.cardAlt, color: colors.text, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 14 },
  smallBtn: { backgroundColor: colors.cardAlt, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 9 },
  smallBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  search: { marginTop: spacing.sm, gap: 6 },
  result: { color: colors.text, fontSize: 13, paddingVertical: 4 },
  resultMuted: { color: colors.textMuted, fontSize: 12 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600" },
});
