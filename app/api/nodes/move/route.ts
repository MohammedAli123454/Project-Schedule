import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq, isNull, gte, and } from 'drizzle-orm';

async function generateWbsCode(nodeId: number): Promise<string | null> {
  try {
    const node = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.id, nodeId))
      .limit(1);

    if (node.length === 0) return null;

    const codes: string[] = [];
    let currentNode: { [x: string]: any } | null = node[0]; // <-- fix here!

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

async function updateWbsCodesRecursive(nodeId: number) {
  // Get the node and all its descendants
  const allNodes = await db.select().from(wbsNodes);

  const findDescendants = (parentId: number): number[] => {
    const children = allNodes.filter(n => n.parentId === parentId);
    let descendants = children.map(c => c.id);

    for (const child of children) {
      descendants = descendants.concat(findDescendants(child.id));
    }

    return descendants;
  };

  const nodesToUpdate = [nodeId, ...findDescendants(nodeId)];

  // Update WBS codes for each node
  for (const id of nodesToUpdate) {
    const wbsCode = await generateWbsCode(id);
    if (wbsCode) {
      await db
        .update(wbsNodes)
        .set({ wbsCode })
        .where(eq(wbsNodes.id, id));
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nodeId, targetId, position } = await request.json();

    if (!nodeId || !targetId || !position) {
      return NextResponse.json(
        { error: 'Node ID, target ID, and position are required' },
        { status: 400 }
      );
    }

    // Get the node to move
    const nodeToMove = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.id, nodeId))
      .limit(1);

    if (nodeToMove.length === 0) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Get the target node
    const targetNode = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.id, targetId))
      .limit(1);

    if (targetNode.length === 0) {
      return NextResponse.json({ error: 'Target node not found' }, { status: 404 });
    }

    // Prevent moving node to itself
    if (nodeId === targetId) {
      return NextResponse.json({ error: 'Cannot move node to itself' }, { status: 400 });
    }

    let newParentId: number | null = null;
    let newOrderIdx = 0;
    let newLevel = 0;

    switch (position.type) {
      case 'above':
        newParentId = targetNode[0].parentId;
        newOrderIdx = targetNode[0].orderIdx;
        newLevel = targetNode[0].level;
        break;
      case 'below':
        newParentId = targetNode[0].parentId;
        newOrderIdx = targetNode[0].orderIdx + 1;
        newLevel = targetNode[0].level;
        break;
      case 'inside':
        newParentId = targetId;
        newLevel = targetNode[0].level + 1;

        // Get the last child's order index
        const lastChild = await db
          .select()
          .from(wbsNodes)
          .where(eq(wbsNodes.parentId, targetId))
          .orderBy(wbsNodes.orderIdx)
          .limit(1);

        newOrderIdx = lastChild.length > 0 ? lastChild[0].orderIdx + 1 : 0;
        break;
    }

    // Update order indexes of siblings that come after the insertion point
    if (position.type === 'above' || position.type === 'below') {
      await db
        .update(wbsNodes)
        .set({
          orderIdx: wbsNodes.orderIdx + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            newParentId ? eq(wbsNodes.parentId, newParentId) : isNull(wbsNodes.parentId),
            gte(wbsNodes.orderIdx, newOrderIdx)
          )
        );
    }

    // Move the node (cross-db safe extraction)
    const result = await db
      .update(wbsNodes)
      .set({
        parentId: newParentId,
        orderIdx: newOrderIdx,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(wbsNodes.id, nodeId))
      .returning();

    let movedNode: any = null;
    if (Array.isArray(result)) {
      movedNode = result[0];
    } else if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as any).rows)) {
      movedNode = (result as any).rows[0];
    }

    // Update WBS codes for the moved node and its descendants
    await updateWbsCodesRecursive(nodeId);

    return NextResponse.json({ success: true, movedNode });
  } catch (error) {
    console.error('Failed to move node:', error);
    return NextResponse.json({ error: 'Failed to move node' }, { status: 500 });
  }
}
