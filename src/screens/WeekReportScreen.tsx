import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenHeader } from "../components/ScreenHeader";
import { useGoals } from "../context/GoalsContext";
import { useTimeline } from "../context/TimelineContext";
import { useWater } from "../context/WaterContext";
import { useWellness } from "../context/WellnessContext";
import { GymSession } from "../gym/gym";
import type { MoreStackParamList } from "../navigation/MoreStack";
import { AREA_LABELS, AreaId, computeWeekReport, percent, reportText } from "../report/weekly";
import { MealEntry } from "../nutrition/meals";
import { WeightEntry } from "../nutrition/weight";
import { ProgressPhoto } from "../progress/photos";
import { loadGymLog, loadMealLog, loadProgressPhotos, loadWeightLog } from "../storage/storage";
import { colors, radii, spacing } from "../theme";
import { todayKey } from "../utils/date";
import { formatMood } from "../utils/mood";

type Props = NativeStackScreenProps<MoreStackParamList, "WeekReport">;

export function WeekReportScreen({ navigation }: Props) {
  const { plan, log } = useTimeline();
  const { settings: waterSettings, log: water } = useWater();
  const { entries, goals: wellnessGoals } = useWellness();
  const { goals } = useGoals();
  const [gymLog, setGymLog] = useState<GymSession[]>([]);
  const [mealLog, setMealLog] = useState<MealEntry[]>([]);
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    loadGymLog().then(setGymLog);
    loadMealLog().then(setMealLog);
    loadWeightLog().then(setWeightLog);
    loadProgressPhotos().then(setProgressPhotos);
  }, []);

  const report = useMemo(
    () =>
      computeWeekReport(
        { plan, timelineLog: log, water, waterSettings, entries, moodRange: wellnessGoals.moodRange, gymLog, goals, mealLog, weightLog, progressPhotos },
        todayKey()
      ),
    [plan, log, water, waterSettings, entries, wellnessGoals.moodRange, gymLog, goals, mealLog, weightLog, progressPhotos]
  );
  const text = reportText(report);

  const share = async () => {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(text);
        setCopied("Copiato ✓ Incollalo nella chat.");
      } catch {
        setCopied("Selezionalo qui sotto e copialo a mano.");
      }
      return;
    }
    await Share.share({ message: text }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        eyebrow={report.week}
        title="Resoconto settimana"
        subtitle="Per il brainstorm della domenica sera"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Micro-azioni fatte</Text>
          {(Object.keys(AREA_LABELS) as AreaId[]).map((id) => {
            const s = report.areas[id];
            const p = percent(s);
            if (p === null) return null;
            return (
              <View key={id} style={styles.area}>
                <View style={styles.areaHeader}>
                  <Text style={styles.areaLabel}>{AREA_LABELS[id]}</Text>
                  <Text style={styles.areaValue}>
                    {p}% · {s.done}/{s.total}
                  </Text>
                </View>
                <ProgressBar progress={s.done / s.total} color={colors.primary} />
              </View>
            );
          })}
          <Text style={styles.hint}>
            Contano i giorni da lunedì a oggi. Non è un voto: serve a capire cosa cambiare nel piano, non a giudicarti.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.line}>
            Acqua: {report.water.avgGlasses === null ? "non registrata" : `media ${report.water.avgGlasses} bicchieri, obiettivo raggiunto ${report.water.daysOnTarget}/${report.water.days} giorni`}
          </Text>
          <Text style={styles.line}>
            Umore: {report.mood.values.length ? `${report.mood.values.map((m) => formatMood(m.mood)).join(" ")} · ${report.mood.stableDays}/${report.mood.values.length} giorni nella zona stabile` : "non registrato"}
          </Text>
          <Text style={styles.line}>Palestra: {report.gym.sessions} sessioni registrate</Text>
          <Text style={styles.line}>
            Pasti: {report.meals.days ? `media ${report.meals.avgKcal} kcal · ${report.meals.avgProtein} g proteine (${report.meals.days} giorni registrati)` : "non registrati"}
          </Text>
          {report.mostSkipped.length > 0 && (
            <Text style={styles.line}>Più saltate: {report.mostSkipped.map((m) => `${m.title} (${m.skipped})`).join(", ")}</Text>
          )}
        </View>

        <PressableScale style={styles.button} onPress={share}>
          <Text style={styles.buttonText}>{Platform.OS === "web" ? "Copia per il brainstorm" : "Condividi / copia per il brainstorm"}</Text>
        </PressableScale>
        {copied ? <Text style={styles.hint}>{copied}</Text> : null}

        <View style={[styles.card, { marginTop: spacing.md }]}>
          <Text selectable style={styles.mono}>
            {text}
          </Text>
        </View>
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
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  area: { marginBottom: spacing.sm },
  areaHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  areaLabel: { color: colors.text, fontWeight: "700", fontSize: 13 },
  areaValue: { color: colors.textMuted, fontSize: 12 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 4 },
  line: { fontSize: 13, color: colors.text, lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 14 },
  mono: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
});
