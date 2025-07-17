
import type { InferSelectModel } from 'drizzle-orm';
import { wbsNodes } from '@/db/schema';
export type NodeRow = InferSelectModel<typeof wbsNodes>;
export type TreeNode = NodeRow & { children: TreeNode[] };

export function buildTree(rows: NodeRow[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId) map.get(node.parentId)?.children.push(node);
    else roots.push(node);
  });
  return roots;
}
