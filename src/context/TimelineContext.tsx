import React, { createContext, useContext, useEffect, useState } from "react";
import { AiSettings, DEFAULT_AI_SETTINGS } from "../import/gemini";
import { DietMeal } from "../import/dietParser";
import { ImportedActivity, ParseMethod } from "../import/types";
import {
  DEFAULT_TIMELINE_SETTINGS,
  isDefaultPlanApplied,
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
  statusOf: (date: string, stepId: string) => StepStatus;
  updateSettings: (next: TimelineSettings) => Promise<void>;
  updateAi: (next: AiSettings) => Promise<void>;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<TimelinePlan>(EMPTY_PLAN);
  const [log, setLog] = useState<TimelineDayLog[]>([]);
  const [settings, setSettings] = useState<TimelineSettings>(DEFAULT_TIMELINE_SETTINGS);
  const [ai, setAi] = useState<AiSettings>(DEFAULT_AI_SETTINGS);

  useEffect(() => {
    (async () => {
      const [loaded, l, s, a, applied] = await Promise.all([
        loadTimelinePlan(),
        loadTimelineLog(),
        loadTimelineSettings(),
        loadAiSettings(),
        isDefaultPlanApplied(),
      ]);
      let p = loaded;
      if (!applied && p.routine.length === 0 && p.meals.length === 0) {
        const pack = defaultPlanPack();
        p = { routine: pack.routine, meals: pack.meals, routineSource: { name: pack.name, method: "pack", importedAt: Date.now() } };
        await saveTimelinePlan(p);
        await markDefaultPlanApplied();
      }
      setPlan(p);
      setLog(l);
      setSettings(s);
      setAi(a);
      setLoading(false);
      syncTimelineNotifications(p, s.notifyEachStep)
        .then(() => syncBrainstormReminders())
        .catch(() => {});
    })();
  }, []);

  const persistPlan = async (next: TimelinePlan, notifyEachStep = settings.notifyEachStep) => {
    setPlan(next);
    await saveTimelinePlan(next);
    syncTimelineNotifications(next, notifyEachStep).catch(() => {});
  };

  const saveRoutine = (activities: ImportedActivity[], fileName: string, method: ParseMethod) =>
    persistPlan({ ...plan, routine: buildRoutine(activities), routineSource: { name: fileName, method, importedAt: Date.now() } });

  const saveDiet = (meals: DietMeal[], fileName: string, method: ParseMethod) =>
    persistPlan({ ...plan, meals: buildMeals(meals), dietSource: { name: fileName, method, importedAt: Date.now() } });

  const setStep = async (date: string, stepId: string, status: StepStatus) => {
    const next = setStepStatus(log, date, stepId, status);
    setLog(next);
    await saveTimelineLog(next);
  };

  const updateSettings = async (next: TimelineSettings) => {
    setSettings(next);
    await saveTimelineSettings(next);
    syncTimelineNotifications(plan, next.notifyEachStep).catch(() => {});
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
        clearRoutine: () => persistPlan({ ...plan, routine: [], routineSource: undefined }),
        clearDiet: () => persistPlan({ ...plan, meals: [], dietSource: undefined }),
        setStep,
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
