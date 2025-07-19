'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Copy,
  FileText,
  Milestone,
  Package,
  Layers,
  Loader2,
} from 'lucide-react';
import { TreeNode, TreeViewSettings } from '@/lib/types';

interface TreeNodeProps {
  node: TreeNode;
  projectId: number;
  depth: number;
  isSelected: boolean;
  draggedNodeId: number | null;
  settings: TreeViewSettings;
  onSelect: (nodeId: number) => void;
  onUpdate: (nodeId: number, updates: Partial<TreeNode>) => void;
  onDelete: (nodeId: number) => void;
  onMove: (nodeId: number, targetId: number, position: any) => void;
  onAddChild: (parentId: number, name: string) => void;
  onCopy: (nodeId: number) => void;
  onCut: (nodeId: number) => void;
  onPaste: (parentId: number) => void;
  clipboard: { type: 'copy' | 'cut'; nodeId: number } | null;
  onDragStart: (nodeId: number, dragData: any) => void;
  onDragEnd: () => void;
  expandedNodes: Set<number>;
  onToggleExpanded: (nodeId: number) => void;
  loadingStates?: {
    updating: Set<number>;
    deleting: Set<number>;
    adding: Set<number>;
    moving: Set<number>;
  };
  isTreeDisabled?: boolean;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  node,
  projectId,
  depth,
  isSelected,
  draggedNodeId,
  settings,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
  onAddChild,
  onCopy,
  onCut,
  onPaste,
  clipboard,
  onDragStart,
  onDragEnd,
  expandedNodes,
  onToggleExpanded,
  loadingStates = {
    updating: new Set(),
    deleting: new Set(),
    adding: new Set(),
    moving: new Set(),
  },
  isTreeDisabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [isDragOver, setIsDragOver] = useState<'above' | 'below' | 'inside' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isDragging = draggedNodeId === node.id;
  const isProjectNode = node.id === projectId;

  // Check loading states
  const isUpdating = loadingStates.updating.has(node.id);
  const isDeleting = loadingStates.deleting.has(node.id);
  const isAdding = loadingStates.adding.has(node.id);
  const isMoving = loadingStates.moving.has(node.id);
  const hasAnyLoading = isUpdating || isDeleting || isAdding || isMoving;

  const typeIcons = {
    task: FileText,
    milestone: Milestone,
    deliverable: Package,
    phase: Layers,
  };

  const typeColors = {
    task: 'text-blue-600',
    milestone: 'text-purple-600',
    deliverable: 'text-green-600',
    phase: 'text-orange-600',
  };

  const handleEdit = () => {
    if (isProjectNode || hasAnyLoading || isTreeDisabled) {
      return;
    }
    setIsEditing(true);
    setContextMenu(null);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== node.name) {
      onUpdate(node.id, { name: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(node.name);
    setIsEditing(false);
  };

  const handleAddChildFromMenu = () => {
    if (hasAnyLoading || isTreeDisabled) return;
    
    const name = prompt('Enter task name:');
    if (name?.trim()) {
      onAddChild(node.id, name.trim());
      if (!isExpanded) {
        onToggleExpanded(node.id);
      }
    }
    setContextMenu(null);
  };

  const handleDeleteFromMenu = () => {
    if (isProjectNode || hasAnyLoading || isTreeDisabled) {
      if (isProjectNode) {
        alert('Cannot delete the project itself');
      }
      return;
    }
    
    if (confirm(`Delete "${node.name}" and all subtasks?`)) {
      onDelete(node.id);
    }
    setContextMenu(null);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing || isProjectNode || hasAnyLoading || isTreeDisabled) {
      e.preventDefault();
      return;
    }
    
    const dragData = {
      nodeId: node.id,
      parentId: node.parentId,
      indexInParent: 0,
      level: depth,
      nodeType: node.type,
      nodeName: node.name
    };
    
    console.log('🚀 Drag start:', dragData);
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add drag image for better visual feedback
    if (nodeRef.current) {
      const dragImage = nodeRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(2deg)';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
    
    onDragStart(node.id, dragData);
  };

  const handleDragEnd = () => {
    console.log('🏁 Drag end');
    onDragEnd();
    setIsDragOver(null);
  };

  // REDESIGNED: Natural drag experience - drop anywhere on a node
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isDragging || hasAnyLoading || isTreeDisabled) return;
    
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Simple and intuitive: most of the node is a valid drop target
    let newPosition: 'above' | 'below' | 'inside' | null = null;
    
    // Very small edge zones for precise control, large center for natural drops
    const edgeSize = Math.min(height * 0.15, 8); // Max 8px edge zones
    
    if (y <= edgeSize) {
      // Tiny top edge for "above"
      newPosition = 'above';
    } else if (y >= height - edgeSize) {
      // Tiny bottom edge for "below"  
      newPosition = 'below';
    } else {
      // Most of the node area - make smart decisions
      if (hasChildren) {
        // Parent nodes: dropping on them means "add as child"
        newPosition = 'inside';
      } else {
        // Leaf nodes: dropping on them means "add as next sibling"
        newPosition = 'below';
      }
    }
    
    if (newPosition !== isDragOver) {
      setIsDragOver(newPosition);
      console.log(`🎯 Drop on ${node.name}: ${newPosition} (y: ${y.toFixed(0)}/${height}, edge: ${edgeSize}px)`);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // More robust drag leave detection
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX;
    const y = e.clientY;
    
    // Check if we're actually leaving the node bounds
    const isOutside = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
    
    if (isOutside) {
      console.log(`🚪 Drag leave ${node.name} (${node.id}): clearing position`);
      setIsDragOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver || hasAnyLoading || isTreeDisabled) return;
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      console.log('🎯 Drop event:', {
        from: `${dragData.nodeName} (${dragData.nodeId})`,
        to: `${node.name} (${node.id})`,
        position: isDragOver,
        draggedParent: dragData.parentId,
        targetParent: node.parentId
      });
      
      // Basic validation
      if (dragData.nodeId === node.id) {
        console.log('❌ Cannot drop node on itself');
        setIsDragOver(null);
        return;
      }
      
      // Prevent dropping a node as child of itself (would create cycle)
      if (isDragOver === 'inside' && dragData.parentId === node.id) {
        console.log('❌ Node is already a child of target');
        setIsDragOver(null);
        return;
      }
      
      // Create position object for API
      const position = {
        type: isDragOver,
        targetId: node.id,
        targetParentId: node.parentId,
        targetIndex: 0,
        draggedNodeParentId: dragData.parentId,
        draggedNodeOrderIdx: dragData.indexInParent || 0
      };
      
      console.log('📤 Sending to API:', {
        nodeId: dragData.nodeId,
        targetId: node.id,
        position
      });
      
      // Execute the move
      onMove(dragData.nodeId, node.id, position);
      
    } catch (error) {
      console.error('❌ Drop failed:', error);
    } finally {
      setIsDragOver(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (hasAnyLoading || isTreeDisabled) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(node.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing || hasAnyLoading || isTreeDisabled) return;
    e.stopPropagation();
    onSelect(node.id);
  };

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      
      if (isSelected && nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        const clickedElement = e.target as Element;
        const isTreeNode = clickedElement.closest('[data-tree-node]');
        if (!isTreeNode) {
          onSelect(-1);
        }
      }
    };

    if (contextMenu || isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu, isSelected, onSelect]);

  const TypeIcon = typeIcons[node.type as keyof typeof typeIcons] || FileText;

  return (
    <div className="relative">
      {/* Drop indicators with better visibility */}
      {isDragOver === 'above' && !isProjectNode && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full z-10 shadow-sm" />
      )}
      {isDragOver === 'below' && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full z-10 shadow-sm" />
      )}

      <div
        ref={nodeRef}
        data-tree-node="true"
        className={`
          relative flex items-center group transition-all duration-200
          ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 shadow-md' : 'hover:bg-gray-50'}
          ${isDragging ? 'opacity-40 scale-98 shadow-lg ring-2 ring-blue-300' : ''}
          ${isDragOver === 'inside' ? 'bg-green-50 ring-2 ring-green-400 shadow-lg scale-102 border-green-300' : ''}
          ${isDragOver === 'below' ? 'bg-blue-50 ring-2 ring-blue-400 shadow-md' : ''}
          ${isDragOver === 'above' ? 'bg-blue-50 ring-2 ring-blue-400 shadow-md' : ''}
          ${isProjectNode ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm' : ''}
          ${hasAnyLoading || isTreeDisabled ? 'opacity-75' : ''}
          ${settings.compactView ? 'py-2' : 'py-3'}
          pl-3 pr-4 rounded-lg mx-1 my-0.5 cursor-pointer
        `}
        style={{ 
          marginLeft: `${depth * (settings.compactView ? 20 : 28)}px`,
          fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: `${Math.max(settings.fontSize, 15)}px`,
          fontWeight: isProjectNode ? '700' : depth === 1 ? '600' : '500',
        }}
        draggable={!isEditing && !isProjectNode && !hasAnyLoading && !isTreeDisabled}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        {/* Expand/Collapse Button */}
        <button
          className={`
            flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors
            ${hasChildren ? 'text-gray-600' : 'text-transparent'}
            ${settings.compactView ? 'mr-2' : 'mr-3'}
            ${hasAnyLoading ? 'pointer-events-none' : ''}
          `}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren && !hasAnyLoading) {
              onToggleExpanded(node.id);
            }
          }}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          )}
        </button>

        {/* Loading Spinner */}
        {hasAnyLoading && (
          <div className="mr-3 flex items-center">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          </div>
        )}

        {/* Type Icon */}
        <TypeIcon className={`w-5 h-5 mr-3 ${
          settings.colorByType ? typeColors[node.type as keyof typeof typeColors] : 'text-gray-500'
        } ${isProjectNode ? 'text-blue-600' : ''} ${hasAnyLoading ? 'opacity-50' : ''}`} />

        {/* Node Content */}
        <div className="flex-1 min-w-0 relative">
          {/* Drop action indicator overlay */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-end pr-4 z-20">
              <div className={`
                px-3 py-1 rounded-full text-xs font-semibold shadow-lg border-2 transition-all duration-200
                ${isDragOver === 'inside' 
                  ? 'bg-green-100 text-green-800 border-green-300' 
                  : 'bg-blue-100 text-blue-800 border-blue-300'
                }
              `}>
                {isDragOver === 'inside' ? '📁 Add as child' : 
                 isDragOver === 'above' ? '⬆️ Add above' : 
                 '⬇️ Add below'}
              </div>
            </div>
          )}
          
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
              onClick={(e) => e.stopPropagation()}
              disabled={hasAnyLoading}
            />
          ) : (
            <div className="flex items-center">
              <span className={`
                truncate 
                ${isProjectNode ? 'text-xl font-bold text-blue-900' : 
                  depth === 1 ? 'text-lg font-semibold text-gray-800' : 
                  'text-base text-gray-700'}
                ${hasAnyLoading ? 'opacity-75' : ''}
              `}
              style={{ 
                fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                letterSpacing: '0.01em',
                lineHeight: '1.4'
              }}>
                {node.name}
              </span>
              
              {settings.showDescription && node.description && (
                <span className={`ml-3 text-sm text-gray-500 truncate ${hasAnyLoading ? 'opacity-50' : ''}`}
                      style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                  - {node.description}
                </span>
              )}

              {/* Loading status indicators */}
              {hasAnyLoading && (
                <span className="ml-3 text-xs text-blue-600 font-medium">
                  {isUpdating && 'Updating...'}
                  {isDeleting && 'Deleting...'}
                  {isAdding && 'Adding...'}
                  {isMoving && 'Moving...'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && !hasAnyLoading && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700"
            onClick={handleAddChildFromMenu}
          >
            <Plus className="w-4 h-4" />
            {isProjectNode ? 'Add Task' : 'Add Child'}
          </button>
          
          {!isProjectNode && (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                onClick={handleEdit}
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              
              <div className="border-t border-gray-200 my-1"></div>
              
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                onClick={() => {
                  onCopy(node.id);
                  setContextMenu(null);
                }}
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              
              {clipboard && (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                  onClick={() => {
                    onPaste(node.id);
                    setContextMenu(null);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Paste Here
                </button>
              )}
              
              <div className="border-t border-gray-200 my-1"></div>
              
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 flex items-center gap-2 text-red-600"
                onClick={handleDeleteFromMenu}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
          
          {/* Project-specific menu items */}
          {isProjectNode && clipboard && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                onClick={() => {
                  onPaste(node.id);
                  setContextMenu(null);
                }}
              >
                <Plus className="w-4 h-4" />
                Paste Here
              </button>
            </>
          )}
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              projectId={projectId}
              depth={depth + 1}
              isSelected={isSelected}
              draggedNodeId={draggedNodeId}
              settings={settings}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
              onAddChild={onAddChild}
              onCopy={onCopy}
              onCut={onCut}
              onPaste={onPaste}
              clipboard={clipboard}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              expandedNodes={expandedNodes}
              onToggleExpanded={onToggleExpanded}
              loadingStates={loadingStates}
              isTreeDisabled={isTreeDisabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNodeComponent;