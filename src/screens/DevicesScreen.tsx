import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { useWellness } from "../context/WellnessContext";
import { connectHealth, healthStatus, HealthStatus, isHealthConnectPlatform, openHealthSettings } from "../health/healthConnect";
import { syncHealthNow } from "../health/HealthBridge";
import { HealthDaily } from "../health/healthData";
import { HealthSyncState, loadHealthDaily, loadHealthSync, saveHealthSync } from "../storage/storage";
import { colors, radii, spacing } from "../theme";
import { todayKey } from "../utils/date";

const DEVICES: { kind: string; items: string[] }[] = [
  {
    kind: "Bilance",
    items: [
      "Withings Body+ / Body Smart: sincronizzano con Health Connect dall'app Withings (tra le più affidabili).",
      "Xiaomi / Mi Body Composition Scale: tramite l'app Zepp Life o Mi Fitness, che collegano Health Connect.",
      "Renpho: l'app Renpho Health invia peso e grasso a Health Connect.",
      "Eufy Smart Scale: tramite l'app EufyLife (verifica nelle impostazioni dell'app).",
    ],
  },
  {
    kind: "Smartwatch e fitness band",
    items: [
      "Samsung Galaxy Watch: Samsung Health scrive in Health Connect sonno, passi e allenamenti (anche MMA come «arti marziali»).",
      "Google Pixel Watch / Fitbit: sonno molto preciso, passi e allenamenti in Health Connect.",
      "Xiaomi Smart Band / Redmi Watch (Mi Fitness) e Amazfit (Zepp): economici, con sincronizzazione Health Connect.",
      "Garmin: ottimo per gli allenamenti; controlla nell'app Garmin Connect che la condivisione con Health Connect sia disponibile sul tuo modello.",
    ],
  },
];

export function DevicesScreen() {
  const navigation = useNavigation();
  const { updateBodyweightKg } = useWellness();
  const [status, setStatus] = useState<HealthStatus>("unavailable");
  const [sync, setSync] = useState<HealthSyncState>({ connected: false, lastSyncAt: 0, granted: [] });
  const [daily, setDaily] = useState<HealthDaily>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setStatus(await healthStatus());
    setSync(await loadHealthSync());
    setDaily(await loadHealthDaily());
  };

  useEffect(() => {
    reload().catch(() => {});
  }, []);

  const connect = async () => {
    setBusy(true);
    setMessage("");
    try {
      const granted = await connectHealth();
      const next = { connected: granted.length > 0, lastSyncAt: sync.lastSyncAt, granted };
      await saveHealthSync(next);
      if (!granted.length) setMessage("Nessun permesso concesso: senza, l'app non può leggere niente.");
      else {
        const r = await syncHealthNow(updateBodyweightKg);
        setMessage(r ? `Collegato. Letti ${r.weights} pesi e ${r.days} giorni di dati.` : "Collegato.");
      }
    } catch {
      setMessage("Collegamento non riuscito: apri Health Connect e controlla che sia installato e aggiornato.");
    } finally {
      setBusy(false);
      reload().catch(() => {});
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const r = await syncHealthNow(updateBodyweightKg);
      setMessage(r ? `Aggiornato: ${r.weights} pesi, ${r.days} giorni.` : "Non collegato.");
    } catch {
      setMessage("Aggiornamento non riuscito.");
    } finally {
      setBusy(false);
      reload().catch(() => {});
    }
  };

  const today = daily[todayKey()];
  const lastSleep = Object.entries(daily).filter(([, d]) => d.sleepHours).sort(([a], [b]) => b.localeCompare(a))[0];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dispositivi" subtitle="Bilancia e smartwatch tramite Health Connect" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Come funziona</Text>
          <Text style={styles.body}>
            Android ha un «archivio salute» comune, Health Connect: l'app della tua bilancia o del tuo orologio ci scrive peso,
            sonno, allenamenti e passi, e questa app li legge da lì in automatico. Legge soltanto, non scrive e non manda
            niente a nessuno.
          </Text>
        </View>

        {!isHealthConnectPlatform ? (
          <Text style={styles.hint}>Funziona solo nell'app Android.</Text>
        ) : (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons
                name={sync.connected ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={sync.connected ? colors.success : colors.textMuted}
              />
              <Text style={styles.title}>{sync.connected ? "Health Connect collegato" : "Health Connect non collegato"}</Text>
            </View>
            {status === "needs-update" && <Text style={styles.warn}>Health Connect va aggiornato dal Play Store.</Text>}
            {status === "unavailable" && (
              <Text style={styles.warn}>
                Health Connect non risulta disponibile: su Android 14 e successivi è già nel telefono (Impostazioni → Sicurezza e
                privacy → Health Connect); su Android 13 o precedenti installalo dal Play Store.
              </Text>
            )}
            {sync.connected && (
              <Text style={styles.hint}>
                Dati permessi: {sync.granted.join(", ") || "—"} · ultimo aggiornamento{" "}
                {sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString("it-IT") : "mai"}
              </Text>
            )}
            {sync.connected && (today || lastSleep) && (
              <Text style={styles.body}>
                {lastSleep ? `Ultimo sonno: ${String(lastSleep[1].sleepHours).replace(".", ",")} h. ` : ""}
                {today?.steps ? `Passi oggi: ${today.steps}. ` : ""}
                {today?.exerciseMinutes ? `Allenamento registrato oggi: ${today.exerciseMinutes}′.` : ""}
              </Text>
            )}
            <PressableScale style={[styles.button, busy && { opacity: 0.6 }]} onPress={() => !busy && (sync.connected ? syncNow() : connect())}>
              <Text style={styles.buttonText}>{busy ? "Un attimo…" : sync.connected ? "Aggiorna adesso" : "Collega Health Connect"}</Text>
            </PressableScale>
            {sync.connected && (
              <TouchableOpacity onPress={connect}>
                <Text style={styles.link}>Cambia i dati permessi</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => openHealthSettings()}>
              <Text style={styles.link}>Apri Health Connect</Text>
            </TouchableOpacity>
            {message ? <Text style={styles.hint}>{message}</Text> : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.title}>La tua bilancia OKOK</Text>
          <Text style={styles.body}>
            1. Apri l'app OKOK International → Io/Profilo → Impostazioni: cerca «Health Connect», «Google Fit» o «Condividi dati».{"\n"}
            2. Se c'è Health Connect, attivalo e consenti peso (e grasso corporeo): da quel momento ogni pesata arriva qui da sola.{"\n"}
            3. Se c'è solo Google Fit, collegalo comunque: su molti telefoni Google Fit passa i dati a Health Connect.{"\n"}
            4. Se non c'è nessuna delle due, la tua OKOK non condivide i dati: continua con la pesata a mano la domenica (10
            secondi), oppure valuta una bilancia della lista qui sotto.
          </Text>
          <Text style={styles.hint}>
            Collegarsi alla bilancia direttamente via Bluetooth, senza la sua app, si può solo con protocolli non ufficiali (il
            progetto libero openScale ne supporta molti): è fragile e cambia da modello a modello, per questo l'app passa da Health
            Connect.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")}>
            <Text style={styles.link}>Health Connect sul Play Store</Text>
          </TouchableOpacity>
        </View>

        {DEVICES.map((group) => (
          <View key={group.kind} style={styles.card}>
            <Text style={styles.title}>{group.kind} che mandano i dati in automatico</Text>
            {group.items.map((i) => (
              <Text key={i} style={styles.body}>
                • {i}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.hint}>
          Prima di comprare, controlla nella scheda dell'app del dispositivo sul Play Store che citi Health Connect: i modelli e
          le app cambiano spesso.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  body: { fontSize: 13, color: colors.text, lineHeight: 19 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  warn: { fontSize: 12, color: colors.accent, lineHeight: 17 },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center", marginTop: 4 },
  buttonText: { color: colors.onPrimary, fontWeight: "800" },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: 4 },
});
