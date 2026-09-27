import React, { createContext, useContext, useEffect, useState } from "react";
import { LifeGoal, mergeGoals, sortGoals, toggleMilestone } from "../goals/goals";
import { loadDefaultGoalsVersion, loadLifeGoals, saveDefaultGoalsVersion, saveLifeGoals } from "../storage/storage";
import { defaultPlanPack } from "../timeline/pack";

interface GoalsContextValue {
  loading: boolean;
  goals: LifeGoal[];
  toggle: (goalId: string, milestoneId: string) => Promise<void>;
  importGoals: (incoming: LifeGoal[]) => Promise<void>;
}

const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<LifeGoal[]>([]);

  useEffect(() => {
    Promise.all([loadLifeGoals(), loadDefaultGoalsVersion()]).then(async ([g, version]) => {
      let list = g;
      const pack = defaultPlanPack();
      if (list.length === 0) {
        list = pack.goals;
        await saveLifeGoals(list);
        await saveDefaultGoalsVersion(pack.version);
      } else if (version < pack.version && list.every((goal) => /^goal\d+$/.test(goal.id))) {
        // Still the built-in goals: take the new version, keeping every milestone already reached.
        list = mergeGoals(list, pack.goals);
        await saveLifeGoals(list);
        await saveDefaultGoalsVersion(pack.version);
      }
      setGoals(sortGoals(list));
      setLoading(false);
    });
  }, []);

  const persist = async (next: LifeGoal[]) => {
    const sorted = sortGoals(next);
    setGoals(sorted);
    await saveLifeGoals(sorted);
  };

  return (
    <GoalsContext.Provider
      value={{
        loading,
        goals,
        toggle: (goalId, milestoneId) => persist(toggleMilestone(goals, goalId, milestoneId, Date.now())),
        importGoals: (incoming) => persist(mergeGoals(goals, incoming)),
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
