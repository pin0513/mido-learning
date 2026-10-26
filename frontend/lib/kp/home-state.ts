import type { HomeModel } from "./home-diagram";

export interface HomeState {
  disciplineId: string;
  nodeId: string | null;
  task: boolean;
}

export function readHomeState(model: HomeModel, params: { get(name: string): string | null }): HomeState {
  const task = params.get("view") === "task";
  const requested = params.get("d");
  const known = requested != null && model.disciplines.some((item) => item.id === requested);
  const disciplineId = known ? requested : model.defaultDisciplineId;
  const diagram = model.diagrams.find((item) => item.id === disciplineId);
  const kp = params.get("kp");
  const nodeId = !task && kp && diagram?.nodes.some((node) => node.id === kp) ? kp : null;
  return { disciplineId, nodeId, task };
}
