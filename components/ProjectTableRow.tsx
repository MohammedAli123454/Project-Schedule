import { Edit2, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Project } from '../lib/types'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor, truncateText } from '../lib/project-utils'

interface ProjectTableRowProps {
  project: Project;
  index: number;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectTableRow({ project, index, onEdit, onDelete }: ProjectTableRowProps) {
  return (
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
              onEdit(project);
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
              onDelete(project);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}