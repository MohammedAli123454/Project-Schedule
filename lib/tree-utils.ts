import { TreeNode } from './types';

export class TreeUtils {
  static buildTree(nodes: any[]): TreeNode[] {
    const nodeMap = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // Create all nodes
    nodes.forEach(node => {
      const treeNode: TreeNode = {
        ...node,
        children: [],
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
      };
      nodeMap.set(node.id, treeNode);
    });

    // Build tree structure
    nodeMap.forEach(node => {
      if (node.parentId === null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Sort by orderIdx
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.orderIdx - b.orderIdx);
      nodes.forEach(node => sortChildren(node.children));
    };

    sortChildren(roots);
    return roots;
  }

  static flattenTree(roots: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];

    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        result.push(node);
        traverse(node.children);
      });
    };

    traverse(roots);
    return result;
  }

  static findNodeById(roots: TreeNode[], id: number): TreeNode | null {
    const traverse = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = traverse(node.children);
        if (found) return found;
      }
      return null;
    };

    return traverse(roots);
  }

  static searchNodes(roots: TreeNode[], query: string): TreeNode[] {
    const results: TreeNode[] = [];
    const lowerQuery = query.toLowerCase();

    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        const matches = [
          node.name.toLowerCase().includes(lowerQuery),
          node.description?.toLowerCase().includes(lowerQuery),
          node.wbsCode?.toLowerCase().includes(lowerQuery),
        ].some(Boolean);

        if (matches) {
          results.push(node);
        }

        traverse(node.children);
      });
    };

    traverse(roots);
    return results;
  }

  static findNodePath(roots: TreeNode[], targetId: number): TreeNode[] {
    const path: TreeNode[] = [];

    const traverse = (nodes: TreeNode[]): boolean => {
      for (const node of nodes) {
        path.push(node);
        if (node.id === targetId) return true;
        if (traverse(node.children)) return true;
        path.pop();
      }
      return false;
    };

    traverse(roots);
    return path;
  }

  static exportToJson(roots: TreeNode[]): string {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      nodes: roots,
    };

    return JSON.stringify(exportData, null, 2);
  }
}