export interface KpCard {
  id: string;
  title: string;
  href: string;
  stage: string;
  stageName: string;
  folder: string;
  folderName: string;
  layer: string;
  layerName: string;
  competencies: string[];
}

export interface FilterOption {
  id: string;
  label: string;
}
