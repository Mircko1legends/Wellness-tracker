import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useAppReload } from "../backup/AppReload";
import {
  chooseBackupFolder,
  exportBackupJson,
  fileNameFromUri,
  getBackupFolder,
  getLastBackupAt,
  isBackupSupported,
  restoreFromJson,
  restoreLatestBackup,
  runBackup,
} from "../backup/backup";
import { colors, radii, spacing } from "../theme";
import { PressableScale } from "./PressableScale";

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} alle ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function pickBackupText(): Promise<string | null> {
  const DocumentPicker = await import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "*/*"], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;
  const uri = result.assets[0].uri;
  if (Platform.OS === "web") return (await fetch(uri)).text();
  const { readAsStringAsync } = await import("expo-file-system/legacy");
  return readAsStringAsync(uri);
}

function downloadOnWeb(json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wellness-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Moving data between the web version and the installed app, or restoring any backup file. */
function FileTransfer({ onMessage }: { onMessage: (m: string) => void }) {
  const reload = useAppReload();
  const restoreFile = async () => {
    const json = await pickBackupText();
    if (!json) return;
    const result = await restoreFromJson(json);
    if (result.status === "restored") {
      onMessage(`Ripristinato il backup del ${formatDateTime(result.createdAt)}.`);
      reload();
    } else {
      onMessage("Il file scelto non è un backup di questa app.");
    }
  };
  return (
    <View style={styles.spaced}>
      <View style={styles.row}>
        {Platform.OS === "web" && (
          <PressableScale style={[styles.button, { flex: 1 }]} onPress={async () => downloadOnWeb(await exportBackupJson())}>
            <Text style={styles.buttonText}>Scarica backup</Text>
          </PressableScale>
        )}
        <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={restoreFile}>
          <Text style={styles.ghostText}>Ripristina da un file</Text>
        </PressableScale>
      </View>
    </View>
  );
}

/** `compact` shows nothing once a folder is set: used on the dashboard as a one-time nudge. */
export function BackupCard({ compact = false }: { compact?: boolean }) {
  const reload = useAppReload();
  const [folder, setFolder] = useState<string | null | undefined>(undefined);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setFolder(await getBackupFolder());
    setLastBackupAt(await getLastBackupAt());
  };

  useEffect(() => {
    refresh();
  }, []);

  if (Platform.OS === "web") {
    if (compact) return null;
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={styles.title}>Backup dei dati</Text>
        </View>
        <Text style={styles.hint}>
          Nella versione web i dati restano nel browser. Scarica un backup per conservarli o per passarli all'app
          Android: lì usa "Ripristina da un file".
        </Text>
        <FileTransfer onMessage={setMessage} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }
  if (!isBackupSupported || folder === undefined) return null;
  if (compact && folder) return null;

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const backupNow = () =>
    withBusy(async () => {
      const result = await runBackup();
      if (result.status === "ok") setMessage("Backup salvato.");
      else if (result.status === "no-access") setMessage("Non riesco a scrivere nella cartella: sceglila di nuovo.");
    });

  const pickFolder = () =>
    withBusy(async () => {
      const picked = await chooseBackupFolder();
      if (!picked) return;
      const result = await runBackup();
      setMessage(result.status === "ok" ? "Cartella impostata e primo backup salvato." : "Cartella impostata.");
    });

  const restore = () =>
    withBusy(async () => {
      setConfirmRestore(false);
      const result = await restoreLatestBackup();
      if (result.status === "restored") {
        setMessage(`Ripristinato il backup del ${formatDateTime(result.createdAt)}.`);
        reload();
      } else if (result.status === "none") {
        setMessage("In questa cartella non c'è nessun backup dell'app.");
      } else {
        setMessage("Non riesco a leggere la cartella: sceglila di nuovo.");
      }
    });

  return (
    <View style={[styles.card, !folder && styles.cardHighlight]}>
      <View style={styles.titleRow}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <Text style={styles.title}>Backup che sopravvive alla disinstallazione</Text>
      </View>

      {!folder ? (
        <Text style={styles.hint}>
          Scegli (o crea) una cartella del telefono, ad esempio Documenti/Wellness. L'app ci salva ogni giorno un
          backup completo e le tabelle settimanali di tutto quello che fai. Se disinstalli l'app i file restano: dopo
          la reinstallazione scegli la stessa cartella e premi "Ripristina".
        </Text>
      ) : (
        <Text style={styles.hint}>
          Cartella: {fileNameFromUri(folder).replace(/^primary:/, "")}
          {"\n"}
          Ultimo backup: {lastBackupAt ? formatDateTime(lastBackupAt) : "mai"} · automatico quando chiudi l'app
        </Text>
      )}

      <View style={styles.row}>
        <PressableScale style={[styles.button, { flex: 1 }, busy && styles.disabled]} onPress={folder ? backupNow : pickFolder}>
          <Text style={styles.buttonText}>{folder ? "Backup ora" : "Scegli cartella"}</Text>
        </PressableScale>
        {folder && (
          <PressableScale style={[styles.ghost, { flex: 1 }, busy && styles.disabled]} onPress={pickFolder}>
            <Text style={styles.ghostText}>Cambia cartella</Text>
          </PressableScale>
        )}
      </View>

      {folder &&
        (!confirmRestore ? (
          <PressableScale style={[styles.ghost, styles.spaced, busy && styles.disabled]} onPress={() => setConfirmRestore(true)}>
            <Text style={styles.ghostText}>Ripristina dall'ultimo backup</Text>
          </PressableScale>
        ) : (
          <View style={styles.spaced}>
            <Text style={styles.warning}>Sostituisce i dati attuali con quelli dell'ultimo backup nella cartella.</Text>
            <View style={styles.row}>
              <PressableScale style={[styles.button, { flex: 1 }]} onPress={restore}>
                <Text style={styles.buttonText}>Sì, ripristina</Text>
              </PressableScale>
              <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => setConfirmRestore(false)}>
                <Text style={styles.ghostText}>Annulla</Text>
              </PressableScale>
            </View>
          </View>
        ))}

      {!compact && <FileTransfer onMessage={setMessage} />}

      {!folder && (
        <Text style={[styles.hint, styles.spaced]}>
          Hai reinstallato l'app? Scegli la cartella dove c'erano i backup: poi comparirà "Ripristina".
        </Text>
      )}

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHighlight: { borderColor: colors.primary },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
  title: { fontSize: 14, fontWeight: "800", color: colors.text, flex: 1 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  spaced: { marginTop: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 13 },
  ghost: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.5 },
  warning: { fontSize: 12, color: colors.accent, marginBottom: spacing.sm },
  message: { fontSize: 12, color: colors.success, marginTop: spacing.sm },
});
