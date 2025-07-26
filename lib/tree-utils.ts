import { TreeNode } from './types';

export class TreeUtils {
  static buildTree(nodes: any[]): TreeNode[] {
    const nodeMap = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];
    nodes.forEach(node => {
      const treeNode: TreeNode = {
        ...node,
        children: [],
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
      };
      nodeMap.set(node.id, treeNode);
    });
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

  // ---- PERFORMANCE: Optimistic local update helpers ----

  /** Add a new node under a parent node (immutably) */
  static addNodeLocally(tree: TreeNode[], parentId: number, newNode: TreeNode): TreeNode[] {
    function helper(nodes: TreeNode[]): TreeNode[] {
      return nodes.map(node => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...node.children, newNode],
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: helper(node.children) };
        }
        return node;
      });
    }
    return helper(tree);
  }

  /** Move node under/around another node (immutably, preserves structure) */
  static moveNodeLocally(tree: TreeNode[], nodeId: number, targetId: number, position: any): TreeNode[] {
    let nodeToMove: TreeNode | null = null;

    // Remove node from tree, remembering its data
    function removeNode(nodes: TreeNode[]): TreeNode[] {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.id === nodeId) {
          nodeToMove = node;
          return acc;
        }
        if (node.children.length > 0) {
          acc.push({ ...node, children: removeNode(node.children) });
        } else {
          acc.push(node);
        }
        return acc;
      }, []);
    }
    let newTree = removeNode(tree);
    if (!nodeToMove) return tree;

    // Insert node in new place
    function insertNode(nodes: TreeNode[]): TreeNode[] {
      return nodes.map(node => {
        if (node.id === targetId) {
          if (position.type === 'inside') {
            return {
              ...node,
              children: [...node.children, { ...nodeToMove!, parentId: node.id }]
            };
          }
        }
        if (node.children.length > 0) {
          return { ...node, children: insertNode(node.children) };
        }
        return node;
      });
    }

    if (position.type === 'inside') {
      return insertNode(newTree);
    } else {
      function insertSibling(nodes: TreeNode[]): TreeNode[] {
        const idx = nodes.findIndex(n => n.id === targetId);
        if (idx !== -1) {
          const newNodes = [...nodes];
          const insertAt = position.type === 'above' ? idx : idx + 1;
          newNodes.splice(insertAt, 0, { ...nodeToMove!, parentId: nodes[idx].parentId });
          return newNodes;
        }
        return nodes.map(n => ({ ...n, children: insertSibling(n.children) }));
      }
      return insertSibling(newTree);
    }
  }
}
