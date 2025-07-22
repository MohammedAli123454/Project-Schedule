export type NodeType = 'task' | 'milestone' | 'deliverable' | 'phase';
//export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface TreeNode {
  id: number;
  projectId: number;
  parentId: number | null;
  name: string;
  description?: string;
  orderIdx: number;
  level: number;
  wbsCode?: string;
  type: NodeType;
  createdAt: Date;
  updatedAt: Date;
  children: TreeNode[];
}

export interface DragData {
  nodeId: number;
  parentId: number | null;
  indexInParent: number;
  level: number;
}

export interface DropPosition {
  type: 'above' | 'below' | 'inside';
  targetId: number;
  targetParentId: number | null;
  targetIndex: number;
}

export interface TreeViewSettings {
  fontFamily: string;
  fontSize: number;
  showWbsCode: boolean;
  showDescription: boolean;
  compactView: boolean;
  colorByType: boolean;
}


// types/project.ts

export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'planned' | 'active' | 'completed' | 'on-hold';
  createdAt: string;
  updatedAt: string;
  plannedStartDate: string;
  mustFinishBy: string;
  projectManager: string;
  poNumber?: string;
  mocNo?: string;
  serviceOrderNo?: string;
  projectType: 'MOC' | 'Project' | 'Turn Around' | 'EPC';
  clientName: string;
  priority?: 'High' | 'Medium' | 'Low';
  budget: number;
  actualFinishDate?: string;
  awardedValue: number;
}

export const PROJECT_TYPES = ['MOC', 'Project', 'Turn Around', 'EPC'] as const;
export const STATUSES = ['planned', 'active', 'completed', 'on-hold'] as const;
export const PRIORITIES = ['High', 'Medium', 'Low'] as const;

export type ProjectType = typeof PROJECT_TYPES[number];
export type ProjectStatus = typeof STATUSES[number];
export type ProjectPriority = typeof PRIORITIES[number];
