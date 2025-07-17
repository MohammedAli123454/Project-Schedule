import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const pid = parseInt(projectId);
    
    if (isNaN(pid)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const nodes = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.projectId, pid))
      .orderBy(wbsNodes.orderIdx);

    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Failed to fetch tree:', error);
    return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
  }
}