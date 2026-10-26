export const KP_SITE_ORIGIN = "https://learn.paulfun.net";

export function knowledgePointPath(concept: string, stage: string): string {
  return `/kp/${concept}/${stage}`;
}

export function knowledgePointUrl(concept: string, stage: string): string {
  return `${KP_SITE_ORIGIN}${knowledgePointPath(concept, stage)}`;
}

export function conceptPath(concept: string): string {
  return `/kp/${concept}`;
}

export function disciplinePath(folder: string): string {
  return `/kp/discipline/${folder}`;
}

export function stagePath(stage: string): string {
  return `/kp/stage/${stage}`;
}

export function competencyPath(code: string): string {
  return `/kp/competency/${code}`;
}

export function learningPathPath(pathId: string): string {
  return `/kp/path/${pathId}`;
}
