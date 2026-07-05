import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { computeMedicationAdherence } from "../utils/medicationAdherence";

const ADHERENCE_WINDOW_DAYS = 30;

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function MedicationsScreen() {
  const navigation = useNavigation();
  const {
    medications,
    medicationLogs,
    addMedication,
    deleteMedication,
    updateMedication,
    isMedicationTakenToday,
    toggleMedicationTakenToday,
  } = useWellness();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  const adherence = useMemo(
    () => computeMedicationAdherence(medications, medicationLogs, ADHERENCE_WINDOW_DAYS),
    [medications, medicationLogs]
  );

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addMedication({ name: name.trim(), dosage: dosage.trim() || undefined, hour, minute, enabled: true });
    setName("");
    setDosage("");
    setHour(8);
    setMinute(0);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Farmaci"
        subtitle="Promemoria e check giornaliero"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {adherence.rate !== null && (
          <View style={styles.adherenceCard}>
            <Text style={styles.adherenceTitle}>Aderenza ultimi {ADHERENCE_WINDOW_DAYS} giorni</Text>
            <Text style={styles.adherenceValue}>
              {adherence.takenCount}/{adherence.expectedCount} dosi ·{" "}
              {Math.round(adherence.rate * 100)}%
            </Text>
            <Text style={styles.adherenceHint}>
              Utile da mostrare allo psichiatra o a chi ti segue durante i controlli.
            </Text>
          </View>
        )}

        {medications.length === 0 && (
          <Text style={styles.emptyText}>
            Nessun farmaco ancora aggiunto. Aggiungine uno qui sotto per ricevere un promemoria
            ogni giorno.
          </Text>
        )}

        {medications.map((medication) => {
          const taken = isMedicationTakenToday(medication.id);
          return (
            <View key={medication.id} style={[styles.medCard, taken && styles.medCardTaken]}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleMedicationTakenToday(medication.id)}
              >
                <Ionicons
                  name={taken ? "checkmark-circle" : "ellipse-outline"}
                  size={26}
                  color={taken ? colors.success : colors.textMuted}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{medication.name}</Text>
                <Text style={styles.medDetail}>
                  {medication.dosage ? `${medication.dosage} · ` : ""}
                  {formatTime(medication.hour, medication.minute)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => updateMedication({ ...medication, enabled: !medication.enabled })}
                hitSlop={8}
              >
                <Ionicons
                  name={medication.enabled ? "notifications" : "notifications-off-outline"}
                  size={18}
                  color={medication.enabled ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteMedication(medication.id)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.addCard}>
          <Text style={styles.addTitle}>Aggiungi un farmaco</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome (es. Vitamina D)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Dosaggio (opzionale, es. 1 compressa)"
            placeholderTextColor={colors.textMuted}
            value={dosage}
            onChangeText={setDosage}
          />
          <StepperInput label="Ora" value={hour} unit="h" min={0} max={23} onChange={setHour} />
          <StepperInput label="Minuti" value={minute} unit="min" min={0} max={59} step={5} onChange={setMinute} />

          <PressableScale style={[styles.addButton, !name.trim() && styles.addButtonDisabled]} onPress={handleAdd}>
            <Text style={styles.addButtonText}>Aggiungi</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  adherenceCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  adherenceTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adherenceValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  adherenceHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  medCardTaken: {
    borderColor: colors.success,
  },
  checkbox: {
    padding: 2,
  },
  medName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  medDetail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  addCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.onPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
});
