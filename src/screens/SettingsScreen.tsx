import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { isNotificationsSupported } from "../notifications";
import { colors, radii, spacing } from "../theme";

export function SettingsScreen() {
  const { reminderSettings, updateReminderSettings, resetAllData } = useWellness();
  const [enabled, setEnabled] = useState(reminderSettings.enabled);
  const [hour, setHour] = useState(reminderSettings.hour);
  const [minute, setMinute] = useState(reminderSettings.minute);

  const handleToggle = async (value: boolean) => {
    setEnabled(value);
    await updateReminderSettings({ enabled: value, hour, minute });
  };

  const handleTimeChange = async (nextHour: number, nextMinute: number) => {
    setHour(nextHour);
    setMinute(nextMinute);
    if (enabled) {
      await updateReminderSettings({ enabled, hour: nextHour, minute: nextMinute });
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Cancella tutti i dati",
      "Questa azione eliminerà tutte le registrazioni, gli obiettivi e le impostazioni. Continuare?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Cancella",
          style: "destructive",
          onPress: async () => {
            await resetAllData();
            setEnabled(false);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Impostazioni</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Promemoria giornaliero</Text>
            <Text style={styles.hint}>
              {isNotificationsSupported
                ? "Ricevi una notifica per ricordarti di registrare la giornata."
                : "Le notifiche non sono supportate su web."}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={!isNotificationsSupported}
          />
        </View>

        {enabled && isNotificationsSupported && (
          <View style={styles.timeRow}>
            <StepperInput
              label="Ora"
              value={hour}
              unit="h"
              min={0}
              max={23}
              onChange={(v) => handleTimeChange(v, minute)}
            />
            <StepperInput
              label="Minuti"
              value={minute}
              unit="min"
              min={0}
              max={59}
              step={5}
              onChange={(v) => handleTimeChange(hour, v)}
            />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.dangerButton} onPress={handleReset}>
        <Text style={styles.dangerButtonText}>Cancella tutti i dati</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  timeRow: {
    marginTop: spacing.md,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  dangerButtonText: {
    color: colors.danger,
    fontWeight: "700",
  },
});
