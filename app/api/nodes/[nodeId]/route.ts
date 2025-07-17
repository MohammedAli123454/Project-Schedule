import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    const id = parseInt(nodeId);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid node ID' }, { status: 400 });
    }

    const node = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.id, id))
      .limit(1);

    if (node.length === 0) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json(node[0]);
  } catch (error) {
    console.error('Failed to fetch node:', error);
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    const updates = await request.json();
    const id = parseInt(nodeId);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid node ID' }, { status: 400 });
    }

    const [updatedNode] = await db
      .update(wbsNodes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(wbsNodes.id, id))
      .returning();

    if (!updatedNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json(updatedNode);
  } catch (error) {
    console.error('Failed to update node:', error);
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    const id = parseInt(nodeId);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid node ID' }, { status: 400 });
    }

    await db.delete(wbsNodes).where(eq(wbsNodes.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete node:', error);
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
  }
}