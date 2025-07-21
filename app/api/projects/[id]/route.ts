// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/db/drizzle';
import { projects } from '@/db/schema';
import { eq } from "drizzle-orm";

// GET /api/projects/[id] - Get a single project by ID
export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" }, 
        { status: 400 }
      );
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" }, 
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" }, 
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project by ID
export async function PUT(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" }, 
        { status: 400 }
      );
    }

    const data = await req.json();
    const now = new Date();

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

    // Validate enums if provided
    if (status) {
      const validStatuses = ['planned', 'active', 'completed', 'on-hold'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status value" }, 
          { status: 400 }
        );
      }
    }

    if (projectType) {
      const validProjectTypes = ['MOC', 'Project', 'Turn Around', 'EPC'];
      if (!validProjectTypes.includes(projectType)) {
        return NextResponse.json(
          { error: "Invalid project type" }, 
          { status: 400 }
        );
      }
    }

    if (priority) {
      const validPriorities = ['High', 'Medium', 'Low'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: "Invalid priority value" }, 
          { status: 400 }
        );
      }
    }

    // Validate date logic if both dates are provided
    const startDate = plannedStartDate || data.plannedStartDate;
    const finishDate = mustFinishBy || data.mustFinishBy;
    if (startDate && finishDate && new Date(finishDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "Must finish date cannot be before planned start date" }, 
        { status: 400 }
      );
    }

    // Build update object with only provided fields (using your original, cleaner approach)
    const updateData = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(plannedStartDate !== undefined && { plannedStartDate }),
      ...(mustFinishBy !== undefined && { mustFinishBy }),
      ...(projectManager !== undefined && { projectManager }),
      ...(poNumber !== undefined && { poNumber }),
      ...(mocNo !== undefined && { mocNo }),
      ...(serviceOrderNo !== undefined && { serviceOrderNo }),
      ...(projectType !== undefined && { projectType }),
      ...(clientName !== undefined && { clientName }),
      ...(priority !== undefined && { priority }),
      ...(budget !== undefined && { budget: budget.toString() }),
      ...(actualFinishDate !== undefined && { actualFinishDate }),
      ...(awardedValue !== undefined && { awardedValue: awardedValue.toString() }),
      updatedAt: now,
    };

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Project not found" }, 
        { status: 404 }
      );
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" }, 
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project by ID
export async function DELETE(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" }, 
        { status: 400 }
      );
    }

    const [deletedProject] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (!deletedProject) {
      return NextResponse.json(
        { error: "Project not found" }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Project deleted successfully",
      deletedProject 
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" }, 
      { status: 500 }
    );
  }
}