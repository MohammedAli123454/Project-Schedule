import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { projects } from '@/db/schema';

export async function GET() {
  try {
    const allProjects = await db.select().from(projects).orderBy(projects.createdAt);
    return NextResponse.json(allProjects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        status: 'active',
      })
      .returning();

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}