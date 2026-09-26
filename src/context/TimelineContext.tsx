import React, { createContext, useContext, useEffect, useState } from "react";
import { AiSettings, DEFAULT_AI_SETTINGS } from "../import/gemini";
import { DietMeal } from "../import/dietParser";
import { ImportedActivity, ParseMethod } from "../import/types";
import {
  DEFAULT_TIMELINE_SETTINGS,
  loadAiSettings,
  loadTimelineLog,
  loadTimelinePlan,
  loadTimelineSettings,
  saveAiSettings,
  saveTimelineLog,
  saveTimelinePlan,
  saveTimelineSettings,
  TimelineSettings,
} from "../storage/storage";
import { syncTimelineNotifications } from "../timeline/notifications";
import { buildMeals, buildRoutine, EMPTY_PLAN, TimelineDayLog, TimelinePlan, toggleDone } from "../timeline/plan";

interface TimelineContextValue {
  loading: boolean;
  plan: TimelinePlan;
  log: TimelineDayLog[];
  settings: TimelineSettings;
  ai: AiSettings;
  saveRoutine: (activities: ImportedActivity[], fileName: string, method: ParseMethod) => Promise<void>;
  saveDiet: (meals: DietMeal[], fileName: string, method: ParseMethod) => Promise<void>;
  clearRoutine: () => Promise<void>;
  clearDiet: () => Promise<void>;
  toggleStep: (date: string, stepId: string) => Promise<void>;
  isDone: (date: string, stepId: string) => boolean;
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
      const [p, l, s, a] = await Promise.all([loadTimelinePlan(), loadTimelineLog(), loadTimelineSettings(), loadAiSettings()]);
      setPlan(p);
      setLog(l);
      setSettings(s);
      setAi(a);
      setLoading(false);
      syncTimelineNotifications(p, s.notifyEachStep).catch(() => {});
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

  const toggleStep = async (date: string, stepId: string) => {
    const next = toggleDone(log, date, stepId);
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
        clearRoutine: () => persistPlan({ ...plan, routine: [], routineSource: undefined }),
        clearDiet: () => persistPlan({ ...plan, meals: [], dietSource: undefined }),
        toggleStep,
        isDone: (date, stepId) => !!log.find((d) => d.date === date)?.doneIds.includes(stepId),
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
