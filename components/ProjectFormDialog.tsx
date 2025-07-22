'use client';

import { Controller, useForm } from 'react-hook-form';
import React from 'react';

import {
  Dialog, DialogContent, DialogTitle, DialogFooter, DialogHeader, DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Project, PROJECT_TYPES, STATUSES, PRIORITIES } from '../lib/types';
import DatePicker from '@/components/DatePicker';

type ProjectFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<Project>;
  onClose: () => void;
  onSubmit: (values: Partial<Project>) => void;
  isSubmitting?: boolean;
};

export function ProjectFormDialog({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
  isSubmitting,
}: ProjectFormDialogProps) {
  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors }, trigger } = useForm<Partial<Project>>({
    mode: 'all',
    reValidateMode: 'onChange',
    defaultValues: initialData || {
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

  // Update form when initialData changes (for edit mode)
  React.useEffect(() => {
    reset(initialData || {});
  }, [initialData, reset]);

  const formValues = watch();
  const [activeTab, setActiveTab] = React.useState('basic');

  // Tab validation helpers
  const isBasicTabComplete = () =>
    !!(formValues.name && formValues.description && formValues.projectType && formValues.status);
  const isTimelineTabComplete = () =>
    !!(formValues.plannedStartDate && formValues.mustFinishBy);
  const isFinancialTabComplete = () =>
    !!(formValues.budget && formValues.awardedValue);
  const isManagementTabComplete = () =>
    !!(formValues.clientName && formValues.projectManager);

  const hasBasicTabErrors = () =>
    !!(errors.name || errors.description || errors.projectType || errors.status || errors.priority);
  const hasTimelineTabErrors = () =>
    !!(errors.plannedStartDate || errors.mustFinishBy || errors.actualFinishDate);
  const hasFinancialTabErrors = () =>
    !!(errors.budget || errors.awardedValue);
  const hasManagementTabErrors = () =>
    !!(errors.clientName || errors.projectManager || errors.poNumber || errors.mocNo || errors.serviceOrderNo);

  const getTabStatusIcon = (isComplete: boolean, hasErrors: boolean) => {
    if (hasErrors) return <XCircle className="w-4 h-4 ml-1 text-red-500" />;
    if (isComplete) return <CheckCircle className="w-4 h-4 ml-1 text-green-500" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: '650px', width: '100%' }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Project' : 'Edit Project'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Use Ctrl+1-4 or Alt+Arrow keys to navigate between tabs
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit(values))}
          className="space-y-0"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    rules={{ required: "Planned start date is required" }}
                    render={({ field, fieldState }) => (
                      <DatePicker
                        label=""
                        required
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
                    render={({ field, fieldState }) => (
                      <DatePicker
                        label=""
                        required
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  {mode === 'create' ? (
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
  );
}
