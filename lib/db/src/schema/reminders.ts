import { pgTable, text, boolean, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clients } from "./clients";

export const reminders = pgTable("reminders", {
  id:          text("id").primaryKey(),
  title:       text("title").notNull(),
  clientId:    text("client_id").references(() => clients.id, { onDelete: "set null" }),
  clientName:  text("client_name"),
  dueAt:       bigint("due_at", { mode: "number" }).notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt:   bigint("created_at", { mode: "number" }).notNull(),
  updatedAt:   bigint("updated_at", { mode: "number" }).notNull(),
  serverUpdatedAt: timestamp("server_updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  serverUpdatedAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
