/**
 * 進度只活在瀏覽器。DemoProgress 是假資料；LocalProgress 寫 localStorage。
 * 不呼叫 API，也不寫 Firestore。日後接上後端時實作同一個 ProgressSource。
 */

export interface PersonMark {
  name: string;
  at: string | null;
  visited: string[];
}

export interface ProgressSnapshot {
  kind: "demo" | "local";
  /** 畫面上必須能看見的來源說明。範例模式固定含「範例資料」。 */
  notice: string;
  adult: PersonMark;
  child: PersonMark;
}

export interface ProgressSource {
  read(): ProgressSnapshot;
}

export const PROGRESS_STORAGE_KEY = "mido-city-progress";

const DEMO: ProgressSnapshot = {
  kind: "demo",
  notice: "範例資料：家庭標記與走過的建築都是假的，不代表任何人的進度。",
  child: {
    name: "孩子",
    at: "pm.breakdown@es",
    visited: ["pm.goal@es", "ma.number@es", "ph.question@es", "it.steps@es"],
  },
  adult: {
    name: "大人",
    at: "pm.estimate@sh",
    visited: ["pm.breakdown@es", "pm.project@jh", "pm.triangle@jh", "ph.reason@es"],
  },
};

export const demoProgress: ProgressSource = {
  read: () => DEMO,
};

export interface StoredProgress {
  adultName: string;
  childName: string;
  adultAt: string | null;
  childAt: string | null;
  adultVisited: string[];
  childVisited: string[];
}

export const emptyStoredProgress = (): StoredProgress => ({
  adultName: "大人",
  childName: "孩子",
  adultAt: null,
  childAt: null,
  adultVisited: [],
  childVisited: [],
});

export function readStoredProgress(): StoredProgress {
  if (typeof window === "undefined") return emptyStoredProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return emptyStoredProgress();
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    return {
      adultName: parsed.adultName || "大人",
      childName: parsed.childName || "孩子",
      adultAt: parsed.adultAt ?? null,
      childAt: parsed.childAt ?? null,
      adultVisited: Array.isArray(parsed.adultVisited) ? parsed.adultVisited.filter((id) => typeof id === "string") : [],
      childVisited: Array.isArray(parsed.childVisited) ? parsed.childVisited.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return emptyStoredProgress();
  }
}

export function writeStoredProgress(value: StoredProgress): void {
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(value));
}

export function clearStoredProgress(): void {
  window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
}

export function toSnapshot(value: StoredProgress): ProgressSnapshot {
  return {
    kind: "local",
    notice: "這是你標在這台裝置上的記號，清掉瀏覽器資料就會消失。",
    adult: { name: value.adultName, at: value.adultAt, visited: value.adultVisited },
    child: { name: value.childName, at: value.childAt, visited: value.childVisited },
  };
}

export function together(snapshot: ProgressSnapshot, id: string): boolean {
  const seen = (person: PersonMark) => person.at === id || person.visited.includes(id);
  return seen(snapshot.adult) && seen(snapshot.child);
}
