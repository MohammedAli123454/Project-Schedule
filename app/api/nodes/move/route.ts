import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

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

async function updateWbsCodesRecursive(nodeId: number) {
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

async function reorderNodes(parentId: number | null) {
  // Get all siblings and reorder them with consecutive indices
  const siblings = await db
    .select()
    .from(wbsNodes)
    .where(parentId ? eq(wbsNodes.parentId, parentId) : isNull(wbsNodes.parentId))
    .orderBy(wbsNodes.orderIdx);

  // Update with consecutive order indices
  for (let i = 0; i < siblings.length; i++) {
    await db
      .update(wbsNodes)
      .set({
        orderIdx: i,
        updatedAt: new Date(),
      })
      .where(eq(wbsNodes.id, siblings[i].id));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nodeId, targetId, position } = await request.json();

    console.log('=== MOVE REQUEST ===');
    console.log('Node ID:', nodeId);
    console.log('Target ID:', targetId);
    console.log('Position:', position);

    // Validation
    if (!nodeId || !targetId || !position) {
      return NextResponse.json(
        { error: 'Node ID, target ID, and position are required' },
        { status: 400 }
      );
    }

    if (nodeId === targetId) {
      return NextResponse.json({ error: 'Cannot move node to itself' }, { status: 400 });
    }

    // Get nodes
    const [nodeToMove] = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.id, nodeId))
      .limit(1);

    const [targetNode] = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.id, targetId))
      .limit(1);

    if (!nodeToMove) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    if (!targetNode) {
      return NextResponse.json({ error: 'Target node not found' }, { status: 404 });
    }

    console.log('Current node:', { id: nodeToMove.id, parentId: nodeToMove.parentId, orderIdx: nodeToMove.orderIdx });
    console.log('Target node:', { id: targetNode.id, parentId: targetNode.parentId, orderIdx: targetNode.orderIdx });

    // Prevent dropping onto direct parent when position is 'inside'
    if (position.type === 'inside' && nodeToMove.parentId === targetId) {
      console.log('Prevented: Node is already a child of target');
      return NextResponse.json({ 
        error: 'Node is already a child of the target node',
        success: false 
      }, { status: 400 });
    }

    // Calculate new position
    let newParentId: number | null = null;
    let newLevel = 0;
    let insertPosition = 0;

    switch (position.type) {
      case 'above':
        newParentId = targetNode.parentId;
        newLevel = targetNode.level;
        insertPosition = targetNode.orderIdx;
        break;
        
      case 'below':
        newParentId = targetNode.parentId;
        newLevel = targetNode.level;
        insertPosition = targetNode.orderIdx + 1;
        break;
        
      case 'inside':
        newParentId = targetId;
        newLevel = targetNode.level + 1;
        // Get max order index of children + 1
        const children = await db
          .select()
          .from(wbsNodes)
          .where(eq(wbsNodes.parentId, targetId))
          .orderBy(wbsNodes.orderIdx);
        insertPosition = children.length;
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid position type' }, { status: 400 });
    }

    console.log('New position calculated:', { newParentId, newLevel, insertPosition });

    // STEP 1: Remove node from current position
    console.log('STEP 1: Removing node from current position');
    
    // If moving within same parent, adjust insertion position if needed
    if (nodeToMove.parentId === newParentId && nodeToMove.orderIdx < insertPosition) {
      insertPosition = insertPosition - 1;
      console.log('Same parent, moving down - adjusted insert position:', insertPosition);
    }

    // Get current siblings and close the gap
    if (nodeToMove.parentId !== null) {
      const currentSiblings = await db
        .select()
        .from(wbsNodes)
        .where(eq(wbsNodes.parentId, nodeToMove.parentId))
        .orderBy(wbsNodes.orderIdx);

      // Shift siblings after the moved node
      for (let i = 0; i < currentSiblings.length; i++) {
        const sibling = currentSiblings[i];
        if (sibling.orderIdx > nodeToMove.orderIdx) {
          await db
            .update(wbsNodes)
            .set({
              orderIdx: sibling.orderIdx - 1,
              updatedAt: new Date(),
            })
            .where(eq(wbsNodes.id, sibling.id));
        }
      }
    }

    // STEP 2: Make space in new position
    console.log('STEP 2: Making space in new position');
    
    const newSiblings = await db
      .select()
      .from(wbsNodes)
      .where(newParentId ? eq(wbsNodes.parentId, newParentId) : isNull(wbsNodes.parentId))
      .orderBy(wbsNodes.orderIdx);

    // Shift siblings to make room (exclude the moving node if it's in the same parent)
    for (let i = 0; i < newSiblings.length; i++) {
      const sibling = newSiblings[i];
      if (sibling.id !== nodeId && sibling.orderIdx >= insertPosition) {
        await db
          .update(wbsNodes)
          .set({
            orderIdx: sibling.orderIdx + 1,
            updatedAt: new Date(),
          })
          .where(eq(wbsNodes.id, sibling.id));
      }
    }

    // STEP 3: Update the moved node
    console.log('STEP 3: Updating moved node to final position');
    
    const result = await db
      .update(wbsNodes)
      .set({
        parentId: newParentId,
        orderIdx: insertPosition,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(wbsNodes.id, nodeId))
      .returning();

    // STEP 4: Clean up order indices (ensure they're consecutive)
    console.log('STEP 4: Cleaning up order indices');
    
    // Reorder old parent if different
    if (nodeToMove.parentId !== newParentId && nodeToMove.parentId !== null) {
      await reorderNodes(nodeToMove.parentId);
    }
    
    // Reorder new parent
    await reorderNodes(newParentId);

    // STEP 5: Update WBS codes
    console.log('STEP 5: Updating WBS codes');
    await updateWbsCodesRecursive(nodeId);

    console.log('=== MOVE COMPLETED SUCCESSFULLY ===');
    
    return NextResponse.json({ 
      success: true, 
      movedNode: Array.isArray(result) ? result[0] : result 
    });

  } catch (error) {
    console.error('=== MOVE FAILED ===');
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to move node', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}