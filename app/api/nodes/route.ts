import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';

async function generateWbsCode(nodeId: number): Promise<string | null> {
  try {
    const node = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.id, nodeId))
      .limit(1);

    if (node.length === 0) return null;

    const codes: string[] = [];
    let currentNode: { [x: string]: any } | null = node[0];

    // Build path from root to current node
    const path = [];
    while (currentNode) {
      path.unshift(currentNode);
      if (currentNode.parentId) {
        const parent = await db
          .select()
          .from(wbsNodes)
          .where(eq(wbsNodes.id, currentNode.parentId))
          .limit(1);
        currentNode = parent[0] || null;
      } else {
        currentNode = null;
      }
    }

    // Generate codes for each level
    for (let i = 0; i < path.length; i++) {
      const levelNode = path[i];
      const parentId = levelNode.parentId;

      const siblings = await db
        .select()
        .from(wbsNodes)
        .where(
          parentId
            ? eq(wbsNodes.parentId, parentId)
            : isNull(wbsNodes.parentId)
        )
        .orderBy(wbsNodes.orderIdx);

      const index = siblings.findIndex(s => s.id === levelNode.id);
      codes.push((index + 1).toString());
    }

    return codes.join('.');
  } catch (error) {
    console.error('Failed to generate WBS code:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      parentId,
      name,
      description,
      type = 'task',
    } = await request.json();

    if (!projectId || !name?.trim()) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      );
    }

    // Get the next order index for siblings
    const siblings = await db
      .select()
      .from(wbsNodes)
      .where(
        parentId
          ? eq(wbsNodes.parentId, parentId)
          : isNull(wbsNodes.parentId)
      )
      .orderBy(desc(wbsNodes.orderIdx))
      .limit(1);

    const nextOrderIdx = siblings.length > 0 ? siblings[0].orderIdx + 1 : 0;

    // Calculate level
    let level = 0;
    if (parentId) {
      const parent = await db
        .select()
        .from(wbsNodes)
        .where(eq(wbsNodes.id, parentId))
        .limit(1);

      if (parent.length > 0) {
        level = parent[0].level + 1;
      }
    }

    // Create the node (cross-db safe)
    const result = await db
      .insert(wbsNodes)
      .values({
        projectId,
        parentId: parentId || null,
        name: name.trim(),
        description: description?.trim() || null,
        type,
        orderIdx: nextOrderIdx,
        level,
      })
      .returning();

    // Only use [0] for arrays, otherwise look for rows[0]
    let newNode: any = null;
    if (Array.isArray(result)) {
      newNode = result[0];
    } else if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as any).rows)) {
      newNode = (result as any).rows[0];
    }

    if (!newNode) {
      return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
    }

    // Generate WBS code
    const wbsCode = await generateWbsCode(newNode.id);
    if (wbsCode) {
      await db
        .update(wbsNodes)
        .set({ wbsCode })
        .where(eq(wbsNodes.id, newNode.id));
    }

    return NextResponse.json({ ...newNode, wbsCode }, { status: 201 });
  } catch (error) {
    console.error('Failed to create node:', error);
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
  }
}
