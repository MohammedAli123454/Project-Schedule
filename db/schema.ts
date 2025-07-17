import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active'), // active, completed, archived
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// WBS Nodes table (self-referencing)
let wbsNodes: any; // <-- Don't annotate with pgTable type, or just omit type (preferred)

wbsNodes = pgTable('wbs_nodes', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id').references(() => wbsNodes.id, { onDelete: 'cascade' }),

  // Node content
  name: text('name').notNull(),
  description: text('description'),

  // Hierarchy and ordering
  orderIdx: integer('order_idx').default(0),
  level: integer('level').default(0),

  // WBS code (e.g., "1.2.3")
  wbsCode: varchar('wbs_code', { length: 50 }),

  // Node type
  type: varchar('type', { length: 20 }).default('task'), // task, milestone, deliverable, phase

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export { wbsNodes };

// Types for TypeScript
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type WbsNode = typeof wbsNodes.$inferSelect;
export type NewWbsNode = typeof wbsNodes.$inferInsert;
