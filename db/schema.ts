import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  varchar,
  date,
  decimal,
} from 'drizzle-orm/pg-core';

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  plannedStartDate: date('planned_start_date').notNull(),
  mustFinishBy: date('must_finish_by').notNull(),
  projectManager: varchar('project_manager', { length: 100 }).notNull(),
  poNumber: varchar('po_number', { length: 50 }), // nullable
  mocNo: varchar('moc_no', { length: 50 }), // nullable
  serviceOrderNo: varchar('service_order_no', { length: 50 }), // nullable
  projectType: varchar('project_type', { length: 30 }).notNull(),
  clientName: varchar('client_name', { length: 100 }).notNull(),
  priority: varchar('priority', { length: 20 }), // nullable
  budget: decimal('budget', { precision: 14, scale: 2 }).notNull(),
  actualFinishDate: date('actual_finish_date'), // nullable
  awardedValue: decimal('awarded', { precision: 14, scale: 2 }).notNull(),
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
