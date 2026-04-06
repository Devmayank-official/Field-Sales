import { pgTable, text, boolean, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientStatusEnum, colorLabelEnum } from "./enums";

export const clients = pgTable("clients", {
  id:                   text("id").primaryKey(),
  name:                 text("name").notNull(),
  phone:                text("phone"),
  email:                text("email"),
  address:              text("address").notNull(),
  subAddress:           text("sub_address"),
  pincode:              text("pincode"),
  shopType:             text("shop_type").notNull(),
  status:               clientStatusEnum("status").notNull().default("Lead"),
  tags:                 text("tags").array().notNull().default([]),
  colorLabel:           colorLabelEnum("color_label"),
  isArchived:           boolean("is_archived").notNull().default(false),
  notes:                text("notes"),
  visitFrequency:       integer("visit_frequency"),
  monthlyValueEstimate: integer("monthly_value_estimate"),
  lastVisitAt:          bigint("last_visit_at", { mode: "number" }),
  createdAt:            bigint("created_at", { mode: "number" }).notNull(),
  updatedAt:            bigint("updated_at", { mode: "number" }).notNull(),
  serverUpdatedAt:      timestamp("server_updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  serverUpdatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
