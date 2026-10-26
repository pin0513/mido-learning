import { disciplineRoots, disciplineTitle, layerName, stageName, type ContentCatalog } from "./catalog";
import type { KnowledgePoint } from "./types";
import type { FilterOption, KpCard } from "../kp/cards";
import { knowledgePointPath } from "../kp/routes";

export function toCards(catalog: ContentCatalog, points: KnowledgePoint[]): KpCard[] {
  return points.map((point) => ({
    id: point.id,
    title: point.title,
    href: knowledgePointPath(point.concept, point.stage),
    stage: point.stage,
    stageName: stageName(catalog, point.stage),
    folder: point.folder,
    folderName: disciplineTitle(catalog, point.folder),
    layer: point.layer,
    layerName: layerName(catalog, point.layer),
    competencies: point.curriculum108?.coreCompetencies ?? [],
  }));
}

export function filterOptions(catalog: ContentCatalog): {
  stages: FilterOption[];
  folders: FilterOption[];
  layers: FilterOption[];
  competencies: FilterOption[];
} {
  return {
    stages: catalog.taxonomy.stageList.map((stage) => ({ id: stage.id, label: stage.name })),
    folders: disciplineRoots(catalog).map((root) => ({
      id: root.contentFolder ?? root.id,
      label: disciplineTitle(catalog, root.contentFolder ?? root.id),
    })),
    layers: catalog.taxonomy.layerList.map((layer) => ({ id: layer.id, label: layer.name })),
    competencies: catalog.taxonomy.coreCompetencies.map((item) => ({
      id: item.code,
      label: `${item.code} ${item.name}`,
    })),
  };
}
