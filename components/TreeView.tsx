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
  Milestone,
  Package,
  Layers,
} from 'lucide-react';
import { TreeNode, TreeViewSettings } from '@/lib/types';
import { TreeUtils } from '@/lib/tree-utils';
import TreeNodeComponent from './TreeNode';
import { Button } from './ui/button';

interface TreeViewProps {
  projectId: number;
}

const defaultSettings: TreeViewSettings = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 14,
  showWbsCode: true,
  showDescription: true,
  compactView: false,
  colorByType: true,
};

const TreeView: React.FC<TreeViewProps> = ({ projectId }) => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [settings] = useState<TreeViewSettings>(defaultSettings); // Removed setSettings
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<TreeNode[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
  const [clipboard, setClipboard] = useState<{ type: 'copy' | 'cut'; nodeId: number } | null>(null);

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

  // Update local state when tree data changes
  useEffect(() => {
    if (treeData) {
      setNodes(treeData);
      setFilteredNodes(treeData);
      
      // Auto-expand root nodes
      const rootIds = treeData.map(node => node.id);
      setExpandedNodes(new Set(rootIds));
    }
  }, [treeData]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNodes(nodes);
      return;
    }

    const searchResults = TreeUtils.searchNodes(nodes, searchQuery);
    setFilteredNodes(searchResults);
    
    // Expand paths to search results
    const expandedIds = new Set(expandedNodes);
    searchResults.forEach(node => {
      const path = TreeUtils.findNodePath(nodes, node.id);
      path.forEach(pathNode => expandedIds.add(pathNode.id));
    });
    setExpandedNodes(expandedIds);
  }, [searchQuery, nodes, expandedNodes]);

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
  const handleAddRoot = useCallback(() => {
    const name = prompt('Enter root task name:');
    if (name?.trim()) {
      addNodeMutation.mutate({ parentId: null, name: name.trim() });
    }
  }, [addNodeMutation]);

  const handleAddChild = useCallback((parentId: number, name: string) => {
    addNodeMutation.mutate({ parentId, name });
  }, [addNodeMutation]);

  const handleUpdateNode = useCallback((nodeId: number, updates: Partial<TreeNode>) => {
    updateNodeMutation.mutate({ nodeId, updates });
  }, [updateNodeMutation]);

  const handleDeleteNode = useCallback((nodeId: number) => {
    deleteNodeMutation.mutate(nodeId);
  }, [deleteNodeMutation]);

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
    const allIds = TreeUtils.flattenTree(nodes).map(node => node.id);
    setExpandedNodes(new Set(allIds));
  }, [nodes]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const handleDragStart = useCallback((nodeId: number, dragData: any) => {
    setDraggedNodeId(nodeId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedNodeId(null);
  }, []);

  const handleExport = useCallback(() => {
    const exportData = TreeUtils.exportToJson(nodes);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'wbs'}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, project?.name]);

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
          case 'n':
            e.preventDefault();
            handleAddRoot();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleExport, handleAddRoot]);

  // Loading state
  if (isProjectLoading || isTreeLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading WBS...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">No WBS Created Yet</h2>
          <p className="text-gray-500 mb-6">Start by creating your first root task</p>
          <Button onClick={handleAddRoot} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Root Task
          </Button>
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
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            {project?.name || 'WBS Project'}
          </h1>
          <p className="text-sm text-gray-600">Work Breakdown Structure</p>
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
            />
          </div>
          

        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button onClick={handleAddRoot} className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Add Root
            </Button>
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              Export
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Tree Container */}
        <div className="flex-1 overflow-auto p-4">
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