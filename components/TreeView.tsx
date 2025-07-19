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
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BarLoader } from "react-spinners";
import Link from 'next/link';
import { TreeNode, TreeViewSettings } from '@/lib/types';
import { TreeUtils } from '@/lib/tree-utils';
import TreeNodeComponent from './TreeNode';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Loading states for UI feedback
  const [loadingStates, setLoadingStates] = useState({
    updating: new Set<number>(),
    deleting: new Set<number>(),
    adding: new Set<number>(),
    moving: new Set<number>(),
  });
  
  // Global loading state for full tree operations
  const [isTreeOperationLoading, setIsTreeOperationLoading] = useState(false);
  
  // Store expanded state to preserve it during updates
  const [preservedExpandedNodes, setPreservedExpandedNodes] = useState<Set<number>>(new Set());

  const qc = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper functions to manage loading states
  const addLoadingState = useCallback((type: keyof typeof loadingStates, nodeId: number) => {
    setLoadingStates(prev => ({
      ...prev,
      [type]: new Set([...prev[type], nodeId])
    }));
  }, []);

  const removeLoadingState = useCallback((type: keyof typeof loadingStates, nodeId: number) => {
    setLoadingStates(prev => ({
      ...prev,
      [type]: new Set([...prev[type]].filter(id => id !== nodeId))
    }));
  }, []);

  // Simple drag handlers - no complex state management
  const handleDragStart = useCallback((nodeId: number, dragData: any) => {
    setDraggedNodeId(nodeId);
    console.log('🚀 Drag started for node:', nodeId);
  }, []);

  const handleDragEnd = useCallback(() => {
    console.log('🏁 Drag ended');
    setDraggedNodeId(null);
  }, []);

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
      
      // Restore expanded state if preserved, otherwise auto-expand project node
      if (preservedExpandedNodes.size > 0) {
        setExpandedNodes(preservedExpandedNodes);
      } else {
        setExpandedNodes(new Set([project.id]));
      }
    }
  }, [project, treeData, preservedExpandedNodes]);

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

  // Simplified mutations - focus on core functionality
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
    onMutate: async ({ parentId }) => {
      const targetParentId = parentId || projectId;
      addLoadingState('adding', targetParentId);
      setIsTreeOperationLoading(true);
      setDraggedNodeId(null); // Clear any drag state
      setPreservedExpandedNodes(new Set(expandedNodes));
    },
    onSuccess: () => {
      refetchTree().then(() => {
        setIsTreeOperationLoading(false);
        setLoadingStates({
          updating: new Set(),
          deleting: new Set(),
          adding: new Set(),
          moving: new Set(),
        });
      });
    },
    onError: (error) => {
      setIsTreeOperationLoading(false);
      setLoadingStates({
        updating: new Set(),
        deleting: new Set(),
        adding: new Set(),
        moving: new Set(),
      });
      console.error('Failed to add node:', error);
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
    onMutate: async ({ nodeId }) => {
      addLoadingState('updating', nodeId);
      setIsTreeOperationLoading(true);
      setDraggedNodeId(null);
      setPreservedExpandedNodes(new Set(expandedNodes));
    },
    onSuccess: () => {
      refetchTree().then(() => {
        setIsTreeOperationLoading(false);
        setLoadingStates({
          updating: new Set(),
          deleting: new Set(),
          adding: new Set(),
          moving: new Set(),
        });
      });
    },
    onError: (error) => {
      setIsTreeOperationLoading(false);
      setLoadingStates({
        updating: new Set(),
        deleting: new Set(),
        adding: new Set(),
        moving: new Set(),
      });
      console.error('Failed to update node:', error);
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
    onMutate: async (nodeId) => {
      addLoadingState('deleting', nodeId);
      setIsTreeOperationLoading(true);
      setDraggedNodeId(null);
      setPreservedExpandedNodes(new Set(expandedNodes));
    },
    onSuccess: () => {
      refetchTree().then(() => {
        setIsTreeOperationLoading(false);
        setLoadingStates({
          updating: new Set(),
          deleting: new Set(),
          adding: new Set(),
          moving: new Set(),
        });
      });
      setSelectedNodeId(null);
    },
    onError: (error) => {
      setIsTreeOperationLoading(false);
      setLoadingStates({
        updating: new Set(),
        deleting: new Set(),
        adding: new Set(),
        moving: new Set(),
      });
      console.error('Failed to delete node:', error);
    },
  });

  // Simplified move mutation - just execute and refresh
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
    onMutate: async ({ nodeId, targetId }) => {
      addLoadingState('moving', nodeId);
      addLoadingState('moving', targetId);
      setIsTreeOperationLoading(true);
      setDraggedNodeId(null); // Clear drag state immediately
      setPreservedExpandedNodes(new Set(expandedNodes));
    },
    onSuccess: () => {
      refetchTree().then(() => {
        setIsTreeOperationLoading(false);
        setLoadingStates({
          updating: new Set(),
          deleting: new Set(),
          adding: new Set(),
          moving: new Set(),
        });
      });
    },
    onError: (error) => {
      setIsTreeOperationLoading(false);
      setLoadingStates({
        updating: new Set(),
        deleting: new Set(),
        adding: new Set(),
        moving: new Set(),
      });
      console.error('Failed to move node:', error);
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

  // Simple move handler - just execute the move
  const handleMoveNode = useCallback((nodeId: number, targetId: number, position: any) => {
    console.log('📤 Move operation:', { nodeId, targetId, position });
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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Simple selection handler
  const handleSelect = useCallback((nodeId: number) => {
    setSelectedNodeId(prev => {
      if (prev === nodeId || nodeId === -1) {
        return null;
      }
      return nodeId;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            if (!sidebarCollapsed) {
              searchInputRef.current?.focus();
            }
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case 'b':
            e.preventDefault();
            toggleSidebar();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleExport, toggleSidebar, sidebarCollapsed]);

  // Loading state
  if (isProjectLoading || isTreeLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Collapsible Left Sidebar */}
      <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-0' : 'w-80'
      } ${sidebarCollapsed ? 'overflow-hidden' : 'overflow-visible'}`}>
        <div className={`${sidebarCollapsed ? 'hidden' : 'block'} h-full flex flex-col`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
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
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
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
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
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

          {/* Help Section */}
          <div className="p-4 text-xs text-gray-500 flex-shrink-0" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            <div className="space-y-1">
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+B</kbd> Toggle sidebar</div>
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+F</kbd> Search</div>
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+E</kbd> Export</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="relative">
        <button
          onClick={toggleSidebar}
          className={`absolute top-4 z-10 p-2 bg-white border border-gray-200 rounded-r-lg shadow-sm hover:bg-gray-50 transition-all duration-200 ${
            sidebarCollapsed ? 'left-0' : '-left-10'
          }`}
          title={sidebarCollapsed ? 'Open sidebar (Ctrl+B)' : 'Close sidebar (Ctrl+B)'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Main Content - Full width when sidebar collapsed */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Optional Top Bar for when sidebar is collapsed */}
        {sidebarCollapsed && (
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-800" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                {project.name}
              </h1>
              <span className={`px-2 py-1 text-xs rounded-full ${
                project.status === 'active' ? 'bg-green-100 text-green-800' :
                project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </Link>
            </div>
          </div>
        )}

        {/* Scrollable Tree Container */}
        <div className="flex-1 relative min-h-0" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
          {/* Simple Loading Bar */}
          {isTreeOperationLoading && (
            <div className="absolute top-0 left-0 right-0 z-50">
              <BarLoader
                color="#3b82f6"
                width="100%"
                height={4}
                loading={isTreeOperationLoading}
              />
            </div>
          )}
          
          <ScrollArea className={`h-full ${isTreeOperationLoading ? 'pointer-events-none opacity-60' : ''}`}>
            <div className="p-6">
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
                    onSelect={handleSelect}
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
                    loadingStates={loadingStates}
                    isTreeDisabled={isTreeOperationLoading}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default TreeView;