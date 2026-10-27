import type { HomeModel } from "./home-diagram";

export interface HomeState {
  disciplineId: string;
  nodeId: string | null;
  task: boolean;
  branchId: string | null;
}

/** 舊網址 b=en、b=ja。其他值不在這裡改，由 readHomeState 落到該學門的預設線。 */
export function canonicalLanguageBranch(raw: string | null): string | null {
  if (raw === "en") return "en-talk";
  if (raw === "ja") return "ja-read";
  return null;
}

export function readHomeState(model: HomeModel, params: { get(name: string): string | null }): HomeState {
  const task = params.get("view") === "task";
  const requested = params.get("d");
  const match = requested == null ? undefined : model.disciplines.find((item) => item.id === requested);
  const known = match != null && (match.id !== "language" || match.ready);
  const disciplineId = known && match ? match.id : model.defaultDisciplineId;
  const requestedBranch = params.get("b");
  const alias = disciplineId === "language" ? canonicalLanguageBranch(requestedBranch) : null;
  const branchKey = alias ?? requestedBranch;
  const branches = model.branches.filter((item) => item.disciplineId === disciplineId);
  const fallback = disciplineId === "language" ? "basic" : branches[0]?.id ?? null;
  const branchId = branches.length === 0
    ? null
    : branches.some((item) => item.id === branchKey) ? branchKey : fallback;
  const diagram = model.diagrams.find((item) => item.id === disciplineId && item.branchId === branchId);
  const kp = params.get("kp");
  const nodeId = !task && kp && diagram?.nodes.some((node) => node.id === kp) ? kp : null;
  return { disciplineId, nodeId, task, branchId };
}
