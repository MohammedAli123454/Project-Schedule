'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  FileText,
  Target,
  Calendar as CalendarIcon,
  ExternalLink,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  Building,
  Flag,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from '@/components/DatePicker';

export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'planned' | 'active' | 'completed' | 'on-hold';
  createdAt: string;
  updatedAt: string;
  plannedStartDate: string;
  mustFinishBy: string;
  projectManager: string;
  poNumber?: string;
  mocNo?: string;
  serviceOrderNo?: string;
  projectType: 'MOC' | 'Project' | 'Turn Around' | 'EPC';
  clientName: string;
  priority?: 'High' | 'Medium' | 'Low';
  budget: number;
  actualFinishDate?: string;
  awardedValue: number;
}

const PROJECT_TYPES = ['MOC', 'Project', 'Turn Around', 'EPC'];
const STATUSES = ['planned', 'active', 'completed', 'on-hold'];
const PRIORITIES = ['High', 'Medium', 'Low'];

export default function ProjectsTablePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  const queryClient = useQueryClient();

  // Initialize form with proper default values
  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors }, trigger, getValues } = useForm<Project>({
    mode: 'all', // Changed to 'all' for aggressive validation
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      projectType: '' as any,
      status: '' as any,
      priority: '' as any,
      plannedStartDate: '',
      mustFinishBy: '',
      actualFinishDate: '',
      budget: 0,
      awardedValue: 0,
      clientName: '',
      projectManager: '',
      poNumber: '',
      mocNo: '',
      serviceOrderNo: ''
    }
  });

  // Watch all form values for progress indicators
  const formValues = watch();

  // Check if each tab's required fields are complete
  const isBasicTabComplete = () => {
    return !!(formValues.name && formValues.description && formValues.projectType && formValues.status);
  };

  const isTimelineTabComplete = () => {
    return !!(formValues.plannedStartDate && formValues.mustFinishBy);
  };

  const isFinancialTabComplete = () => {
    return !!(formValues.budget && formValues.awardedValue);
  };

  const isManagementTabComplete = () => {
    return !!(formValues.clientName && formValues.projectManager);
  };

  // Check if tabs have errors
  const hasBasicTabErrors = () => {
    return !!(errors.name || errors.description || errors.projectType || errors.status || errors.priority);
  };

  const hasTimelineTabErrors = () => {
    return !!(errors.plannedStartDate || errors.mustFinishBy || errors.actualFinishDate);
  };

  const hasFinancialTabErrors = () => {
    return !!(errors.budget || errors.awardedValue);
  };

  const hasManagementTabErrors = () => {
    return !!(errors.clientName || errors.projectManager || errors.poNumber || errors.mocNo || errors.serviceOrderNo);
  };

  // Get tab status icon
  const getTabStatusIcon = (isComplete: boolean, hasErrors: boolean) => {
    if (hasErrors) {
      return <XCircle className="w-4 h-4 ml-1 text-red-500" />;
    }
    if (isComplete) {
      return <CheckCircle className="w-4 h-4 ml-1 text-green-500" />;
    }
    return null;
  };

  // Keyboard navigation for tabs
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only work when modal is open
      if (!showCreateModal && !showEditModal) return;

      // Ctrl/Cmd + 1-4 to switch tabs
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const tabs = ['basic', 'timeline', 'financial', 'management'];
        setActiveTab(tabs[parseInt(e.key) - 1]);
      }

      // Alt + Arrow keys for tab navigation
      if (e.altKey) {
        const tabs = ['basic', 'timeline', 'financial', 'management'];
        const currentIndex = tabs.indexOf(activeTab);

        if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
          e.preventDefault();
          setActiveTab(tabs[currentIndex + 1]);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          setActiveTab(tabs[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showCreateModal, showEditModal, activeTab]);

  // Fetch projects
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Create project mutation
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
      setShowCreateModal(false);
      reset();
    },
  });

  // Update project mutation
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
      setShowEditModal(false);
      setSelectedProject(null);
      reset();
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowDeleteModal(false);
      setSelectedProject(null);
    },
  });

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectManager?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async (data: Partial<Project>) => {
    // Validate all fields before submission
    const isValid = await trigger();
    if (isValid) {
      createProjectMutation.mutate(data);
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    // Reset form with project data
    reset({
      ...project,
      plannedStartDate: project.plannedStartDate || '',
      mustFinishBy: project.mustFinishBy || '',
      actualFinishDate: project.actualFinishDate || ''
    });
    setActiveTab('basic'); // Reset to first tab
    setShowEditModal(true);
  };

  const handleUpdateProject = async (data: Partial<Project>) => {
    // Validate all fields before submission
    const isValid = await trigger();
    if (isValid && selectedProject) {
      updateProjectMutation.mutate({ ...data, id: selectedProject.id });
    }
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedProject) {
      deleteProjectMutation.mutate(selectedProject.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'on-hold': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

    // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
              onClick={() => {
                reset({
                  name: '',
                  description: '',
                  projectType: '' as any,
                  status: '' as any,
                  priority: '' as any,
                  plannedStartDate: '',
                  mustFinishBy: '',
                  actualFinishDate: '',
                  budget: 0,
                  awardedValue: 0,
                  clientName: '',
                  projectManager: '',
                  poNumber: '',
                  mocNo: '',
                  serviceOrderNo: ''
                });
                setActiveTab('basic'); // Reset to first tab
                setShowCreateModal(true);
              }}
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
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search projects, clients, managers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
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
                <Button
                  onClick={() => {
                    setActiveTab('basic'); // Reset to first tab
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 mx-auto"
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
                    <TableRow
                      key={project.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors group"
                      onClick={() => window.open(`/projects/${project.id}`, '_blank')}
                    >
                      <TableCell className="py-4 w-16 text-sm">
                        {index + 1}
                      </TableCell>

                      <TableCell className="py-4 w-48">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                            {truncateText(project.name, 25)}
                          </span>
                          <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>

                      <TableCell className="py-4 w-32">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {project.projectType}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 w-32">
                        <Badge className={`${getStatusColor(project.status)} text-xs`}>
                          {project.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-4 w-24">
                        {project.priority ? (
                          <Badge variant="outline" className={`${getPriorityColor(project.priority)} text-xs`}>
                            {project.priority}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>

                      <TableCell className="py-4 w-40 text-sm">
                        {truncateText(project.clientName, 20)}
                      </TableCell>

                      <TableCell className="py-4 w-40 text-sm">
                        {truncateText(project.projectManager, 20)}
                      </TableCell>

                      <TableCell className="py-4 w-32 text-sm">
                        {formatCurrency(project.budget)}
                      </TableCell>

                      <TableCell className="py-4 w-32 text-sm">
                        {formatCurrency(project.awardedValue)}
                      </TableCell>

                      <TableCell className="py-4 w-32 text-sm">
                        {formatDate(project.plannedStartDate)}
                      </TableCell>

                      <TableCell className="py-4 w-32 text-sm">
                        {formatDate(project.mustFinishBy)}
                      </TableCell>

                      <TableCell className="py-4 w-32 text-sm">
                        {truncateText(project.poNumber || '', 15)}
                      </TableCell>

                      <TableCell className="py-4 w-24">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProject(project);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>


      {/* Create/Edit Project Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={() => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedProject(null);
        setActiveTab('basic'); // Reset to first tab
        reset();
      }}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          style={{ maxWidth: '650px', width: '100%' }}
        >
          <DialogHeader>
            <DialogTitle>
              {showCreateModal ? 'Create New Project' : 'Edit Project'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Use Ctrl+1-4 or Alt+Arrow keys to navigate between tabs
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(
              showCreateModal ? handleCreateProject : handleUpdateProject,
              (errors) => {
                console.log('Validation errors:', errors);
                console.log('Current form values:', watch());

                // Switch to the tab containing the first error
                if (errors.name || errors.description || errors.projectType || errors.status) {
                  setActiveTab('basic');
                } else if (errors.plannedStartDate || errors.mustFinishBy) {
                  setActiveTab('timeline');
                } else if (errors.budget || errors.awardedValue) {
                  setActiveTab('financial');
                } else if (errors.clientName || errors.projectManager) {
                  setActiveTab('management');
                }
              }
            )}
            className="space-y-0"
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                // Trigger validation for date fields when switching to timeline tab
                if (value === 'timeline') {
                  setTimeout(() => {
                    trigger(['plannedStartDate', 'mustFinishBy']);
                  }, 100);
                }
              }}
              className="w-full"
            >
              <TabsList className="mb-4 w-full grid grid-cols-4">
                <TabsTrigger value="basic" className="flex items-center justify-center">
                  Basic Info
                  {getTabStatusIcon(isBasicTabComplete(), hasBasicTabErrors())}
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center justify-center">
                  Timeline
                  {getTabStatusIcon(isTimelineTabComplete(), hasTimelineTabErrors())}
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex items-center justify-center">
                  Financial
                  {getTabStatusIcon(isFinancialTabComplete(), hasFinancialTabErrors())}
                </TabsTrigger>
                <TabsTrigger value="management" className="flex items-center justify-center">
                  Management
                  {getTabStatusIcon(isManagementTabComplete(), hasManagementTabErrors())}
                </TabsTrigger>
              </TabsList>

              {/* --- Basic Information Tab --- */}
              <TabsContent value="basic" className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <Label htmlFor="name" className="w-40 text-right">Project Name *</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="name"
                      {...register('name', { required: 'Project name is required' })}
                      placeholder="Enter project name"
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="description" className="w-40 text-right">Description *</Label>
                  <div className="flex-1 min-w-0">
                    <Textarea
                      id="description"
                      {...register('description', { required: 'Description is required' })}
                      placeholder="Enter project description"
                    />
                    {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Project Type *</Label>
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name="projectType"
                      rules={{ required: "Project type is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={value => field.onChange(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select project type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.projectType && (
                      <p className="text-sm text-red-600 mt-1">{errors.projectType.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Status *</Label>
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name="status"
                      rules={{ required: "Status is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={value => field.onChange(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(status => (
                              <SelectItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.status && (
                      <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
                    )}

                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Priority</Label>
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name="priority"
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={value => field.onChange(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map(priority => (
                              <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* --- Timeline Tab --- */}
              <TabsContent value="timeline" className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Planned Start Date *</Label>
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name="plannedStartDate"
                      rules={{
                        required: "Planned start date is required",
                        validate: (value) => {
                          if (!value || value === '') {
                            return "Planned start date is required";
                          }
                          return true;
                        }
                      }}
                      render={({ field, fieldState }) => {
                        return (
                          <DatePicker
                            label=""
                            required
                            date={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              const newValue = date ? date.toISOString().split('T')[0] : '';
                              field.onChange(newValue);
                              field.onBlur();
                              setTimeout(() => trigger('plannedStartDate'), 0);
                            }}
                            error={fieldState.error?.message}
                          />
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Must Finish By *</Label>
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name="mustFinishBy"
                      rules={{
                        required: "Must finish by date is required",
                        validate: (value) => {
                          if (!value || value === '') {
                            return "Must finish by date is required";
                          }

                          const startDate = watch('plannedStartDate');
                          if (startDate && new Date(value) < new Date(startDate)) {
                            return "Must finish date should be after the planned start date";
                          }
                          return true;
                        }
                      }}
                      render={({ field, fieldState }) => {
                        return (
                          <DatePicker
                            label=""
                            required
                            date={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              const newValue = date ? date.toISOString().split('T')[0] : '';
                              field.onChange(newValue);
                              field.onBlur();
                              setTimeout(() => trigger('mustFinishBy'), 0);
                            }}
                            error={fieldState.error?.message}
                          />
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Actual Finish Date</Label>
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name="actualFinishDate"
                      render={({ field, fieldState }) => (
                        <DatePicker
                          label=""
                          date={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => {
                            const newValue = date ? date.toISOString().split('T')[0] : '';
                            field.onChange(newValue);
                            field.onBlur();
                          }}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* --- Financial Tab --- */}
              <TabsContent value="financial" className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <Label htmlFor="budget" className="w-40 text-right">Budget ($) *</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      {...register('budget', {
                        required: 'Budget is required',
                        valueAsNumber: true,
                        min: { value: 0, message: 'Budget must be positive' }
                      })}
                      placeholder="0.00"
                    />
                    {errors.budget && <p className="text-sm text-red-600 mt-1">{errors.budget.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="awardedValue" className="w-40 text-right">Awarded Value ($) *</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="awardedValue"
                      type="number"
                      step="0.01"
                      {...register('awardedValue', {
                        required: 'Awarded value is required',
                        valueAsNumber: true,
                        min: { value: 0, message: 'Awarded value must be positive' }
                      })}
                      placeholder="0.00"
                    />
                    {errors.awardedValue && <p className="text-sm text-red-600 mt-1">{errors.awardedValue.message}</p>}
                  </div>
                </div>
              </TabsContent>

              {/* --- Management Tab --- */}
              <TabsContent value="management" className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <Label htmlFor="clientName" className="w-40 text-right">Client Name *</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="clientName"
                      {...register('clientName', { required: 'Client name is required' })}
                      placeholder="Enter client name"
                    />
                    {errors.clientName && <p className="text-sm text-red-600 mt-1">{errors.clientName.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="projectManager" className="w-40 text-right">Project Manager *</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="projectManager"
                      {...register('projectManager', { required: 'Project manager is required' })}
                      placeholder="Enter project manager name"
                    />
                    {errors.projectManager && <p className="text-sm text-red-600 mt-1">{errors.projectManager.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="poNumber" className="w-40 text-right">PO Number</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="poNumber"
                      {...register('poNumber')}
                      placeholder="Enter PO number"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="mocNo" className="w-40 text-right">MOC No</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="mocNo"
                      {...register('mocNo')}
                      placeholder="Enter MOC No"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="serviceOrderNo" className="w-40 text-right">Service Order No</Label>
                  <div className="flex-1 min-w-0">
                    <Input
                      id="serviceOrderNo"
                      {...register('serviceOrderNo')}
                      placeholder="Enter Service Order No"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="pt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedProject(null);
                  setActiveTab('basic'); // Reset to first tab
                  reset();
                }}
                disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
              >
                {(createProjectMutation.isPending || updateProjectMutation.isPending) ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {showCreateModal ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    {showCreateModal ? (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Update Project
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the project "{selectedProject?.name}"?
              This action cannot be undone and will permanently remove all associated data.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}