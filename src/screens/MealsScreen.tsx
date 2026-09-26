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
import { bulkAdvice, upsertWeight, WeightEntry, weightTrend } from "../nutrition/weight";
import { useWellness } from "../context/WellnessContext";
import {
  addLayer,
  analyzeMealPhoto,
  applyScale,
  foodGramsOnScale,
  itemFromFood,
  layerPrompt,
  PhotoResult,
  reapplyScale,
  MealEntry,
  MealItem,
  OnlineFood,
  planMeals,
  reliability,
  RELIABILITY_TEXT,
  searchOpenFoodFacts,
  totals,
} from "../nutrition/meals";
import { DEFAULT_MEAL_SETTINGS, loadWeightLog, saveWeightLog, loadMealLog, loadMealSettings, MealSettings, saveMealLog, saveMealSettings } from "../storage/storage";
import { colors, radii, spacing } from "../theme";
import { dayTimeline } from "../timeline/plan";
import { todayKey } from "../utils/date";
import { isoWeekNumber } from "../utils/weeklyTable";

type Props = NativeStackScreenProps<DietStackParamList, "Meals">;

const RELIABILITY_LABEL = { affidabile: "Affidabile", totale: "Peso totale da bilancia", stima: "Stima", incompleto: "Incompleto" };

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

function ScaleBox({ draft, onChange }: { draft: MealEntry; onChange: (d: MealEntry) => void }) {
  const scale = draft.scale!;
  const update = (patch: Partial<typeof scale>) => {
    const next = { ...scale, ...patch };
    onChange({ ...draft, scale: next, items: reapplyScale(draft.items, next) });
  };
  return (
    <View style={styles.scaleBox}>
      <View style={styles.itemRow}>
        <Ionicons name="scale-outline" size={18} color={colors.primary} />
        <Text style={styles.scaleText}>Bilancia letta:</Text>
        <TextInput
          accessibilityLabel="Numero sulla bilancia"
          style={styles.grams}
          keyboardType="numeric"
          value={String(scale.grams)}
          onChangeText={(v) => update({ grams: Math.max(0, Math.round(Number(v.replace(",", ".")) || 0)) })}
        />
        <Text style={styles.hint}>g</Text>
      </View>
      <View style={styles.itemRow}>
        <Text style={[styles.hint, { flex: 1 }]}>Tara fatta con il piatto sopra</Text>
        <Switch value={scale.tared} onValueChange={(tared) => update({ tared })} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      {!scale.tared && (
        <View style={styles.itemRow}>
          <Text style={[styles.hint, { flex: 1 }]}>Peso del piatto vuoto</Text>
          <TextInput
            accessibilityLabel="Peso del piatto"
            style={styles.grams}
            keyboardType="numeric"
            value={String(scale.plateGrams)}
            onChangeText={(v) => update({ plateGrams: Math.max(0, Math.round(Number(v) || 0)) })}
          />
          <Text style={styles.hint}>g</Text>
        </View>
      )}
      <Text style={styles.hint}>
        Cibo sulla bilancia: {foodGramsOnScale(scale)} g. Controlla che il numero sia quello del display.
      </Text>
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
      {draft.scale && <ScaleBox draft={draft} onChange={onChange} />}
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
      <Text style={[styles.hint, { marginTop: 4 }, (rel === "affidabile" || rel === "totale") && { color: colors.success }]}>{RELIABILITY_TEXT[rel]}</Text>
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

function WeightCard() {
  const { bodyweightKg, updateBodyweightKg } = useWellness();
  const [log, setLog] = useState<WeightEntry[]>([]);
  const [kg, setKg] = useState(bodyweightKg);
  const today = todayKey();
  useEffect(() => {
    loadWeightLog().then((l) => {
      setLog(l);
      if (l.length) setKg(l[l.length - 1].kg);
    });
  }, []);
  const trend = weightTrend(log, today);
  const todays = log.find((w) => w.date === today);
  const record = async () => {
    const next = upsertWeight(log, today, kg);
    setLog(next);
    await saveWeightLog(next);
    await updateBodyweightKg(Math.round(kg));
  };
  const step = (d: number) => setKg(Math.max(30, Math.round((kg + d) * 10) / 10));
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Peso e massa</Text>
      <View style={styles.itemRow}>
        <TouchableOpacity accessibilityLabel="Meno peso" style={styles.stepBtn} onPress={() => step(-0.1)}>
          <Ionicons name="remove" size={16} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.weight}>{kg.toFixed(1).replace(".", ",")} kg</Text>
        <TouchableOpacity accessibilityLabel="Più peso" style={styles.stepBtn} onPress={() => step(0.1)}>
          <Ionicons name="add" size={16} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.smallBtn} onPress={record}>
          <Text style={styles.smallBtnText}>{todays ? "Aggiorna oggi" : "Registra oggi"}</Text>
        </TouchableOpacity>
      </View>
      {trend && (
        <Text style={styles.macros}>
          Tendenza: {trend.kgPerWeek >= 0 ? "+" : ""}
          {String(trend.kgPerWeek).replace(".", ",")} kg a settimana ({trend.pctPerWeek >= 0 ? "+" : ""}
          {String(trend.pctPerWeek).replace(".", ",")}%)
        </Text>
      )}
      <Text style={styles.hint}>{bulkAdvice(trend)}</Text>
      <Text style={[styles.hint, { marginTop: 4 }]}>Il peso oscilla di 1–2 kg da un giorno all'altro (acqua, cibo): conta solo la tendenza.</Text>
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
  const [mealSettings, setMealSettings] = useState<MealSettings>(DEFAULT_MEAL_SETTINGS);
  const [layer, setLayer] = useState<{ title: string; items: MealItem[]; grams: number; pending: PhotoResult | null } | null>(null);
  const [manualReading, setManualReading] = useState("");

  useEffect(() => {
    loadMealLog().then(setLog);
    loadMealSettings().then(setMealSettings);
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

  const pickPhoto = async (camera: boolean): Promise<ImagePicker.ImagePickerAsset | null> => {
    if (!ai.geminiApiKey) {
      setMessage("Per leggere le foto serve la chiave gratuita di Gemini: incollala qui sotto.");
      return null;
    }
    const options: ImagePicker.ImagePickerOptions = { base64: true, quality: 0.6, mediaTypes: ["images"] };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setMessage("Senza permesso per la fotocamera puoi scegliere una foto dalla galleria.");
        return null;
      }
    }
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    return asset?.base64 ? asset : null;
  };

  const fromPhoto = async (title: string, camera: boolean) => {
    setMessage("");
    try {
      const asset = await pickPhoto(camera);
      if (!asset) return;
      setBusy(true);
      const result = await analyzeMealPhoto(asset.base64!, asset.mimeType ?? "image/jpeg", ai);
      const entry: MealEntry = { id: `${Date.now()}`, date, time: nowHm(), title, origin: "foto", items: result.items };
      if (result.scaleGrams !== null && result.items.length) {
        entry.scale = { grams: result.scaleGrams, tared: mealSettings.tared, plateGrams: mealSettings.plateGrams };
        entry.items = applyScale(result.items, entry.scale);
      }
      setDraft(entry);
      setMessage(
        !result.items.length
          ? "Nella foto non ho riconosciuto alimenti: aggiungili a mano."
          : result.scaleGrams !== null
            ? `Ho visto la bilancia: ${result.scaleGrams} g. ${result.note}`.trim()
            : result.note
      );
    } catch (e) {
      setMessage(e instanceof AiReadError ? e.message : "Analisi non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  };

  const layerPhoto = async (camera: boolean) => {
    if (!layer) return;
    setMessage("");
    try {
      const asset = await pickPhoto(camera);
      if (!asset) return;
      setBusy(true);
      const result = await analyzeMealPhoto(
        asset.base64!,
        asset.mimeType ?? "image/jpeg",
        ai,
        undefined,
        layerPrompt(layer.grams, layer.items.map((i) => i.name))
      );
      if (result.scaleGrams === null) {
        setLayer({ ...layer, pending: result });
        setMessage("Non riesco a leggere il display: scrivi tu il numero della bilancia.");
      } else {
        setLayer({ ...layer, items: addLayer(layer.items, layer.grams, result, result.scaleGrams), grams: result.scaleGrams, pending: null });
      }
    } catch (e) {
      setMessage(e instanceof AiReadError ? e.message : "Analisi non riuscita, riprova.");
    } finally {
      setBusy(false);
    }
  };

  const confirmManualReading = () => {
    const n = Math.round(Number(manualReading.replace(",", ".")));
    if (!layer?.pending || !Number.isFinite(n) || n <= layer.grams) return;
    setLayer({ ...layer, items: addLayer(layer.items, layer.grams, layer.pending, n), grams: n, pending: null });
    setManualReading("");
    setMessage("");
  };

  const finishLayers = () => {
    if (!layer) return;
    setDraft({ id: `${Date.now()}`, date, time: nowHm(), title: layer.title, origin: "foto", items: layer.items });
    setLayer(null);
  };

  const save = async () => {
    if (!draft) return;
    if (draft.scale && (draft.scale.tared !== mealSettings.tared || draft.scale.plateGrams !== mealSettings.plateGrams)) {
      const next = { tared: draft.scale.tared, plateGrams: draft.scale.plateGrams };
      setMealSettings(next);
      await saveMealSettings(next);
    }
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

        <WeightCard />

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

        {layer && (
          <View style={[styles.card, styles.editor]}>
            <Text style={styles.cardTitle}>Pesa a strati · {layer.title}</Text>
            <Text style={styles.hint}>
              1. Metti il piatto vuoto sulla bilancia e fai la tara (0 g).{"\n"}2. Aggiungi un alimento e scatta con il display
              ben visibile.{"\n"}3. Ripeti per ogni alimento, olio compreso. Ogni peso è esatto: è la differenza sul display.
            </Text>
            {layer.items.map((item, i) => (
              <Text key={i} style={styles.line}>
                ✓ {item.name}: {item.grams} g
              </Text>
            ))}
            <Text style={styles.hint}>Bilancia ora: {layer.grams} g</Text>
            {layer.pending && (
              <View style={styles.itemRow}>
                <TextInput
                  accessibilityLabel="Numero sul display"
                  value={manualReading}
                  onChangeText={setManualReading}
                  keyboardType="numeric"
                  placeholder="Numero sul display"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity style={styles.smallBtn} onPress={confirmManualReading}>
                  <Text style={styles.smallBtnText}>Usa</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.buttonRow, { marginTop: spacing.sm }]}>
              <PressableScale style={[styles.button, { flex: 1 }]} onPress={() => layerPhoto(true)}>
                <Text style={styles.buttonText}>Scatta</Text>
              </PressableScale>
              <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => layerPhoto(false)}>
                <Text style={styles.ghostText}>Galleria</Text>
              </PressableScale>
              <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={layer.items.length ? finishLayers : () => setLayer(null)}>
                <Text style={styles.ghostText}>{layer.items.length ? "Fine" : "Annulla"}</Text>
              </PressableScale>
            </View>
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
                    <Text style={styles.hint}>{RELIABILITY_LABEL[reliability(e.items)]}</Text>
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
                  <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => setLayer({ title: activity.title, items: [], grams: 0, pending: null })}>
                    <Text style={styles.ghostText}>Strati</Text>
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
          <PressableScale style={[styles.ghost, { marginTop: spacing.sm }]} onPress={() => setLayer({ title: "Fuori piano", items: [], grams: 0, pending: null })}>
            <Text style={styles.ghostText}>Pesa a strati sulla bilancia (il più preciso)</Text>
          </PressableScale>
          <Text style={[styles.hint, { marginTop: 6 }]}>
            Con una foto normale, se il piatto è sulla bilancia l'app legge il display e usa quel peso.
          </Text>
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
  weight: { color: colors.text, fontWeight: "900", fontSize: 18, minWidth: 80, textAlign: "center" },
  line: { fontSize: 13, color: colors.text, lineHeight: 20 },
  scaleBox: { backgroundColor: colors.cardAlt, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm, gap: 4 },
  scaleText: { color: colors.text, fontWeight: "700", fontSize: 13 },
});
