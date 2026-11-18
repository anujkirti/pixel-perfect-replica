import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import type { LiveDetection } from "@/detectors/types";
import { modelCache } from "@/lib/model-cache";
export const liveSettingsSchema = z
  .object({
    firearm: z.number().min(0.05).max(0.95),
    knife: z.number().min(0.05).max(0.95),
    nms: z.number().min(0.05).max(0.95),
    k: z.number().int().min(1).max(20),
    n: z.number().int().min(1).max(30),
    cooldown: z.number().min(0).max(120),
    fps: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(60)]),
    mirror: z.boolean(),
    facing: z.enum(["user", "environment"]),
    resolution: z.enum(["640x480", "1280x720"]),
    showSuppressed: z.boolean(),
    sound: z.boolean(),
    notifications: z.boolean(),
    model: z.enum(["demo", "onnx", "remote"]),
    labels: z.string().min(1),
    weapons: z.array(z.string()),
    apiUrl: z.string(),
    remoteConsent: z.boolean(),
    remoteInterval: z.number().min(100).max(10000),
  })
  .refine((s) => s.k <= s.n, "Confirmation K must not exceed N.");
export type LiveSettings = z.infer<typeof liveSettingsSchema>;
export const liveDefaults: LiveSettings = {
  firearm: 0.6,
  knife: 0.55,
  nms: 0.45,
  k: 4,
  n: 6,
  cooldown: 10,
  fps: 10,
  mirror: false,
  facing: "environment",
  resolution: "1280x720",
  showSuppressed: false,
  sound: false,
  notifications: false,
  model: "demo",
  labels: "firearm,knife",
  weapons: ["firearm", "knife"],
  apiUrl: "",
  remoteConsent: false,
  remoteInterval: 1000,
};
export type FeedbackEntry = {
  id: string;
  timestamp: number;
  detection: LiveDetection;
  frames: number;
  status: "Alert" | "Suppressed look-alike" | "Suppressed threshold";
  feedback?: "correct" | "fp" | undefined;
  category?: string | undefined;
  snapshot?: string | undefined;
};
const entrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  detection: z.object({
    label: z.string(),
    confidence: z.number().min(0).max(1),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    weapon: z.boolean(),
  }),
  frames: z.number(),
  status: z.enum(["Alert", "Suppressed look-alike", "Suppressed threshold"]),
  feedback: z.enum(["correct", "fp"]).optional(),
  category: z.string().optional(),
  snapshot: z.string().max(100000).optional(),
});
type Store = {
  settings: LiveSettings;
  setSettings: (s: LiveSettings) => void;
  entries: FeedbackEntry[];
  addEntries: (s: FeedbackEntry[]) => void;
  mark: (id: string, feedback: "correct" | "fp", category?: string) => void;
  clearLog: () => void;
  reset: () => void;
  clearStored: () => Promise<void>;
  storageError: string;
};
const Context = createContext<Store | null>(null);
export function LiveProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(liveDefaults),
    [entries, setEntries] = useState<FeedbackEntry[]>([]),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const s = localStorage.getItem("sentineleye-live-settings"),
        e = localStorage.getItem("sentineleye-live-feedback");
      if (s) {
        const parsed = liveSettingsSchema.safeParse(JSON.parse(s));
        if (parsed.success) setSettings(parsed.data);
      }
      if (e) {
        const parsed = z.array(entrySchema).safeParse(JSON.parse(e));
        if (parsed.success) setEntries(parsed.data);
      }
    } catch {
      setStorageError("Saved preferences could not be read. This session still works.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("sentineleye-live-settings", JSON.stringify(settings));
      localStorage.setItem("sentineleye-live-feedback", JSON.stringify(entries));
      setStorageError("");
    } catch {
      setStorageError(
        "Device storage is full or unavailable. Export your feedback before leaving.",
      );
    }
  }, [ready, settings, entries]);
  return (
    <Context.Provider
      value={{
        settings,
        setSettings,
        entries,
        storageError,
        addEntries: (newEntries) => setEntries((old) => [...newEntries, ...old].slice(0, 300)),
        mark: (id, feedback, category) =>
          setEntries((old) =>
            old.map((e) =>
              e.id === id
                ? {
                    ...e,
                    feedback,
                    category: feedback === "fp" ? (category ?? "other") : undefined,
                  }
                : e,
            ),
          ),
        clearLog: () => setEntries([]),
        reset: () => setSettings({ ...liveDefaults }),
        clearStored: async () => {
          setEntries([]);
          setSettings({ ...liveDefaults });
          await modelCache("clear");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLive() {
  const store = useContext(Context);
  if (!store) throw new Error("LiveProvider missing");
  return store;
}
