import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import TreeView from '@/components/TreeView';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const projectId = parseInt(id);

  if (isNaN(projectId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Project ID</h1>
          <p className="text-gray-600 mb-6">The project ID provided is not valid.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  // Fetch project data server-side
  let project;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${projectId}`, {
      cache: 'no-store', // Always fetch fresh data
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }
    
    project = await response.json();
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or has been deleted.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Back to Projects"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
                {project?.description && (
                  <p className="text-gray-600 text-sm mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-sm rounded-full ${
                project?.status === 'active' ? 'bg-green-100 text-green-800' :
                project?.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project?.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tree View */}
      <TreeView projectId={projectId} />
    </div>
  );
}