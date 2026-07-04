import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { isNotificationsSupported } from "../notifications";
import { colors, radii, spacing } from "../theme";
import { exportEntries } from "../utils/csvExport";

export function SettingsScreen() {
  const { entries, reminderSettings, updateReminderSettings, resetAllData } = useWellness();
  const [enabled, setEnabled] = useState(reminderSettings.enabled);
  const [hour, setHour] = useState(reminderSettings.hour);
  const [minute, setMinute] = useState(reminderSettings.minute);
  const [exportState, setExportState] = useState<"idle" | "done" | "empty" | "error">("idle");

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

  const handleExport = async () => {
    if (entries.length === 0) {
      setExportState("empty");
      setTimeout(() => setExportState("idle"), 2000);
      return;
    }
    try {
      await exportEntries(entries);
      setExportState("done");
    } catch {
      setExportState("error");
    } finally {
      setTimeout(() => setExportState("idle"), 2000);
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
    <View style={styles.container}>
      <ScreenHeader title="Impostazioni" />
      <ScrollView contentContainerStyle={styles.content}>
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

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Esporta i tuoi dati</Text>
            <Text style={styles.hint}>
              Salva tutte le registrazioni in un file CSV, apribile con Excel, Google Sheets o
              Numeri per confronti più approfonditi.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Ionicons name="download-outline" size={18} color="#fff" />
          <Text style={styles.exportButtonText}>
            {exportState === "done"
              ? "Esportato ✓"
              : exportState === "empty"
              ? "Nessun dato da esportare"
              : exportState === "error"
              ? "Errore durante l'esportazione"
              : "Esporta dati (CSV)"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.dangerButton} onPress={handleReset}>
        <Text style={styles.dangerButtonText}>Cancella tutti i dati</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
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
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
