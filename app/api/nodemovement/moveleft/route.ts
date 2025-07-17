// app/api/nodemovement/moveleft/route.ts
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  const { nodeId } = await req.json();

  // Find node
  const node = await db.query.wbsNodes.findFirst({ where: (fields, { eq }) => eq(fields.id, nodeId) });
  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  if (node.parentId == null) {
    return Response.json({ error: 'Node is already at root level' }, { status: 400 });
  }

  const parent = await db.query.wbsNodes.findFirst({
    where: (fields, { eq }) => eq(fields.id, node.parentId as number)
  });
  if (!parent) return Response.json({ error: 'Parent node not found' }, { status: 400 });

  const siblings = await db.query.wbsNodes.findMany({
    where: (fields, { eq, isNull }) =>
      parent.parentId === null ? isNull(fields.parentId) : eq(fields.parentId, parent.parentId),
    orderBy: (fields) => [fields.orderIdx],
  });

  const parentIdx = siblings.findIndex(n => n.id === parent.id);
  if (parentIdx === -1) return Response.json({ error: 'Parent not found in grandparent children' }, { status: 400 });

  await db.update(wbsNodes)
    .set({ parentId: parent.parentId ?? null, orderIdx: parentIdx + 1 })
    .where(eq(wbsNodes.id, nodeId));

  return Response.json({ ok: true });
}

