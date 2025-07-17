export type NodeType = 'task' | 'milestone' | 'deliverable' | 'phase';
export type ProjectStatus = 'active' | 'completed' | 'archived';

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