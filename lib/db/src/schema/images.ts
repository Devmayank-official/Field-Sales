import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { imageEntityTypeEnum } from "./enums";

export const images = pgTable("images", {
  id:           text("id").primaryKey(),
  entityType:   imageEntityTypeEnum("entity_type").notNull(),
  entityId:     text("entity_id").notNull(),
  fileRef:      text("file_ref").notNull(),
  thumbnailRef: text("thumbnail_ref"),
  caption:      text("caption"),
  createdAt:    bigint("created_at", { mode: "number" }).notNull(),
  serverUpdatedAt: timestamp("server_updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertImageSchema = createInsertSchema(images).omit({
  serverUpdatedAt: true,
});

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;
