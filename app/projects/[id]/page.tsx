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
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
     

      {/* Tree View */}
      <TreeView projectId={projectId} />
    </div>
  );
}