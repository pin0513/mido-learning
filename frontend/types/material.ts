export interface Material {
  id: string;
  componentId?: string;
  version: number;
  filename: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MaterialFile {
  path: string;
  size: number;
  contentType: string;
}

export interface MaterialManifest {
  materialId: string;
  componentId: string;
  version: number;
  entryPoint: string;
  files: string[];
  baseUrl: string;
  accessToken?: string;
  scriptPath?: string;
  /** 教材版型：'responsive' 自適應、'fixed' 固定尺寸畫布。未提供時視為 'fixed'。 */
  layoutMode?: 'responsive' | 'fixed';
}

export interface MaterialListResponse {
  materials: Material[];
}

export interface UploadMaterialResponse {
  id: string;
  version: number;
  filename: string;
  size: number;
  uploadedAt: string;
}
