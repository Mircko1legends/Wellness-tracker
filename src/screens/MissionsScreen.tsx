import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ProgressRing } from "../components/ProgressRing";
import { ScreenHeader } from "../components/ScreenHeader";
import { MAX_LEVEL, milestoneXp, XP, xpForLevel } from "../progress/lifeProgress";
import { useLifeProgress } from "../progress/useLifeProgress";
import { colors, radii, spacing } from "../theme";

const HOW_XP = [
  `Ogni micro-azione fatta nella Giornata: ${XP.stepDone} XP (segnata come saltata: ${XP.stepSkipped} XP, perché registrare con onestà conta)`,
  `Ogni bottiglietta finita: ${XP.bottle} XP · ogni serie in palestra: ${XP.gymSet} XP`,
  `Registro della giornata: ${XP.dayLog} XP · farmaco preso: ${XP.medication} XP · lenti tolte: ${XP.lensRemoved} XP`,
  `Pasto registrato: ${XP.meal} XP (+${XP.mealReliable} se pesato) · pesata: ${XP.weighIn} XP · foto progressi: ${XP.photo} XP`,
  `Ogni missione del mese completata: ${XP.mission} XP`,
  `Ogni tappa di un obiettivo di vita: da ${milestoneXp(6)} a ${milestoneXp(1)} XP (di più per gli obiettivi più importanti)`,
];

export function MissionsScreen() {
  const navigation = useNavigation();
  const progress = useLifeProgress();
  if (!progress) return <View style={styles.container} />;
  const { level, xp, missions, streak } = progress;
  const applicable = missions.filter((m) => m.applicable);
  const done = applicable.filter((m) => m.done).length;
  const areas = Object.entries(xp.byArea).sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Livello e missioni" subtitle={`${xp.total.toLocaleString("it-IT")} XP in tutto · oggi +${xp.today}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.levelCard}>
          <ProgressRing size={96} strokeWidth={8} progress={level.progress} color={colors.primary} trackColor={colors.border}>
            <Text style={styles.levelNumber}>{level.level}</Text>
            <Text style={styles.levelLabel}>su {MAX_LEVEL}</Text>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <Text style={styles.levelTitle}>{level.title}</Text>
            {level.level < MAX_LEVEL && (
              <Text style={styles.hint}>
                {level.xpIntoLevel.toLocaleString("it-IT")} / {level.xpForNextLevel.toLocaleString("it-IT")} XP al livello {level.level + 1}
              </Text>
            )}
            <Text style={styles.hint}>
              Serie di giorni: {streak.current} (record {streak.best})
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Da 0 a 99</Text>
          <Text style={styles.body}>
            0 sei tu oggi. 99 è la miglior versione possibile di te: quella che ha imparato a gestire la sua salute ed è arrivata a
            un funzionamento estremo in ogni area. Non si raggiunge per inerzia: servono anni di giornate fatte bene e obiettivi
            di vita completati (il livello 99 vale {xpForLevel(99).toLocaleString("it-IT")} XP). Magari ci arrivi a 25 anni, magari
            mai: il 99 è una direzione e uno stile di vita, una medaglia solo quando non ci sarà più niente da migliorare.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>
          Missioni del primo mese · oggi {done}/{applicable.length}
        </Text>
        <Text style={[styles.hint, { marginBottom: spacing.sm }]}>
          Le abitudini da mettere in piedi per prime. Si spuntano da sole con quello che segni nella Giornata; le puoi anche
          spuntare a mano in Registra. Ogni domenica nel brainstorm decidiamo quali togliere o aggiungere.
        </Text>
        {missions.map((m) => (
          <View key={m.id} style={[styles.mission, !m.applicable && styles.missionOff]}>
            <Ionicons name={m.icon as any} size={20} color={m.done ? colors.success : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.missionName, m.done && { color: colors.success }]}>{m.name}</Text>
              <Text style={styles.hint}>{m.applicable ? m.description : "Oggi non si applica."}</Text>
            </View>
            {m.done && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Come si guadagnano gli XP</Text>
          {HOW_XP.map((line) => (
            <Text key={line} style={styles.body}>
              • {line}
            </Text>
          ))}
        </View>

        {areas.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Da dove vengono i tuoi XP</Text>
            {areas.map(([area, value]) => (
              <View key={area} style={styles.areaRow}>
                <Text style={styles.body}>{area}</Text>
                <Text style={styles.areaValue}>{value.toLocaleString("it-IT")} XP</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  levelNumber: { fontSize: 30, fontWeight: "900", color: colors.text },
  levelLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "700" },
  levelTitle: { fontSize: 18, fontWeight: "900", color: colors.primary, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 6 },
  body: { fontSize: 13, color: colors.text, lineHeight: 19 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: 4 },
  mission: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: 6,
  },
  missionOff: { opacity: 0.45 },
  missionName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  areaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  areaValue: { color: colors.primary, fontWeight: "700", fontSize: 13 },
});
