import { db } from '@/db/drizzle';
import { wbsNodes } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  const { nodeId, newParentId } = await req.json();

  // Find the node to move
  const node = await db.query.wbsNodes.findFirst({ where: (fields, { eq }) => eq(fields.id, nodeId) });
  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  // Find the current siblings (old parent)
  const oldSiblings = await db.query.wbsNodes.findMany({
    where: (fields, { eq, isNull }) =>
      node.parentId === null ? isNull(fields.parentId) : eq(fields.parentId, node.parentId),
    orderBy: (fields) => [fields.orderIdx],
  });

  // Remove the node from old siblings and re-index them
  const filteredOld = oldSiblings.filter(n => n.id !== nodeId);
  await Promise.all(
    filteredOld.map((n, i) =>
      db.update(wbsNodes)
        .set({ orderIdx: i })
        .where(eq(wbsNodes.id, n.id))
    )
  );

  // Find new siblings (children of new parent)
  const newSiblings = await db.query.wbsNodes.findMany({
    where: (fields, { eq, isNull }) =>
      newParentId === null ? isNull(fields.parentId) : eq(fields.parentId, newParentId),
    orderBy: (fields) => [fields.orderIdx],
  });
  const newOrderIdx = newSiblings.length;

  // Update the node's parentId and orderIdx
  await db.update(wbsNodes)
    .set({ parentId: newParentId, orderIdx: newOrderIdx })
    .where(eq(wbsNodes.id, nodeId));

  return Response.json({ success: true });
}
