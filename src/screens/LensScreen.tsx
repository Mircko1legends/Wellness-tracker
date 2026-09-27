import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LensGuard } from "../../modules/lens-guard";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { isLensGuardAvailable, useLens } from "../context/LensContext";
import { requestNotificationPermission } from "../notifications";
import { colors, radii, spacing } from "../theme";
import { todayKey } from "../utils/date";
import {
  defaultFriendMessage,
  EVENING_STEPS,
  formatReminderSchedule,
  LENS_RULES,
  LensSettings,
  lastSmsStatus,
  LensStep,
  MORNING_STEPS,
  replacementStatus,
  smsProblems,
} from "../utils/lens";

const pad = (n: number) => String(n).padStart(2, "0");

function formatDueDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

export function LensTonightCard() {
  const { settings, today, guard, confirmRemovedToday, undoRemovedToday } = useLens();
  const removed = !!today.removedAt;
  const deadline = `${pad(settings.deadlineHour)}:${pad(settings.deadlineMinute)}`;
  const friend = settings.friendName.trim() || "il tuo amico";

  return (
    <View style={[styles.card, removed ? styles.cardDone : styles.cardAlert]}>
      <View style={styles.titleRow}>
        <Ionicons name="eye-outline" size={18} color={removed ? colors.success : colors.primary} />
        <Text style={styles.cardTitle}>{removed ? "Lenti tolte" : `Lenti: da togliere entro le ${deadline}`}</Text>
      </View>
      {!removed && settings.enabled && (
        <Text style={styles.hint}>
          Promemoria alle {formatReminderSchedule(settings).join(", ")}. Se alle {deadline} non hai confermato, parte
          l'SMS automatico a {friend}.
        </Text>
      )}
      {guard?.lastAlertAt ? (
        <Text style={styles.hint}>
          Ultimo avviso all'amico: {new Date(guard.lastAlertAt).toLocaleString("it-IT")}{" "}
          {guard.lastAlertOk ? "(SMS inviato)" : "(SMS NON inviato)"}
        </Text>
      ) : null}
      {!removed ? (
        <PressableScale style={styles.bigButton} onPress={confirmRemovedToday}>
          <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          <Text style={styles.bigButtonText}>Ho tolto le lenti</Text>
        </PressableScale>
      ) : (
        <TouchableOpacity onPress={undoRemovedToday}>
          <Text style={styles.link}>Annulla (le ho ancora addosso)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Checklist({ title, steps }: { title: string; steps: LensStep[] }) {
  const { today, toggleTodayStep } = useLens();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {steps.map((step) => {
        const done = today.doneSteps.includes(step.id);
        return (
          <TouchableOpacity key={step.id} style={styles.stepRow} onPress={() => toggleTodayStep(step.id)}>
            <Ionicons name={done ? "checkbox" : "square-outline"} size={20} color={done ? colors.success : colors.textMuted} />
            <Text style={[styles.stepText, done && styles.stepDone]}>{step.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReplacementCard() {
  const { settings, updateSettings } = useLens();
  const today = todayKey();
  const lens = replacementStatus(settings.lensStartDate, settings.lensDurationDays, today);
  const lensCase = replacementStatus(settings.caseStartDate, settings.caseDurationDays, today);

  const line = (status: ReturnType<typeof replacementStatus>, what: string) => {
    if (!status) return `Imposta il giorno in cui hai iniziato ${what}.`;
    if (status.daysLeft < 0) return `Da cambiare: scadute da ${-status.daysLeft} giorni (dal ${formatDueDate(status.dueDate)}).`;
    if (status.daysLeft === 0) return "Da cambiare oggi.";
    return `Giorno ${status.dayNumber} · cambio il ${formatDueDate(status.dueDate)} (tra ${status.daysLeft} giorni)`;
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Cambio lenti e astuccio</Text>
      <Text style={[styles.hint, lens && lens.daysLeft <= 2 && styles.warning]}>Lenti: {line(lens, "il paio attuale")}</Text>
      <PressableScale style={styles.ghost} onPress={() => updateSettings({ ...settings, lensStartDate: today })}>
        <Text style={styles.ghostText}>Ho aperto un paio nuovo oggi</Text>
      </PressableScale>
      <Text style={[styles.hint, styles.spaced, lensCase && lensCase.daysLeft <= 2 && styles.warning]}>
        Astuccio: {line(lensCase, "l'astuccio attuale")}
      </Text>
      <PressableScale style={styles.ghost} onPress={() => updateSettings({ ...settings, caseStartDate: today })}>
        <Text style={styles.ghostText}>Astuccio nuovo oggi</Text>
      </PressableScale>
      <Text style={[styles.hint, styles.spaced]}>
        Durate: lenti {settings.lensDurationDays} giorni, astuccio {settings.caseDurationDays} giorni. Modificabili sotto
        se ottico o confezione indicano altro.
      </Text>
    </View>
  );
}

function StatusRow({ ok, label, action, onPress }: { ok: boolean; label: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.statusRow}>
      <Ionicons name={ok ? "checkmark-circle" : "alert-circle"} size={18} color={ok ? colors.success : colors.accent} />
      <Text style={styles.statusText}>{label}</Text>
      {!ok && !!action && (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.link}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function GuardSetup() {
  const { settings, guard, requestSmsPermission, refreshGuard } = useLens();
  const [notificationsOk, setNotificationsOk] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    requestNotificationPermission().then(setNotificationsOk);
  }, []);

  if (!isLensGuardAvailable || !guard) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Avviso automatico all'amico</Text>
        <Text style={styles.hint}>Funziona solo nell'app Android installata sul telefono, non nella versione web.</Text>
      </View>
    );
  }

  const sendTest = () => {
    const who = settings.yourName.trim() || "un amico";
    LensGuard!.sendTestSms(
      settings.friendPhone.trim(),
      `Messaggio di prova dall'app di ${who}: se lo ricevi, l'avviso automatico per le lenti funziona. Non devi fare nulla.`
    );
    setTestResult("In invio…");
    // Android reports the real outcome a few seconds later: follow it here.
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      refreshGuard();
      if (tries >= 20) clearInterval(timer);
    }, 1500);
  };

  const problems = smsProblems(guard);
  const status = lastSmsStatus(guard, Date.now());

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Controlli perché l'avviso funzioni</Text>
      <StatusRow ok={guard.enabled} label="Avviso attivo (serve il numero dell'amico)" action="" onPress={() => {}} />
      <StatusRow ok={guard.smsPermission} label="Permesso di inviare SMS" action="Consenti" onPress={requestSmsPermission} />
      <StatusRow
        ok={notificationsOk}
        label="Notifiche"
        action="Consenti"
        onPress={() => requestNotificationPermission().then(setNotificationsOk)}
      />
      <StatusRow
        ok={guard.exactAlarmsAllowed}
        label="Allarmi a orario esatto"
        action="Apri"
        onPress={() => {
          LensGuard!.openExactAlarmSettings();
          refreshGuard();
        }}
      />
      <StatusRow
        ok={guard.ignoringBatteryOptimizations}
        label="Nessuna restrizione batteria (consigliato)"
        action="Apri"
        onPress={() => LensGuard!.openBatterySettings()}
      />
      {guard.enabled && guard.nextDeadlineAt > 0 && (
        <Text style={[styles.hint, styles.spaced]}>
          Prossimo controllo: {new Date(guard.nextDeadlineAt).toLocaleString("it-IT")}
        </Text>
      )}
      {problems.map((p) => (
        <View key={p.text} style={[styles.problem, styles.spaced]}>
          <Text style={styles.problemText}>{p.text}</Text>
          <Text style={styles.hint}>{p.fix}</Text>
        </View>
      ))}
      <TouchableOpacity onPress={() => LensGuard!.openAppSettings()}>
        <Text style={styles.link}>Apri impostazioni dell'app</Text>
      </TouchableOpacity>
      <PressableScale
        style={[styles.ghost, styles.spaced, (!guard.smsPermission || !settings.friendPhone.trim()) && styles.disabled]}
        onPress={sendTest}
      >
        <Text style={styles.ghostText}>Invia SMS di prova all'amico</Text>
      </PressableScale>
      {(testResult || status) && <Text style={[styles.hint, styles.spaced]}>Ultimo SMS: {status ?? testResult}</Text>}
      <Text style={[styles.hint, styles.spaced]}>
        Diagnosi: Android {guard.androidVersion} · permesso SMS {guard.smsPermission ? "sì" : "no"} · invio consentito dal sistema{" "}
        {guard.smsAppOpAllowed ? "sì" : "no"} · SIM predefinita per SMS {guard.defaultSmsSubscription === -1 ? "nessuna" : "sì"} · SIM attive{" "}
        {guard.activeSims === -1 ? "?" : guard.activeSims}
      </Text>
    </View>
  );
}

function SettingsForm() {
  const { settings, updateSettings } = useLens();
  const [draft, setDraft] = useState<LensSettings>(settings);
  const [offsets, setOffsets] = useState(settings.reminderOffsets.join(", "));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(settings);
    setOffsets(settings.reminderOffsets.join(", "));
  }, [settings]);

  const set = (patch: Partial<LensSettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  const save = async () => {
    const parsed = offsets
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0 && n < 24 * 60);
    await updateSettings({ ...draft, reminderOffsets: parsed.length ? parsed : settings.reminderOffsets });
    setSaved(true);
  };

  const missingPhone = draft.enabled && !draft.friendPhone.trim();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Impostazioni</Text>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Avviso automatico all'amico</Text>
        <Switch
          value={draft.enabled}
          onValueChange={(enabled) => set({ enabled })}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      <StepperInput label="Togliere entro (ora)" value={draft.deadlineHour} unit="h" min={0} max={23} onChange={(deadlineHour) => set({ deadlineHour })} />
      <StepperInput label="Minuti" value={draft.deadlineMinute} unit="min" min={0} max={55} step={5} onChange={(deadlineMinute) => set({ deadlineMinute })} />

      <Text style={styles.label}>Promemoria: minuti prima della scadenza</Text>
      <TextInput style={styles.input} value={offsets} onChangeText={(t) => { setOffsets(t); setSaved(false); }} placeholder="60, 30, 15" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Il tuo nome (va nel messaggio)</Text>
      <TextInput style={styles.input} value={draft.yourName} onChangeText={(yourName) => set({ yourName })} placeholder="es. Mirko" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Nome dell'amico</Text>
      <TextInput style={styles.input} value={draft.friendName} onChangeText={(friendName) => set({ friendName })} placeholder="es. Luca" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Numero dell'amico</Text>
      <TextInput
        style={styles.input}
        value={draft.friendPhone}
        onChangeText={(friendPhone) => set({ friendPhone })}
        placeholder="+39 333 1234567"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
      />
      <Text style={styles.label}>Messaggio (vuoto = testo standard)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={draft.friendMessage}
        onChangeText={(friendMessage) => set({ friendMessage })}
        placeholder={defaultFriendMessage(draft.yourName)}
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <StepperInput label="Durata lenti" value={draft.lensDurationDays} unit="gg" min={1} max={365} onChange={(lensDurationDays) => set({ lensDurationDays })} />
      <StepperInput label="Durata astuccio" value={draft.caseDurationDays} unit="gg" min={7} max={365} step={7} onChange={(caseDurationDays) => set({ caseDurationDays })} />

      {missingPhone && <Text style={[styles.hint, styles.warning]}>Inserisci il numero dell'amico: senza, l'avviso resta spento.</Text>}
      <PressableScale style={[styles.bigButton, styles.spaced]} onPress={save}>
        <Text style={styles.bigButtonText}>{saved ? "Salvato" : "Salva"}</Text>
      </PressableScale>
    </View>
  );
}

export function LensScreen() {
  const navigation = useNavigation();
  const { loading } = useLens();
  if (loading) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Lenti a contatto" subtitle="Igiene, cambio e rete di sicurezza" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LensTonightCard />
        <Checklist title="Sera: quando le togli" steps={EVENING_STEPS} />
        <Checklist title="Mattina: quando le metti" steps={MORNING_STEPS} />
        <ReplacementCard />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Regole d'oro</Text>
          {LENS_RULES.map((rule) => (
            <Text key={rule} style={styles.rule}>
              • {rule}
            </Text>
          ))}
          <Text style={[styles.hint, styles.spaced]}>
            Indicazioni generali: segui quelle del tuo ottico/oculista e della soluzione che usi.
          </Text>
        </View>
        <GuardSetup />
        <SettingsForm />
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
  cardAlert: { borderColor: colors.primary },
  cardDone: { borderColor: colors.success },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.xs },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  warning: { color: colors.accent },
  spaced: { marginTop: spacing.sm },
  problem: { backgroundColor: colors.cardAlt, borderRadius: radii.sm, padding: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.accent },
  problemText: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 2 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: spacing.xs },
  bigButton: {
    flexDirection: "row",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  bigButtonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 15 },
  ghost: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.5 },
  stepRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", paddingVertical: 6 },
  stepText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  stepDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  rule: { fontSize: 13, color: colors.text, lineHeight: 19, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 5 },
  statusText: { flex: 1, fontSize: 13, color: colors.text },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
});
