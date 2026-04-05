import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fridgeConditionEnum } from "./enums";
import { clients } from "./clients";

export const fridges = pgTable("fridges", {
  id:               text("id").primaryKey(),
  clientId:         text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serialNo:         text("serial_no").notNull(),
  gccCode:          text("gcc_code"),
  qrCodeValue:      text("qr_code_value"),
  condition:        fridgeConditionEnum("condition").notNull().default("Good"),
  installationDate: bigint("installation_date", { mode: "number" }),
  lastCheckedAt:    bigint("last_checked_at", { mode: "number" }),
  notes:            text("notes"),
  createdAt:        bigint("created_at", { mode: "number" }).notNull(),
  updatedAt:        bigint("updated_at", { mode: "number" }).notNull(),
  serverUpdatedAt:  timestamp("server_updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFridgeSchema = createInsertSchema(fridges).omit({
  serverUpdatedAt: true,
});

export type InsertFridge = z.infer<typeof insertFridgeSchema>;
export type Fridge = typeof fridges.$inferSelect;
