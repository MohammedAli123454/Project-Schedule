// app/api/nodemovement/moveright/route.ts
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  const { nodeId } = await req.json();

  // Find node
  const node = await db.query.wbsNodes.findFirst({ where: (fields, { eq }) => eq(fields.id, nodeId) });
  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  // Get siblings under the same parent
  const siblings = await db.query.wbsNodes.findMany({
    where: (fields, { eq, isNull }) =>
      node.parentId === null ? isNull(fields.parentId) : eq(fields.parentId, node.parentId),
    orderBy: (fields) => [fields.orderIdx],
  });

  const idx = siblings.findIndex(n => n.id === nodeId);
  if (idx === -1) return Response.json({ error: 'Node not found among siblings' }, { status: 400 });
  if (idx === 0) return Response.json({ error: 'No left sibling to move under' }, { status: 400 });

  const prevSibling = siblings[idx - 1];

  // Get all children of prevSibling (the new parent)
  const children = await db.query.wbsNodes.findMany({
    where: (fields, { eq }) => eq(fields.parentId, prevSibling.id),
    orderBy: (fields) => [fields.orderIdx],
  });

  // Move node under prevSibling at the end
  await db.update(wbsNodes)
    .set({ parentId: prevSibling.id, orderIdx: children.length })
    .where(eq(wbsNodes.id, nodeId));

  return Response.json({ ok: true });
}

