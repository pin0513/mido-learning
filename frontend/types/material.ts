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
  scriptPath?: string;
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
