import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from '@tanstack/react-router';
import { demoResults, resultsSchema, type Results } from "@/lib/results";
import { registerOffline } from "@/lib/offline";
import type { Thresholds } from "@/lib/detection";
export type Settings = { mode: "demo" | "live"; apiUrl: string; apiKey: string; nms: number };
const defaults: Settings = { mode: "demo", apiUrl: "", apiKey: "", nms: 0.45 };
type Store = {
  thresholds: Thresholds;
  setThresholds: (t: Thresholds) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  results: Results;
  setResults: (r: Results) => void;
  imported: boolean;
  reset: () => void;
  revert: () => void;
};
const Context = createContext<Store | null>(null);
export function SentinelProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({select: state => state.location.pathname});
  const [thresholds, setThresholds] = useState<Thresholds>({ ...demoResults.metrics.recommended });
  const [settings, setSettings] = useState(defaults);
  const [results, setResultsState] = useState(demoResults);
  const [imported, setImported] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sentineleye");
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved.thresholds &&
          ["firearm", "knife"].every(
            (k) =>
              typeof saved.thresholds[k] === "number" &&
              saved.thresholds[k] >= 0.05 &&
              saved.thresholds[k] <= 0.95,
          )
        )
          setThresholds(saved.thresholds);
        if (saved.settings) setSettings({ ...defaults, ...saved.settings });
        const parsed = resultsSchema.safeParse(saved.results);
        if (parsed.success) {
          setResultsState(parsed.data);
          setImported(saved.imported === true);
        }
      }
    } catch {
      localStorage.removeItem("sentineleye");
    }
    setReady(true);
  }, []);
  useEffect(() => { registerOffline().catch(() => {}); }, [pathname]);
  useEffect(() => {
    if (ready)
      localStorage.setItem(
        "sentineleye",
        JSON.stringify({ thresholds, settings, results, imported }),
      );
  }, [thresholds, settings, results, imported, ready]);
  const revert = () => {
    setResultsState(demoResults);
    setImported(false);
  };
  const reset = () => {
    setThresholds({ ...demoResults.metrics.recommended });
    setSettings(defaults);
    revert();
  };
  return (
    <Context.Provider
      value={{
        thresholds,
        setThresholds,
        settings,
        setSettings,
        results,
        setResults: (r) => {
          setResultsState(r);
          setImported(true);
        },
        imported,
        reset,
        revert,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useThresholds() {
  const c = useContext(Context);
  if (!c) throw new Error("SentinelProvider required");
  return c;
}
