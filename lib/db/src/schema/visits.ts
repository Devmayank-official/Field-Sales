import { pgTable, text, bigint, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { visitStatusEnum } from "./enums";
import { clients } from "./clients";

export const visits = pgTable("visits", {
  id:               text("id").primaryKey(),
  clientId:         text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  startedAt:        bigint("started_at", { mode: "number" }).notNull(),
  endedAt:          bigint("ended_at", { mode: "number" }),
  locationLat:      doublePrecision("location_lat"),
  locationLng:      doublePrecision("location_lng"),
  locationNote:     text("location_note"),
  notes:            text("notes"),
  followUpOutcome:  text("follow_up_outcome"),
  status:           visitStatusEnum("status").notNull().default("active"),
  fridgesChecked:   text("fridges_checked").array().notNull().default([]),
  createdAt:        bigint("created_at", { mode: "number" }).notNull(),
  updatedAt:        bigint("updated_at", { mode: "number" }).notNull(),
  serverUpdatedAt:  timestamp("server_updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVisitSchema = createInsertSchema(visits).omit({
  serverUpdatedAt: true,
});

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;
