'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Download,
  Plus,
  Expand,
  ChevronUp,  
  RefreshCw,
  Target,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { TreeNode, TreeViewSettings } from '@/lib/types';
import { TreeUtils } from '@/lib/tree-utils';
import TreeNodeComponent from './TreeNode';
import { Button } from './ui/button';

interface TreeViewProps {
  projectId: number;
}

const defaultSettings: TreeViewSettings = {
  fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  fontSize: 15,
  showWbsCode: false,     // Hide WBS codes
  showDescription: true,
  compactView: false,
  colorByType: true,
};

const TreeView: React.FC<TreeViewProps> = ({ projectId }) => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [settings] = useState<TreeViewSettings>(defaultSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<TreeNode[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
  const [clipboard, setClipboard] = useState<{ type: 'copy' | 'cut'; nodeId: number } | null>(null);
  const [projectNode, setProjectNode] = useState<TreeNode | null>(null);

  const qc = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch project data
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  // Fetch tree data
  const { data: treeData, isLoading: isTreeLoading, refetch: refetchTree } = useQuery({
    queryKey: ['tree', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/tree/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch tree');
      const data = await response.json();
      return TreeUtils.buildTree(data);
    },
    refetchOnWindowFocus: false,
  });

  // Create project node from project data
  useEffect(() => {
    if (project && treeData) {
      const projectTreeNode: TreeNode = {
        id: project.id,
        name: project.name,
        description: project.description || '',
        type: 'phase', // Project is treated as a phase
        parentId: null,
        projectId: project.id,
        wbsCode: '1.0',
        children: treeData,
        orderIdx: 0,
        level: 0,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
      
      setProjectNode(projectTreeNode);
      setNodes([projectTreeNode]);
      setFilteredNodes([projectTreeNode]);
      
      // Auto-expand the project node
      setExpandedNodes(new Set([project.id]));
    }
  }, [project, treeData]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !projectNode) {
      setFilteredNodes(nodes);
      return;
    }

    // Search within the project's children
    const searchResults = TreeUtils.searchNodes(projectNode.children || [], searchQuery);
    
    if (searchResults.length > 0) {
      // Create a filtered project node with only search results
      const filteredProjectNode = {
        ...projectNode,
        children: searchResults,
      };
      setFilteredNodes([filteredProjectNode]);
      
      // Expand paths to search results
      const expandedIds = new Set([projectNode.id]);
      searchResults.forEach(node => {
        const path = TreeUtils.findNodePath(projectNode.children || [], node.id);
        path.forEach(pathNode => expandedIds.add(pathNode.id));
      });
      setExpandedNodes(expandedIds);
    } else {
      setFilteredNodes([{ ...projectNode, children: [] }]);
    }
  }, [searchQuery, nodes, projectNode]);

  // Mutations
  const addNodeMutation = useMutation({
    mutationFn: async ({ parentId, name, type = 'task' }: { parentId: number | null; name: string; type?: string }) => {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, parentId, name, type }),
      });
      if (!response.ok) throw new Error('Failed to add node');
      return response.json();
    },
    onSuccess: () => {
      refetchTree();
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ nodeId, updates }: { nodeId: number; updates: Partial<TreeNode> }) => {
      const response = await fetch(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update node');
      return response.json();
    },
    onSuccess: () => {
      refetchTree();
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: number) => {
      const response = await fetch(`/api/nodes/${nodeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete node');
      return response.json();
    },
    onSuccess: () => {
      refetchTree();
      setSelectedNodeId(null);
    },
  });

  const moveNodeMutation = useMutation({
    mutationFn: async ({ nodeId, targetId, position }: { nodeId: number; targetId: number; position: any }) => {
      const response = await fetch('/api/nodes/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, targetId, position }),
      });
      if (!response.ok) throw new Error('Failed to move node');
      return response.json();
    },
    onSuccess: () => {
      refetchTree();
    },
  });

  // Event handlers
  const handleAddChild = useCallback((parentId: number, name: string) => {
    // If adding to project node, use null as parentId for API
    const apiParentId = parentId === projectId ? null : parentId;
    addNodeMutation.mutate({ parentId: apiParentId, name });
  }, [addNodeMutation, projectId]);

  const handleUpdateNode = useCallback((nodeId: number, updates: Partial<TreeNode>) => {
    if (nodeId === projectId) {
      // Handle project updates differently if needed
      console.log('Project update requested:', updates);
      return;
    }
    updateNodeMutation.mutate({ nodeId, updates });
  }, [updateNodeMutation, projectId]);

  const handleDeleteNode = useCallback((nodeId: number) => {
    if (nodeId === projectId) {
      // Prevent deleting the project node
      alert('Cannot delete the project itself');
      return;
    }
    deleteNodeMutation.mutate(nodeId);
  }, [deleteNodeMutation, projectId]);

  const handleMoveNode = useCallback((nodeId: number, targetId: number, position: any) => {
    moveNodeMutation.mutate({ nodeId, targetId, position });
  }, [moveNodeMutation]);

  const handleCopyNode = useCallback((nodeId: number) => {
    setClipboard({ type: 'copy', nodeId });
  }, []);

  const handleCutNode = useCallback((nodeId: number) => {
    setClipboard({ type: 'cut', nodeId });
  }, []);

  const handlePasteNode = useCallback((parentId: number) => {
    if (!clipboard) return;
    console.log('Pasting node', clipboard.nodeId, 'under', parentId);
    setClipboard(null);
  }, [clipboard]);

  const handleToggleExpanded = useCallback((nodeId: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (!projectNode) return;
    const allIds = [projectNode.id, ...TreeUtils.flattenTree(projectNode.children || []).map(node => node.id)];
    setExpandedNodes(new Set(allIds));
  }, [projectNode]);

  const handleCollapseAll = useCallback(() => {
    if (!projectNode) return;
    setExpandedNodes(new Set([projectNode.id])); // Keep project expanded
  }, [projectNode]);

  const handleDragStart = useCallback((nodeId: number, dragData: any) => {
    setDraggedNodeId(nodeId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedNodeId(null);
  }, []);

  const handleExport = useCallback(() => {
    if (!projectNode) return;
    const exportData = TreeUtils.exportToJson([projectNode]);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'wbs'}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectNode, project?.name]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleExport]);

  // Loading state
  if (isProjectLoading || isTreeLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            Loading WBS...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Target className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            Project Not Found
          </h2>
          <p className="text-gray-500 mb-6" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            The project you're looking for doesn't exist
          </p>
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-5 h-5" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-800" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
              WBS Structure
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              project.status === 'active' ? 'bg-green-100 text-green-800' :
              project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`} style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
              {project.status}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 gap-2 mb-4">
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              Export WBS
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleExpandAll} variant="outline" size="sm">
              <Expand className="w-4 h-4 mr-1" />
              Expand
            </Button>
            <Button onClick={handleCollapseAll} variant="outline" size="sm">
              <ChevronUp className="w-4 h-4 mr-1" />
              Collapse
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Full width without right column */}
      <div className="flex-1 flex flex-col">
        {/* Tree Container */}
        <div className="flex-1 overflow-auto p-6" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
          <div className="space-y-1">
            {filteredNodes.map((node) => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                projectId={projectId}
                depth={0}
                isSelected={selectedNodeId === node.id}
                draggedNodeId={draggedNodeId}
                settings={settings}
                onSelect={setSelectedNodeId}
                onUpdate={handleUpdateNode}
                onDelete={handleDeleteNode}
                onMove={handleMoveNode}
                onAddChild={handleAddChild}
                onCopy={handleCopyNode}
                onCut={handleCutNode}
                onPaste={handlePasteNode}
                clipboard={clipboard}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                expandedNodes={expandedNodes}
                onToggleExpanded={handleToggleExpanded}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreeView;