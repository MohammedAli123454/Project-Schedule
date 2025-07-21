// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/db/drizzle';
import { projects } from '@/db/schema';
import { desc } from "drizzle-orm";

// GET /api/projects - Fetch all projects
export async function GET(req: NextRequest) {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt)); // Order by creation date, newest first

    return NextResponse.json(allProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" }, 
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Add timestamps
    const now = new Date();
    
    // Destructure and validate required fields
    const {
      name,
      description,
      status,
      plannedStartDate,
      mustFinishBy,
      projectManager,
      poNumber,
      mocNo,
      serviceOrderNo,
      projectType,
      clientName,
      priority,
      budget,
      actualFinishDate,
      awardedValue,
    } = data;

    // Validate required fields
    if (!name || !description || !status || !plannedStartDate || 
        !mustFinishBy || !projectManager || !projectType || 
        !clientName || budget == null || awardedValue == null) {
      return NextResponse.json(
        { error: "Missing required fields" }, 
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses = ['planned', 'active', 'completed', 'on-hold'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" }, 
        { status: 400 }
      );
    }

    // Validate project type enum
    const validProjectTypes = ['MOC', 'Project', 'Turn Around', 'EPC'];
    if (!validProjectTypes.includes(projectType)) {
      return NextResponse.json(
        { error: "Invalid project type" }, 
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['High', 'Medium', 'Low'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: "Invalid priority value" }, 
          { status: 400 }
        );
      }
    }

    // Validate date logic
    if (new Date(mustFinishBy) < new Date(plannedStartDate)) {
      return NextResponse.json(
        { error: "Must finish date cannot be before planned start date" }, 
        { status: 400 }
      );
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name,
        description,
        status,
        createdAt: now,
        updatedAt: now,
        plannedStartDate,
        mustFinishBy,
        projectManager,
        poNumber: poNumber || null,
        mocNo: mocNo || null,
        serviceOrderNo: serviceOrderNo || null,
        projectType,
        clientName,
        priority: priority || null,
        budget: budget.toString(), // Convert to string for decimal type
        actualFinishDate: actualFinishDate || null,
        awardedValue: awardedValue.toString(), // Convert to string for decimal type
      })
      .returning();

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" }, 
      { status: 500 }
    );
  }
}
