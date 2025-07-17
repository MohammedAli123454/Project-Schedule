import Link from 'next/link';

async function getProjects() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">WBS Projects</h1>
          <p className="text-muted-foreground">Manage your Work Breakdown Structure projects</p>
        </div>
        <button className="btn btn-primary">
          + New Project
        </button>
      </div>

      <div className="grid gap-4">
        {projects.map((project: any) => (
          <Link 
            key={project.id} 
            href={`/projects/${project.id}`}
            className="block p-6 border rounded-lg hover:bg-accent transition-colors bg-card"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{project.name}</h3>
                {project.description && (
                  <p className="text-muted-foreground mt-1">{project.description}</p>
                )}
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                {project.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span>ID: {project.id}</span>
              <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}