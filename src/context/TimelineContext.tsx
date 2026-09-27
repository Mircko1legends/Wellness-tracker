import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AiSettings, DEFAULT_AI_SETTINGS } from "../import/gemini";
import { DietMeal } from "../import/dietParser";
import { ImportedActivity, ParseMethod } from "../import/types";
import {
  DEFAULT_TIMELINE_SETTINGS,
  isDefaultPlanApplied,
  loadDefaultPlanVersion,
  saveDefaultPlanVersion,
  loadAiSettings,
  loadTimelineLog,
  loadTimelinePlan,
  loadTimelineSettings,
  markDefaultPlanApplied,
  saveAiSettings,
  saveTimelineLog,
  saveTimelinePlan,
  saveTimelineSettings,
  TimelineSettings,
} from "../storage/storage";
import { syncBrainstormReminders } from "../report/notifications";
import { syncTimelineNotifications } from "../timeline/notifications";
import { defaultPlanPack, PlanPack } from "../timeline/pack";
import { useWellness } from "./WellnessContext";
import { scalePlanForWeight } from "../timeline/scaling";
import { buildMeals, buildRoutine, EMPTY_PLAN, setStepStatus, StepStatus, stepStatus, TimelineDayLog, TimelinePlan } from "../timeline/plan";

interface TimelineContextValue {
  loading: boolean;
  plan: TimelinePlan;
  log: TimelineDayLog[];
  settings: TimelineSettings;
  ai: AiSettings;
  saveRoutine: (activities: ImportedActivity[], fileName: string, method: ParseMethod) => Promise<void>;
  saveDiet: (meals: DietMeal[], fileName: string, method: ParseMethod) => Promise<void>;
  applyPack: (pack: PlanPack, fileName: string) => Promise<void>;
  clearRoutine: () => Promise<void>;
  clearDiet: () => Promise<void>;
  setStep: (date: string, stepId: string, status: StepStatus) => Promise<void>;
  /** Sets many steps at once (a notification's "Fatto"), without toggling ones already in that state. */
  setSteps: (date: string, stepIds: string[], status: Exclude<StepStatus, null>) => Promise<void>;
  statusOf: (date: string, stepId: string) => StepStatus;
  updateSettings: (next: TimelineSettings) => Promise<void>;
  updateAi: (next: AiSettings) => Promise<void>;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const { bodyweightKg } = useWellness();
  const [loading, setLoading] = useState(true);
  // The stored plan is the reference menu (70 kg); everyone else sees it scaled to your weight.
  const [basePlan, setPlan] = useState<TimelinePlan>(EMPTY_PLAN);
  const plan = useMemo(() => scalePlanForWeight(basePlan, bodyweightKg), [basePlan, bodyweightKg]);
  const [log, setLog] = useState<TimelineDayLog[]>([]);
  const [settings, setSettings] = useState<TimelineSettings>(DEFAULT_TIMELINE_SETTINGS);
  const [ai, setAi] = useState<AiSettings>(DEFAULT_AI_SETTINGS);

  useEffect(() => {
    (async () => {
      const [loaded, l, s, a, applied, version] = await Promise.all([
        loadTimelinePlan(),
        loadTimelineLog(),
        loadTimelineSettings(),
        loadAiSettings(),
        isDefaultPlanApplied(),
        loadDefaultPlanVersion(),
      ]);
      let p = loaded;
      const pack = defaultPlanPack();
      const fresh = !applied && p.routine.length === 0 && p.meals.length === 0;
      // An older built-in plan that you haven't replaced with your own import is upgraded in place.
      const outdated = applied && version < pack.version && p.routineSource?.method === "pack" && p.routineSource.name.startsWith("Routine annuale");
      if (fresh || outdated) {
        p = { routine: pack.routine, meals: pack.meals, routineSource: { name: pack.name, method: "pack", importedAt: Date.now() } };
        await saveTimelinePlan(p);
        await markDefaultPlanApplied();
        await saveDefaultPlanVersion(pack.version);
      }
      setPlan(p);
      setLog(l);
      setSettings(s);
      setAi(a);
      setLoading(false);
      syncBrainstormReminders().catch(() => {});
    })();
  }, []);

  // Notifications follow the plan as you see it (portions scaled to your weight); a short delay collapses
  // the burst of changes at startup (plan loaded, then weight loaded) into one reschedule.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncTimelineNotifications(plan, settings.notifyEachStep).catch(() => {});
    }, 1500);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [loading, plan, settings.notifyEachStep]);

  const persistPlan = async (next: TimelinePlan) => {
    setPlan(next);
    await saveTimelinePlan(next);
  };

  const saveRoutine = (activities: ImportedActivity[], fileName: string, method: ParseMethod) =>
    persistPlan({ ...basePlan, routine: buildRoutine(activities), routineSource: { name: fileName, method, importedAt: Date.now() } });

  const saveDiet = (meals: DietMeal[], fileName: string, method: ParseMethod) =>
    persistPlan({ ...basePlan, meals: buildMeals(meals), dietSource: { name: fileName, method, importedAt: Date.now() } });

  const setStep = async (date: string, stepId: string, status: StepStatus) => {
    const next = setStepStatus(log, date, stepId, status);
    setLog(next);
    await saveTimelineLog(next);
  };

  const setSteps = async (date: string, stepIds: string[], status: Exclude<StepStatus, null>) => {
    let next = log;
    for (const id of stepIds) if (stepStatus(next, date, id) !== status) next = setStepStatus(next, date, id, status);
    setLog(next);
    await saveTimelineLog(next);
  };

  const updateSettings = async (next: TimelineSettings) => {
    setSettings(next);
    await saveTimelineSettings(next);
  };

  const updateAi = async (next: AiSettings) => {
    setAi(next);
    await saveAiSettings(next);
  };

  return (
    <TimelineContext.Provider
      value={{
        loading,
        plan,
        log,
        settings,
        ai,
        saveRoutine,
        saveDiet,
        applyPack: (pack, fileName) =>
          persistPlan({
            routine: pack.routine,
            meals: pack.meals,
            routineSource: { name: fileName, method: "pack", importedAt: Date.now() },
            ...(pack.meals.length ? { dietSource: { name: fileName, method: "pack", importedAt: Date.now() } } : {}),
          }),
        clearRoutine: () => persistPlan({ ...basePlan, routine: [], routineSource: undefined }),
        clearDiet: () => persistPlan({ ...basePlan, meals: [], dietSource: undefined }),
        setStep,
        setSteps,
        statusOf: (date, stepId) => stepStatus(log, date, stepId),
        updateSettings,
        updateAi,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline(): TimelineContextValue {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error("useTimeline must be used within TimelineProvider");
  return ctx;
}
