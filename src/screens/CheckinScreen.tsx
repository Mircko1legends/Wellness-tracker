import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { computeWeeklyCheckin } from "../utils/weeklyCheckin";

export function CheckinScreen() {
  const navigation = useNavigation();
  const { entries, goals, medications, medicationLogs } = useWellness();

  const checkin = useMemo(
    () => computeWeeklyCheckin(entries, goals, medications, medicationLogs),
    [entries, goals, medications, medicationLogs]
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Check-in settimanale"
        subtitle="Come sono andati gli ultimi 7 giorni"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, checkin.hasConcerns && styles.summaryCardConcern]}>
          <Ionicons
            name={checkin.hasConcerns ? "chatbubble-ellipses-outline" : "checkmark-circle-outline"}
            size={20}
            color={checkin.hasConcerns ? colors.primary : colors.success}
          />
          <Text style={styles.summaryText}>
            {checkin.hasConcerns
              ? "Ci sono un paio di cose da tenere d'occhio questa settimana. Non è una diagnosi, solo un promemoria: se vuoi, parlane con chi ti segue."
              : "Questa settimana sembra stabile su questi indicatori. Continua così."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sonno</Text>
          {checkin.sleepStdDevHours === null ? (
            <Text style={styles.cardBody}>
              Non hai ancora registrato abbastanza giorni questa settimana per valutare la
              regolarità del sonno.
            </Text>
          ) : (
            <>
              <Text style={styles.cardValue}>
                Variabilità: {checkin.sleepStdDevHours.toFixed(1)}h tra un giorno e l'altro
              </Text>
              <Text style={styles.cardBody}>
                {checkin.sleepIrregular
                  ? "Il sonno è stato piuttosto irregolare. Un orario di andare a letto e svegliarsi più costante può aiutare a stabilizzare l'umore."
                  : "Un ritmo di sonno abbastanza regolare, che è un buon segno di stabilità."}
              </Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Umore</Text>
          <Text style={styles.cardValue}>
            {checkin.moodLowDaysCount}/7 giorni sotto la soglia minima
          </Text>
          <Text style={styles.cardBody}>
            {checkin.moodTrendDown
              ? "L'umore medio di questa settimana è sceso rispetto alla settimana scorsa."
              : checkin.moodConcern
              ? "Diversi giorni sotto la soglia questa settimana: potrebbe valere la pena parlarne con chi ti segue."
              : checkin.moodLowDaysCount > 0
              ? "Qualche giorno più difficile, ma niente che indichi un pattern preoccupante."
              : "Umore nella norma per tutta la settimana."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Farmaci</Text>
          {checkin.medicationAdherenceRate === null ? (
            <Text style={styles.cardBody}>Nessun farmaco attivo da monitorare al momento.</Text>
          ) : (
            <>
              <Text style={styles.cardValue}>
                Aderenza questa settimana: {Math.round(checkin.medicationAdherenceRate * 100)}%
              </Text>
              <Text style={styles.cardBody}>
                {checkin.medicationConcern
                  ? "Sono state saltate più dosi del solito questa settimana. Se è difficile mantenere la routine, potrebbe aiutare parlarne con chi ti segue."
                  : "Buona aderenza questa settimana."}
              </Text>
            </>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Questo check-in è solo un supporto per notare pattern nella tua routine: non sostituisce
          il parere di uno psichiatra o del tuo piano di cura.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  summaryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCardConcern: {
    borderColor: colors.primary,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
