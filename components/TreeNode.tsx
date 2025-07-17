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
    setIsEditing(true);
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

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) return;
    
    const dragData = {
      nodeId: node.id,
      parentId: node.parentId,
      indexInParent: 0,
      level: depth,
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(node.id, dragData);
  };

  const handleDragEnd = () => {
    onDragEnd();
    setIsDragOver(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isDragging) return;
    
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height * 0.25) {
      setIsDragOver('above');
    } else if (y > height * 0.75) {
      setIsDragOver('below');
    } else {
      setIsDragOver('inside');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!nodeRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) return;
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (dragData.nodeId === node.id) return;
      
      const position = {
        type: isDragOver,
        targetId: node.id,
        targetParentId: node.parentId,
        targetIndex: 0,
      };
      
      onMove(dragData.nodeId, node.id, position);
    } catch (error) {
      console.error('Failed to drop node:', error);
    }
    
    setIsDragOver(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(node.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect(node.id);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  const TypeIcon = typeIcons[node.type as keyof typeof typeIcons] || FileText;

  return (
    <div className="relative">
      {/* Drop indicators */}
      {isDragOver === 'above' && (
        <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
      )}
      {isDragOver === 'below' && (
        <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
      )}

      <div
        ref={nodeRef}
        className={`
          relative flex items-center group transition-all duration-200
          ${isSelected ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-50'}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isDragOver === 'inside' ? 'bg-blue-100 ring-2 ring-blue-400 ring-dashed' : ''}
          ${settings.compactView ? 'py-1' : 'py-2'}
          pl-2 pr-4 rounded-lg mx-1 my-0.5 cursor-pointer
        `}
        style={{ 
          marginLeft: `${depth * (settings.compactView ? 16 : 24)}px`,
          fontSize: `${settings.fontSize}px`,
          fontFamily: settings.fontFamily,
        }}
        draggable={!isEditing}
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
            flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200
            ${hasChildren ? 'text-gray-600' : 'text-transparent'}
            ${settings.compactView ? 'mr-1' : 'mr-2'}
          `}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
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

        {/* Type Icon */}
        <TypeIcon className={`w-4 h-4 mr-2 ${settings.colorByType ? typeColors[node.type as keyof typeof typeColors] : 'text-gray-500'}`} />

        {/* Node Content */}
        <div className="flex-1 min-w-0">
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
              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <span className={`
                  truncate font-medium
                  ${depth === 0 ? 'text-lg font-semibold' : 'text-sm'}
                `}>
                  {settings.showWbsCode && node.wbsCode && (
                    <span className="text-gray-400 mr-2 font-mono text-xs">
                      {node.wbsCode}
                    </span>
                  )}
                  {node.name}
                </span>
                
                {settings.showDescription && node.description && (
                  <span className="ml-2 text-xs text-gray-500 truncate">
                    - {node.description}
                  </span>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-gray-400 capitalize">
                  {node.type}
                </span>
                
                {hasChildren && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">
                    {node.children.length}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 flex items-center gap-2 text-red-600"
            onClick={() => {
              if (confirm(`Delete "${node.name}" and all subtasks?`)) {
                onDelete(node.id);
              }
              setContextMenu(null);
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-4">
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNodeComponent;