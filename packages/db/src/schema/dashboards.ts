import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const dashboards = sqliteTable(
  "dashboards",
  {
    orgId: text("org_id").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.orgId, table.id] }),
    index("dashboards_org_updated_idx").on(table.orgId, table.updatedAt),
    index("dashboards_org_name_idx").on(table.orgId, table.name),
  ],
)

export type DashboardRow = typeof dashboards.$inferSelect
export type DashboardInsert = typeof dashboards.$inferInsert
