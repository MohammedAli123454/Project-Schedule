'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, FileText, Target, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project, STATUSES } from '../lib/types';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <span className="text-xl font-medium text-slate-700">Loading your projects...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-white/20 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Oops! Something went wrong</h3>
          <p className="text-slate-600 mb-8">We couldn't load your projects. Please try again.</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Main Heading */}
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 border-b">
  <div className="max-w-full mx-auto px-6 lg:px-8 py-4">
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold text-white drop-shadow-sm">
        Projects List
      </h1>
      <Button
        onClick={handleCreate}
        className="flex items-center gap-3 bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
      >
        <Plus className="w-5 h-5" />
        New Project
      </Button>
    </div>
  </div>
</div>

      {/* Enhanced Filters with modern design */}
     <div className="max-w-full mx-auto px-6 lg:px-8 py-6">
  <div className="flex flex-col sm:flex-row gap-4">
    <div className="flex-1">
      <Input
        type="text"
        placeholder="Search projects, clients, managers..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
    </div>
    <div className="w-full sm:w-48">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
</div>

      {/* Enhanced Projects Table */}
      <div className="max-w-full mx-auto px-6 lg:px-8 pb-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-slate-600 mb-8 text-lg max-w-md mx-auto">
                {searchQuery
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for'
                  : 'Create your first project to get started with comprehensive WBS planning and management'
                }
              </p>
              {!searchQuery && (
                <Button 
                  onClick={handleCreate} 
                  className="flex items-center gap-3 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Create First Project
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-100 to-slate-200 border-b-2 border-slate-300">
                    <TableHead className="font-bold text-slate-700 w-16 py-4">Sr.No</TableHead>
                    <TableHead className="font-bold text-slate-700 w-48 py-4">Project Name</TableHead>
                    <TableHead className="font-bold text-slate-700 w-32 py-4">Type</TableHead>
                    <TableHead className="font-bold text-slate-700 w-32 py-4">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 w-24 py-4">Priority</TableHead>
                    <TableHead className="font-bold text-slate-700 w-40 py-4">Client</TableHead>
                    <TableHead className="font-bold text-slate-700 w-40 py-4">Project Manager</TableHead>
                    <TableHead className="font-bold text-slate-700 w-32 py-4">Budget</TableHead>
                    <TableHead className="font-bold text-slate-700 w-32 py-4">Awarded Value</TableHead>
                    <TableHead className="font-bold text-slate-700 w-32 py-4">Start Date</TableHead>
                    <TableHead className="font-bold text-slate-700 w-32 py-4">Due Date</TableHead>
                    <TableHead className="font-bold text-slate-700 w-32 py-4">PO Number</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center w-24 py-4">Actions</TableHead>
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