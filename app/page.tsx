'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { Project, PROJECT_TYPES, STATUSES, PRIORITIES } from '../lib/types';
import { ProjectTableRow } from '@/components/ProjectTableRow';
import { DeleteProjectDialog } from '@/components/DeleteProjectDialog';
import { ProjectFormDialog } from '@/components/ProjectFormDialog';

export default function ProjectsTablePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formInitialData, setFormInitialData] = useState<Partial<Project> | undefined>(undefined);

  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowFormModal(false);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Project> & { id: number }) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowFormModal(false);
      setSelectedProject(null);
    },
  });

  // Filter logic
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectManager?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleCreate = () => {
    setFormMode('create');
    setFormInitialData(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (project: Project) => {
    setFormMode('edit');
    setFormInitialData(project);
    setShowFormModal(true);
    setSelectedProject(project);
  };

  const handleFormSubmit = (values: Partial<Project>) => {
    if (formMode === 'create') {
      createProjectMutation.mutate(values);
    } else if (formMode === 'edit' && selectedProject) {
      updateProjectMutation.mutate({ ...values, id: selectedProject.id });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Target className="w-16 h-16 mx-auto mb-2" />
            <p className="text-lg font-medium">Failed to load projects</p>
          </div>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
              <p className="text-gray-600 mt-1">Manage your Work Breakdown Structure projects</p>
            </div>
            <Button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-full mx-auto px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search projects, clients, managers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="max-w-full mx-auto px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? 'Try adjusting your search terms or filters'
                  : 'Create your first project to get started with WBS planning'
                }
              </p>
              {!searchQuery && (
                <Button onClick={handleCreate} className="flex items-center gap-2 mx-auto">
                  <Plus className="w-5 h-5" />
                  Create First Project
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold w-16">Sr.No</TableHead>
                    <TableHead className="font-semibold w-48">Project Name</TableHead>
                    <TableHead className="font-semibold w-32">Type</TableHead>
                    <TableHead className="font-semibold w-32">Status</TableHead>
                    <TableHead className="font-semibold w-24">Priority</TableHead>
                    <TableHead className="font-semibold w-40">Client</TableHead>
                    <TableHead className="font-semibold w-40">Project Manager</TableHead>
                    <TableHead className="font-semibold w-32">Budget</TableHead>
                    <TableHead className="font-semibold w-32">Awarded Value</TableHead>
                    <TableHead className="font-semibold w-32">Start Date</TableHead>
                    <TableHead className="font-semibold w-32">Due Date</TableHead>
                    <TableHead className="font-semibold w-32">PO Number</TableHead>
                    <TableHead className="font-semibold text-center w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project, index) => (
                    <ProjectTableRow
                      key={project.id}
                      project={project}
                      index={index}
                      onEdit={handleEdit}
                      onDelete={(proj) => { setSelectedProject(proj); setShowDeleteModal(true); }}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <ProjectFormDialog
        open={showFormModal}
        mode={formMode}
        initialData={formInitialData}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        isSubmitting={formMode === 'create' ? createProjectMutation.isPending : updateProjectMutation.isPending}
      />

      {/* Delete Modal */}
      <DeleteProjectDialog
        project={selectedProject}
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedProject(null); }}
      />
    </div>
  );
}
