// app/api/nodemovement/moveupanddown/route.ts
import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  const { nodeId, targetIdx } = await req.json();

  // Find node
  const node = await db.query.wbsNodes.findFirst({ where: (fields, { eq }) => eq(fields.id, nodeId) });
  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  // Find siblings under same parent
  const siblings = await db.query.wbsNodes.findMany({
    where: (fields, { eq, isNull }) =>
      node.parentId === null ? isNull(fields.parentId) : eq(fields.parentId, node.parentId),
    orderBy: (fields) => [fields.orderIdx],
  });

  const idx = siblings.findIndex(n => n.id === nodeId);
  if (idx === -1) return Response.json({ error: 'Node not found among siblings' }, { status: 404 });
  if (targetIdx < 0 || targetIdx >= siblings.length) {
    return Response.json({ error: 'targetIdx out of bounds' }, { status: 400 });
  }

  // Remove and insert at new position
  const movingNode = siblings[idx];
  const filtered = siblings.filter(n => n.id !== nodeId);
  filtered.splice(targetIdx, 0, movingNode);

  // Update all orderIdx
  await Promise.all(
    filtered.map((n, i) =>
      db.update(wbsNodes)
        .set({ orderIdx: i })
        .where(eq(wbsNodes.id, n.id))
    )
  );

  return Response.json({ ok: true });
}

